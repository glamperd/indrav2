import { connect } from "@connext/client";
import { ClientOptions, IConnextClient } from "@connext/types";
import { Contract, Wallet } from "ethers";
import { JsonRpcProvider } from "ethers/providers";
import { parseEther } from "ethers/utils";
import tokenAbi from "human-standard-token-abi";

import { ChannelProvider } from "./channelProvider";
import { env } from "./env";
import { ethProvider } from "./ethprovider";
import { MemoryStoreService, MemoryStoreServiceFactory } from "./store";

const wallet = Wallet.fromMnemonic(env.mnemonic).connect(ethProvider);

let clientStore: MemoryStoreService;

export const createClient = async (
  mnemonic: string = Wallet.createRandom().mnemonic,
): Promise<IConnextClient> => {
  const storeServiceFactory = new MemoryStoreServiceFactory();

  clientStore = storeServiceFactory.createStoreService();

  const clientOpts: ClientOptions = {
    ethProviderUrl: env.ethProviderUrl,
    logLevel: env.logLevel,
    mnemonic,
    nodeUrl: env.nodeUrl,
    store: clientStore,
  };

  const client = await connect(clientOpts);
  // TODO: add client endpoint to get node config, so we can easily have its xpub etc

  await client.isAvailable();

  const ethTx = await wallet.sendTransaction({
    to: client.signerAddress,
    value: parseEther("0.1"),
  });

  const token = new Contract(client.config.contractAddresses.Token, tokenAbi, wallet);

  const tokenTx = await token.functions.transfer(client.signerAddress, parseEther("10"));

  await Promise.all([ethTx.wait(), tokenTx.wait()]);

  expect(client.freeBalanceAddress).toBeTruthy();
  expect(client.publicIdentifier).toBeTruthy();
  return client;
};

export const createRemoteClient = async (
  channelProvider: ChannelProvider,
): Promise<IConnextClient> => {
  const clientOpts: ClientOptions = {
    channelProvider,
    ethProviderUrl: env.ethProviderUrl,
    logLevel: env.logLevel,
  };

  const client = await connect(clientOpts);

  await client.isAvailable();

  expect(client.freeBalanceAddress).toBeTruthy();
  expect(client.publicIdentifier).toBeTruthy();

  return client;
};

export const getStore = (): MemoryStoreService => {
  return clientStore;
};
