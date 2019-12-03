#!/bin/bash
set -e

project="indra"
export ETH_RPC_URL="http://172.17.0.1:8545"
export NODE_URL="nats://172.17.0.1:4222"

divider="\n########################################"
tokenAddress="`cat address-book.json | jq '.["4447"].Token.address' | tr -d '"'`"

id="xpub6DXwZMmWUq4bRZ3LtaBYwu47XV4Td19pnngok2Y7DnRzcCJSKCmD1AcLJDbZZf5dzZpvHqYzmRaKf7Gd2MV9qDvWwwN7VpBPNXQCZCbfyoK"

# hardcode the mnemonics to the prefunded ones found in
# `migrate-contracts.js`
mnemonic1="humble sense shrug young vehicle assault destroy cook property average silent travel"
mnemonic2="roof traffic soul urge tenant credit protect conduct enable animal cinnamon adult"

# Generate some random hex chunks to use in link payments
# For regular links
paymentId1="0x`head -c32 /dev/urandom | xxd -p -c32`"
preImage1="0x`head -c32 /dev/urandom | xxd -p -c32`"

# For async payments
paymentId2="0x`head -c32 /dev/urandom | xxd -p -c32`"
preImage2="0x`head -c32 /dev/urandom | xxd -p -c32`"

# Make sure the recipient bot in the background exits when this script exits
function cleanup {
  docker container stop ${project}_payment_bot_1 2> /dev/null || true
  docker container stop ${project}_payment_bot_2 2> /dev/null || true
}
trap cleanup EXIT SIGINT

rm -f ops/recipient-bot.log
touch ops/recipient-bot.log

function logInstalledApps {
  senderStore=modules/payment-bot/.payment-bot-db/2.json
  recipientStore=modules/payment-bot/.payment-bot-db/1.json
  senderApps=0
  recipientApps=0
  if [[ -f "$senderStore" ]]
  then senderApps="`cat $senderStore | grep channel | cut -d ":" -f3- | tr -d '\\\' | cut -c 3- | rev | cut -c 3- | rev | jq '.appInstances | length'`"
  fi
  if [[ -f "$recipientStore" ]]
  then recipientApps="`cat $recipientStore | grep channel | cut -d ":" -f3- | tr -d '\\\' | cut -c 3- | rev | cut -c 3- | rev | jq '.appInstances | length'`"
  fi
  echo -e "$divider";echo "Installed apps:"
  echo "Sender: $senderApps"
  echo "Recipient: $recipientApps"
  if [[ "$senderApps" != "0" || "$recipientApps" != "0" ]]
  then echo "Error: no lingering apps should be left uninstalled" && echo && exit 1
  fi
}


########################################
## Run Tests

logInstalledApps

echo -e "$divider";echo "Requesting eth collateral for recipient bot"
bash ops/payment-bot.sh -i 1 -q -m "$mnemonic1"

echo -e "$divider";echo "Requesting token collateral for recipient bot"
bash ops/payment-bot.sh -i 1 -q -a $tokenAddress -m "$mnemonic1"

echo -e "$divider";echo "Depositing eth into sender bot"
bash ops/payment-bot.sh -i 2 -d 0.1 -m "$mnemonic2"

echo -e "$divider";echo "Depositing tokens into sender bot"
bash ops/payment-bot.sh -i 2 -d 0.1 -a $tokenAddress -m "$mnemonic2"

echo -e "$divider";echo "Removing sender's state to trigger a restore"
rm modules/payment-bot/.payment-bot-db/2.json
bash ops/payment-bot.sh -i 2

echo -e "$divider";echo "Skipping sync transfer tests for now.."
#echo -e "$divider";echo "Starting recipient bot in background, waiting for payments"
#rm -f ops/recipient-bot.log
#bash ops/payment-bot.sh -i 1 -a $tokenAddress -m "$mnemonic1" -o &> ops/recipient-bot.log &
#sleep 3 # give recipient a sec to get set up
#echo -e "$divider";echo "Sending eth to recipient bot"
#bash ops/payment-bot.sh -i 2 -t 0.025 -c $id -m "$mnemonic2"
#echo -e "$divider";echo "Sending tokens to recipient bot"
#bash ops/payment-bot.sh -i 2 -t 0.05 -c $id -a $tokenAddress -m "$mnemonic2"
#echo -e "$divider";echo "Stopping recipient listener so it can redeem a link payment"
#cleanup

echo -e "$divider";echo "Generating an async payment & leaving the sender running so it can uninstall the app after"
bash ops/payment-bot.sh -i 2 -a $tokenAddress -n 0.01 -c $id -p "$paymentId2" -h "$preImage2" -m "$mnemonic2" -o &
sleep 3

echo -e "$divider";echo "Redeeming async payment"
bash ops/payment-bot.sh -i 1 -a $tokenAddress

echo -e "$divider";echo "Giving the sender a few seconds to finish uninstalling.."
sleep 2
cleanup
logInstalledApps

echo -e "$divider";echo "Generating a link payment & leaving the sender running so it can uninstall the app after"
bash ops/payment-bot.sh -i 2 -a $tokenAddress -l 0.01 -p "$paymentId1" -h "$preImage1" -m "$mnemonic2" -o &
sleep 3

echo -e "$divider";echo "Redeeming link payment"
bash ops/payment-bot.sh -i 1 -a $tokenAddress -y 0.01 -p "$paymentId1" -h "$preImage1" -m "$mnemonic1"

echo -e "$divider";echo "Giving the sender a few seconds to finish uninstalling.."
sleep 2
cleanup
logInstalledApps

echo -e "$divider";echo "Withdrawing tokens from recipient"
bash ops/payment-bot.sh -i 1 -a $tokenAddress -w 0.02

echo -e "$divider";echo "Tests finished successfully"
