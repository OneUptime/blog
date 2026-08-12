# Validation Summary: Make Browser Beacons More Reliable During Navigation

## Status
validated

## Post Type
Technical guide / implementation guide

## Technologies Covered
- Beacon API and `navigator.sendBeacon()`
- Fetch API and `Request.keepalive`
- Page Visibility API, `visibilitychange`, and `pagehide`
- Browser page lifecycle and back/forward cache behavior
- JavaScript telemetry batching, UTF-8 byte measurement, and UUID generation
- IndexedDB, Web Storage, service workers, and Background Sync
- Content Security Policy `connect-src`
- Cross-Origin Resource Sharing and Fetch credentials modes
- Idempotent telemetry ingestion and end-to-end delivery measurement
- Core Web Vitals reporting

## Sources Consulted
- [W3C Beacon specification: `sendBeacon()` and processing model](https://w3c.github.io/beacon/#sec-processing-model)
- [WHATWG Fetch Standard: keepalive processing and shared 64 KiB in-flight body quota](https://fetch.spec.whatwg.org/#http-network-or-cache-fetch)
- [WHATWG Fetch Standard: BodyInit extraction and media types](https://fetch.spec.whatwg.org/#concept-bodyinit-extract)
- [WHATWG Fetch Standard: CORS protocol](https://fetch.spec.whatwg.org/#cors-protocol)
- [WHATWG Fetch Standard: CORS and credentials](https://fetch.spec.whatwg.org/#cors-protocol-and-credentials)
- [WHATWG Fetch Standard: Fetch API promise processing](https://fetch.spec.whatwg.org/#fetch-method)
- [MDN: `Navigator.sendBeacon()`](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/sendBeacon)
- [MDN: `Request.keepalive`](https://developer.mozilla.org/en-US/docs/Web/API/Request/keepalive)
- [MDN: `Window.fetch()`](https://developer.mozilla.org/en-US/docs/Web/API/Window/fetch)
- [Chrome Developers: Page Lifecycle API](https://developer.chrome.com/docs/web-platform/page-lifecycle-api)
- [MDN: `visibilitychange`](https://developer.mozilla.org/en-US/docs/Web/API/Document/visibilitychange_event)
- [MDN: `pagehide`](https://developer.mozilla.org/en-US/docs/Web/API/Window/pagehide_event)
- [MDN: `beforeunload`](https://developer.mozilla.org/en-US/docs/Web/API/Window/beforeunload_event)
- [MDN: `unload`](https://developer.mozilla.org/en-US/docs/Web/API/Window/unload_event)
- [MDN: Using IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB)
- [MDN: Web Storage API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API)
- [MDN: `SyncManager`](https://developer.mozilla.org/en-US/docs/Web/API/SyncManager)
- [W3C Service Workers specification: service worker lifetime](https://www.w3.org/TR/service-workers/#service-worker-lifetime)
- [W3C Content Security Policy: `connect-src`](https://www.w3.org/TR/CSP/#directive-connect-src)
- [MDN: `Crypto.randomUUID()`](https://developer.mozilla.org/en-US/docs/Web/API/Crypto/randomUUID)
- [GoogleChrome `web-vitals` documentation](https://github.com/GoogleChrome/web-vitals/blob/main/README.md)

## Issues Found
1. **The Beacon-to-Fetch fallback incorrectly implied an independent retry path.** `sendBeacon()` itself creates a keepalive request, and Beacon and keepalive Fetch share the same in-flight body quota in the relevant fetch group. An immediate keepalive Fetch of the same body therefore cannot reliably recover from the quota condition that caused Beacon to return `false`. Changed the guidance and queue example to choose one primary transport per batch, requeue or split a Beacon-refused batch while the page remains active, and use keepalive Fetch from the outset when its additional controls are required.
2. **The Fetch result was mislabeled as a queue result, and the sample handled only rejected promises.** Fetch fulfills its promise for HTTP error responses such as 429 and 500; callers must inspect `Response.ok` or `Response.status`. Updated the capability table and retry guidance to distinguish Beacon's Boolean queue result from Fetch's response promise, and clarified that a rejected promise does not prove that the server failed to accept the request.
3. **The batching helper could not satisfy the stated byte limit or queue semantics as called.** The original call selected events before constructing the envelope, so it could not measure the encoded final body, and its mutation behavior was unspecified even though requeueing assumed that it removed events. Changed the example to pass envelope metadata into `takeBatchWithinBytes`, require it to remove selected events atomically, and return the final serialized body whose UTF-8 measurement includes the envelope, events, and JSON syntax. Also required the helper to quarantine a single oversized event instead of repeatedly returning an empty batch without making progress.
4. **The event identity shown in code did not match the collector's deduplication scheme.** Events had only a sequence that restarted for each document, while the prose required a page-lifecycle identity plus sequence. Added a per-page `pageViewId`, scoped event deduplication by tenant, required the batch ID to remain stable when retransmitting the same serialized batch after an ambiguous outcome, and clarified that split or repackaged events can receive new batch IDs because their event identities remain stable. Deduplication and durable enqueueing must be atomic to prevent racing copies from both being stored.
5. **Beacon and Fetch sent the same JSON bytes under different media types.** Passing a string to Beacon is standardized as UTF-8 with `Content-Type: text/plain;charset=UTF-8`, while the removed fallback explicitly declared `application/json`. Updated the same-origin Beacon example to send an `application/json` `Blob` and corrected the explanation of string and Blob media-type behavior.
6. **The cross-origin CORS and credentials guidance was incomplete.** A cross-origin Fetch using its default `cors` mode is governed by CORS whether or not application code reads the response, and an `application/json` request requires a successful preflight before the POST is sent. Beacon fixes its Fetch credentials mode to `include`, whereas Fetch exposes a credentials option. Updated the bullets to cover preflight authorization, constrained `no-cors` use, opaque responses, `SameSite` and browser cookie policy, and the explicit origin and `Access-Control-Allow-Credentials` requirements for credentialed CORS.
7. **The lifecycle snippet declared an unused checkpoint variable.** Removed `lastFlushedSequence`, which did not participate in either flushing or deduplication. The queue example now states the secure-context requirement for `crypto.randomUUID()`.

## Review Notes
- The lifecycle guidance is correct: transitioning to `hidden` is the last reliably observable opportunity in common mobile termination paths, while `pagehide` is bfcache-compatible but not guaranteed and `beforeunload`/`unload` should not be the primary telemetry path.
- The 64 KiB value is correctly described as a shared in-flight keepalive body budget for the relevant fetch group, not a per-request safe allowance. Measuring serialized UTF-8 bytes with `TextEncoder` and using 48 KiB only as operational headroom are sound recommendations.
- The guidance to persist offline queues before termination is correct. Exit-time IndexedDB work may not complete, Web Storage is synchronous, and Background Sync/service workers remain progressive enhancement rather than a durability guarantee.
- The CSP header is valid, and `connect-src` governs both Fetch and Beacon. All external documentation links in the post were checked and resolve to the intended resources.
- The collector guidance on authentication, scoped browser credentials, schema and payload validation, rate limiting, durable enqueueing, staged pipeline metrics, and short-lived deduplication identifiers is technically sound.
- The Core Web Vitals advice is correct: metric values can update during a lifecycle, so updates should be associated by metric identity or versioned rather than counted as independent page-view samples.
- No terminal commands or version-specific framework configuration are present in the post.
