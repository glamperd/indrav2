import {
  Button,
  CircularProgress,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Grid,
  TextField,
  Typography,
  withStyles,
} from "@material-ui/core";
import { Send as SendIcon } from "@material-ui/icons";
import { Zero } from "ethers/constants";
import React, { Component } from "react";
import queryString from "query-string";

import { Currency, delay } from "../utils";

const SWAP_LIMIT = Currency.DAI("10"); // $10 capped swap amount

const styles = theme => ({
  icon: {
    width: "40px",
    height: "40px",
  },
  input: {
    width: "100%",
  },
  button: {
    backgroundColor: "#FCA311",
    color: "#FFF",
  },
});

const PaymentStates = {
  None: 0,
  Collateralizing: 1,
  CollateralTimeout: 2,
  OtherError: 3,
  Success: 4,
};

class BuyTipsCard extends Component {
  constructor(props) {
    super(props);
    this.state = {
      amount: { display: "", error: null, value: null },
      tips: { display: "", error: null, value: null },
      recipient: { display: "", error: null, value: null },
      sendError: null,
      scan: false,
      showReceipt: false,
      paymentState: PaymentStates.None,
      isBuy: true,
    };
  }

  async componentDidMount() {
    const query = queryString.parse(this.props.location.search);
    if (query.amountToken) {
      this.updateAmountHandler(query.amountToken);
    }
    if (query.tipsToken) {
      this.updateTipsHandler(query.tipsToken);
    }
  }

  async updateAmountHandler(rawValue) {
    const { balance } = this.props;
    const { isBuy } = this.state;
    let value = null,
      error = null;
    try {
      value = Currency.DAI(rawValue);
    } catch (e) {
      error = e.message;
    }
    if (isBuy && value && value.wad.gt(balance.channel.token.wad)) {
      error = `Invalid amount: must be less than your balance`;
    }
    if (value && value.wad.lte(Zero)) {
      error = "Invalid amount: must be greater than 0";
    }
    this.setState({
      amount: {
        display: rawValue,
        error,
        value: error ? null : value,
      },
    });
  }

  async updateTipsHandler(rawValue) {
    const { balance } = this.props;
    const { isBuy } = this.state;
    let value = null,
      error = null;
    try {
      value = Currency.TIP(rawValue);
    } catch (e) {
      error = e.message;
    }
    if (!isBuy && value && value.wad.gt(balance.channel.tipToken.wad)) {
      error = `Invalid amount: must be less than your balance`;
    }
    if (value && value.wad.lte(Zero)) {
      error = "Invalid amount: must be greater than 0";
    }
    this.setState({
      tips: {
        display: rawValue,
        error,
        value: error ? null : value,
      },
    });
  }

  async buyTipsHandler() {
    const { channel, token, tipToken } = this.props;
    const { amount, tips, address } = this.state;
    if (amount.error || tips.error) return;

    console.log(`Swapping ${amount.value} for ${tips.value}`);
    this.setState({ paymentState: PaymentStates.Collateralizing });

    // there is a chance the payment will fail when it is first sent
    // due to lack of collateral. collateral will be auto-triggered on the
    // hub side. retry for 1min, then fail
    const endingTs = Date.now() + 60 * 1000;
    let transferRes = undefined;
    const swapRate = "1000";
    while (Date.now() < endingTs) {
      try {
        //transferRes =
        await channel.requestCollateral(
          tipToken.address);
           /*,
          channel.xpub,
          Currency.TIP("1000").wad
        );*/

        transferRes = await channel.swap({
          amount: amount.value.wad.toString(),
          fromAssetId: token.address,
          toAssetId: tipToken.address,
          swapRate,
        });

        //await this.refreshBalances();
        break;
      } catch (e) {
        console.log('error' + e.message);
        await delay(5000);
      }
    }
    if (!transferRes) {
      console.log('Swap failed');
      this.setState({ paymentState: PaymentStates.OtherError, showReceipt: true });
      return;
    }
    console.log('Swap succeeded');
    this.setState({ showReceipt: true, paymentState: PaymentStates.Success });
  }

  closeModal = () => {
    this.setState({ showReceipt: false, paymentState: PaymentStates.None });
  };

