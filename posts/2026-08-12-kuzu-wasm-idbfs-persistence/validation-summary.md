# Validation Summary: Kuzu-Wasm Database Vanishes on Refresh: Persisting IDBFS and Synchronizing the Filesystem

## Status
validated

## Post Type
Technical troubleshooting guide and implementation tutorial

## Technologies Covered

- Kuzu and `kuzu-wasm` 0.11.3
- WebAssembly and Emscripten virtual filesystems
- MEMFS, IDBFS, IndexedDB, and `FS.syncfs()`
- JavaScript promises and Web Workers
- Kuzu Cypher, catalog inspection, transactions, and lifecycle APIs
- Browser storage quotas, persistence, origins, and page lifecycle events
- BroadcastChannel and the Web Locks API
- LadybugDB and OPFS

## Sources Consulted

- [Kuzu v0.11.3 release](https://github.com/kuzudb/kuzu/releases/tag/v0.11.3)
- [Kuzu-Wasm documentation](https://kuzudb.github.io/docs/client-apis/wasm/)
- [Kuzu-Wasm asynchronous API documentation](https://kuzudb.github.io/api-docs/wasm/async/)
- [Kuzu-Wasm `Database` API](https://kuzudb.github.io/api-docs/wasm/async/Database.html)
- [Kuzu-Wasm `FS` API](https://kuzudb.github.io/api-docs/wasm/async/FS.html)
- [Kuzu-Wasm `QueryResult` API](https://kuzudb.github.io/api-docs/wasm/async/QueryResult.html)
- [Persistent browser example in the Kuzu v0.11.3 source tree](https://github.com/kuzudb/kuzu/blob/v0.11.3/tools/wasm/examples/browser_persistent/public/index.html)
- [Persistent example package manifest](https://github.com/kuzudb/kuzu/blob/v0.11.3/tools/wasm/examples/browser_persistent/package.json) and [lockfile](https://github.com/kuzudb/kuzu/blob/v0.11.3/tools/wasm/examples/browser_persistent/package-lock.json)
- [Kuzu-Wasm asynchronous filesystem wrapper](https://github.com/kuzudb/kuzu/blob/v0.11.3/tools/wasm/src_js/fs.js), [database wrapper](https://github.com/kuzudb/kuzu/blob/v0.11.3/tools/wasm/src_js/database.js), and [connection wrapper](https://github.com/kuzudb/kuzu/blob/v0.11.3/tools/wasm/src_js/connection.js)
- [Kuzu v0.11.3 native database initialization](https://github.com/kuzudb/kuzu/blob/v0.11.3/src/main/database.cpp) and [`show_tables` implementation](https://github.com/kuzudb/kuzu/blob/v0.11.3/src/function/table/show_tables.cpp)
- [Kuzu-Wasm v0.11.3 build configuration](https://github.com/kuzudb/kuzu/blob/v0.11.3/CMakeLists.txt)
- [Kuzu transactions](https://kuzudb.github.io/docs/cypher/transaction/) and [connections and concurrency](https://kuzudb.github.io/docs/concurrency/)
- [Emscripten File System API, including MEMFS, IDBFS, and `syncfs`](https://emscripten.org/docs/api_reference/Filesystem-API.html)
- [Emscripten IDBFS implementation](https://github.com/emscripten-core/emscripten/blob/main/src/lib/libidbfs.js) and [filesystem synchronization implementation](https://github.com/emscripten-core/emscripten/blob/main/src/lib/libfs.js)
- [npm registry metadata for `kuzu-wasm` 0.11.3](https://registry.npmjs.org/kuzu-wasm/0.11.3)
- [MDN same-origin policy](https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Same-origin_policy), [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API), and [storage quotas and eviction](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)
- [MDN `StorageManager.persist()`](https://developer.mozilla.org/en-US/docs/Web/API/StorageManager/persist) and [`StorageManager.estimate()`](https://developer.mozilla.org/en-US/docs/Web/API/StorageManager/estimate)
- [MDN `pagehide`](https://developer.mozilla.org/en-US/docs/Web/API/Window/pagehide_event), [`beforeunload`](https://developer.mozilla.org/en-US/docs/Web/API/Window/beforeunload_event), and [`unload`](https://developer.mozilla.org/en-US/docs/Web/API/Window/unload_event)
- [MDN Broadcast Channel API](https://developer.mozilla.org/en-US/docs/Web/API/Broadcast_Channel_API) and [Web Locks API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Locks_API)
- [Current LadybugDB persistent browser example using OPFS](https://github.com/LadybugDB/ladybug-wasm/blob/aa726993fd95b0cbe6e080a76d94e689a7044950/examples/browser_persistent/public/index.html)

## Issues Found

- The post passed the mounted `/database` directory directly to `new kuzu.Database()`. The example retained in Kuzu's v0.11.3 source tree does this, but its lockfile resolves `kuzu-wasm` 0.8.0. Published `kuzu-wasm` 0.11.3 rejects a directory as a database path. The code now uses `/database/app.kuzu`, a database file inside the IDBFS mount, and the version mismatch is documented.
- The unsafe startup example claimed that `new kuzu.Database()` immediately races with an unawaited populate. In 0.11.3, `Database` and `Connection` constructors initialize lazily. The example now calls `await db.init()` after the unawaited `syncfs(true)`, accurately demonstrating the race, and the diagnostic checklist now identifies `db.init()` or the first connection operation as the point that must wait.
- The post said an empty write-direction synchronization could merely overwrite or obscure persisted state. Emscripten's IDBFS reconciliation can delete destination-only IndexedDB entries. The explanation now states that `syncfs(false)` from an empty in-memory tree can delete the persisted files.
- The post generalized synchronous filesystem expectations to WebAssembly itself. WebAssembly does not define a filesystem. The wording now attributes the common synchronous-I/O expectation to applications compiled with Emscripten and identifies IndexedDB as the asynchronous persistence layer in this scenario.
- The archive and asset wording was imprecise. Kuzu's source repository is archived, while npm marks `kuzu-wasm` 0.11.3 deprecated. The post now uses those exact statuses and explains that the main module and worker must match in both version and variant. It also notes that the 0.11.3 browser worker bundle embeds the Wasm binary, so there is no separate browser `.wasm` asset to mix and match.
- The `localStorage` drift explanation listed an origin change even though both `localStorage` and IndexedDB are origin-scoped. That example was removed; independently clearing one store or failing a sync remains a valid cause of drift.
- The automated-test wording could be read as creating an isolated browser context, which would not share the same origin storage. It now specifies loading the same origin in a fresh page while preserving the browser profile.
- The conclusion described refresh itself as a durability boundary, conflicting with the correct warning that unload-time asynchronous work is unreliable. It now describes an explicit completed save followed by refresh as the durability test.

## Review Notes

- The corrected persistence sequence was exercised in Chromium against the published `kuzu-wasm` 0.11.3 package. Creating data, closing results/connection/database, awaiting `syncfs(false)`, reloading, awaiting `syncfs(true)`, reopening, and querying the persisted data all succeeded.
- The catalog/schema snippet was also executed against the published 0.11.3 runtime. `CALL show_tables() RETURN name` returned objects keyed by `name`, and the `CREATE NODE TABLE Note(id STRING PRIMARY KEY, body STRING)` statement succeeded.
- The Kuzu repository and package are no longer maintained. The post is therefore intentionally version-specific, and production users should retain the pinned package assets or evaluate a maintained successor.
- LadybugDB's rendered Wasm documentation still mentions IDBFS, but the current persistent example source mounts OPFS. The post's cautious statement about the successor moving its example toward OPFS is accurate as of the validation date.
