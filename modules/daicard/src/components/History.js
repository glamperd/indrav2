import {
  Button,
  CircularProgress,
  Container,
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
  TableHead,
  TableRow,
  TextField,
  Typography,
  withStyles,
} from "@material-ui/core";
import { ArrowRight as SubmitIcon, Settings as SettingsIcon } from "@material-ui/icons";
import React, { useEffect, useState } from "react";

const style = withStyles(theme => ({
  table: {
    minWidth: 650,
  },
}));

export const History = style(({ classes, ethProvider, paymentsAddress, nftAddress }) => {
  let [rows, setRows] = useState([]);
  let [isLoading, setIsLoading] = useState(true);

  const getTransactionsForAccount = async (account) => {

    const latestBlock = await ethProvider.getBlockNumber();
    console.log('latest block is ', latestBlock);
    let temprows = [];
    for (var i = 0; i <= latestBlock; i++) {
     if (i % 1000 == 0) {
       console.log("Searching block " + i);
     }
     var block = await ethProvider.getBlock(i, true);
     if (block && block.transactions ) {
       block.transactions.forEach( function(e) {
         if (account == e.from || account == e.to) {
           console.log('found tx in ', i);
           let row = {
             hash: e.hash,
             tofrom: account == e.from ? 'from' : 'to',
             counterparty: account == e.from ? e.to : e.from,
             value: e.value.toString(),
             time: block.timestamp + " " + new Date(block.timestamp * 1000).toGMTString(),
             gas: e.gas,
           }
           temprows.push(row);
         }
       });
     }
    }
    return temprows;
  }

  useEffect(() => {
     const fetchRows = async () => {
       setIsLoading(true);
       let tempRows = [];
       // Get tx list for payments address(es) - web3 block scan
       console.log('Getting tx hist for ', paymentsAddress);
       tempRows = await getTransactionsForAccount(paymentsAddress);
       console.log('rows ', tempRows);

       // Get tx list for NFT address(es) - etherscan API
       setRows(tempRows);
       setIsLoading(false);
     };

     fetchRows();
  }, []);

  return (
    <Container component={Paper}>
    {isLoading ? (<div>Loading...</div>) : (
    <Table className={classes.table} aria-label="history table">
      <TableHead>
        <TableRow>
        <TableCell align="right">Hash</TableCell>
          <TableCell align="right">Time</TableCell>
          <TableCell align="right">To/From</TableCell>
          <TableCell align="right">Amount</TableCell>
          <TableCell align="right">Counterparty</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map(row => (
            <TableRow key={row.hash || 'x'} >
              <TableCell component="th" scope="row">{row.hash}</TableCell>
              <TableCell align="right">{row.time}</TableCell>
              <TableCell align="right">{row.tofrom}</TableCell>
              <TableCell align="right">{row.value}</TableCell>
              <TableCell align="right">{row.counterparty}</TableCell>
            </TableRow>
        ))}
      </TableBody>
    </Table>
    )}
  </Container>
  );
});
