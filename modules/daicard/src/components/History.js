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
  IconButton,
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
import { ArrowRight as SubmitIcon, Settings as SettingsIcon, OpenInBrowser as OpenInBrowserIcon } from "@material-ui/icons";
import React, { useEffect, useState, Fragment } from "react";
import { fromWei } from '../utils/bn';

const style = withStyles(theme => ({
  table: {
    //minWidth: 450,
    paddingTop: '0px',
    paddingLeft: '0px',
    paddingRight: '0px',
    backgroundColor: "#000000",
    color: "#f0f0f0",
  },
  cell: {
    borderBottom: '0px',
    color: "#f0f0f0",
  },
  paper: {
    paddingTop: "30px",
    backgroundColor: "#000",
    color: "#f0f0f0",
  },
  footer: {
    paddingTop: "20px",
    backgroundColor: "#626262",
    color: "#f0f0f0",
  },
  root: {
    display: 'flex',
    '& > * + *': {
      marginLeft: theme.spacing(2),
    },
  },
}));

const knownAddresses = {
  DreamChannel: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
  Payments: '0xb90FCfD094c60B180Df2bC4a346907F9882D3e7D',
};

const SEARCH_START_BLOCK = 6990000;

export const History = style(({ classes, ethProvider, nftEthProvider, paymentsAddress, nftAddress, daiContract, gzeContract }) => {
  let [rows, setRows] = useState([]);
  let [isLoading, setIsLoading] = useState(true);
  let [balances, setBalances] = useState({});

  const getTransactionsForAccount = async (account, provider, startBlock) => {

    const latestBlock = await provider.getBlockNumber();
    console.log('latest block is ', latestBlock);
    let temprows = [];
    for (var i = startBlock; i <= latestBlock; i++) {
     if (i % 1000 == 0) {
       console.log("Searching block " + i);
     }
     var block = await provider.getBlock(i, true);
     if (block && block.transactions ) {
       block.transactions.forEach( function(e) {
         if (account == e.from || account == e.to) {
           console.log('found tx in ', i);
           let row = {
             hash: e.hash,
             tofrom: account == e.from ? 'from' : 'to',
             counterparty: account == e.from ? e.to : e.from,
             value: Number(fromWei(e.value)).toFixed(4),
             time: new Date(block.timestamp * 1000).toLocaleString(),
             gas: e.gas,
           };
           // Decorate with recognisable events and addresses
           row = embellishRow(row);
           temprows.push(row);
         }
       });
     }
    }
    return temprows;
  }

  const getAccountHistoryWithApi = async (address) => {
    // Ropsten API
    let temprows=[];
    const url = 'http://api-ropsten.etherscan.io/api?module=account&action=txlist'
      + '&address=' + address
      + '&startblock=' + SEARCH_START_BLOCK
      + '&endblock=99999999&sort=asc'
      + '&apikey=YAJXVIAAS1XJHTC1RPYYPDNI2HQVPR8BF3'
    let res = await fetch(url);
    //console.log('response ', res);
    if (!res.ok) {
      console.log('API call not successful', res);
      return [];
    }
    let txList = await res.json();
    if (txList.status='1') {
      txList.result.forEach (tx => {
        let row = {
          hash: tx.hash,
          tofrom: address == tx.from ? 'from' : 'to',
          counterparty: address == tx.from ? tx.to : tx.from,
          value: Number(fromWei(tx.value)).toFixed(4),
          time: new Date(tx.timestamp * 1000).toLocaleString('en-US',{dateStyle: 'short', timeStyle: 'short'}),
          gas: tx.gas,
          contract: tx.contractAddress,
        };
        row = embellishRow(row);
        temprows.push(row);
      });
    }
    console.log('found ', temprows.length);
    // Parse result to form rows
    return temprows;
  }

  const embellishRow = (row) => {
    if (row.counterparty === knownAddresses.DreamChannel) {
      row.event = 'Top-up from DreamChannel';
    } else if (row.counterparty === knownAddresses.Payments) {
      row.event = row.tofrom === 'from' ? 'Deposit to ' : 'Withdraw from ';
      row.event += 'Payments';
    } else {
      row.event = row.tofrom === 'to' ? 'Received from ' : 'Sent to ';
      row.event += row.counterparty.slice(0,6) + '...';
    }
    return row;
  }

  const columnHeader = (text) => {
    return (
      <Typography variant="overline">{text}</Typography>
    );
  }

  const cell = (text) => {
    return (
      <Typography variant="body2">{text}</Typography>
    );
  }

  useEffect(() => {
     const fetchRows = async () => {
       setIsLoading(true);
       let tempRows = [];
       // Get tx list for payments address(es) - web3 block scan
       console.log('Getting tx hist for ', paymentsAddress);
       tempRows = await getTransactionsForAccount(paymentsAddress, ethProvider, 0);
       //console.log('rows ', tempRows);

       // Get tx list for NFT address(es) - etherscan API
       let nftRows = await getAccountHistoryWithApi(nftAddress);
       //tempRows.concat(nftRows);
       setRows(tempRows);

       // Balances
       let bals = {payments:{}, nft:{}};
       // Get ETH balance
       let bal = await ethProvider.getBalance(paymentsAddress);
       bals.payments.eth = bal ? Number(fromWei(bal)).toFixed(4).toString() : '0';
       bal = await nftEthProvider.getBalance(nftAddress);
       bals.nft.eth = bal ? Number(fromWei(bal)).toFixed(4).toString() : '0';
       // Get DAI balance
       bal = await daiContract.functions.balanceOf(paymentsAddress);
       bals.payments.dai = bal ? Number(fromWei(bal)).toFixed(2).toString() : '0';
       // Get GZE balance
       bals.payments.gze = await gzeContract.functions.balanceOf(paymentsAddress);
       bals.payments.gze = '0';
       setBalances(bals);

       setIsLoading(false);
     };

     fetchRows();
  }, []);

  return (
    <Container component={Paper} className={classes.paper}>
      {isLoading ? (
        <Container className={classes.root}>
          <CircularProgress variant="indeterminate" />
        </Container>
      ) : (
      <Fragment >
        <Typography variant="h6">Transaction History</Typography>
        <Table className={classes.table} aria-label="history table" >
          <TableHead>
            <TableRow>
              <TableCell align="center" padding='none' className={classes.cell}>{columnHeader('Time')}</TableCell>
              <TableCell align="center" padding='none' className={classes.cell}>{columnHeader('Event')}</TableCell>
              <TableCell align="right" padding='none' className={classes.cell}>{columnHeader('Amount')}</TableCell>
              <TableCell align="left" padding='none' className={classes.cell}></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map(row => (
                <TableRow key={row.hash} >
                  <TableCell align="left" padding='none' className={classes.cell}>{cell(row.time)}</TableCell>
                  <TableCell align="left" padding='none' className={classes.cell}>{cell(row.event)}</TableCell>
                  <TableCell align="right" padding='none' className={classes.cell}>{cell(row.value)}</TableCell>
                  <TableCell align="left" padding='none' className={classes.cell}>
                    <IconButton size='small'
                      href={"http://ropsten.etherscan.io/tx/" + row.hash}
                      style={{ color: '#ffffff' }}
                    >
                      <OpenInBrowserIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
            ))}
          </TableBody>
        </Table>
        <Paper className={classes.footer}>
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
        </Paper>
      </Fragment>
      )}
    </Container>
  );
});
