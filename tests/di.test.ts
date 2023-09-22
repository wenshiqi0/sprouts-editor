import { lazy, immediate, root } from '../src/di';

const IA = Symbol('IA');
interface IA {
  history: number;
  plus(a: number, b: number): number;
  mult(a: number, b: number): number
}

class A implements IA {
  history: number = 0;

  plus(a: number, b: number) {
    return this.history = a + b;
  }

  mult(a: number, b: number) {
    return this.history = a * b;
  }
}

test('test lazy class', () => {
  const lazyA = lazy<IA>(IA, A);
  const a = new A();
  expect(root.current.getSingleton(IA)).toBeUndefined();
  expect(lazyA.plus(1, 2)).toEqual(a.plus(1, 2));
  expect(root.current.getSingleton(IA)).not.toBeUndefined();
  expect(lazyA.mult(80, 9)).toEqual(a.mult(80, 9));
  expect(root.current.getSingleton<IA>(IA).history).toBe(80 * 9);
})

const IB = Symbol('IB');
interface IB {
  sayHi(): string;
}
class B {
  sayHi() {
    return 'hello';
  }
};

test('test immediate class', () => {
  immediate(IB, B);
  expect(root.current.getSingleton(IB)).not.toBeUndefined();
  expect(root.current.getSingleton<IB>(IB).sayHi()).toBe('hello');
})

const IC = Symbol('IC');
interface IC {
  sayHi(): string;
}
class C {
  static count = 0;
  constructor() {
    C.count += 1;
  }
  sayHi() {
    return 'hello';
  }
}

const ID = Symbol('ID');
interface ID {
  c: IC;
  sayC(): string;
}
class D {
  constructor(public c: IC) {}
  sayC() {
    return this.c.sayHi();
  }
}

const IE = Symbol('IE');
interface IE {
  c: IC;
  d: ID;
}
class E {
  constructor(public c: IC, public d: ID) {}
}

test('test di', () => {
  const c = lazy<IC>(IC, C);
  const d = lazy<ID>(ID, D, [IC]);
  const e = lazy<IE>(IE, E, [IC, ID]);
  expect(c.sayHi()).toEqual(d.sayC());
  expect(c.sayHi()).toEqual(d.c.sayHi());
  expect(e.c.sayHi()).toEqual(e.d.sayC());
  expect(e.c.sayHi()).toEqual(e.d.c.sayHi());
  expect(C.count).toBe(1);
})

const IF = Symbol('IF')
interface IF {
  c: IC;
}
class ClassF {
  c!: IC;
}
function F(c: IC) {
  const f = new ClassF();
  f.c = c;
  return f;
}

test('test function ctor', () => {
  const f = lazy<IF>(IF, F, [IC]);
  expect(f.c.sayHi()).toBe('hello');
})
