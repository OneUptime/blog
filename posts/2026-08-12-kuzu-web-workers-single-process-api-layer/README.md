# Use Kuzu with Multiple Web Workers Safely

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kuzu, Web Workers, WebAssembly, Concurrency, API Design

Description: Keep browser Kuzu writes safe by owning one Database in one runtime and routing UI and worker requests through a typed message API.

---

Do not create a read-write Kuzu `Database` in every Web Worker and point all of them at the same persistent graph. Each Worker has its own JavaScript and WebAssembly runtime, so each instance has independent Kuzu storage, buffer, and transaction managers. That violates Kuzu's core concurrency rule: one database path can have one `READ_WRITE` `Database` object, or multiple `READ_ONLY` objects, but not a writer alongside another independent object.

The safe browser design is one owner and many clients. Let one Kuzu-Wasm runtime create the database and its connections. UI code and application Workers send typed requests to that owner, which executes queries and returns plain structured-cloneable data.

## A Web Worker Is Not a Kuzu Connection

These concepts are easy to conflate:

- A **Web Worker** is an isolated JavaScript execution context.
- A **Kuzu `Database`** owns engine-wide storage, cache, and transaction state.
- A **Kuzu `Connection`** is created from a database object and submits transactions through that shared engine.
- A **multithreaded Wasm build** allows one engine to use Wasm threads; it does not authorize multiple engine instances to write one file.
- The **async Kuzu-Wasm package** already dispatches calls to its own Worker so queries do not block the browser's main thread.

Kuzu explicitly supports multiple connections from the same read-write database object. Its documented concurrency model does not safely support separate database objects when one can write. The architecture should preserve that distinction across the browser boundary.

## Why “One Worker per Request” Fails

This shape is unsafe for a shared persistent database:

~~~javascript
// Do not repeat this in several independent Workers for the same path.
import kuzu from "kuzu-wasm";

await kuzu.FS.mkdir("/database");
await kuzu.FS.mountIdbfs("/database");
await kuzu.FS.syncfs(true);

const db = new kuzu.Database("/database/graph.kuzu");
const conn = new kuzu.Connection(db);
~~~

Even if every Worker uses the same string, each runtime has its own virtual filesystem view of the `/database` mount. With persistent IDBFS, independent runtimes can also load and flush snapshots without one shared Kuzu transaction manager. Browser storage coordination is not a substitute for database cache coherence.

Across native processes on a filesystem that honors its locks, Kuzu normally rejects a conflicting owner. Kuzu-Wasm's Emscripten filesystem does not coordinate that lock across independent browser runtimes, so a second owner may open successfully without being safe. Do not treat a successful open as proof of exclusive ownership.

## Prefer the Built-In Async Worker

For a typical single-page application, import the default async Kuzu-Wasm variant on the main thread. Official Kuzu documentation says this variant sends module calls to a Worker and returns Promises, specifically to avoid blocking the UI.

Configure its worker script before any other module call:

~~~javascript
import kuzu from "kuzu-wasm";

kuzu.setWorkerPath("/vendor/kuzu_wasm_worker.js");

const databaseReady = (async () => {
  const db = new kuzu.Database(":memory:");
  await db.init();

  const conn = new kuzu.Connection(db);
  await conn.init();

  return { db, conn };
})();
~~~

The file name and deployed URL must match the worker artifact copied from the pinned `kuzu-wasm` package. Kuzu says `setWorkerPath` must run before initialization starts and cannot be changed afterward.

This arrangement already gives the UI a nonblocking query interface. Adding a second layer of Workers around each query adds serialization and creates ownership confusion without making the database safer.

## Expose Operations, Not Arbitrary Cypher

Build a narrow broker around the single owner. Its public operations describe application intent and bind values as parameters:

~~~javascript
const operations = {
  async getUser({ id }) {
    const { conn } = await databaseReady;
    const prepared = await conn.prepare(
      "MATCH (u:User) WHERE u.id = $id RETURN u.id, u.name"
    );
    try {
      const result = await conn.execute(prepared, { id });
      try {
        return await result.getAllObjects();
      } finally {
        await result.close();
      }
    } finally {
      await prepared.close();
    }
  },

  async renameUser({ id, name }) {
    const { conn } = await databaseReady;
    const prepared = await conn.prepare(
      "MATCH (u:User) WHERE u.id = $id SET u.name = $name RETURN u.id"
    );
    try {
      const result = await conn.execute(prepared, { id, name });
      try {
        return await result.getAllObjects();
      } finally {
        await result.close();
      }
    } finally {
      await prepared.close();
    }
  },
};

export async function handleDatabaseRequest(message) {
  if (
    message === null ||
    typeof message !== "object" ||
    !Object.hasOwn(operations, message.operation)
  ) {
    throw new Error("Unknown database operation");
  }
  return operations[message.operation](message.arguments);
}
~~~

Check the exact prepared-statement/result method signatures in the pinned Kuzu-Wasm API and test this adapter; the architectural contract is more important than exposing Kuzu objects. Never send a `Database`, `Connection`, prepared statement, or query result through `postMessage`. Return arrays, objects, strings, numbers, and other cloneable values.

An operation allowlist also prevents a compromised component from submitting `INSTALL`, `LOAD`, `COPY FROM`, schema changes, or arbitrary file paths.

## Route Requests from Application Workers

When other Workers perform parsing, layout, or analytics, let the main broker forward their database requests. Give every request an ID and return exactly one response:

