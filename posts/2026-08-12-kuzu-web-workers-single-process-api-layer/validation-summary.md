# Validation Summary: Use Kuzu with Multiple Web Workers Safely

## Status

validated

## Post Type

Technical architecture guide

## Technologies Covered

- Kuzu and Kuzu-Wasm 0.11.3
- JavaScript
- Web Workers and `postMessage`
- WebAssembly and Emscripten
- IndexedDB-backed IDBFS persistence
- Database connections, transactions, and concurrency
- Cross-origin isolation and multithreaded Wasm
- Browser API-layer and request-broker design

## Sources Consulted

- [Kuzu WebAssembly guide](https://kuzudb.github.io/docs/client-apis/wasm/)
- [Kuzu connections and concurrency documentation](https://kuzudb.github.io/docs/concurrency/)
- [Kuzu transaction documentation](https://kuzudb.github.io/docs/cypher/transaction/)
- [Kuzu configuration and query-timeout documentation](https://kuzudb.github.io/docs/cypher/configuration/)
- [Kuzu-Wasm asynchronous API reference](https://kuzudb.github.io/api-docs/wasm/async/)
- [Kuzu-Wasm v0.11.3 JavaScript source](https://github.com/kuzudb/kuzu/tree/v0.11.3/tools/wasm/src_js)
- [Kuzu-Wasm v0.11.3 C++/Embind source](https://github.com/kuzudb/kuzu/tree/v0.11.3/tools/wasm/src_cpp)
- [Kuzu-Wasm v0.11.3 package exports and build definitions](https://github.com/kuzudb/kuzu/tree/v0.11.3/tools/wasm)
- [Kuzu v0.11.3 persistent-browser example](https://github.com/kuzudb/kuzu/tree/v0.11.3/tools/wasm/examples/browser_persistent)
- [Kuzu v0.11.3 in-memory browser example](https://github.com/kuzudb/kuzu/tree/v0.11.3/tools/wasm/examples/browser_in_memory)
- [Kuzu v0.11.0 release notes introducing single-file databases](https://github.com/kuzudb/kuzu/releases/tag/v0.11.0)
- [Kuzu on-disk-files documentation](https://kuzudb.github.io/docs/developer-guide/files/)
- [Kuzu v0.11.3 database and filesystem-locking source](https://github.com/kuzudb/kuzu/tree/v0.11.3/src)
- [Emscripten filesystem and IDBFS documentation](https://emscripten.org/docs/api_reference/Filesystem-API.html)
- [Emscripten `fcntl` syscall implementation](https://github.com/emscripten-core/emscripten/blob/main/src/lib/libsyscall.js)
- [MDN Web Workers API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API)
- [MDN structured clone algorithm](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm)
- [MDN `SharedArrayBuffer` security requirements](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer#security_requirements)

## Issues Found

1. The concurrency checklist recommended `conn.setQueryTimeout(...)`. Although that method appears in Kuzu-Wasm 0.11.3's public JavaScript API, it throws at runtime because the JavaScript wrapper calls `setQueryTimeout` while the underlying Embind export is named `setQueryTimeOut`. Replaced the recommendation with the working connection-level `CALL TIMEOUT=3000` configuration and retained broker cancellation for queued work.
2. The native-lock statement could imply that Kuzu's POSIX file lock necessarily rejects another `Database` object in the same process. POSIX record locks are process-associated. Narrowed the statement to conflicting owners across native processes on filesystems that honor the locks; the browser/Wasm warning remains unchanged.

## Review Notes

- The import, worker-path setup, explicit `Database.init()` and `Connection.init()`, prepared-statement parameter binding, result conversion, and close calls match Kuzu-Wasm 0.11.3. The default async browser build was smoke-tested in Chromium with its Worker artifact; it initialized, ran the prepared read, and returned structured-cloneable rows. A separate browser test created `/database/graph.kuzu` on IDBFS, flushed it, reloaded the page, and reopened the persisted row successfully. The read and rename prepared-query examples were also executed against the published 0.11.3 package's Node.js Wasm variant.
- The published 0.11.3 package and tagged source confirm that the async facade owns one dispatcher Worker whose handlers invoke the synchronous bindings. Multiple pending Promises therefore do not guarantee concurrent top-level query execution.
- The v0.11.3 persistent-browser example declares `kuzu-wasm` `^0.8.0`, while its committed lockfile resolves 0.8.0. Its IDBFS populate, flush, close, and unmount sequence matches the post. Because Kuzu 0.11.0 and later use a single-file database and reject a directory as the database path, a filename below the mount point is correct for 0.11.3.
- All external links in the post returned HTTP 200 and led to the described official resources during review.
- The Kuzu repository is archived, and npm marks `kuzu-wasm@0.11.3` as deprecated. The post is appropriately version-specific; future implementations should not assume that another Kuzu release will repair the timeout-wrapper defect.
