# Validation Summary: Choose Async, Sync, or Multithreaded Kuzu-Wasm Builds

## Status

validated

## Post Type

Technical troubleshooting and deployment guide

## Technologies Covered

- Kuzu 0.11.3 and the deprecated `kuzu-wasm` package
- WebAssembly and Emscripten pthreads
- JavaScript ES modules, dynamic imports, promises, and lifecycle APIs
- Browser Web Workers and Node.js worker threads
- `SharedArrayBuffer` and cross-origin isolation
- Content Security Policy, COOP, COEP, CORP, CORS, and Permissions Policy
- Browser performance measurement and the Long Tasks API

## Sources Consulted

- [Kuzu 0.11.3 release](https://github.com/kuzudb/kuzu/releases/tag/v0.11.3)
- [Official Kuzu-Wasm documentation](https://kuzudb.github.io/docs/client-apis/wasm/)
- [Kuzu 0.11.3 Wasm README](https://github.com/kuzudb/kuzu/blob/v0.11.3/tools/wasm/README.md)
- [Kuzu-Wasm 0.11.3 package exports](https://github.com/kuzudb/kuzu/blob/v0.11.3/tools/wasm/package.json)
- [Kuzu-Wasm 0.11.3 build script](https://github.com/kuzudb/kuzu/blob/v0.11.3/tools/wasm/build.mjs)
- [Kuzu-Wasm async dispatcher](https://github.com/kuzudb/kuzu/blob/v0.11.3/tools/wasm/src_js/dispatcher.js)
- [Kuzu-Wasm async module API](https://github.com/kuzudb/kuzu/blob/v0.11.3/tools/wasm/src_js/index.js)
- [Kuzu-Wasm async Database API](https://github.com/kuzudb/kuzu/blob/v0.11.3/tools/wasm/src_js/database.js)
- [Kuzu-Wasm async Connection API](https://github.com/kuzudb/kuzu/blob/v0.11.3/tools/wasm/src_js/connection.js)
- [Kuzu-Wasm async QueryResult API](https://github.com/kuzudb/kuzu/blob/v0.11.3/tools/wasm/src_js/query_result.js)
- [Kuzu-Wasm synchronous API](https://github.com/kuzudb/kuzu/blob/v0.11.3/tools/wasm/src_js/sync/index.js)
- [Kuzu-Wasm browser examples](https://github.com/kuzudb/kuzu/tree/v0.11.3/tools/wasm/examples)
- [Kuzu 0.11.3 WebAssembly pthread-pool configuration](https://github.com/kuzudb/kuzu/blob/v0.11.3/CMakeLists.txt#L194-L198)
- [Kuzu 0.11.3 default thread-count selection](https://github.com/kuzudb/kuzu/blob/v0.11.3/src/main/database.cpp#L69-L73)
- [npm registry metadata for `kuzu-wasm` 0.11.3](https://registry.npmjs.org/kuzu-wasm/0.11.3)
- [WHATWG HTML Standard: Web workers](https://html.spec.whatwg.org/multipage/workers.html)
- [W3C Content Security Policy Level 3](https://www.w3.org/TR/CSP3/)
- [MDN `Worker()` constructor](https://developer.mozilla.org/en-US/docs/Web/API/Worker/Worker)
- [MDN `importScripts()`](https://developer.mozilla.org/en-US/docs/Web/API/WorkerGlobalScope/importScripts)
- [MDN CSP in workers](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy#csp_in_workers)
- [MDN Cross-Origin-Embedder-Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cross-Origin-Embedder-Policy)
- [MDN `cross-origin-isolated` Permissions Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Permissions-Policy/cross-origin-isolated)
- [Web.dev cross-origin isolation guide](https://web.dev/articles/cross-origin-isolation-guide)
- [Ladybug current Wasm documentation](https://docs.ladybugdb.com/client-apis/wasm/)

## Issues Found

- Kuzu-Wasm 0.11.3 fixes Emscripten's pthread pool at eight workers, but an omitted or zero `Database` `maxNumThreads` value expands to the browser's reported hardware concurrency. On a browser reporting more than eight logical processors, the published multithreaded artifact exhausted the pool and hung during initialization. The post now caps the third `Database` argument at eight or lower and keeps the connection limit no higher.
- The disabling Permissions Policy was written as the incomplete header value `Permissions-Policy: cross-origin-isolated`. It now uses the valid disabling syntax `Permissions-Policy: cross-origin-isolated=()`.
- The CSP explanation could imply that only the worker response policy matters. It now distinguishes the creator's `worker-src` check, which gates worker creation, from the CSP on an HTTP(S) worker response, which governs code inside that worker; the existing `blob:` inheritance explanation remains intact.
- The COEP explanation said all resources requested in `cors` mode must pass CORS. It now correctly scopes that requirement to cross-origin resources.

## Review Notes

- The Kuzu repository is archived, the npm package is deprecated, and 0.11.3 remains the latest stable published version as of validation. The post correctly recommends pinning and self-hosting a matched artifact set.
- All external links in the post resolved successfully and matched their descriptions during validation.
- The published 0.11.3 default async browser lifecycle was smoke-tested in Chromium through worker loading, query execution, result conversion, and cleanup. The Node.js variant completed the same lifecycle.
- The published multithreaded browser artifact was smoke-tested under COOP, COEP, and the documented split page/worker CSP. It hung with the default thread count on a browser reporting more than eight logical processors and completed successfully when both database and connection limits were capped at eight.
- Package inspection confirmed that the 0.11.3 browser variants embed Wasm in their JavaScript bundles and ship no separate `.wasm` file; the Node.js variant does ship a separate `.wasm` file.
- Long Tasks observation is not supported uniformly across browsers; the post correctly qualifies its use with feature detection and a tracing fallback.
