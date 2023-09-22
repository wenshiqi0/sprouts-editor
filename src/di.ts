export interface ClassCtor<T> {
  new(...deps: InstanceProxy[]): T;
}

export type FunctionCtor<T> = (...deps: InstanceProxy[]) => T;

export type Ctor<T> = ClassCtor<T> | FunctionCtor<T>;

function isFunctionCtor<T = Instance>(ctor: Ctor<T>): ctor is FunctionCtor<T> {
  if (typeof ctor.constructor !== 'function') return true;
  return false;
}

function isClassCtor<T = Instance>(ctor: Ctor<T>): ctor is ClassCtor<T> {
  if (typeof ctor.constructor === 'function') return true;
  return false;
}

export enum DiError {
  ServiceContextNotFound = 'context not found',
  ServiceContextExisted = 'context already existed',
  CtorNotFound = 'constructor not found',
}

type Instance = any;
type InstanceProxy = any;
type Identifier = string | Symbol;
const DefaultContext = Symbol('defaultContext');

class RootService {
  static singleton?: RootService;
  static get instance() {
    if (!RootService.singleton) {
      RootService.singleton = new RootService();
    }
    return RootService.singleton;
  }

  private _current: Identifier = DefaultContext;
  private _ctxMap = new Map<Identifier, ServiceContext>();

  get current() {
    return this.getContext(this._current);
  }

  constructor() {
    const defaultCtx = new ServiceContext();
    this._ctxMap.set(this._current, defaultCtx);
  }

  private getContext(name: Identifier) {
    const ctx = this._ctxMap.get(name);
    if (!ctx) {
      throw new Error(DiError.ServiceContextNotFound)
    }
    return ctx;
  }

  use(id: Identifier) {
    this.getContext(id);
    this._current = id;
  }

  resolve(id: Identifier) {
    return this._ctxMap.get(id);
  }

  create(id: Identifier) {
    const ctx = new ServiceContext();
    const old = this._ctxMap.get(id);
    if (old) {
      throw new Error(DiError.ServiceContextExisted);
    }
    this._ctxMap.set(id, ctx);
    return ctx;
  }
}

const lazySingletonHandler: ProxyHandler<{ id: Identifier }> = {
  get({ id }, prop) {
    let instance = root.current.getInstance<any>(id);
    if (!instance) {
      instance = root.current.concreteSingleton(id);
    }
    if (prop === 'bind') {
      return instance[prop];
    }
    if (instance[prop].bind) {
      return instance[prop].bind(instance);
    }
    return instance[prop];
  }
}

const createSingletonProxy = (id: Identifier): InstanceProxy => {
  return new Proxy({ id }, lazySingletonHandler);
}

class ServiceContext {
  private ctors = new Map<Identifier, Ctor<Instance>>();
  private ctorDeps = new Map<Identifier, Identifier[]>();
  private ctorExtra = new Map<Identifier, any[]>();
  private singletons = new Map<Identifier, Instance>();

  private concrete<T extends Instance>(id: Identifier) {
    const ctor = this.ctors.get(id);
    const deps = this.ctorDeps.get(id) || [];
    const extra = this.ctorExtra.get(id) || [];
    if (!ctor) {
      throw new Error(DiError.CtorNotFound);
    }
    let instance: Instance;
    if (isFunctionCtor(ctor)) {
      instance = ctor(...deps.map(dep => createSingletonProxy(dep)), ...extra);
    }
    if (isClassCtor(ctor)) {
      instance = new ctor(...deps.map(dep => createSingletonProxy(dep)), ...extra);
    }
    return instance! as T;
  }

  addConstructor<T extends Instance>(id: Identifier, ctor: Ctor<T>, deps: Identifier[], extra: any[]) {
    this.ctors.set(id, ctor);
    this.ctorDeps.set(id, deps);
    this.ctorExtra.set(id, extra);
  }

  concreteSingleton<T extends Instance>(id: Identifier) {
    const singleton = this.concrete<T>(id);
    this.singletons.set(id, singleton);
    return singleton;
  }

  getInstance<T>(id: Identifier) {
    return this.singletons.get(id) as T;
  }

  getSingleton<T>(id: Identifier) {
    return createSingletonProxy(id) as T;
  }
}

export const root = RootService.instance;

export function lazy<T = Instance>(id: Identifier, ctor: Ctor<T>, deps: Identifier[] = [], ...extra: any[]) {
  root.current.addConstructor(id, ctor, deps, extra);
  return createSingletonProxy(id) as T;
}

export function immediate<T = Instance>(id: Identifier, ctor: Ctor<T>, deps: Identifier[] = [], ...extra: any[]) {
  lazy(id, ctor, deps, ...extra);
  root.current.concreteSingleton(id);
  return createSingletonProxy(id);
}
