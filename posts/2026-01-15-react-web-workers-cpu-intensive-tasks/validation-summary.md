# Validation Summary: How to Implement Web Workers in React for CPU-Intensive Tasks

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- React
- TypeScript
- Web Workers API
- Worker message passing
- Structured clone algorithm
- Transferable objects
- Vite-style worker creation with `new URL()` and `import.meta.url`

## Sources Consulted
- MDN Web Workers API: https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API
- MDN Using Web Workers: https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers
- MDN Worker `postMessage()`: https://developer.mozilla.org/en-US/docs/Web/API/Worker/postMessage
- MDN Structured clone algorithm: https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm
- MDN Transferable objects: https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Transferable_objects
- MDN WorkerGlobalScope `self`: https://developer.mozilla.org/en-US/docs/Web/API/WorkerGlobalScope/self
- React `useEffect` reference: https://react.dev/reference/react/useEffect
- Vite Web Workers guide: https://vite.dev/guide/features.html#web-workers

## Issues Found
- The opening explanation said JavaScript runs on a single thread in the browser. This was too broad because Web Workers are also JavaScript execution contexts. Changed it to specify JavaScript running on the main thread.
- The worker capability description said workers can perform any computation. This was too broad because workers have API restrictions and no direct DOM access. Changed it to refer to computation with worker-supported APIs.
- The memory-isolation wording said data must be serialized for transfer. Browser worker messaging uses the structured clone algorithm by default, and transferables can move ownership without copying. Updated the wording and transferable-object section to reflect this.
- The worker pool React usage sent `{ id, value }` tasks to a worker that expects `{ type: 'CALCULATE', payload: ... }`, so the worker would not post a response and the pool promises would remain pending. Updated the example to send the documented worker message format and flatten the returned payloads.
- The worker pool `onerror` handler rejected the current task but did not clear the worker's current task or continue the queue. Updated it to clear the task, return the worker to the free list, and continue processing queued tasks.
- The worker pool usage did not restore the loading state if `execBatch` rejected. Wrapped the await in `try`/`finally` so `isProcessing` is reset.

## Review Notes
The examples assume a bundler setup that supports constructing workers with `new Worker(new URL(..., import.meta.url))`, such as Vite. Other React build setups may require different worker-loading configuration.
