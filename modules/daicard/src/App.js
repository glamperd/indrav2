import { Paper, withStyles, Grid } from "@material-ui/core";
import * as connext from "@connext/client";
import { ethers as eth } from "ethers";
import { AddressZero } from "ethers/constants";
import { formatEther, parseEther } from "ethers/utils";
import interval from "interval-promise";
import React from "react";
import { BrowserRouter as Router, Route } from "react-router-dom";

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

import { Currency, store, toBN } from "./utils";

// Optional URL overrides for custom urls
const overrides = {
  nodeUrl: process.env.REACT_APP_NODE_URL_OVERRIDE,
  ethUrl: process.env.REACT_APP_ETH_URL_OVERRIDE,
};

// Constants for channel max/min - this is also enforced on the hub
const WITHDRAW_ESTIMATED_GAS = toBN("300000");
const DEPOSIT_ESTIMATED_GAS = toBN("25000");
const HUB_EXCHANGE_CEILING = parseEther("69"); // 69 token
const CHANNEL_DEPOSIT_MAX = parseEther("30"); // 30 token

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
        channel: { token: Currency.DEI("0", swapRate), ether: Currency.WEI("0", swapRate) },
        onChain: { token: Currency.DEI("0", swapRate), ether: Currency.WEI("0", swapRate) },
      },
      ethprovider: null,
      swapRate,
      freeBalanceAddress: null,
      loadingConnext: true,
      maxDeposit: null,
      minDeposit: null,
      pending: { type: "", complete: false, closed: false },
      sendScanArgs: { amount: null, recipient: null },
    };
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
    const cfWallet = eth.Wallet.fromMnemonic(mnemonic, cfPath);

    const channel = await connext.connect({
      ethProviderUrl: ethUrl,
      logLevel: 5,
      mnemonic,
      nodeUrl,
      store,
    });
    const freeBalanceAddress = channel.freeBalanceAddress || channel.myFreeBalanceAddress;
    const connextConfig = await channel.config();
    const tokenAddress = connextConfig.contractAddresses.Token
    const swapRate = await channel.getLatestSwapRate(AddressZero, tokenAddress);

    console.log(`Client created successfully!`);
    console.log(` - Public Identifier: ${channel.publicIdentifier}`);
    console.log(` - Account multisig address: ${channel.opts.multisigAddress}`);
    console.log(` - CF Account address: ${cfWallet.address}`);
    console.log(` - Free balance address: ${freeBalanceAddress}`);
    console.log(` - Token address: ${tokenAddress}`);
    console.log(` - Swap rate: ${swapRate}`)

    channel.subscribeToSwapRates(AddressZero, tokenAddress, (swapRate) => {
      console.log(`Got swap rate upate: ${this.state.swapRate} -> ${swapRate}`);
      this.setState({ swapRate });
    })

    this.setState({
      address: cfWallet.address,
      channel,
      ethprovider,
      freeBalanceAddress,
      swapRate,
      tokenAddress,
      wallet: cfWallet,
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
    const { address, balance, channel, ethprovider, swapRate } = this.state;
    const freeBalance = await channel.getFreeBalance();
    balance.onChain.ether = Currency.WEI(await ethprovider.getBalance(address), swapRate);
    balance.channel.ether = Currency.WEI(freeBalance[this.state.freeBalanceAddress], swapRate);
    this.setState({ balance });
  }

  async setDepositLimits() {
    const { swapRate, ethprovider } = this.state;
    let gasPrice = await ethprovider.getGasPrice();
    // default multiple is 1.5, leave 2x for safety
    let totalDepositGasWei = DEPOSIT_ESTIMATED_GAS.mul(toBN(2)).mul(gasPrice);
    let totalWithdrawalGasWei = WITHDRAW_ESTIMATED_GAS.mul(gasPrice);
    const minDeposit = Currency.WEI(totalDepositGasWei.add(totalWithdrawalGasWei), swapRate);
    const maxDeposit = Currency.DEI(CHANNEL_DEPOSIT_MAX, swapRate);
    this.setState({ maxDeposit, minDeposit });
  }

  async autoDeposit() {
    const { balance, channel, minDeposit, maxDeposit, pending } = this.state;
    if (!channel || (pending.type === "deposit" && !pending.complete)) return;
    if (!(await channel.getChannel()).available) {
      console.warn(`Channel not available yet.`);
      return;
    }

    const bnBalance = {
      ether: toBN(balance.onChain.ether),
      token: toBN(balance.onChain.token),
    };

    const minWei = minDeposit.toWEI().floor();
    const maxWei = maxDeposit.toWEI().floor();

    if (bnBalance.token.gt(eth.constants.Zero)) {
      const tokenDepositParams = {
        amount: bnBalance.token.toString(),
        assetId: process.env.REACT_APP_TOKEN_ADDRESS,
      };
      const channelState = await channel.getChannel();
      console.log(
        `Attempting to deposit ${tokenDepositParams.amount} tokens into channel: ${JSON.stringify(
          channelState,
          null,
          2,
        )}...`,
      );
      this.setPending({ type: "deposit", complete: false, closed: false });
      const result = await channel.deposit(tokenDepositParams);
      this.setPending({ type: "deposit", complete: true, closed: false });
      console.log(`Successfully deposited! Result: ${JSON.stringify(result, null, 2)}`);
    }

    if (bnBalance.ether.gt(minWei)) {
      if (bnBalance.ether.gt(maxWei)) {
        console.log(
          `Attempting to deposit more than the limit: ` +
            `${formatEther(bnBalance.ether)} > ${maxDeposit.toETH()}`,
        );
        return;
      }

      const ethDepositParams = { amount: bnBalance.ether.sub(minWei).toString() };

      const channelState = await channel.getChannel();
      console.log(
        `Attempting to deposit ${ethDepositParams.amount} wei into channel: ${JSON.stringify(
          channelState,
          null,
          2,
        )}...`,
      );

      this.setPending({ type: "deposit", complete: false, closed: false });
      const result = await channel.deposit(ethDepositParams);
      this.setPending({ type: "deposit", complete: true, closed: false });

      console.log(`Successfully deposited! Result: ${JSON.stringify(result, null, 2)}`);
    }

  }

  async autoSwap() {
    const { balance, channel } = this.state;
    const weiBalance = toBN(balance.channel.ether);
    const tokenBalance = toBN(balance.channel.token);
    if (false && weiBalance.gt(toBN("0")) && tokenBalance.lte(HUB_EXCHANGE_CEILING)) {
      await channel.swap(weiBalance, "wei");
    }
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
              render={props => <RequestCard {...props} address={address} maxDeposit={maxDeposit} />}
            />
            <Route
              path="/send"
              render={props => (
                <SendCard
                  {...props}
                  balance={balance}
                  channel={channel}
                  scanArgs={sendScanArgs}
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
