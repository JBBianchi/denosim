/**
 * Core simulation container that maintains:
 * - The current virtual time of the simulation
 * - All events that have been scheduled
 */
export interface Simulation<TEvent = Event<unknown>> {
  /**
   * The current virtual time in the simulation.
   * Represents the timestamp up to which the simulation has processed.
   * Measured in arbitrary time units (could be steps, seconds, etc.)
   */
  currentTime: number;

  /**
   * Queue of all events in the system.
   * Includes:
   * - Newly scheduled but not yet processed events
   * - Partially processed events with generator state
   * - Completed events (for historical tracking)
   */
  events: TEvent[];
  terminate: (value: SimulationStats | PromiseLike<SimulationStats>) => void;
  termination: Promise<SimulationStats>
}

/**
 * Lifecycle states for events within the simulation.
 * Follows a strict progression: Fired → Scheduled → Finished
 */
export enum EventState {
  /**
   * Initial state when event is first created.
   * Indicates the event has been instantiated but not yet scheduled.
   */
  Fired = "Fired",

  /**
   * Event has been scheduled for future processing.
   * Will be executed when simulation time reaches scheduledAt.
   */
  Scheduled = "Scheduled",
  Pending = "Pending",

  /**
   * Final state indicating the event has been fully processed.
   * Events in this state remain in the system for historical tracking.
   */
  Completed = "Completed",
  Terminated = "Terminated",
}

/**
 * Holds the state of the ongoing process for an event.
 * Can yield an event for execution continuation.
 */
export type ProcessStep<T = void> = Generator<
  Event<T> | undefined,
  void,
  void
>;

/**
 * Holds the state of the ongoing process for an event.
 * Can yield an event for execution continuation.
 */
export type PromiseProcessStep<T = void> = Promise<T>;

/**
 * Type definition for event process logic.
 * Generator function that defines an event's behavior.
 * Can yield to pause execution and schedule intermediate events.
 */
export type Process<T = void> = (
  sim: Simulation<Event<T>>, // Reference to the running simulation
  event: Event<T>, // The event instance being processed
) => ProcessStep<T>; // Generator that can yield events or nothing

export type PromiseProcess<T = void> = (
  sim: Simulation<PromiseEvent<T>>, // Reference to the running simulation
  event: PromiseEvent<T>, // The event instance being processed
) => PromiseProcessStep<T>

/**
 * Represents a discrete event in the simulation system.
 * Events are immutable - state changes create new instances.
 */
export type Event<T = void> = {
  /** Unique identifier for the event */
  id: string;

  /** Current lifecycle state of the event */
  status: EventState;

  /**
   * When the event was initially created.
   * Represents the simulation time when createEvent() was called.
   */
  firedAt: number;

  /**
   * When the event should be processed.
   * Simulation time will jump directly to this value when processed.
   */
  scheduledAt: number;

  /**
   * When the event completed processing.
   * Only populated when status = EventState.Finished
   */
  finishedAt?: number;

  /**
   * Optional generator state for multi-step events.
   * Preserves execution context between partial processing runs.
   */
  generator?: ProcessStep<T>;

  /**
   * Optional item that can be passed through the event.
   */
  item?: T;

  /**
   * The process logic to execute when this event is processed.
   * Generator function that can yield to pause/resume execution.
   */
  callback: Process<T>;
}

export type PromiseEvent<T> = Omit<Event<T>, 'callback' | 'generator'> & {
  callback: PromiseProcess<T>;
  //generator?: PromiseProcessStep<T>;
}

/**
 * Statistics about a simulation run.
 * Currently tracks only duration, but could be extended with:
 * - Events processed count
 * - Average event latency
 * - Other performance metrics
 */
export interface SimulationStats {
  /** Real-world time (in milliseconds) the simulation took to complete */
  duration: number;
}

/**
 * Utility data structure for inter-process synchronization.
 */
export interface Store<T> {
  /** Unique identifier for the store */
  id: string;

  /**
   * Array of items immediately available in the store.
   * Put/Get operations (see resources.ts) work in a FIFO fashion.
   */
  items: T[];

  /**
   * Array of pending requests in the store.
   * Earliest requests will be handled first.
   */
  requests: Event<T>[];
}


/**
 * Utility data structure for inter-process synchronization.
 */
export interface PromiseStore<T> {
  /** Unique identifier for the store */
  id: string;

  /**
   * Array of items immediately available in the store.
   * Put/Get operations (see resources.ts) work in a FIFO fashion.
   */
  items: T[];

  /**
   * Array of pending requests in the store.
   * Earliest requests will be handled first.
   */
  requests: PromiseEvent<T>[];
}