  render() {
    const { classes } = this.props;
    const { amount, tips, recipient, paymentState, showReceipt, sendError, isBuy } = this.state;
    const buyOrSell = isBuy ? "Buy" : "Sell";
    return (
      <Grid
        container
        spacing={2}
        direction="column"
        style={{
          display: "flex",
          paddingLeft: 12,
          paddingRight: 12,
          paddingTop: "10%",
          paddingBottom: "10%",
          textAlign: "center",
          justify: "center",
        }}
      >
        <Grid container wrap="nowrap" direction="row" justify="center" alignItems="center">
          <Grid item xs={12}>
            <SendIcon className={classes.icon} /> {/*TODO make this a swap icon*/}
          </Grid>
        </Grid>
        <Grid item xs={12}>
          <Grid container direction="row" justify="center" alignItems="center">
            <Typography variant="h4">
              <span>{this.props.balance.channel.token.toDAI().format()}</span>
            </Typography>
          </Grid>
          <Grid container direction="row" justify="center" alignItems="center">
            <Typography variant="h5">
              <span>{this.props.balance.channel.tipToken.toTIP().format()}</span>
            </Typography>
            <Typography variant="body2">
              TIP
            </Typography>
          </Grid>
        </Grid>
        <Grid container direction="row" alignItems="center" justify="center" spacing={8}>
          <Grid item xs={6}>
            <TextField
              fullWidth
              id="outlined-number"
              label="Credits"
              value={amount.display}
              type="number"
              margin="normal"
              variant="outlined"
              onChange={evt => this.updateAmountHandler(evt.target.value)}
              error={amount.error !== null}
              helperText={amount.error}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth
              id="outlined-number"
              label="Tip Tokens"
              value={tips.display}
              type="number"
              margin="normal"
              variant="outlined"
              onChange={evt => this.updateTipsHandler(evt.target.value)}
              error={tips.error !== null}
              helperText={tips.error}
            />
          </Grid>
        </Grid>
        <Grid item xs={12}>
          <Grid container direction="row" alignItems="center" justify="center" spacing={8}>
            <Grid item xs={6}>
              <Button
                  className={classes.button}
                  disabled={!!amount.error || !!tips.error}
                  fullWidth
                  onClick={() => {
                    this.buyTipsHandler();
                  }}
                  size="large"
                  variant="contained"
              >
                {buyOrSell + ' TIPS'}
              </Button>
            </Grid>
          </Grid>
        </Grid>
        <Grid item xs={12}>
          <Button
            variant="outlined"
            style={{
              background: "#FFF",
              border: "1px solid #F22424",
              color: "#F22424",
              width: "15%",
            }}
            size="medium"
            onClick={() => this.props.history.push("/")}
          >
            Back
          </Button>
        </Grid>
      </Grid>
    );
  }
}

function ConfirmationDialogText(paymentState, amountToken, recipient) {
  switch (paymentState) {
    case PaymentStates.Collateralizing:
      return (
        <Grid>
          <DialogTitle disableTypography>
            <Typography variant="h5" color="primary">
              Payment In Progress
            </Typography>
          </DialogTitle>
          <DialogContent>
            <DialogContentText variant="body1" style={{ color: "#0F1012", margin: "1em" }}>
              Recipient's Card is being set up. This should take 20-30 seconds.
            </DialogContentText>
            <DialogContentText variant="body1" style={{ color: "#0F1012" }}>
              If you stay on this page, your payment will be retried automatically. If you navigate
              away or refresh the page, you will have to attempt the payment again yourself.
            </DialogContentText>
            <CircularProgress style={{ marginTop: "1em" }} />
          </DialogContent>
        </Grid>
      );
    case PaymentStates.CollateralTimeout:
      return (
        <Grid>
          <DialogTitle disableTypography>
            <Typography variant="h5" style={{ color: "#F22424" }}>
              Payment Failed
            </Typography>
          </DialogTitle>
          <DialogContent>
            <DialogContentText variant="body1" style={{ color: "#0F1012", margin: "1em" }}>
              After some time, recipient channel could not be initialized.
            </DialogContentText>
            <DialogContentText variant="body1" style={{ color: "#0F1012" }}>
              Is the receiver online to set up their Card? Please try your payment again later. If
              you have any questions, please contact support. (Settings --> Support)
            </DialogContentText>
          </DialogContent>
        </Grid>
      );
    case PaymentStates.OtherError:
      return (
        <Grid>
          <DialogTitle disableTypography>
            <Typography variant="h5" style={{ color: "#F22424" }}>
              Payment Failed
            </Typography>
          </DialogTitle>
          <DialogContent>
            <DialogContentText variant="body1" style={{ color: "#0F1012", margin: "1em" }}>
              An unknown error occured when making your payment.
            </DialogContentText>
            <DialogContentText variant="body1" style={{ color: "#0F1012" }}>
              Please try again in 30s and contact support if you continue to experience issues.
              (Settings --> Support)
            </DialogContentText>
          </DialogContent>
        </Grid>
      );
    case PaymentStates.Success:
      return (
        <Grid>
          <DialogTitle disableTypography>
            <Typography variant="h5" style={{ color: "#009247" }}>
              Payment Success!
            </Typography>
          </DialogTitle>
          <DialogContent>
            <DialogContentText variant="body1" style={{ color: "#0F1012", margin: "1em" }}>
              Amount: ${amountToken}
            </DialogContentText>
            <DialogContentText variant="body1" style={{ color: "#0F1012" }}>
              To: {recipient.substr(0, 5)}...
            </DialogContentText>
          </DialogContent>
        </Grid>
      );
    case PaymentStates.None:
    default:
      return <div />;
  }
}

export default withStyles(styles)(BuyTipsCard);