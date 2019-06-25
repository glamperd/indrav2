import { Node } from "@counterfactual/node";
import { ConnextListener } from "src/listener";

import { ConnextInternal } from "../connext";
import { Logger } from "../lib/logger";
import { INodeApiClient } from "../node";

export abstract class AbstractController {
  public name: string;
  public connext: ConnextInternal;
  public log: Logger;
  public node: INodeApiClient;
  public cfModule: Node;
  public listener: ConnextListener;

  public constructor(name: string, connext: ConnextInternal) {
    this.connext = connext;
    this.name = name;
    this.node = connext.node;
    this.cfModule = connext.cfModule;
    this.listener = connext.listener;
    this.log = new Logger(name, connext.opts.logLevel);
  }
}