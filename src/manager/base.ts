import { GenericRouter } from "@ugursahinkaya/generic-router";
import { ModuleManager } from "@ugursahinkaya/module-manager";
import { ManagerBase } from "../index.js";
export class OPCUAError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OPCUAError";
  }
}
export class BaseManager {
  router: GenericRouter<any>;
  protected moduleManager: ModuleManager;
  protected rawManager: ManagerBase;

  constructor(
    manager: ManagerBase,
    operations: Record<string, (...args: any[]) => any>
  ) {
    this.rawManager = manager;
    this.router = new GenericRouter(operations);
    this.moduleManager = new ModuleManager();
  }

  async importDependencies() {
    const keys = Object.keys(this.rawManager.dependencies);
    for (let j = 0; j < keys.length; j++) {
      const key = keys[j];
      const dependency = this.rawManager.dependencies[key];
      const instanceName = await this.moduleManager.resolve(key, dependency);
      this.rawManager.dependencies[key].instanceName = instanceName;
    }
  }

  async resolveHandlers() {
    const result: Record<string, (...args: any[]) => Promise<void>> = {};
    if (!this.rawManager.handlers) {
      return result;
    }
    Object.entries(this.rawManager.handlers).forEach(([key, handler]) => {
      const rawModule = this.rawManager.dependencies[handler.module];

      if (rawModule && rawModule.instanceName) {
        const instance = this.moduleManager.modules[rawModule.instanceName];
        const operation = instance[handler.operation];

        if (operation) {
          result[key] = operation;
        }
      }
    });
  }
}
