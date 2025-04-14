import { assertEquals } from '@std/assert/equals';
import { createStore } from '../src/store.ts';
import { createEvent, initializeSimulation, runSimulation, scheduleEvent } from "../src/simulation-p.ts";
import { PromiseProcess } from "../src/model.ts";


Deno.test('store should store', () => {
  const store = createStore<string>();

  const p1 = store.get();
  const p2 = store.put('foo');
  const p3 = store.put('bar');
  const p4 = store.get();
  
  Promise.allSettled([p1, p2, p3, p4]).then(([r1, r2, r3, r4]) => {
    assertEquals((r1 as PromiseFulfilledResult<string>).value, 'foo');
    assertEquals((r2 as PromiseFulfilledResult<string>).value, 'foo');
    assertEquals((r3 as PromiseFulfilledResult<string>).value, 'bar');
    assertEquals((r4 as PromiseFulfilledResult<string>).value, 'bar');
  });
});

Deno.test('Store should simulate', () => {
  const sim = initializeSimulation<string>();
  const store = createStore<string>();
  const result: Record<string, string> = {};

  const prod: PromiseProcess<string> = (_sim, _event) => {
    const item = "foobar";
    return store.put(item);
  };
  const cons: PromiseProcess<string> = async (_sim, event) => {
    const item = await store.get();

    if (item) {
      result[event.id] = item;
    }
    return Promise.resolve(item);
  };

  const e1 = createEvent(sim, 0, prod);
  sim.events = scheduleEvent(sim, e1);
  const e2 = createEvent(sim, 0, cons);
  sim.events = scheduleEvent(sim, e2);

  const e3 = createEvent(sim, 10, prod);
  sim.events = scheduleEvent(sim, e3);
  const e4 = createEvent(sim, 20, cons);
  sim.events = scheduleEvent(sim, e4);

  const e5 = createEvent(sim, 21, prod);
  sim.events = scheduleEvent(sim, e5);
  const e6 = createEvent(sim, 22, prod);
  sim.events = scheduleEvent(sim, e6);
  const e7 = createEvent(sim, 23, cons);
  sim.events = scheduleEvent(sim, e7);
  const e8 = createEvent(sim, 24, cons);
  sim.events = scheduleEvent(sim, e8);

  const e9 = createEvent(sim, 30, cons);
  sim.events = scheduleEvent(sim, e9);
  const e10 = createEvent(sim, 40, prod);
  sim.events = scheduleEvent(sim, e10);

  const e11 = createEvent(sim, 45, cons);
  sim.events = scheduleEvent(sim, e11);
  const e12 = createEvent(sim, 45, prod);
  sim.events = scheduleEvent(sim, e12);

  const e13 = createEvent(sim, 50, cons);
  sim.events = scheduleEvent(sim, e13);
  const e14 = createEvent(sim, 55, cons);
  sim.events = scheduleEvent(sim, e14);
  const e15 = createEvent(sim, 60, cons);
  sim.events = scheduleEvent(sim, e15);
  const e16 = createEvent(sim, 70, prod);
  sim.events = scheduleEvent(sim, e16);
  runSimulation(sim).then(_stats => {

    assertEquals(result[e2.id], "foobar");
    assertEquals(result[e4.id], "foobar");
    assertEquals(result[e7.id], "foobar");
    assertEquals(result[e8.id], "foobar");
    assertEquals(result[e9.id], "foobar");
    assertEquals(result[e13.id], "foobar");
    assertEquals(result[e14.id], undefined);
    assertEquals(result[e15.id], undefined);

  });
});

Deno.test('Store and timeout', () => {
  const sim = initializeSimulation<string>();
  const store = createStore<string>();
  const result: Record<string, string> = {};

  const prod: PromiseProcess<string> = (_sim, _event) => {
    const item = "foobar";
    return store.put(item);
  };
  const cons: PromiseProcess<string> = async (_sim, event) => {
    const item = await store.get();

    if (item) {
      result[event.id] = item;
    }
    return Promise.resolve(item);
  };
  const delayedCons: PromiseProcess<string> = async (_sim, event) => {
    console.log('callback before timeout');
    await 
  };

  const e1 = createEvent(sim, 0, (_sim, _event) => store.put('foobar'));
  scheduleEvent(sim, e1);

  // delayed, will miss value
  const e2 = createEvent(sim, 0, async (_sim, _event) => {});


});