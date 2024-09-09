import {
  OPCUAServer,
  Variant,
  DataType,
  StatusCodes,
  UAVariable,
} from "node-opcua";
import type { RawServer, RawVariable, ServerManager } from "../index.js";
import { BaseManager, OPCUAError } from "./base.js";

export class OPCUAServerManager extends BaseManager {
  servers: Map<string, OPCUAServer>;
  protected declare rawManager: ServerManager;
  protected variables: Map<string, UAVariable>;

  constructor(
    manager: ServerManager,
    operations: Record<string, (...args: any[]) => any>
  ) {
    super(manager, operations);
    this.servers = new Map();
    this.variables = new Map();
  }

  createServer(rawServer: RawServer): OPCUAServer {
    const server = new OPCUAServer(rawServer);
    this.servers.set(rawServer.name, server);
    return server;
  }

  async startServer(serverName: string): Promise<void> {
    const server = this.servers.get(serverName);
    if (!server) {
      return;
    }
    try {
      await server.initialize();
      await server.start();
      await this.initializeAddressSpace(serverName);
      console.log("Server is now listening ... ( press CTRL+C to stop)");
    } catch (error) {
      this.handleError("Failed to start server", error);
    }
  }

  async stopServer(serverName: string): Promise<void> {
    const server = this.servers.get(serverName);
    if (!server) {
      return;
    }
    if (server) {
      await server.shutdown();
      console.log("Server stopped.");
    } else {
      console.error("Server not initialized");
    }
  }

  private async initializeAddressSpace(serverName: string): Promise<void> {
    const { variables } = this.rawManager.servers[serverName] ?? {};
    if (variables) {
      for (const [_name, options] of Object.entries(variables)) {
        await this.addVariable(serverName, options);
      }
    }
  }
  addVariable<T>(serverName: string, variableOptions: RawVariable<T>) {
    const server = this.servers.get(serverName);
    if (!server) {
      throw new OPCUAError(`Server ${serverName} not found`);
    }
    if (!server.engine.addressSpace) {
      throw new OPCUAError(`Address space for ${serverName} not initialized`);
    }

    const { nodeId, value, handler, ...opt } = variableOptions;
    if (!value) {
      throw new OPCUAError(`Value must be set for ${nodeId} variable init`);
    }

    const namespace = server.engine.addressSpace.getOwnNamespace();
    const variable = namespace.addVariable({
      ...opt,
      nodeId,
      dataType: DataType[variableOptions.dataType as keyof typeof DataType],
      value: {
        get: () =>
          new Variant({
            dataType:
              DataType[variableOptions.dataType as keyof typeof DataType],
            value,
          }),
        set: (variant: Variant) => {
          if (handler) {
            this.router.call(handler, {}, variant.value);
          }
          return StatusCodes.Good;
        },
      },
    });
    this.variables.set(`${variable.nodeId}@${serverName}`, variable);
    return `${variable.nodeId}@${serverName}`;
  }

  private handleError(message: string, error: any): void {
    console.error(`${message}:`, error);
  }
}
