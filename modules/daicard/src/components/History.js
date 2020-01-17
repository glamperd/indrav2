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
  Hidden,
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
import React, { useEffect, useState, Fragment } from "react";
import { fromWei } from '../utils/bn';

const style = withStyles(theme => ({
  table: {
    minWidth: 450,
  },
}));

const knownAddresses = {
  DreamChannel: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
  Payments: '0xb90FCfD094c60B180Df2bC4a346907F9882D3e7D',
};

export const History = style(({ classes, ethProvider, paymentsAddress, nftAddress, daiContract }) => {
  let [rows, setRows] = useState([]);
  let [isLoading, setIsLoading] = useState(true);
  let [balances, setBalances] = useState({});

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
             value: Number(fromWei(e.value)).toFixed(4),
             time: new Date(block.timestamp * 1000).toGMTString(),
             gas: e.gas,
           };
           // Decorate with recognisable events and addresses
           if (row.counterparty === knownAddresses.DreamChannel) {
             row.event = 'Top-up';
             row.counterparty = 'DreamChannel';
           } else if (row.counterparty === knownAddresses.Payments) {
             row.event = row.tofrom === 'from' ? 'Deposit' : 'Withdraw';
             row.counterparty = 'Payments';
           } else {
             row.event = row.tofrom === 'to' ? 'Received' : 'Sent';
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

       let bals = {payments:{}, nft:{}};
       // Get ETH balance
       let bal = await ethProvider.getBalance(paymentsAddress);
       bals.payments.eth = bal ? Number(fromWei(bal)).toFixed(4).toString() : '0';
       bal = await ethProvider.getBalance(nftAddress);
       bals.nft.eth = bal ? Number(fromWei(bal)).toFixed(4).toString() : '0';
       // Get DAI balance
       bal = await daiContract.functions.balanceOf(paymentsAddress);
       bals.payments.dai = bal ? Number(fromWei(bal)).toFixed(2).toString() : '0';
       // Get GZE balance
       //bals.payments.gze = await gzeContract.methods.balanceOf(paymentsAddress).call();
       bals.payments.gze = '0';
       setBalances(bals);

       setIsLoading(false);
     };

     fetchRows();
  }, []);

  return (
    <Container component={Paper}>
      {isLoading ? (<CircularProgress variant="indeterminate" />) : (
      <Fragment>
        <Table className={classes.table} aria-label="history table">
          <TableHead>
            <TableRow>
              <TableCell align="right">Time</TableCell>
              <TableCell align="right">Event</TableCell>
              <TableCell align="right">Amount</TableCell>
              <TableCell align="left">Counterparty</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map(row => (
                <TableRow key={row.hash} >
                  <TableCell align="right">{row.time}</TableCell>
                  <TableCell align="left">{row.event}</TableCell>
                  <TableCell align="right">{row.value}</TableCell>
                  <TableCell align="left">{row.counterparty}</TableCell>
                </TableRow>
            ))}
          </TableBody>
        </Table>
        <Grid container spacing={3}>
          <Grid item xs>
            <div>Balances:</div>
          </Grid>
          <Grid item xs>
            <div>{'Ξ' + balances.payments.eth}</div>
          </Grid>
          <Grid item xs>
            <div>{'Ξ' + balances.nft.eth}</div>
          </Grid>
          <Grid item xs>
            <div>{'\u25c8' + balances.payments.dai}</div>
          </Grid>
          <Grid item xs>
            <div>{'GZE' + balances.payments.gze }</div>
          </Grid>
        </Grid>
      </Fragment>
      )}
    </Container>
  );
});
