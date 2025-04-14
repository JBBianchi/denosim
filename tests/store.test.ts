import { assertEquals } from '@std/assert/equals';
import { createStore } from '../src/store.ts';


Deno.test('store should store', async () => {
  const store = createStore<string>();

  const p1 = await store.get();
  const p2 = await store.put('foo');
  const p3 = await store.put('bar');
  const p4 = await store.get();
  
  assertEquals(p1, 'foo');
  assertEquals(p2, 'foo');
  assertEquals(p3, 'bar');
  assertEquals(p4, 'bar');
});