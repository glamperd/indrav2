import { Paper, withStyles, Grid } from "@material-ui/core";
import * as connext from "@connext/client";
import { Contract, ethers as eth } from "ethers";
import { AddressZero, Zero } from "ethers/constants";
import { formatEther, parseEther } from "ethers/utils";
import interval from "interval-promise";
import React from "react";
import { BrowserRouter as Router, Route } from "react-router-dom";
import tokenArtifacts from "openzeppelin-solidity/build/contracts/ERC20Mintable.json";

import "./App.css";

// Pages
import AppBarComponent from "./components/AppBar";
import CashOutCard from "./components/cashOutCard";
import Confirmations from "./components/Confirmations";
import DepositCard from "./components/depositCard";
import Home from "./components/Home";
import MySnackbar from "./components/snackBar";
import RequestCard from "./components/requestCard";
import RedeemCard from "./components/redeemCard";
import SendCard from "./components/sendCard";
import SettingsCard from "./components/settingsCard";
import SetupCard from "./components/setupCard";
import SupportCard from "./components/supportCard";

import { Currency, store, minBN, toBN, tokenToWei, weiToToken } from "./utils";

// Optional URL overrides for custom urls
const overrides = {
  nodeUrl: process.env.REACT_APP_NODE_URL_OVERRIDE,
  ethUrl: process.env.REACT_APP_ETH_URL_OVERRIDE,
};

// Constants for channel max/min - this is also enforced on the hub
const WITHDRAW_ESTIMATED_GAS = toBN("300000");
const DEPOSIT_ESTIMATED_GAS = toBN("25000");
const MAX_CHANNEL_VALUE = Currency.DAI("30");

const styles = theme => ({
  paper: {
    width: "100%",
    padding: `0px ${theme.spacing(1)}px 0 ${theme.spacing(1)}px`,
    [theme.breakpoints.up("sm")]: {
      width: "450px",
      height: "650px",
      marginTop: "5%",
      borderRadius: "4px",
    },
    [theme.breakpoints.down(600)]: {
      "box-shadow": "0px 0px",
    },
  },
  app: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    flexGrow: 1,
    fontFamily: ["proxima-nova", "sans-serif"],
    backgroundColor: "#FFF",
    width: "100%",
    margin: "0px",
  },
  zIndex: 1000,
  grid: {},
});

class App extends React.Component {
  constructor(props) {
    super(props);
    const swapRate = "314.08";
    this.state = {
      address: "",
      balance: {
        channel: {
          ether: Currency.WEI("0", swapRate),
          token: Currency.DEI("0", swapRate),
          total: Currency.WEI("0", swapRate),
        },
        onChain: {
          ether: Currency.WEI("0", swapRate),
          token: Currency.DEI("0", swapRate),
          total: Currency.WEI("0", swapRate),
        },
      },
      ethprovider: null,
      freeBalanceAddress: null,
      loadingConnext: true,
      maxDeposit: null,
      minDeposit: null,
      pending: { type: "", complete: false, closed: false },
      sendScanArgs: { amount: null, recipient: null },
      swapRate,
      token: null,
      xpub: "",
    };
    this.refreshBalances.bind(this);
    this.setDepositLimits.bind(this);
    this.autoDeposit.bind(this);
    this.autoSwap.bind(this);
  }

  // ************************************************* //
  //                     Hooks                         //
  // ************************************************* //

