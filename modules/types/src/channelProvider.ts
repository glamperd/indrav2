import { CFCoreTypes, NetworkContext } from "./cf";
import { Store } from "./client";

export type ChannelProvider = any;

export type ChannelProviderConfig = {
  freeBalanceAddress: string;
  multisigAddress?: string; // may not be deployed yet
  natsClusterId?: string;
  natsToken?: string;
  nodeUrl: string;
  signerAddress: string;
  userPublicIdentifier: string;
};

export interface CFChannelProviderOptions {
  ethProvider: any;
  keyGen: CFCoreTypes.IPrivateKeyGenerator;
  lockService?: CFCoreTypes.ILockService;
  messaging: any;
  networkContext: NetworkContext;
  nodeConfig: any;
  nodeUrl: string;
  xpub: string;
  store: Store;
}

export type RpcConnection = ChannelProvider | any;

export type StorePair = {
  path: string;
  value: any;
};

export type KeyGen = (index: string) => Promise<string>;

// export interface IChannelProvider {
//   connection: RpcConnection;
//   wallet: Wallet | undefined;
//   _config: ChannelProviderConfig;
//   _multisigAddress: string | undefined;
//   _signerAddress: string | undefined;
//   store: Store | undefined;

//   enable(): Promise<ChannelProviderConfig>;
//   send(method: CFCoreTypes.RpcMethodName | NewRpcMethodName, params: any): Promise<any>;

//   on(event: string, listener: (...args: any[]) => void): RpcConnection;

//   once(event: string, listener: (...args: any[]) => void): RpcConnection;

//   signMessage(message: string): Promise<string>;

//   get(path: string): Promise<any>;

//   set(pairs: StorePair[], allowDelete?: Boolean): Promise<void>;

//   restore(): Promise<{ path: string; value: any }[]>;

//   reset(): Promise<void>;

//   restoreState(path: string): Promise<void>;

//   _send(methodName: CFCoreTypes.RpcMethodName, parameters: RpcParameters): Promise<any>;
// }
