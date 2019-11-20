import { Grid, Typography, withStyles } from "@material-ui/core";
import React from "react";
import PropTypes from "prop-types";
import { CheckCircle } from "@material-ui/icons";

// import { ethers as eth } from "ethers";

const styles = {
  row: {
    color: "#fca311",
    fontWeight: "500",
    fontSize: 32,
  },
  rowLarge: {
    color: "#fca311",
    fontWeight: "500",
    fontSize: 36,
  },
  rowExtraLarge: {
    color: "#fca311",
    fontWeight: "500",
    fontSize: 100,
  },
  pending: {
    marginBottom: "3%",
    color: "white",
  },
  clipboard: {
    cursor: "pointer",
  },
  networkWrapper: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  networkTextLarge: {
    marginTop: "-8px",
    fontSize: 16,
    color: "green",
  },
  networkTextMissingLarge: {
    marginTop: "-8px",
    fontSize: 16,
    color: "#fca311",
  },
  networkText: {
    marginTop: "-8px",
    fontSize: 8,
    color: "green",
  },
  networkTextMissing: {
    marginTop: "-8px",
    fontSize: 8,
    color: "#fca311",
  },
  iconLarge: {
    marginTop: "-10px",
    color: "green",
    fontSize: 16,
  },
  iconNetworkMissingLarge: {
    marginTop: "-10px",
    color: "#fca311",
    fontSize: 16,
  },
  icon: {
    marginTop: "-10px",
    color: "green",
    fontSize: 8,
  },
  iconNetworkMissing: {
    marginTop: "-10px",
    color: "#fca311",
    fontSize: 8,
  },
};

const ChannelCard = props => {
  const { classes, balance, big, swapRate, network } = props;
  const split = balance => {
    const bal = balance.format({ decimals: 2, symbol: false, round: false });
    const whole = bal.substring(0, bal.indexOf("."));
    const part = bal.substring(bal.indexOf("."));
    return { whole, part: part.substring(0, 4) };
  };

  return (
    <Grid item xs={12} style={{ display: "inline-block", textAlign: "center" }}>
      <Typography style={{ display: "inline-block" }} className={classes.row}>
        {"$ "}
      </Typography>
      <span id="balance-channel-token">
        <Typography
          style={{ display: "inline-block" }}
          className={big ? classes.rowExtraLarge : classes.rowLarge}
        >
          <span>{split(balance.channel.token.toDAI(swapRate)).whole}</span>
        </Typography>
        <Typography
          style={{ display: "inline-block" }}
          className={big ? classes.rowExtraLarge : classes.rowLarge}
        >
          <span>{split(balance.channel.token.toDAI(swapRate)).part}</span>
        </Typography>
      </span>
      <Grid className={classes.networkWrapper}>
        <CheckCircle className={network.name
          ? classes[`icon${big ? "Large" : ""}`]
          : classes[`iconNetworkMissing${big ? "Large" : ""}`]} />
        <Typography className={network.name
          ? classes[`networkText${big ? "Large" : ""}`]
          : classes[`networkTextMissing${big ? "Large" : ""}`]}>
          {network.name ? network.name.toUpperCase() : "NO NETWORK"}
        </Typography>
      </Grid>
    </Grid>
  );
};

ChannelCard.propTypes = {
  classes: PropTypes.object.isRequired,
};

export default withStyles(styles)(ChannelCard);
