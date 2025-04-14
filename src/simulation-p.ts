import {
  PromiseEvent,
  EventState,
  PromiseProcess,
  PromiseProcessStep,
  Simulation,
  SimulationStats,
} from "./model.ts";

/**
 * Initializes a new simulation instance with:
 * - currentTime set to 0 (starting point of simulation)
 * - Empty events array (no scheduled events)
 */
export function initializeSimulation<T = unknown>(): Simulation<PromiseEvent<T>> {
  let terminate;
  const termination = new Promise<SimulationStats>(t => {
    terminate = t;
  });
  if (!terminate) throw new Error('No termination function');
  return {
    currentTime: 0,
    events: [],
    terminate,
    termination
  };
}

let lastId = 0;
/** 
 * Generates a unique ID 
 */
function generateId() {
  // return crypto.randomUUID();
  return ++lastId + '';
}

/**
 * Creates a new event with:
 * - Unique ID
 * - Initial state set to "Fired"
 * - Timestamps for when it was created and scheduled
 * - Optional callback process (defaults to empty promise)
 * - Optional item to carry (defaults to undefined)
 */
export function createEvent<T>(
  sim: Simulation<PromiseEvent<T>>,
  scheduledAt: number,
  callback?: PromiseProcess<T>,
  item?: T,
): PromiseEvent<T> {
  return {
    id: generateId(),
    status: EventState.Fired,
    firedAt: sim.currentTime,
    scheduledAt,
    callback: callback ?? Promise.resolve,
    item,
  };
}

/**
 * Schedules an event for future processing in the simulation.
 * Validates that the event isn't scheduled in the past.
 * Returns updated events array with the new scheduled event.
 */
export function scheduleEvent<T>(
  sim: Simulation<PromiseEvent<T>>,
  event: PromiseEvent<T>,
): PromiseEvent<T>[] {
  if (event.scheduledAt < sim.currentTime) {
    throw RangeError(
      `Event scheduled at a point in time in the past: ${event.id} ` +
        `(scheduled at: ${event.scheduledAt}; current time: ${sim.currentTime})`,
    );
  }

  return [
    ...sim.events,
    { ...event, status: EventState.Scheduled } as PromiseEvent<T>,
  ].sort((a, b) => b.scheduledAt - a.scheduledAt);
}

/**
 * Runs the discrete-event simulation until no more events remain to process.
 * The simulation processes events in chronological order (earliest first).
 * Returns statistics about the simulation run.
 */
export function runSimulation<T = unknown>(sim: Simulation<PromiseEvent<T>>): Promise<SimulationStats> {
  const eventPromises = [];
  const start = performance.now();
  while (true) {
    // Get all scheduled events that haven't been processed yet,
    // so we can efficiently pop the earliest event
    const eventsTodo = sim.events.filter((event) =>
      (event.scheduledAt >= sim.currentTime) &&
      (event.status === EventState.Scheduled)
    );

    const event = eventsTodo.pop();

    if (!event) {
      break; // No more events to process
    }

    // Advance simulation time to this event's scheduled time
    sim.currentTime = event.scheduledAt;

    event.status = EventState.Pending;
    // Process the event and get its final state
    eventPromises.push(handleEvent(sim, event, sim.termination).then(newEvent => {
      sim.events = sim.events.map(existingEvent => existingEvent.id === newEvent.id ? newEvent : existingEvent);
    }));
  }

  const end = performance.now();

  sim.terminate({
    duration: end - start, // Return real-world time taken for simulation
  });
  return Promise.allSettled(eventPromises).then(() => sim.termination);
}

/**
 * Processes an event by executing its generator function.
 * Handles both immediate completion and yielding of new events.
 * Returns the completed event with updated status and timestamps.
 */
export function handleEvent<T>(sim: Simulation<PromiseEvent<T>>, event: PromiseEvent<T>, simulationProcess: Promise<SimulationStats>): Promise<PromiseEvent<T>> {
  return Promise.race([
    simulationProcess.then(() => ({
      ...event,
      finishedAt: sim.currentTime,
      status: EventState.Terminated,
    })),
    event.callback(sim, event).then(item => ({
      ...event,
      item,
      finishedAt: sim.currentTime,
      status: EventState.Completed,
    }))
  ]);
}

// /**
//  * Generator function that creates and schedules a timeout event.
//  * This is a utility for creating delayed events in the simulation.
//  * Yields control until the timeout duration has passed.
//  */
// export function timeout<T>(
//   sim: Simulation<PromiseEvent<T>>,
//   duration: number,
//   callback?: PromiseProcess<T>,
//   item?: T,
// ): PromiseProcessStep<T> {
//   // Fire an event that will be scheduled after specified duration
//   const timeoutEvent = createEvent<T>(
//     sim,
//     sim.currentTime + duration,
//     callback,
//     item,
//   );

//   // Schedule the timeout event
//   sim.events = scheduleEvent(sim, timeoutEvent);

//   // Yield control (allowing other code to run until timeout completes)
//   return Promise.resolve({ value: timeoutEvent, done: true });
// }

export function timeout<T>(
  sim: Simulation<PromiseEvent<T>>,
  duration: number,
  callback?: PromiseProcess<T>,
  item?: T,
): {

}