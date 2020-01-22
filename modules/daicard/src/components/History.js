import {
  Button,
  CircularProgress,
  Container,
  Grid,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  withStyles,
} from "@material-ui/core";
import { OpenInBrowser as OpenInBrowserIcon } from "@material-ui/icons";
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
  cellPositive: {
    borderBottom: '0px',
    color: "#66ff66",
  },
  cellNegative: {
    borderBottom: '0px',
    color: "#ff6666",
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
    color: "white",
  },
}));

const knownAddresses = {
  DreamChannel: process.env.DC_FUNDING_ADDRESS || '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
  Payments: process.env.CONNEXT_MULTISIG_ADDRESS || '0xb90FCfD094c60B180Df2bC4a346907F9882D3e7D',
};

const SEARCH_START_BLOCK = 6990000;
const DAI_SYMBOL = '\u25c8';
const ETH_SYMBOL = 'Ξ';
const ONE_SYMBOL = '\u2460';
const TWO_SYMBOL = '\u2461';
const P_SYMBOL = '\u24C5';

export const History = style(({ classes, ethProvider, nftEthProvider, paymentsAddress, nftAddress, daiContract, tipContract, gzeContract, channel }) => {
  let [rows, setRows] = useState([]);
  let [isLoading, setIsLoading] = useState(true);
  let [balances, setBalances] = useState({});

  // Get layer 1 transactions for an address. The method is
  // to use the provider node, get each block (from a starting block)
  // and scan the block for transactions. This may be slow.
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
         if (account === e.from || account == e.to) {
           //console.log('found tx in ', i);
           let toFrom, cp, sign;
           if (account === e.from) {
             toFrom = 'from';
             cp = e.to;
             sign = false;
           } else {
             toFrom = 'to';
             cp = e.from;
             sign = true;
           }
           let row = {
             hash: e.hash,
             tofrom: toFrom,
             counterparty: cp,
             value: ETH_SYMBOL + Number(fromWei(e.value)).toFixed(4),
             time: new Date(block.timestamp * 1000),
             gas: e.gas,
             showLink: false,
             source: ONE_SYMBOL,
             isCredit: sign,
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

  // Get transactions for an address using the etherscan API.
  const getAccountHistoryWithApi = async (address) => {
    // Ropsten API
    let temprows=[];
    const url = 'https://api-ropsten.etherscan.io/api?module=account&action=txlist'
      + '&address=' + address
      + '&startblock=' + SEARCH_START_BLOCK
      + '&endblock=99999999&sort=asc'
      + '&apikey=YAJXVIAAS1XJHTC1RPYYPDNI2HQVPR8BF3';
    const options = {
      method: 'GET',
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json',
      }
    };
    let res = await fetch(url, options);
    //console.log('response ', res);
    if (!res.ok) {
      console.log('API call not successful', res);
      return [];
    }
    let txList = await res.json();
    if (txList.status==='1') {
      txList.result.forEach (tx => {
        let toFrom, cp, sign;
        if (address === tx.from) {
          toFrom = 'from';
          cp = tx.to;
          sign = false;
        } else {
          toFrom = 'to';
          cp = tx.from;
          sign = true;
        }
        let row = {
          hash: tx.hash,
          tofrom: toFrom,
          counterparty: cp,
          value: ETH_SYMBOL+Number(fromWei(tx.value)).toFixed(4),
          time: new Date(tx.timeStamp * 1000),
          gas: tx.gas,
          contract: tx.contractAddress,
          showLink: true,
          source: TWO_SYMBOL,
          isCredit: sign,
        };
        row = embellishRow(row);
        temprows.push(row);
      });
    }
    console.log('found ', temprows.length);
    // Parse result to form rows
    return temprows;
  }

  // Get transfers on layer 2 using the Connext API.
  const getL2TransferHistory = async () => {
    let temprows = [];
    const l2History = await channel.getTransferHistory();
    //console.log('l2 history', l2History);
    l2History.forEach(transfer => {
      let val = Number(fromWei(transfer.amount)).toFixed(4);
      let prefix = (transfer.assetId === tipContract.address) ? 'Tip' : DAI_SYMBOL;
      val = prefix + val;
      let time = new Date(transfer.createdAt);
      let toFrom, cp, sign;
      if (channel.publicIdentifier === transfer.senderPublicIdentifier) {
        toFrom = 'from';
        cp = transfer.receiverPublicIdentifier;
        sign = false;
      } else {
        toFrom = 'to';
        cp = transfer.senderPublicIdentifier;
        sign = true;
      }
      let row = {
        hash: transfer.id,
        tofrom: toFrom,
        counterparty: cp,
        value: val,
        time: time,
        assetId: transfer.assetId,
        meta: transfer.meta,
        showLink: false,
        source: P_SYMBOL,
        isCredit: sign,
      };
      row = embellishRow(row);
      temprows.push(row);

    });
    return temprows;
  }

  const formatTime = (time) => {
    return time.toLocaleString('en-US',{dateStyle: 'short', timeStyle: 'short'});
  }

  const embellishRow = (row) => {
    if (row.counterparty === knownAddresses.DreamChannel) {
      row.event = 'Top-up from DreamChannel';
    } else if (row.counterparty === knownAddresses.Payments) {
      row.event = row.tofrom === 'from' ? 'Deposit to ' : 'Withdraw from ';
      row.event += 'Payments';
    } else {
      row.event = row.tofrom === 'to' ? 'Received from ' : 'Sent to ';
      row.event += row.counterparty.slice(0,8) + '...';
    }
    return row;
  }

  const getBalances = async () => {
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
       console.log('process.env ', process.env);
       if (channel.config.contractAddresses.FundingAccount) {
         knownAddresses.DreamChannel = channel.config.contractAddresses.FundingAccount;
       };
       if (channel.config.contractAddresses.ConnextDeposits) {
         knownAddresses.Payments = channel.config.contractAddresses.ConnextDeposits;
       };
       setIsLoading(true);
       let tempRows = [];
       // Get tx list for payments address(es) - web3 block scan
       console.log('Getting tx hist for ', paymentsAddress);
       tempRows = await getTransactionsForAccount(paymentsAddress, ethProvider, 0);
       //console.log('rows ', tempRows);

       // Get tx list for NFT address(es) - etherscan API
       let nftRows = await getAccountHistoryWithApi(nftAddress);
       tempRows = tempRows.concat(nftRows);

       // Layer 2 transfer history
       let l2Rows = await getL2TransferHistory();
       tempRows = tempRows.concat(l2Rows);
       // Sort by time
       tempRows = tempRows.sort((rowA, rowB) => {
         return rowA.time - rowB.time;
       });
       tempRows.forEach((row) => {
         row.time = formatTime(row.time);
       });

       setRows(tempRows);


       // Balances
       await getBalances();

       setIsLoading(false);
     };

     fetchRows();
  }, []);

  return (
    <Container component={Paper} className={classes.paper}>
      {isLoading ? (
        <div className={classes.root}>
          <CircularProgress variant="indeterminate" />
        </div>
      ) : (
      <Fragment >
        <Typography variant="h6">Transaction History</Typography>
        <Table className={classes.table} aria-label="history table" >
          <TableHead>
            <TableRow>
              <TableCell align="right" padding='none' className={classes.cell}> </TableCell>
              <TableCell align="center" padding='none' className={classes.cell}>{columnHeader('Time')}</TableCell>
              <TableCell align="center" padding='none' className={classes.cell}>{columnHeader('Event')}</TableCell>
              <TableCell align="right" padding='none' className={classes.cell}>{columnHeader('Amount')}</TableCell>
              <TableCell align="left" padding='none' className={classes.cell}></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map(row => (
              <TableRow key={row.hash} >
                <TableCell align="right" padding='none' className={classes.cell} style={{ color: 'green' }}>{cell(row.source)}</TableCell>
                <TableCell align="left" padding='none' className={classes.cell}>{cell(row.time)}</TableCell>
                <TableCell align="left" padding='none' className={classes.cell}>{cell(row.event)}</TableCell>
                <TableCell align="right" padding='none'
                  className={(row.isCredit) ? classes.cellPositive : classes.cellNegative}>
                  {cell(row.value)}
                </TableCell>
                <TableCell align="left" padding='none' className={classes.cell}>
                  { row.showLink ?
                    (<IconButton size='small'
                      href={"https://ropsten.etherscan.io/tx/" + row.hash}
                      style={{ color: '#ffffff' }}
                    >
                      <OpenInBrowserIcon />
                    </IconButton>)
                    : ' '
                  }
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Paper className={classes.footer}>
          <Grid container spacing={0}>
            <Grid item xs>
              <Typography variant='subtitle1'>Balances:</Typography>
            </Grid>
            <Grid item xs={6} container direction="column" alignItems="stretch">
              <Grid item xs >
                <Typography variant='caption' >Address 1</Typography>
              </Grid>
              <Grid item xs={6} container justify="space-evenly" wrap="nowrap"
                style={{ maxWidth: 'none' }}>
                <Grid item xs>
                  {ETH_SYMBOL + balances.payments.eth}
                </Grid>
                <Grid item xs>
                  {DAI_SYMBOL + balances.payments.dai}
                </Grid>
                <Grid item xs>
                  {'GZE' + balances.payments.gze }
                </Grid>
              </Grid>
            </Grid>
            <Grid item >
              <Typography variant='caption' >Address 2</Typography>
              <div>{ETH_SYMBOL + balances.nft.eth}</div>
            </Grid>
          </Grid>
        </Paper>
      </Fragment>
      )}
    </Container>
  );
});
