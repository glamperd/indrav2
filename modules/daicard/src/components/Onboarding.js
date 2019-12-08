import { Button, Grid, Modal, withStyles } from "@material-ui/core";
import React from "react";

import "../App.css";

//import { store } from '../utils';

const styles = {};

function setAddressScript() {
  return {__html: '<script>function setAddr(addr) {assert(addr);}</script>'}
}

class Onboarding extends React.Component {
  constructor(props) {
    super(props);
    //this.onrampRef = React.createRef();
    this.state = {
      onrampModal: false,
      channel: props.channel,
      store: props.channel ? props.channel.store : undefined,
    };
  }

  componentDidMount () {
/*    const script = document.createElement("script");
    script.src = "https://verify.sendwyre.com/js/widget-loader.js";
    script.async = true;
    script.innerHTML = 'var widget = new Wyre.Widget({ env: "test", auth: {"type": "secretKey", "secretKey": "aaaa"}, operation: {"type":"onramp", "destCurrency": "DAI"} });';
    this.onrampRef.current.appendChild(script);
*/
  }


  handleSubmit = (e) => {
    e.preventDefault();
    const address = e.target.children[0].value;
    console.log('submit' + address);
    var store = this.state.store;
    if (store) {
      store.set([ {path: 'ethAddress', value: address }]);
    }
  }

  setAddress = (addr) => {
    console.log('new address: ' + addr);
    var store = this.state.store;
    if (store) {
      store.set([ {path: 'ethAddress', value: addr }]);
    }
  }

  render() {
    //const { address } = this.props;
    const { store, channel } = this.state;
    const ethAddress = store ? store.get('ethAddress') :
      channel ? channel.freeBalanceAddress : '0xe4621e7D8Ac41691e80Dd90D788365dD8d514Db2';
    return (
      <>
        <Grid
          container
          spacing={1}
          direction="column"
          style={{ paddingLeft: "2%", paddingRight: "2%", textAlign: "center" }}
        >
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
                  src={"https://pay.testwyre.com/purchase?destCurrency=DAI&sourceAmount=10&dest=ethereum:"
                      + ethAddress + "&accountId=AC_GQEAQV3A37U" }
                  frameBorder="0"
                  allowFullScreen
                  height="800">
                </iframe>
              </div>
              {/*<div ref={this.onrampRef} />; */}
            </Modal>
          </Grid>
          <Grid item xs={12}>
            <form id="addressform" onSubmit={this.handleSubmit} hidden >
              <input id="setaddress" type="hidden" onChange={this.setAddress}/>
              <input id="submitaddress" type='submit' value='Submit' />
            </form>
            <div id="mydiv" dangerouslySetInnerHTML={setAddressScript()} />
          </Grid>
        </Grid>
      </>
    );
  }
}

export default withStyles(styles)(Onboarding);
