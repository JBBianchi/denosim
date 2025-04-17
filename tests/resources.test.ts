import { assertEquals } from "@std/assert";
import { Process, Store } from "../src/model.ts";
import {
  createEvent,
  initializeSimulation,
  runSimulation,
  scheduleEvent,
} from "../src/simulation.ts";
import { createStore, get, put } from "../src/resources.ts";

Deno.test("basic store operations", () => {
  let sim = initializeSimulation();

  const store: Store<string> = createStore<string>();
  const result: Record<string, string | undefined> = {};

  const prod: Process<string> = function* (sim, event) {
    const item = "foobar";
    return yield* put(sim, event, store, item);
  };

  const cons: Process<string> = function* (sim, event) {
    const [newSim, newEvent] = yield* get(sim, event, store);
    result[event.id] = newEvent.item;

    return [newSim, newEvent];
  };

  const e1 = createEvent(sim, 0, prod);
  sim = scheduleEvent(sim, e1);
  const e2 = createEvent(sim, 0, cons);
  sim = scheduleEvent(sim, e2);

  const e3 = createEvent(sim, 10, prod);
  sim = scheduleEvent(sim, e3);
  const e4 = createEvent(sim, 20, cons);
  sim = scheduleEvent(sim, e4);

  const [_stop, _stats] = runSimulation(sim);

  assertEquals(result[e2.id], "foobar");
  assertEquals(result[e4.id], "foobar");
  assertEquals(store.getRequests.length, 0);
  assertEquals(store.putRequests.length, 0);
});

Deno.test("out-of-order store operations", () => {
  let sim = initializeSimulation();

  const store: Store<string> = createStore<string>();
  const result: Record<string, string | undefined> = {};

  const prod: Process<string> = function* (sim, event) {
    const item = "foobar";
    return yield* put(sim, event, store, item);
  };

  const cons: Process<string> = function* (sim, event) {
    const [newSim, newEvent] = yield* get(sim, event, store);
    result[event.id] = newEvent.item;

    return [newSim, newEvent];
  };

  const e1 = createEvent(sim, 30, cons);
  sim = scheduleEvent(sim, e1);
  const e2 = createEvent(sim, 40, prod);
  sim = scheduleEvent(sim, e2);

  const e3 = createEvent(sim, 50, cons);
  sim = scheduleEvent(sim, e3);
  const e4 = createEvent(sim, 50, prod);
  sim = scheduleEvent(sim, e4);

  const [_stop, _stats] = runSimulation(sim);

  assertEquals(result[e1.id], "foobar");
  assertEquals(result[e3.id], "foobar");
  assertEquals(store.getRequests.length, 0);
  assertEquals(store.putRequests.length, 0);
});

Deno.test("blocking/non-blocking put operations", () => {
  let sim = initializeSimulation();

  const store: Store<string> = createStore<string>();
  const result: Record<string, string | undefined> = {};
  const timings: Record<string, number> = {};

  const prodBlock: Process<string> = function* (sim, event) {
    const item = "foobar";
    const [newSim, newEvent] = yield* put(sim, event, store, item, true);
    timings[event.id] = newSim.currentTime;

    return [newSim, newEvent];
  };

  const prod: Process<string> = function* (sim, event) {
    const item = "foobar";
    const [newSim, newEvent] = yield* put(sim, event, store, item);
    timings[event.id] = newSim.currentTime;

    return [newSim, newEvent];
  };

  const cons: Process<string> = function* (sim, event) {
    const [newSim, newEvent] = yield* get(sim, event, store);
    result[event.id] = newEvent.item;
    timings[event.id] = newSim.currentTime;

    return [newSim, newEvent];
  };

  const e1 = createEvent(sim, 30, prodBlock);
  sim = scheduleEvent(sim, e1);
  const e2 = createEvent(sim, 40, cons);
  sim = scheduleEvent(sim, e2);

  const e3 = createEvent(sim, 50, prod);
  sim = scheduleEvent(sim, e3);
  const e4 = createEvent(sim, 60, cons);
  sim = scheduleEvent(sim, e4);

  const [_stop, _stats] = runSimulation(sim);

  assertEquals(result[e2.id], "foobar");
  assertEquals(timings[e1.id], 40);
  assertEquals(timings[e2.id], 40);
  assertEquals(timings[e3.id], 50);
  assertEquals(timings[e4.id], 60);
  assertEquals(store.getRequests.length, 0);
  assertEquals(store.putRequests.length, 0);
});

Deno.test("cons > prod: unbalanced store operations", () => {
  let sim = initializeSimulation();

  const store: Store<string> = createStore<string>();
  const result: Record<string, string | undefined> = {};

  const prod: Process<string> = function* (sim, event) {
    const item = "foobar";
    return yield* put(sim, event, store, item);
  };

  const cons: Process<string> = function* (sim, event) {
    const [newSim, newEvent] = yield* get(sim, event, store);
    result[event.id] = newEvent.item;

    return [newSim, newEvent];
  };

  const e1 = createEvent(sim, 50, cons);
  sim = scheduleEvent(sim, e1);
  const e2 = createEvent(sim, 55, cons);
  sim = scheduleEvent(sim, e2);
  const e3 = createEvent(sim, 60, cons);
  sim = scheduleEvent(sim, e3);
  const e4 = createEvent(sim, 70, prod);
  sim = scheduleEvent(sim, e4);

  const [_stop, _stats] = runSimulation(sim);

  assertEquals(result[e1.id], "foobar");
  assertEquals(result[e2.id], undefined);
  assertEquals(result[e3.id], undefined);
  assertEquals(store.getRequests.length, 2);
  assertEquals(store.putRequests.length, 0);
});

Deno.test("prod > cons: unbalanced store operations", () => {
  let sim = initializeSimulation();

  const store: Store<string> = createStore<string>();
  const result: Record<string, string | undefined> = {};

  const prod: Process<string> = function* (sim, event) {
    const item = "foobar";
    return yield* put(sim, event, store, item);
  };

  const cons: Process<string> = function* (sim, event) {
    const [newSim, newEvent] = yield* get(sim, event, store);
    result[event.id] = newEvent.item;

    return [newSim, newEvent];
  };

  const e1 = createEvent(sim, 50, prod);
  sim = scheduleEvent(sim, e1);
  const e2 = createEvent(sim, 55, prod);
  sim = scheduleEvent(sim, e2);
  const e3 = createEvent(sim, 60, prod);
  sim = scheduleEvent(sim, e3);
  const e4 = createEvent(sim, 70, cons);
  sim = scheduleEvent(sim, e4);

  const [_stop, _stats] = runSimulation(sim);

  assertEquals(result[e4.id], "foobar");
  assertEquals(store.getRequests.length, 0);
  assertEquals(store.putRequests.length, 2);
});
