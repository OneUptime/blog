# Persist Kuzu-Wasm with IDBFS Across Refreshes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kuzu, WebAssembly, IDBFS, IndexedDB, Browser Storage, Persistence

Description: Persist Kuzu-Wasm safely across reloads by mounting IDBFS, populating it before opening the database, flushing after close, and serializing lifecycle operations.

---

A Kuzu-Wasm database disappears on refresh when it lives only in Emscripten's in-memory filesystem or when the application mounts IDBFS but never synchronizes the in-memory tree with IndexedDB. Mounting is only half the persistence protocol. On startup, call `syncfs(true)` before opening Kuzu to populate the virtual filesystem from IndexedDB. After writes, close the connection and database, then call `syncfs(false)` to persist the virtual files back to IndexedDB before unmounting.

That synchronization ordering appears in the `browser_persistent` example retained in Kuzu's v0.11.3 source tree and follows Emscripten's documented `populate` direction. It is not equivalent to putting an “initialized” flag in `localStorage`. The database files-not a flag-are the source of truth.

Kuzu's source repository is archived and `kuzu-wasm` 0.11.3 is deprecated on npm, so pin the exact package and preserve its matching main-module and worker-bundle assets. The maintained LadybugDB successor has since moved its current persistent browser example toward OPFS; that does not retroactively change Kuzu-Wasm's documented IDBFS lifecycle.

## Why the Default Filesystem Is Ephemeral

Applications compiled to WebAssembly with Emscripten commonly expect synchronous file operations. IndexedDB is asynchronous, so Emscripten presents a virtual filesystem to the compiled database. Its default `MEMFS` files live in memory and disappear with the page or worker.

IDBFS bridges that virtual tree to IndexedDB. File reads and writes still affect the in-memory view first. `syncfs` reconciles the two stores:

- `syncfs(true)` means **populate** the in-memory filesystem from persistent IndexedDB.
- `syncfs(false)` means **flush** the in-memory filesystem to persistent IndexedDB.

Calling `syncfs(false)` at startup with an empty in-memory tree can delete persisted files from IndexedDB. Initializing Kuzu before the populate completes can create what looks like a fresh database at the same path.

## The Correct Startup Order

Use one mounted directory and await every asynchronous step:

~~~javascript
import kuzu from "kuzu-wasm";

const MOUNT_PATH = "/database";
const DATABASE_PATH = `${MOUNT_PATH}/app.kuzu`;

async function openPersistentDatabase() {
  await kuzu.FS.mkdir(MOUNT_PATH);
  await kuzu.FS.mountIdbfs(MOUNT_PATH);

  // IndexedDB -> Emscripten's in-memory filesystem.
  await kuzu.FS.syncfs(true);

  // Open only after persisted files are visible in the virtual filesystem.
  const db = new kuzu.Database(DATABASE_PATH);
  const conn = new kuzu.Connection(db);
  return { db, conn };
}
~~~

The example in the v0.11.3 source tree uses the mounted `/database` directory itself as the database path, but its lockfile resolves `kuzu-wasm` 0.8.0. Published `kuzu-wasm` 0.11.3 rejects a directory as the database path, so use a file inside the mount, such as `/database/app.kuzu`. The virtual mount point is recreated on every page load, then populated from the IDBFS backend.

Do not do this:

~~~javascript
// Race: database initialization can begin before population finishes.
kuzu.FS.syncfs(true);
const db = new kuzu.Database(DATABASE_PATH);
await db.init();
~~~

Promises must be awaited. Also ensure initialization runs exactly once. React development effects, hot-module reload, two tabs, or two application components can otherwise mount or open the same logical database concurrently.

## Initialize Schema by Inspecting the Database

An `isFirstRun` value in `localStorage` can drift from IndexedDB. Users can clear one storage area or a previous sync can fail. Instead, open the populated database and inspect its catalog:

~~~javascript
async function ensureSchema(conn) {
  const result = await conn.query("CALL show_tables() RETURN name");
  const rows = await result.getAllObjects();
  await result.close();

  const names = new Set(rows.map((row) => row.name));
  if (!names.has("Note")) {
    const create = await conn.query(
      "CREATE NODE TABLE Note(id STRING PRIMARY KEY, body STRING)"
    );
    await create.close();
  }
}
~~~

Handle the actual column keys returned by the pinned API and query alias deliberately if needed. For multi-step migrations, store a schema-version node or table and apply idempotent version transitions. A boolean first-run flag cannot represent partial migration success.

## The Correct Persistence and Shutdown Order

The persistent example retained in Kuzu's tagged source tree closes query results, connection, and database before flushing IDBFS:

~~~javascript
async function closeAndPersist({ conn, db }) {
  await conn.close();
  await db.close();

  // Emscripten's in-memory filesystem -> IndexedDB.
  await kuzu.FS.syncfs(false);
  await kuzu.FS.unmount(MOUNT_PATH);
}
~~~

This creates a clean persistence boundary: Kuzu completes its transactional and file lifecycle first, then IDBFS copies the resulting files. Keep the UI in a “saving” state until the promise resolves. Report a sync failure; do not show “saved” merely because the Cypher mutation returned successfully.

Close every `QueryResult` when finished. The official example does so before closing its connection. It reduces retained Wasm resources and makes lifecycle bugs easier to reason about.

## Do Not Trust Page-Unload Events

Browsers may terminate a page without waiting for asynchronous work in `beforeunload`, `unload`, `pagehide`, a mobile background transition, or a crash. A design that flushes only during unload will eventually lose the latest changes.

