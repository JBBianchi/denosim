type Request<T> = (value: T | PromiseLike<T>) => void;

type StoreState<T = unknown> = {
  id: string;
  items: T[];
  queue: Array<Request<T>>;
}

type StoreActions<T = unknown> = {
  put: (item: T) => Promise<T>;
  get: () => Promise<T>;
}

type Store<T = unknown> = /*StoreState<T> &*/ StoreActions<T>; // The state is internal... 

export function createStore<T>(initialItems: T[] = []): Store<T> {
  const state: StoreState<T> = {
    id: crypto.randomUUID(),
    items: initialItems,
    queue: [],
  };
  const actions: StoreActions<T> = {
    put: (item: T): Promise<T> => {
      const pendingRequest = state.queue.shift();
      if (pendingRequest) {
        pendingRequest(item);
      }
      else {
        state.items.push(item);
      }
      return Promise.resolve(item);
    },
    get: (): Promise<T> => {
      const pendingItem = state.items.shift();
      if (pendingItem) {
        return Promise.resolve(pendingItem);
      }
      return new Promise(resolve => {
        state.queue.push(resolve);
      });
    }
  };
  return {
    ...actions
  };
}
