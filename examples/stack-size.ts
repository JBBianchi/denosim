import { Process } from "../src/model.ts";
import {
  createEvent,
  initializeSimulation,
  runSimulation,
  scheduleEvent,
  timeout,
} from "../src/simulation.ts";

if (import.meta.main) {
  let sim = initializeSimulation();

  let FOO = 0;

  const foo: Process = function* (sim, event) {
    let newSim, newEvent;
    if (sim.currentTime < 10000000) {
      console.log(`[${sim.currentTime}] ${event.id} -- foo @ wake up: ${FOO}`);
      FOO += 1;
      [newSim, newEvent] = yield* timeout(sim, 1);
    } else {
      return yield;
    }
    return [newSim || sim, newEvent || event];
  };

  const e1 = createEvent(sim, 0, foo);
  sim = scheduleEvent(sim, e1);

  const [stop, stats] = runSimulation(sim);

  console.log(`Simulation ended at ${stop.currentTime}`);
  console.log(`Simulation took: ${stats.duration} ms`);
}