Create explicit durable moments:

- After a user clicks Save.
- After a small transaction batch.
- Before navigation your application controls.
- On a bounded periodic checkpoint when the UI is idle.

The official shutdown sequence closes the database before sync. If the app must remain open for continuous editing, design a serialized save lifecycle that closes, flushes, and reopens, or validate a checkpoint-and-sync procedure specifically against Kuzu 0.11.3 and failure-test it. Do not call `syncfs` concurrently with active writes and assume the copied files form a consistent database.

For frequent writes, debounce saves so every keystroke does not copy the database tree. Display the distinction between “updated in memory” and “persisted locally.”

## Serialize All Filesystem Lifecycle Work

Two overlapping `syncfs` calls can race, as can query writes and unmount. A simple promise chain makes operations single-file:

~~~javascript
let lifecycle = Promise.resolve();

function serialize(operation) {
  const next = lifecycle.then(operation, operation);
  lifecycle = next.catch(() => {});
  return next;
}

await serialize(async () => {
  await conn.close();
  await db.close();
  await kuzu.FS.syncfs(false);
  await kuzu.FS.unmount(MOUNT_PATH);
});
~~~

In a larger application, put the Kuzu database, connection, mount state, and queue in one owner-usually the async Kuzu-Wasm worker boundary. Components should send requests to that owner rather than constructing their own `Database` objects.

Coordinate browser tabs too. IndexedDB is shared by same-origin pages, but Kuzu's embedded database lifecycle was not designed for independent writers copying separate in-memory filesystem snapshots to one backing store. Prefer one active writer, detect a second tab with `BroadcastChannel` or the Web Locks API, and give it read-only application behavior or block it. Test the chosen coordination mechanism in every supported browser.

## Origin, Privacy, and Quota Matter

IndexedDB storage is scoped to the web origin. These are different stores:

~~~text
http://localhost:3000
http://127.0.0.1:3000
https://app.example.com
https://staging.example.com
~~~

A hostname, scheme, or port change can make a database appear lost even though it remains under the old origin. Private browsing, user-cleared site data, storage eviction, browser policy, or quota exhaustion can genuinely remove or reject data.

Request persistent storage where appropriate and supported:

~~~javascript
if (navigator.storage?.persist) {
  const persistent = await navigator.storage.persist();
  console.info("Persistent storage granted:", persistent);
}

if (navigator.storage?.estimate) {
  const { usage, quota } = await navigator.storage.estimate();
  console.info({ usage, quota });
}
~~~

Persistence requests are not guaranteed. A browser-local database is not a backup. Offer export/sync to a durable user-controlled or server store when data matters.

Treat IndexedDB as sensitive local data. Tenant logout should follow an explicit retention policy. Encrypting application fields may be appropriate, but key storage and threat model need separate design; WebAssembly does not make browser storage secret from the user or a compromised origin.

## Diagnose “It Vanished” Systematically

1. Confirm the page origin is identical before and after refresh.
2. Verify the IDBFS directory was mounted before `syncfs(true)`.
3. Verify `syncfs(true)` completed before `db.init()` or the first connection operation.
4. Confirm the database file path is inside the mounted directory; with 0.11.3, do not use the directory itself as the database path.
5. Verify the last save awaited connection close, database close, and `syncfs(false)`.
6. Inspect rejected promises and IndexedDB/quota errors in developer tools.
7. Check whether two tabs or duplicate initializers opened the same store.
8. Remove `localStorage` first-run logic from the diagnosis and inspect catalog state.
9. Confirm the `kuzu-wasm` main module and worker bundle come from the same package version and variant. In the 0.11.3 browser build, the worker bundle contains the Wasm binary.

Build an automated persistence test: create a uniquely identified node, close and flush, then load the same origin in a fresh page while preserving the browser profile, populate IDBFS, reopen, and assert the node exists. Then simulate a failed sync and verify the UI does not claim durability.

## Official Documentation

- [Kuzu 0.11.3 release](https://github.com/kuzudb/kuzu/releases/tag/v0.11.3)
- [Kuzu-Wasm documentation](https://kuzudb.github.io/docs/client-apis/wasm/)
- [Persistent browser example retained in the Kuzu 0.11.3 source tree (`kuzu-wasm` 0.8.0)](https://github.com/kuzudb/kuzu/blob/v0.11.3/tools/wasm/examples/browser_persistent/public/index.html)
- [Kuzu 0.11.3 Wasm source and examples](https://github.com/kuzudb/kuzu/tree/v0.11.3/tools/wasm)
- [Emscripten IDBFS and `syncfs` reference](https://emscripten.org/docs/api_reference/Filesystem-API.html#fs-syncfs)
- [Kuzu transactions](https://kuzudb.github.io/docs/cypher/transaction/)
- [Kuzu connections and concurrency](https://kuzudb.github.io/docs/concurrency/)
- [LadybugDB current Wasm documentation](https://docs.ladybugdb.com/client-apis/wasm/)

## Conclusion

IDBFS persistence is a two-direction synchronization protocol. Mount the directory, await `syncfs(true)`, and only then open a Kuzu database file inside it. At a deliberate save boundary, finish queries, close the connection and database, await `syncfs(false)`, and unmount. Serialize the lifecycle, coordinate tabs, surface quota and sync failures, and test across a real reload. Once those rules are explicit, an explicit save followed by refresh stops being a gamble and becomes a verifiable durability test.
