# Kuzu-Wasm Worker Fails to Load or Freezes the UI: Choosing Async, Sync, and Multithreaded Builds

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kuzu, WebAssembly, Web Worker, JavaScript, Browser Performance, Multithreading

Description: Choose the correct Kuzu-Wasm package variant, deploy its matching worker assets and isolation headers, and keep graph queries off the browser main thread.

---

For a browser UI, start with Kuzu-Wasm's default asynchronous build. Its worker-backed operations return promises and are dispatched to a Web Worker so database work does not block the main thread. Choose the multithreaded async build only after profiling shows query execution benefits and the application can serve cross-origin-isolation headers. Reserve the sync build for scripts, prototypes, or code already running inside a dedicated worker; importing sync Kuzu-Wasm on the UI thread can freeze rendering and input.

Worker load failures are usually deployment mismatches: the separate worker bundle was not copied, its URL is wrong, `setWorkerPath()` ran after initialization, CSP blocks workers, assets from different versions are mixed, or the multithreaded build lacks the headers needed for `SharedArrayBuffer`. Fix the runtime contract before changing query code.

The Kuzu repository is archived, and the `kuzu-wasm` package is deprecated; its latest stable release is 0.11.3. Pin and self-host a tested artifact set; do not expect a future Kuzu release to absorb browser or bundler changes.

## The Package Matrix

The official `kuzu-wasm` package defines these entry points:

| Environment/build | Async entry point | Sync entry point | Browser notes |
| --- | --- | --- | --- |
| Default single-threaded | `kuzu-wasm` | `kuzu-wasm/sync` | Smallest, broadest compatibility, no cross-origin isolation required |
| Browser multithreaded | `kuzu-wasm/multithreaded` | `kuzu-wasm/multithreaded/sync` | Larger; requires cross-origin isolation |
| Node.js multithreaded | `kuzu-wasm/nodejs` | `kuzu-wasm/nodejs/sync` | Load with `require()`; CommonJS and direct Node.js filesystem access (`NODERAWFS`); does not run in a browser |

“Async” and “multithreaded” describe different axes. The async wrapper moves API calls off the caller's thread. The multithreaded variant lets the Wasm engine use multiple threads. A default async browser build can keep the UI responsive while the database engine itself remains single-threaded.

Do not mix variants. A `Database` created by the default build cannot be passed to multithreaded functions; an async object cannot be passed to sync APIs. Centralize imports so a dependency cannot accidentally pull two runtimes into one page.

## The Safe Default for a GUI

Use the async root package and await every lifecycle operation:

~~~javascript
import kuzu from "kuzu-wasm";

const db = new kuzu.Database(":memory:");
const conn = new kuzu.Connection(db);

const result = await conn.query("RETURN 1 AS value");
const rows = await result.getAllObjects();

await result.close();
await conn.close();
await db.close();
// When the application no longer needs the shared Kuzu runtime:
await kuzu.close();
~~~

The official documentation says async calls dispatch to a Web Worker or Node worker thread and pay some serialization/deserialization overhead. For a UI, that overhead is usually preferable to long tasks on the main thread. Still paginate or aggregate large results: moving query execution to a worker does not make transferring 500,000 JavaScript objects cheap.

Keep database ownership in one service module. Queue requests, close results, and support cancellation or timeouts at the application layer where available. Avoid recreating the worker and Wasm module for every component render.

## Why the Sync Build Freezes the Page

The sync package makes calls synchronously after initialization:

~~~javascript
import kuzu from "kuzu-wasm/sync";
~~~

If a 600 ms query runs on the main thread, that thread cannot paint, respond to input, or run other main-thread JavaScript during that interval. A larger import can look like a crashed tab. Kuzu's official guide recommends sync for scripting, CLI-like work, and prototyping—not GUI applications or web servers.

Sync can be reasonable inside a worker you create and own, because blocking that worker does not block the UI:

~~~javascript
// database-worker.js
// Create this worker with new Worker(url, { type: "module" }).
import kuzu from "kuzu-wasm/sync";

await kuzu.init();

self.onmessage = ({ data }) => {
  // Initialize once, execute trusted request templates, and post compact results.
};
~~~

But this means designing a message protocol, error handling, lifecycle, and asset deployment yourself. The packaged async build already supplies a worker boundary, so prefer it unless the custom architecture has a measured advantage.

## The Async Worker Is a Separate Asset

Kuzu-Wasm bundles the main module as one script but emits its worker separately. The 0.11.3 build source names the worker entry `kuzu_wasm_worker.js`; its browser builds embed the Wasm binary in that worker instead of emitting a separate `.wasm` file. A bundler that only includes the imported entry can omit the worker from production output.

By default, Kuzu resolves the worker under the same URL prefix as the main module. If deployment fingerprints or relocates it, copy the worker and set its public URL before any Kuzu API call:

~~~javascript
import kuzu from "kuzu-wasm";

kuzu.setWorkerPath("/assets/kuzu/kuzu_wasm_worker.js");

// Only initialize after the path is configured.
const db = new kuzu.Database(":memory:");
~~~

The official contract is strict: after initialization starts, the worker path cannot be changed. Put `setWorkerPath()` immediately after the single runtime import, not inside a later React effect.

Copy the selected variant's worker from the same installed package version. The official 0.11.3 browser artifacts have no separate `.wasm` file; if a custom build emits additional runtime assets, deploy those from the same build too. Do not combine a cached worker from one Kuzu-Wasm build with a main script from another. Deploy immutable versioned URLs and either update them atomically or invalidate the service-worker cache.

## Diagnose Worker Load Failures From the Network Layer

Open browser developer tools and inspect the worker request. Common signatures include:

- **404 or HTML response:** the worker URL points through an SPA fallback or wrong public base path.
- **MIME/origin error:** the asset server returns the wrong content type, or the worker URL violates the worker-loading origin rules.
- **CSP error:** `worker-src` does not permit the URL or `blob:` strategy used by the bundle.
- **Immediate version/type error:** main, worker, and Wasm assets do not match.
- **Works in dev, fails after build:** the development server serves `node_modules`, but the production bundler did not copy the worker.
- **Repeated worker creation:** application initialization runs more than once.

Fetch the configured worker URL directly in the deployed environment and verify it is JavaScript, not the application's index page. If a custom build emits a separate `.wasm`, serve it as `application/wasm`.

Prefer an explicit root-relative, same-origin worker URL. A native `Worker()` entry URL is normally same-origin; CORS alone does not make a direct cross-origin worker URL valid. Kuzu 0.11.3's worker wrapper can turn a scheme-qualified URL into a `blob:` worker that calls `importScripts()`. That topology requires `blob:` in `worker-src`, the imported origin in `script-src`, and, under `COEP: require-corp`, a compatible Cross-Origin-Resource-Policy response for the cross-origin worker script.

A conservative page CSP for the explicit root-relative worker path above might allow only the application's own workers:

~~~text
Content-Security-Policy: default-src 'self'; worker-src 'self'; script-src 'self'
~~~

The creator's `worker-src` controls whether a worker can be created. After creation, a worker loaded from an HTTP(S) URL normally uses the CSP delivered on its own script response for code executed inside it. The 0.11.3 worker uses both dynamic JavaScript generation and WebAssembly compilation, so a worker-specific policy must permit `'unsafe-eval'`, which also permits Wasm compilation:

~~~text
Content-Security-Policy: default-src 'self'; worker-src 'self'; script-src 'self' 'unsafe-eval'
~~~

Keep that relaxation on the worker response where possible. A `blob:` worker inherits its creator's CSP, which would require the relaxation on the page instead. The exact policy depends on bundling and other application resources. Do not add `*` or broad `blob:` allowances merely to suppress an error; inspect the actual worker creation URL.

## When to Use the Multithreaded Build

Import it explicitly:

~~~javascript
import kuzu from "kuzu-wasm/multithreaded";
~~~

The official guide says this build is larger and requires cross-origin isolation in browsers. In practice, the top-level page normally needs these response headers:

~~~text
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
~~~

Also serve `Cross-Origin-Embedder-Policy: require-corp` on `kuzu_wasm_worker.js` and recursively on worker or iframe responses that it loads. `Cross-Origin-Opener-Policy` applies to the top-level document, not the worker response. A secure context is required, and `Permissions-Policy: cross-origin-isolated=()` disables the capability.

Then verify at runtime:

~~~javascript
if (
  globalThis.crossOriginIsolated !== true ||
  typeof globalThis.SharedArrayBuffer === "undefined"
) {
  throw new Error("Multithreaded Kuzu-Wasm prerequisites are unavailable");
}
~~~

`COEP: require-corp` blocks cross-origin `no-cors` subresources unless their responses opt in with a compatible Cross-Origin-Resource-Policy header; cross-origin resources requested in `cors` mode must pass CORS. Apply COEP recursively to worker and iframe responses. Roll out isolation on a staging copy of the complete application, not only a blank Kuzu test page.

Kuzu 0.11.3 hard-codes an eight-worker Emscripten pthread pool, while an omitted or zero database `maxNumThreads` expands to `navigator.hardwareConcurrency`. On browsers reporting more than eight logical processors, the default can exhaust the pool and hang during database initialization. Cap the third `Database` constructor argument at eight or lower, and do not give the connection a higher limit:

~~~javascript
const maxThreads = Math.min(navigator.hardwareConcurrency || 4, 8);
const db = new kuzu.Database(":memory:", 0, maxThreads);
const conn = new kuzu.Connection(db, maxThreads);
~~~