  async componentDidMount() {
    // If no mnemonic, create one and save to local storage
    let mnemonic = localStorage.getItem("mnemonic");
    if (!mnemonic) {
      mnemonic = eth.Wallet.createRandom().mnemonic;
      localStorage.setItem("mnemonic", mnemonic);
    }

    const nodeUrl =
      overrides.nodeUrl || `${window.location.origin.replace(/^http/, "ws")}/api/messaging`;
    const ethUrl = overrides.ethUrl || `${window.location.origin}/api/ethprovider`;
    const ethprovider = new eth.providers.JsonRpcProvider(ethUrl);
    const cfPath = "m/44'/60'/0'/25446";
    const cfWallet = eth.Wallet.fromMnemonic(mnemonic, cfPath).connect(ethprovider);

    const channel = await connext.connect({
      ethProviderUrl: ethUrl,
      logLevel: 5,
      mnemonic,
      nodeUrl,
      store,
    });

    const channelAvailable = async () => {
      const chan = await channel.getChannel();
      return chan && chan.available;
    };
    const interval = 1;
    while (!(await channelAvailable())) {
      console.info(`Waiting ${interval} more seconds for channel to be available`);
      await new Promise(res => setTimeout(() => res(), interval * 1000));
    }

    const freeBalanceAddress = channel.freeBalanceAddress || channel.myFreeBalanceAddress;
    const connextConfig = await channel.config();
    const token = new Contract(connextConfig.contractAddresses.Token, tokenArtifacts.abi, cfWallet);
    const swapRate = await channel.getLatestSwapRate(AddressZero, token.address);

    console.log(`Client created successfully!`);
    console.log(` - Public Identifier: ${channel.publicIdentifier}`);
    console.log(` - Account multisig address: ${channel.opts.multisigAddress}`);
    console.log(` - CF Account address: ${cfWallet.address}`);
    console.log(` - Free balance address: ${freeBalanceAddress}`);
    console.log(` - Token address: ${token.address}`);
    console.log(` - Swap rate: ${swapRate}`)

    channel.subscribeToSwapRates(AddressZero, token.address, (res) => {
      if (!res || !res.swapRate) return;
      console.log(`Got swap rate upate: ${this.state.swapRate} -> ${res.swapRate}`);
      this.setState({ swapRate: res.swapRate });
    })

    this.setState({
      address: cfWallet.address,
      channel,
      ethprovider,
      freeBalanceAddress,
      swapRate,
      token,
      wallet: cfWallet,
      xpub: channel.publicIdentifier,
    });

    await this.startPoller();
    this.setState({ loadingConnext: false });
  }

  // ************************************************* //
  //                    Pollers                        //
  // ************************************************* //

  async startPoller() {
    await this.refreshBalances();
    await this.setDepositLimits();
    await this.autoDeposit();
    await this.autoSwap();
    interval(async (iteration, stop) => {
      await this.refreshBalances();
      await this.setDepositLimits();
      await this.autoDeposit();
      await this.autoSwap();
    }, 3000);
  }

  async refreshBalances() {
    const { address, balance, channel, ethprovider, swapRate, token } = this.state;
    if (!channel) { return; }
    const getTotal = (chain, channel) => Currency.WEI(chain.toBN().add(channel.toBN()), swapRate);
    const freeEtherBalance = await channel.getFreeBalance();
    const freeTokenBalance = await channel.getFreeBalance(token.address);
    balance.onChain.ether = Currency.WEI(await ethprovider.getBalance(address), swapRate);
    balance.onChain.token = Currency.DEI(await token.balanceOf(address), swapRate);
    balance.onChain.total = getTotal(balance.onChain.ether, balance.onChain.token);
    balance.channel.ether = Currency.WEI(freeEtherBalance[this.state.freeBalanceAddress], swapRate);
    balance.channel.token = Currency.DEI(freeTokenBalance[this.state.freeBalanceAddress], swapRate);
    balance.channel.total = getTotal(balance.channel.ether, balance.channel.token);
    this.setState({ balance });
  }

  async setDepositLimits() {
    const { swapRate, ethprovider } = this.state;
    let gasPrice = await ethprovider.getGasPrice();
    let totalDepositGasWei = DEPOSIT_ESTIMATED_GAS.mul(toBN(2)).mul(gasPrice);
    let totalWithdrawalGasWei = WITHDRAW_ESTIMATED_GAS.mul(gasPrice);
    const minDeposit = Currency.WEI(totalDepositGasWei.add(totalWithdrawalGasWei), swapRate);
    const maxDeposit = MAX_CHANNEL_VALUE.toDEI(swapRate);
    this.setState({ maxDeposit, minDeposit });
  }

