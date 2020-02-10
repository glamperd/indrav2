import React, { useEffect, useState } from "react";
import { Grid, Typography, styled } from "@material-ui/core";
const axios = require("axios");

const TopGrid = styled(Grid)({
  display: "flex",
  flexWrap: "wrap",
  flexDirection: "column",
  width: "100%",
  height: "100%",
  justifyContent: "flex-start",
  alignItems: "flex-start",
  marginTop: "2%",
  marginLeft: "2%",
});

const StatGrid = styled(Grid)({
  justifyContent: "flex-start",
  marginVertical: "5%",
  flexDirection: "row",
});

const StatTypography = styled(Typography)({
  textAlign: "left",
  fontSize: "24px",
  color: "#002868",
});

const address = {
  mainnet: "0xF80fd6F5eF91230805508bB28d75248024E50F6F",
  staging: "0x5307B4F67ca8746562A4a9fdEb0714033008Ef4A",
  rinkeby: "0xDA3CCBa9F3e3a9fE7D0Ed9F699Ca2BEF78Ba7A6c",
};

function DebugNode({ classes }) {
  const [ethBalances, setEthBalances] = useState(null);
  const [daiBalances, setDaiBalances] = useState(null);
  const [tipBalances, setTipBalances] = useState(null);

  useEffect(() => {
    async function getBalances(addressArr) {
      const balances = await Promise.all(
        addressArr.map(
          async address =>
            await axios.get(
              "http://api.ethplorer.io/getAddressInfo/" + address + "?apiKey=freekey",
              { mode: 'no-cors', }
            ),
        ),
      );

      var eth = {
        mainnet: balances[0].data.ETH.balance,
        staging: balances[1].data.ETH.balance,
        rinkeby: balances[2].data.ETH.balance,
      };
      var dai = {
        mainnet: balances[0].data.tokens
          ? balances[0].data.tokens[0].balance / 1000000000000000000
          : 0,
        staging: balances[1].data.tokens
          ? balances[1].data.tokens[0].balance / 1000000000000000000
          : 0,
        rinkeby: balances[2].data.tokens
          ? balances[2].data.tokens[0].balance / 1000000000000000000
          : 0,
      };
      var tip = {
        mainnet: balances[0].data.tokens
          ? balances[0].data.tokens[1].balance / 1000000000000000000
          : 0,
        staging: balances[1].data.tokens
          ? balances[1].data.tokens[1].balance / 1000000000000000000
          : 0,
        rinkeby: balances[2].data.tokens
          ? balances[2].data.tokens[1].balance / 1000000000000000000
          : 0,
      };

      setEthBalances(eth);
      setDaiBalances(dai);
      setTipBalances(tip);

      return { eth, dai, tip };
    }
    getBalances(Object.values(address));
  }, []);

  return (
    <TopGrid container>
      <StatGrid>
        <a href={`https://etherscan.io/address/${address.mainnet}`}>Mainnet</a>
        <StatTypography>
          Eth Balance: {ethBalances ? ethBalances.mainnet : "loading..."}
        </StatTypography>
        <StatTypography>
          Dai Balance: {daiBalances ? daiBalances.mainnet : "loading..."}
        </StatTypography>
        <StatTypography>
          Tip Balance: {tipBalances ? tipBalances.mainnet : "loading..."}
        </StatTypography>
        <StatTypography>
          Public Identifier:
          xpub6E3tjd9js7QMrBtYo7f157D7MwauL6MWdLzKekFaRBb3bvaQnUPjHKJcdNhiqSjhmwa6TcTjV1wSDTgvz52To2ZjhGMiQFbYie2N2LZpNx6
        </StatTypography>
      </StatGrid>

      <StatGrid>
        <a href={`https://etherscan.io/address/${address.staging}`}>Staging</a>
        <StatTypography>
          Eth Balance: {ethBalances ? ethBalances.staging : "loading..."}
        </StatTypography>
        <StatTypography>
          Dai Balance: {daiBalances ? daiBalances.staging : "loading..."}
        </StatTypography>
        <StatTypography>Public Identifier: ???</StatTypography>
      </StatGrid>
      <StatGrid>
        <a href={`https://etherscan.io/address/${address.rinkeby}`}>Rinkeby</a>
        <StatTypography>
          Eth Balance: {ethBalances ? ethBalances.rinkeby : "loading..."}
        </StatTypography>
        <StatTypography>
          Dai Balance: {daiBalances ? daiBalances.rinkeby : "loading..."}
        </StatTypography>
        <StatTypography>
          Public Identifier:
          xpub6EUSTe4tBM9vQFvYf3jNHfHAVasAVndhVdn1jFv5vv3dBwjxtiDbQoPZiCUYhNH3EFeiYVeKSckn4YqVqG9NhBe9K8XFF3xa1m9Z3h7kyBW
        </StatTypography>
      </StatGrid>
    </TopGrid>
  );
}

export default DebugNode;
