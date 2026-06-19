# Validation Summary: How to Fix 'Memory Leak' Test Detection

## Status
validated

## Post Type
Tutorial / practical guide

## Technologies Covered
- JavaScript
- Node.js
- V8 heap snapshots and garbage collection
- Jest
- GitHub Actions
- Chrome DevTools heap snapshot analysis

## Sources Consulted
- Node.js `process.memoryUsage()` documentation: https://nodejs.org/api/process.html#processmemoryusage
- Node.js V8 `writeHeapSnapshot()` documentation: https://nodejs.org/api/v8.html#v8writeheapsnapshotfilenameoptions
- Node.js diagnostics guide for heap snapshots: https://nodejs.org/learn/diagnostics/memory/using-heap-snapshot
- Node.js diagnostics guide for `--expose-gc`: https://nodejs.org/learn/diagnostics/memory/understanding-and-tuning-memory
- Jest CLI options documentation: https://jestjs.io/docs/cli
- Jest configuration documentation: https://jestjs.io/docs/configuration
- Jest setup and teardown documentation: https://jestjs.io/docs/setup-teardown
- Jest timer mocks documentation: https://jestjs.io/docs/timer-mocks
- Local Jest 30.0.0 CLI help and `--showConfig` output for `--detectLeaks`, `--logHeapUsage`, `maxWorkers`, and `testTimeout`

## Issues Found
- The `MemoryTracker.analyzeGrowth()` example divided average growth by the total number of snapshots. Because the first snapshot is the baseline, the number of growth intervals is `snapshots.length - 1`. Changed the output fields to `totalSnapshots` and `averageGrowthPerSnapshot` and divided by `this.snapshots.length - 1`.
- The Jest setup example showed `jest.setup.js` but did not show how Jest loads it. Added the required `setupFilesAfterEnv` configuration so the setup hooks are actually registered after Jest installs its globals.
- The post described `jest --detectLeaks` as a general built-in memory leak detector. Jest's own CLI help marks this as experimental and says it tries to garbage collect the test global object and fails if that global is leaked. Updated the wording to reflect that narrower behavior.

## Review Notes
- The Jest `--logHeapUsage` option is also useful for this topic and Jest's official CLI documentation specifically recommends using it with `--runInBand` and Node's `--expose-gc`; this could be added in a future content improvement.
- Heap snapshots are technically correct, but Node.js documentation warns that creating them is synchronous and can require roughly twice the current heap size, so they should be used carefully on large processes.
