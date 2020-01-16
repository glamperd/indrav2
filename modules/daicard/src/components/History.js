import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Grid,
  InputAdornment,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  withStyles,
} from "@material-ui/core";
import { ArrowRight as SubmitIcon, Settings as SettingsIcon } from "@material-ui/icons";
import React, { useState } from "react";

import { Copyable } from "./copyable";

const style = withStyles(theme => ({
  card: {
    display: "flex",
    flexWrap: "wrap",
    flexDirection: "row",
    width: "100%",
    height: "70%",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    padding: "4% 4% 4% 4%",
  },
  icon: {
    width: "40px",
    height: "40px",
  },
  input: {
    width: "100%",
  },
  button: {
    marginBottom: "0px",
  },
}));

export const History = style(({ classes, setWalletConnext, getWalletConnext, store, history }) => {
  const [inputRecovery, setInputRecovery] = useState(false);
  const [isBurning, setIsBurning] = useState(false);
  const [mnemonic, setMnemonic] = useState("");
  const [showRecovery, setShowRecovery] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const rows = [];

  const useWalletConnext = getWalletConnext()

  const generateNewAddress = async () => {
    setIsBurning(true);
    store && await store.reset(); // remove anything in the store related to the old channel
    localStorage.removeItem("mnemonic", mnemonic);
    window.location.reload();
  };

  const recoverAddressFromMnemonic = async () => {
    store && await store.reset(); // remove anything in the store related to the old channel
    localStorage.setItem("mnemonic", mnemonic);
    window.location.reload();
  };

  return (
    <TableContainer component={Paper}>
    <Table className={classes.table} aria-label="simple table">
      <TableHead>
        <TableRow>
          <TableCell>History</TableCell>
          <TableCell align="right">Event</TableCell>
          <TableCell align="right">In/Out</TableCell>
          <TableCell align="right">Amount</TableCell>
          <TableCell align="right">Counterparty</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map(row => (
          <TableRow key={row.name}>
            <TableCell component="th" scope="row">
              {row.name}
            </TableCell>
            <TableCell align="right">{row.event}</TableCell>
            <TableCell align="right">{row.inout}</TableCell>
            <TableCell align="right">{row.amount}</TableCell>
            <TableCell align="right">{row.couterparty}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </TableContainer>
  );
});