  async autoDeposit() {
    const { balance, channel, minDeposit, maxDeposit, pending, swapRate, token } = this.state;
    if (!channel || !(await channel.getChannel()).available) {
      console.warn(`Channel not available yet.`);
      return;
    }
    if (balance.onChain.ether.toBN().lt(minDeposit.toBN())) {
      return; // Not enough on-chain eth to deposit. Also, no gas money for depositing tokens
    }
    if (!pending.complete) {
      return; // Some other operation is pending, let that finish first
    }

    let nowMaxDeposit = maxDeposit.toWei(swapRate).toBN().sub(balance.channel.total.toBN());
    if (nowMaxDeposit.lte(Zero)) {
      return; // Channel balance is at/above cap, not depositing any more
    }

    if (balance.chain.token.toBN().gt(Zero)) {
      const amount = minBN([ nowMaxDeposit.toDEI(swapRate).toBN(), balance.chain.token.toBN() ]);
      const depositParams = {
        amount: amount.toString(),
        assetId: token.address.toLowerCase(),
      };
      const channelState = JSON.stringify(await channel.getChannel(), null, 2);
      console.log(`Depositing ${depositParams.amount} tokens into channel: ${channelState}`);
      this.setPending({ type: "deposit", complete: false, closed: false });
      const result = await channel.deposit(depositParams);
      this.setPending({ type: "deposit", complete: true, closed: false });
      console.log(`Successfully deposited tokens! Result: ${JSON.stringify(result, null, 2)}`);
    }

    await this.refreshBalances();
    nowMaxDeposit = maxDeposit.toWei(swapRate).toBN().sub(balance.channel.total.toBN());
    if (nowMaxDeposit.lte(Zero)) {
      return; // Channel balance is at/above cap, not depositing any more
    }

    const amount = minBN([
      balance.chain.ether.toBN().sub(minDeposit.toBN()),
      nowMaxDeposit.toWEI(swapRate).toBN(),
    ]);
    const channelState = JSON.stringify(await channel.getChannel(), null, 2);
    console.log(`Depositing ${amount} wei into channel: ${channelState}`);
    this.setPending({ type: "deposit", complete: false, closed: false });
    const result = await channel.deposit({ amount: amount.toString() });
    this.setPending({ type: "deposit", complete: true, closed: false });
    console.log(`Successfully deposited ether! Result: ${JSON.stringify(result, null, 2)}`);
  }

  async autoSwap() {
    const { balance, channel, pending, swapRate, token } = this.state;
    if (!channel || !(await channel.getChannel()).available) {
      console.warn(`Channel not available yet.`);
      return;
    }
    if (balance.channel.ether.toBN().eq(Zero)) {
      return; // No eth to swap
    }
    if (balance.channel.token.toBN().gte(MAX_CHANNEL_VALUE)) {
      return; // swap ceiling has been reached, no need to swap more
    }
    if (!pending.complete) {
      return; // Some other operation is pending, let that finish first
    }
    const maxSwap = tokenToWei(MAX_CHANNEL_VALUE.sub(balance.channel.token.toBN()), swapRate)
    const weiToSwap = minBN([balance.channel.ether.toBN(), maxSwap])
    const hubFBAddress = connext.utils.freeBalanceAddressFromXpub(channel.nodePublicIdentifier)
    const collateralNeeded = balance.channel.token.toBN().add(weiToToken(weiToSwap));
    let collateral = formatEther((await channel.getFreeBalance(token.address))[hubFBAddress])

    console.log(`Available collateral: ${collateral} tokens, ${collateralNeeded} needed`)
    if (collateralNeeded.gt(parseEther(collateral))) {
      console.log(`Requesting more collateral...`)
      await channel.addPaymentProfile({
        amountToCollateralize: collateralNeeded,
        minimumMaintainedCollateral: Zero.toString(),
        tokenAddress: token.address,
      });
      await channel.requestCollateral(token.address);
      collateral = formatEther((await channel.getFreeBalance(token.address))[hubFBAddress])
      console.log(`Available collateral: ${collateral} tokens, ${collateralNeeded} needed`)
    }

    console.log(`Attempting to swap ${formatEther(weiToSwap)} for dai at rate: ${swapRate}`);
    this.setPending({ type: "swap", complete: false, closed: false });
    await channel.swap({
      amount: weiToSwap.toString(),
      fromAssetId: AddressZero,
      swapRate,
      toAssetId: token.address,
    });
    this.setPending({ type: "swap", complete: true, closed: false });
  }