~~~javascript
// Main-thread router
applicationWorker.addEventListener("message", async (event) => {
  const request = event.data;
  if (
    request === null ||
    typeof request !== "object" ||
    request.type !== "database-request"
  ) {
    return;
  }

  try {
    const value = await handleDatabaseRequest(request);
    applicationWorker.postMessage({
      type: "database-response",
      requestId: request.requestId,
      ok: true,
      value,
    });
  } catch (error) {
    applicationWorker.postMessage({
      type: "database-response",
      requestId: request.requestId,
      ok: false,
      error: String(error),
    });
  }
});
~~~

~~~javascript
// Application Worker
postMessage({
  type: "database-request",
  requestId: crypto.randomUUID(),
  operation: "getUser",
  arguments: { id: "user-42" },
});
~~~

For several application Workers, register each with the same broker or attach `MessagePort` objects. Keep authorization context in the request envelope, but decide permissions in the owner; a client-provided role is not trusted merely because it arrived through `postMessage`.

## Control Concurrency at the Owner

At the engine level, one owner does not mean one connection. Kuzu permits multiple connections created from the same database object, and the engine transaction manager coordinates them. It permits multiple read transactions but only one write transaction at a time.

In Kuzu-Wasm 0.11.3, however, the async facade funnels calls through one Worker whose handlers invoke the synchronous Wasm bindings. Multiple outstanding Promises, even on different `Connection` objects, therefore do not guarantee overlapping query execution. The multithreaded build can use threads within a query, but it does not change this top-level dispatch behavior.

Start conservatively:

- one connection for schema/setup work;
- one connection for normal operations initially, adding a small fixed pool only if the selected Wasm API and measured workload benefit;
- bounded request queues;
- a trusted, fixed timeout configured on each connection with `CALL TIMEOUT=3000` (and the returned result closed), plus broker-level cancellation for work that has not started; the documented `conn.setQueryTimeout(...)` wrapper is broken in 0.11.3 because its JavaScript method name does not match the Wasm binding;
- short write transactions;
- backpressure instead of unbounded pending Promises.

Serializing writes in the broker can make order and persistence easier to reason about, even though Kuzu's transaction manager already enforces one active writer. A broker queue also provides backpressure and predictable dispatch order.

Do not create a second `Database` to obtain another connection. Every connection must descend from the one owner.

## Multithreaded Wasm Still Has One Owner

Kuzu-Wasm 0.11.3 ships default, multithreaded, and Node.js variants, each with async and sync forms. The browser multithreaded build requires cross-origin isolation. It can improve engine parallelism within a query, but it still represents one module variant and one database owner.

Kuzu warns that objects cannot be mixed across variants or async/sync versions. A database made by `kuzu-wasm` cannot be passed to `kuzu-wasm/multithreaded`, and an async object cannot be passed to a sync API. Pick a variant at build time, test it, and keep its object graph internal to the owner.

Cross-origin isolation headers are a deployment requirement, not a query toggle. Confirm them in the browser before selecting the multithreaded package.

## Persistence Needs the Same Single Owner

The persistent browser example in the Kuzu v0.11.3 source tree still pins `kuzu-wasm` 0.8.0. It mounts IDBFS and calls `syncfs(true)` before reopening an existing database; after writes, it closes the connection and database, calls `syncfs(false)`, and then unmounts the filesystem. In Kuzu-Wasm 0.11.3, which uses the single-file database format, open a file under the mount point such as `/database/graph.kuzu`, not the mount directory itself. Centralize those lifecycle actions with the database owner.

Do not let each client Worker mount, populate, or flush the same IDBFS directory. The owner should expose explicit readiness and shutdown/persist states:

~~~text
UNINITIALIZED -> LOADING -> READY -> DRAINING -> CLOSED
~~~

Reject queries before `READY`; stop accepting new writes in `DRAINING`; close results, connections, and the database before the documented final sync/unmount sequence. Handle initialization failure as a visible application state rather than silently creating a second empty graph.

## Multiple Tabs Require a Stronger Boundary

Each browser tab has its own main thread and normally its own Workers. “One owner per tab” is not one owner for a shared IndexedDB-backed graph. If multiple tabs must write, use a genuinely shared coordinator whose lifecycle you control, or move writes to one server-side API process. A `BroadcastChannel` can announce ownership but does not itself provide crash-safe database locking or transactions.

The simplest safe product policy is often one writable tab with other tabs disabled. If read-only tabs use snapshots, give them immutable, separately named copies that never flush back to the writer's IDBFS store. Test tab crashes, reloads, and browser eviction before promising durable multi-tab behavior.

## Official Documentation

- [Kuzu-Wasm variants and async Worker behavior](https://kuzudb.github.io/docs/client-apis/wasm/)
- [Persistent browser example in the Kuzu v0.11.3 source tree (pins Kuzu-Wasm 0.8.0)](https://github.com/kuzudb/kuzu/tree/v0.11.3/tools/wasm/examples/browser_persistent)
- [In-memory browser example in the Kuzu v0.11.3 source tree (pins Kuzu-Wasm 0.8.0)](https://github.com/kuzudb/kuzu/tree/v0.11.3/tools/wasm/examples/browser_in_memory)
- [Kuzu connections and concurrency](https://kuzudb.github.io/docs/concurrency/)
- [Kuzu transactions](https://kuzudb.github.io/docs/cypher/transaction/)
- [Kuzu-Wasm asynchronous API](https://kuzudb.github.io/api-docs/wasm/async/)
- [Kuzu configuration and query timeouts](https://kuzudb.github.io/docs/cypher/configuration/)
- [Kuzu archived repository](https://github.com/kuzudb/kuzu)

## Conclusion

Multiple Web Workers may request graph work, but they should not each own a writer for the same Kuzu database. Create one Kuzu-Wasm database, keep all connections under it, and expose a typed message API that returns plain data. Built-in async Workers and multithreaded Wasm improve responsiveness or parallelism without changing the single-owner rule.
