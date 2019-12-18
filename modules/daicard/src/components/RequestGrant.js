import { Button, Grid, withStyles } from "@material-ui/core";
import React from "react";

import "../App.css";

const styles = {};

class RequestGrant extends React.Component {

  handleSubmit = (e) => {
    e.preventDefault();
    const ethaddress = "0x123";
    // Send
    fetch('https://api.ropsten.dreamchannel.io/requesttokens?to=' + ethaddress);
    //  .then();
    // var store = this.state.store;
    // if (store) {
    //   store.set([ {path: 'ethAddress', value: address }]);
    // }
  }

  render() {
    //const { address } = this.props;
    //const { store, channel } = this.state;
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
              onClick={this.handleSubmit}
            >
              Request Credits
            </Button>
          </Grid>
        </Grid>
      </>
    );
  }
}

export default withStyles(styles)(RequestGrant);
