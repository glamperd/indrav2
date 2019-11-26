import { Button, Fab, Grid, Modal, withStyles, TextField } from "@material-ui/core";
import { SaveAlt as ReceiveIcon, Send as SendIcon } from "@material-ui/icons";
import QRIcon from "mdi-material-ui/QrcodeScan";
import React, { useState } from "react";
import { Link } from "react-router-dom";

import "../App.css";

import { ChannelCard } from "./channelCard";
import { QRScan } from "./qrCode";

import { initWalletConnect } from "../utils";

const style = withStyles({});

function setAddressScript() {
  return {__html: '<script>function setAddr(addr) {assert(addr);}</script>'}
}

export const Home = style(({ balance, swapRate, channel, history, parseQRCode }) => {
  const [scanModal, setScanModal] = useState(false);

  const scanQRCode = data => {
    setScanModal(false);
    if (channel && data.startsWith("wc:")) {
      localStorage.setItem(`wcUri`, data)
      initWalletConnect(data, channel);
    } else {
      const url = parseQRCode(data)
      history.push(url)
    }
  };

  handleSubmit = (e) => {
    e.preventDefault();
    const address = e.target.children[0].value;
    console.log('submit' + address);
    store.set([ {path: 'ethAddress', value: address }]);
  }

  setAddress = (addr) => {
    console.log('new address: ' + addr);
    store.set([ {path: 'ethAddress', value: addr }]);
  }

  const { address } = this.props;
  const ethAddress = store.get('ethAddress');

  return (
    <>
      <Grid container direction="row" style={{ marginBottom: "-7.5%" }}>
        <Grid item xs={12} style={{ marginRight: "5%", marginLeft: "80%" }}>
          <ChannelCard balance={balance} swapRate={swapRate} />
        </Grid>
      </Grid>
      <Grid container direction="column">
        <Grid item xs={12} style={{ marginRight: "5%", marginLeft: "80%" }}>
          <Fab
            style={{
              color: "#FFF",
              backgroundColor: "#fca311",
              size: "large",
            }}
            onClick={() => setScanModal(true)}
          >
            <QRIcon />
          </Fab>
          <Modal
            id="qrscan"
            open={scanModal}
            onClose={() => setScanModal(false)}
            style={{
              justifyContent: "center",
              alignItems: "center",
              textAlign: "center",
              position: "absolute",
              top: "10%",
              width: "375px",
              marginLeft: "auto",
              marginRight: "auto",
              left: "0",
              right: "0",
            }}
          >
            <QRScan handleResult={scanQRCode} />
          </Modal>
        </Grid>
      </Grid>
      <Grid
        container
        spacing={4}
        direction="column"
        style={{ paddingLeft: "2%", paddingRight: "2%", textAlign: "center" }}
      >
        <Grid item xs={12} style={{ paddingTop: "10%" }}>
          <Grid container spacing={2} direction="row" alignItems="center" justify="center">
            <Grid item xs={12} sm={6}>
              <Button
                disableTouchRipple
                fullWidth
                style={{
                  color: "#FFF",
                  backgroundColor: "#FCA311",
                }}
                variant="contained"
                size="large"
                component={Link}
                to="/request"
              >
                Request
                <ReceiveIcon style={{ marginLeft: "5px" }} />
              </Button>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Button
                disableTouchRipple
                fullWidth
                style={{
                  color: "#FFF",
                  backgroundColor: "#FCA311",
                }}
                size="large"
                variant="contained"
                component={Link}
                to="/send"
              >
                Send
                <SendIcon style={{ marginLeft: "5px" }} />
              </Button>
            </Grid>
          </Grid>
        </Grid>
        <Grid item xs={12}>
          <Button
            disableTouchRipple
            style={{ marginBottom: "20%" }}
            fullWidth
            color="primary"
            variant="outlined"
            size="large"
            component={Link}
            to="/cashout"
          >
            Cash Out
          </Button>
        </Grid>
      </Grid>
      <Grid item xs={12}>
        <Button
          style={{ marginBottom: "5%" }}
          fullWidth
          color="primary"
          variant="outlined"
          size="large"
          onClick={() => this.setState({ onrampModal: true })}
        >
          Buy Credits
        </Button>
        <Modal
          id="onramp"
          open={this.state.onrampModal}
          onClose={() => this.setState({ onrampModal: false })}
          style={{
            justifyContent: "center",
            alignItems: "center",
            textAlign: "center",
            position: "absolute",
            top: "10%",
            width: "375px",
            marginLeft: "auto",
            marginRight: "auto",
            left: "0",
            right: "0"
          }}
        >
          <div>
            <iframe
              title="onrampwyre"
              src={"https://pay.testwyre.com/purchase?destCurrency=DAI&sourceAmount=10&dest=" + ethAddress }
              frameBorder="0"
              allowFullScreen
              height="800">
            </iframe>
          </div>
          {/*<div ref={this.onrampRef} />; */}
        </Modal>
      </Grid>
      <Grid item xs={12}>
        <Button
          style={{ marginBottom: "5%" }}
          fullWidth
          color="primary"
          variant="outlined"
          size="large"
          component={Link}
          to="/swaptips"
        >
          Buy/Sell Tipping Tokens
        </Button>
        <form id="addressform" onSubmit={this.handleSubmit} hidden >
          <input id="setaddress" type="hidden" onChange={this.setAddress}/>
          <input id="submitaddress" type='submit' value='Submit' />
        </form>
        <div id="mydiv" dangerouslySetInnerHTML={setAddressScript()} />
      </Grid>
    </Grid>

    </>
  );
});