Some embedding contexts or third-party integrations cannot support isolation. In that case, use the default async build. A working single-threaded engine is better than a multithreaded bundle that never initializes.

Multithreading is not automatically faster. Small queries may be dominated by worker messages and setup; browser CPU limits vary; memory and package size grow; result conversion can remain single-threaded. Benchmark representative imports, traversals, concurrency, startup, download, p95 query latency, and main-thread responsiveness.

## Keep the Main Thread Responsive End to End

An async database query can still produce UI jank if the application does heavy work after receiving results:

~~~javascript
const rows = await result.getAllObjects(); // Can transfer and allocate a lot.
renderHugeGraph(rows);                     // Can block layout and painting.
~~~

Control the complete pipeline:

- Return scalar IDs and properties instead of full paths when possible.
- Aggregate in Cypher.
- Use explicit `LIMIT` with deterministic pagination.
- Render graph elements incrementally or virtualize lists.
- Avoid JSON-stringifying large results on the main thread.
- Where supported, feature-detect and measure `PerformanceObserver` long tasks as well as query duration; use browser tracing or another supported metric elsewhere.

For imports, display progress only if the pinned API exposes trustworthy progress information; do not spin the UI while one synchronous call blocks it.

## A Version-Aware Loader

Choose the variant before creating any object and fall back only by performing a fresh import/initialization path:

~~~javascript
export async function loadKuzu({ preferThreads, workerPaths }) {
  const canThread =
    preferThreads &&
    globalThis.crossOriginIsolated === true &&
    typeof globalThis.SharedArrayBuffer !== "undefined";

  const module = canThread
    ? await import("kuzu-wasm/multithreaded")
    : await import("kuzu-wasm");

  const kuzu = module.default;
  kuzu.setWorkerPath(
    canThread ? workerPaths.multithreaded : workerPaths.default
  );
  return { kuzu, multithreaded: canThread };
}
~~~

The worker asset path must correspond to the selected variant's emitted worker. If build tooling places default and multithreaded assets in different directories, map both explicitly. Do not initialize one variant, catch an error, and pass its objects into another.

Cache the loader promise so concurrent callers share one initialization. Surface a diagnostic containing chosen variant, `crossOriginIsolated`, worker URL, package version, and asset response status without leaking query data.

## Test the Production Build

Development-server success is insufficient. In CI or a staging browser:

1. Load the built page from its real base path.
2. Assert the chosen worker and any separately emitted runtime assets return 200 with correct content.
3. Initialize Kuzu exactly once.
4. Create a tiny schema, write data, query it, and close all objects.
5. For multithreaded mode, assert `crossOriginIsolated` and `SharedArrayBuffer`.
6. Where supported, record main-thread long tasks during a representative query; use browser tracing or another supported metric elsewhere.
7. Reload through the service worker and repeat to catch stale assets.
8. Exercise CSP and CDN configuration in the same topology as production.

Run the matrix in every browser the product claims to support. Unsupported browsers should take a deliberate default-async fallback or show a clear compatibility error.

## Official Documentation

- [Kuzu 0.11.3 release](https://github.com/kuzudb/kuzu/releases/tag/v0.11.3)
- [Kuzu-Wasm build variants and worker loading](https://kuzudb.github.io/docs/client-apis/wasm/)
- [Kuzu 0.11.3 Wasm README](https://github.com/kuzudb/kuzu/blob/v0.11.3/tools/wasm/README.md)
- [Kuzu-Wasm package exports](https://github.com/kuzudb/kuzu/blob/v0.11.3/tools/wasm/package.json)
- [Kuzu-Wasm build and worker entry](https://github.com/kuzudb/kuzu/blob/v0.11.3/tools/wasm/build.mjs)
- [Kuzu 0.11.3 WebAssembly thread-pool configuration](https://github.com/kuzudb/kuzu/blob/v0.11.3/CMakeLists.txt#L194-L198)
- [Kuzu 0.11.3 default thread selection](https://github.com/kuzudb/kuzu/blob/v0.11.3/src/main/database.cpp#L69-L73)
- [Kuzu-Wasm browser examples](https://github.com/kuzudb/kuzu/tree/v0.11.3/tools/wasm/examples)
- [Web.dev cross-origin isolation guide](https://web.dev/articles/cross-origin-isolation-guide)
- [LadybugDB current Wasm documentation](https://docs.ladybugdb.com/client-apis/wasm/)

## Conclusion

Use default async Kuzu-Wasm for most browser interfaces, sync only away from the main thread, and multithreading only where isolation is supportable and benchmarks justify it. Treat the worker bundle and its embedded Wasm, main module, headers, CSP, and cache as one versioned deployment unit. When the worker fails, inspect its actual network request; when the UI freezes, measure the complete path from query through result conversion and rendering. Correct variant selection plus atomic assets turns Kuzu-Wasm from a fragile demo into an operable browser component.