  setPending(pending) {
    this.setState({ pending });
  }

  closeConfirmations() {
    const { pending } = this.state;
    this.setState({ pending: { ...pending, closed: true } });
  }

  // ************************************************* //
  //                    Handlers                       //
  // ************************************************* //

  async scanQRCode(data) {
    // potential URLs to scan and their params
    const urls = {
      "/send?": ["recipient", "amount"],
      "/redeem?": ["secret", "amountToken"],
    };
    let args = {};
    let path = null;
    for (let [url, fields] of Object.entries(urls)) {
      const strArr = data.split(url);
      if (strArr.length === 1) {
        // incorrect entry
        continue;
      }
      if (strArr[0] !== window.location.origin) {
        throw new Error("incorrect site");
      }
      // add the chosen url to the path scanned
      path = url + strArr[1];
      // get the args
      const params = strArr[1].split("&");
      fields.forEach((field, i) => {
        args[field] = params[i].split("=")[1];
      });
    }
    if (args === {}) {
      console.log("could not detect params");
    }
    switch (path) {
      case "/send":
        this.setState({
          sendScanArgs: { ...args },
        });
        break;
      case "/redeem":
        this.setState({
          redeemScanArgs: { ...args },
        });
        break;
      default:
        break;
    }
    return path;
  }

  async closeModal() {
    await this.setState({ loadingConnext: false });
  }

  render() {
    const {
      address,
      balance,
      channel,
      swapRate,
      maxDeposit,
      minDeposit,
      pending,
      sendScanArgs,
      token,
      xpub,
    } = this.state;
    const { classes } = this.props;
    return (
      <Router>
        <Grid className={classes.app}>
          <Paper elevation={1} className={classes.paper}>
            <MySnackbar
              variant="warning"
              openWhen={this.state.loadingConnext}
              onClose={() => this.closeModal()}
              message="Starting Channel Controllers.."
              duration={30000}
            />
            <AppBarComponent address={address} />
            <Route
              exact
              path="/"
              render={props => (
                <Grid>
                  <Home
                    {...props}
                    balance={balance}
                    scanQRCodee={this.scanQRCode.bind(this)}
                  />
                  <SetupCard
                    {...props}
                    minDeposit={minDeposit}
                    maxDeposit={maxDeposit}
                  />
                </Grid>
              )}
            />
            <Route
              path="/deposit"
              render={props => (
                <DepositCard
                  {...props}
                  address={address}
                  maxDeposit={maxDeposit}
                  minDeposit={minDeposit}
                />
              )}
            />
            <Route path="/settings" render={props => <SettingsCard {...props} />} />
            <Route
              path="/request"
              render={props => <RequestCard
                {...props}
                xpub={xpub}
                maxDeposit={maxDeposit}
              />}
            />
            <Route
              path="/send"
              render={props => (
                <SendCard
                  {...props}
                  balance={balance}
                  channel={channel}
                  scanArgs={sendScanArgs}
                  token={token}
                />
              )}
            />
            <Route
              path="/redeem"
              render={props => (
                <RedeemCard
                  {...props}
                  balance={balance}
                  channel={channel}
                  pending={pending}
                  token={token}
                />
              )}
            />
            <Route
              path="/cashout"
              render={props => (
                <CashOutCard
                  {...props}
                  balance={balance}
                  channel={channel}
                  swapRate={swapRate}
                  setPending={this.setPending.bind(this)}
                  ethprovider={this.state.ethprovider}
                />
              )}
            />
            <Route
              path="/support"
              render={props => (
                <SupportCard
                  {...props}
                  channel={channel}
                />
              )}
            />
            <Confirmations
              pending={pending}
              closeConfirmations={this.closeConfirmations.bind(this)}
            />
          </Paper>
        </Grid>
      </Router>
    );
  }
}

export default withStyles(styles)(App);
