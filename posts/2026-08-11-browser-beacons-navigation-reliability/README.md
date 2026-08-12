# Why Are Browser Beacons Lost During Navigation? Making `sendBeacon` and `fetch(keepalive)` More Reliable

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Beacon API, Fetch API, Browser Monitoring, Page Lifecycle, Telemetry Reliability, Real User Monitoring

Description: Improve navigation-time telemetry delivery with lifecycle-aware flushing, bounded payloads, CSP-safe endpoints, idempotent ingestion, and honest end-to-end coverage metrics.

---

Telemetry sent at the end of a page visit is best effort. A browser may freeze or terminate the page, the operating system may kill the process, the device may lose connectivity, a Content Security Policy or extension may block the collector, or the browser's keepalive quota may already be full. Neither `navigator.sendBeacon()` nor `fetch(..., { keepalive: true })` turns a disappearing page into a durable message queue.

They do improve reliability when used within their design constraints. The robust pattern is to flush before the last possible moment, keep payloads small, use `visibilitychange` rather than unload events, deduplicate on the server, and measure collector acceptance independently from client attempts.

## Understand the Guarantees

### `navigator.sendBeacon()`

`sendBeacon()` asynchronously queues a small HTTP `POST` request. It is intended for analytics and diagnostics that should not delay navigation. It returns:

- `true` if the user agent successfully queued the data for transfer;
- `false` if it could not queue it.

`true` is not a server acknowledgement. The request can still fail because of network loss, CSP, filtering, process termination, or server rejection. Page code cannot read the response or change the method.

### `fetch()` with `keepalive`

The Fetch `keepalive` flag allows a request to outlive the environment that initiated it. It supports methods, headers, and response handling that Beacon does not. However, if the document disappears, JavaScript may not remain alive to observe the promise settlement. The promise is therefore not a dependable post-navigation delivery receipt.

The Fetch Standard bounds in-flight request bodies whose keepalive flag is set. If the new body's length plus other in-flight keepalive body bytes in the relevant fetch group exceeds 64 kibibytes, Fetch returns a network error. This is a shared in-flight budget, not a safe 64 KiB allowance for every beacon. Browser behavior and overhead still argue for much smaller batches.

| Capability | `sendBeacon()` | `fetch(..., {keepalive: true})` |
| --- | --- | --- |
| Method | `POST` | Configurable within Fetch rules |
| Custom headers | No direct header option | Yes |
| Read response | No | Promise exposes response if execution continues |
| Designed for small analytics | Yes | Can be used, still quota-bound with a body |
| Caller-visible result | Boolean queue result | Promise fulfilled with a `Response`, including for HTTP errors, or rejected on a fetch/network error |
| Guaranteed delivery | No | No |

Prefer Beacon for a simple, same-origin analytics POST. Prefer keepalive Fetch when you truly need a different method, headers, credentials mode, or response semantics. Choose one transport for each batch, and never send the same batch with Fetch after Beacon returns `true`, because the second request can duplicate delivery. A `false` return means Beacon did not queue the data, but an immediate keepalive Fetch of the same body cannot be relied on to escape the shared keepalive quota; requeue, split, or retry the batch while the page is still active.

## Flush on `visibilitychange`, Not `unload`

The best widely supported signal that a page may be leaving is the document becoming hidden:

```js
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") {
    flushTelemetry("visibility-hidden");
  }
});
```

On mobile, a user may switch apps and the operating system may later kill the browser without firing `beforeunload`, `pagehide`, or `unload`. The `unload` and `beforeunload` events are unreliable and can also interfere with back/forward cache behavior. Do not make them the primary flush path.

`pagehide` can be a fallback for browsers or transitions where it fires, but it is not guaranteed either. Deduplicate flushes and recognize that a hidden page may become visible again, especially through bfcache or tab switching. A visibility flush should checkpoint the stream, not irrevocably declare the user session finished.

```js
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") flushTelemetry("hidden");
});

window.addEventListener("pagehide", () => {
  flushTelemetry("pagehide-fallback");
});
```

The queue must remove selected events atomically, and the collector must use stable identities to deduplicate any retries so repeated lifecycle signals are harmless.

## Do Not Save Everything for Exit

Reliability improves more by reducing the amount at risk than by changing the final API. Flush:

- periodically while the page is active;
- after a critical action completes or fails;
- when an error is captured;
- when a batch reaches a small byte or event threshold;
- when the document becomes hidden.

Core Web Vitals may update over the lifecycle, so upsert by metric ID or send versioned values. Do not store each update as another page-view sample. For rare critical errors, bypass ordinary head sampling and flush promptly, subject to consent and rate limits.

If offline persistence is required, write the queue continuously while the page is healthy, not for the first time in an exit handler. Asynchronous IndexedDB work started during termination may not finish, and synchronous storage can block the main thread. A service worker and Background Sync can help in supporting environments, but support and lifecycle constraints mean it is progressive enhancement rather than a universal guarantee.

## Keep Batches Well Below the Limit

Measure UTF-8 bytes, not JavaScript string length. Non-ASCII characters can occupy multiple bytes.

```js
const MAX_BATCH_BYTES = 48 * 1024; // Operational headroom, not a platform constant.
const encoder = new TextEncoder();

function byteLength(value) {
  return encoder.encode(value).byteLength;
}
```

The 48 KiB example leaves room under the 64 KiB Fetch keepalive body limit and reduces contention with other in-flight requests, but it is not universally optimal. Smaller batches are usually better for navigation-time telemetry. Cap individual event size, stack depth, breadcrumb count, and attribute length at collection time.

Do not compress for the first time inside `visibilitychange`; asynchronous compression may not complete. If compression is worthwhile and supported by your ingestion contract, prepare batches earlier. Never attach screenshots, replay chunks, or large source-map data to an exit beacon.

## A Lifecycle-Aware Queue

The following pattern uses Beacon as its transport and returns refused events to the in-memory queue. If you need Fetch semantics, use keepalive Fetch as the primary transport rather than as a same-body quota fallback:

```js
const pending = [];
const pageViewId = crypto.randomUUID(); // Requires a secure context.
let sequence = 0;

function enqueueTelemetry(event) {
  pending.push({
    ...sanitize(event),
    pageViewId,
    sequence: ++sequence,
    occurredAt: Date.now(),
  });

  if (pending.length >= 20) flushTelemetry("batch-size");
}

function flushTelemetry(reason) {
  if (pending.length === 0) return;

  const envelope = {
    batchId: crypto.randomUUID(),
    reason,
    release: APP_RELEASE,
  };
  const { events, body } = takeBatchWithinBytes(
    pending,
    envelope,
    MAX_BATCH_BYTES,
  );
  const beaconBody = new Blob([body], { type: "application/json" });

  if (navigator.sendBeacon("/rum/intake", beaconBody)) {
    return; // Queued, not confirmed delivered.
  }

  // Beacon did not queue this request. A later flush may form a new batch.
  pending.unshift(...events);
}
```

`takeBatchWithinBytes` must remove the selected events from `pending` and return the final serialized body. Its byte calculation must include the envelope, the events, and JSON syntax, not just the event payloads. It must select at least one event or remove and quarantine an event that cannot fit by itself; it must not return an empty batch while leaving the same oversized event at the head of the queue. A production queue also needs maximum memory, expiry, consent changes, retry limits, and protection against the telemetry client reporting its own exporter failure recursively.

Passing a string to Beacon makes Fetch encode it as UTF-8 and use `text/plain;charset=UTF-8`, a CORS-safelisted media type. The same-origin example uses an `application/json` `Blob` so the collector sees the intended media type. An `application/json` `Blob` sent cross-origin makes Beacon use CORS mode and requires a successful preflight. Same-origin collection is simplest. If the collector is cross-origin, test the exact body type, credentials behavior, preflight, and response headers in every supported browser.

For a keepalive Fetch transport, inspect `response.ok`: HTTP error statuses such as 429 or 500 still fulfill the promise. A rejected promise does not prove that the collector failed to accept the batch because the response can fail after server acceptance. When retransmitting the same serialized batch after an ambiguous outcome, reuse its batch ID. If events are split or repackaged, assign new batch IDs and rely on their stable event identities for cross-batch deduplication.

## Make the Collector Idempotent

Lifecycle events repeat and retries can race. Give every logical batch a random ID and preserve it when retransmitting that same batch after an ambiguous outcome. Give every event a stable page-lifecycle ID plus sequence so repackaged events also deduplicate. The collector should accept a duplicate batch without storing duplicate metrics.

```text
deduplication key: tenant + batchId
event identity: tenant + pageViewId + sequence
```

Enforce deduplication atomically with durable enqueueing so racing copies cannot both be stored.

Keep identifiers scoped and short-lived; do not turn reliability IDs into cross-site tracking IDs. Apply authentication, origin validation, payload limits, schema validation, and rate limiting. Beacon endpoints are write-only from the page's perspective and should not perform expensive synchronous processing before acceptance.

Return quickly after durably enqueueing the batch. Count each stage:

```text
HTTP request received
-> schema accepted
-> durable queue write
-> processor success
-> storage/query success
```

A `204 No Content` from a collector that drops the batch immediately afterward is not reliable telemetry.

## Configure CSP, CORS, and Credentials Deliberately

Beacon and Fetch destinations are governed by CSP `connect-src`. A restrictive policy must allow the collector:

```http
Content-Security-Policy: default-src 'self'; connect-src 'self' https://rum.example.com
```

If the endpoint is same-origin, `'self'` is usually sufficient for HTTPS Fetch and Beacon. WebSocket scheme matching has additional cross-browser details, but that does not change Beacon's HTTP destination.

For a cross-origin collector:

- configure CORS for cross-origin keepalive Fetch requests that use the default `cors` mode;
- recognize that `application/json` triggers a preflight, so the collector must authorize the origin, method, and `Content-Type` header before the POST is sent;
- use `mode: "no-cors"` only with a safelisted method and headers when an opaque response is acceptable;
- remember that Beacon fixes its credentials mode to `include`, while Fetch makes it configurable; cookie attachment remains subject to `SameSite` and browser policy, and credentialed CORS requires an explicit allowed origin plus `Access-Control-Allow-Credentials: true`;
- never put secrets in the URL to avoid headers;
- allow the destination in CSP;
- handle blocker and enterprise-network filtering as expected delivery loss.

Prefer a narrowly scoped ingestion credential or same-origin server mediation over exposing a general API token in browser JavaScript.

## Measure Delivery Instead of Assuming It

Client-side `attempted`, `queued`, and `fetch_rejected` counters are useful but share the same delivery problem. The authoritative delivery metrics live at the collector and pipeline. Compare:

- independently estimated eligible page experiences;
- SDK initialization and sampled-in event counts;
- collector requests and accepted batches;
- duplicate batches;
- rejected payloads by reason and size;
- queue, processing, and storage success;
- coverage by browser, route, release, and coarse region.

Run a controlled browser test that navigates immediately after emitting payloads of several sizes and concurrency levels. Verify stored batch IDs, not just DevTools request appearance. Test app switching and process termination on real mobile devices, bfcache traversal, CSP rejection, offline recovery, and representative blockers.

Emerging deferred-fetch APIs may improve some cases, but support, quotas, and API shape must be checked at deployment time. Keep a stable Beacon/keepalive baseline and feature-detect any newer mechanism rather than assuming it is universally available.

## Official Documentation

- [Navigator.sendBeacon](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/sendBeacon)
- [Request.keepalive](https://developer.mozilla.org/en-US/docs/Web/API/Request/keepalive)
- [Fetch Standard keepalive processing and quota](https://fetch.spec.whatwg.org/)
- [Page Lifecycle API](https://developer.chrome.com/docs/web-platform/page-lifecycle-api)
- [Page Visibility API](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API)
- [CSP `connect-src`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/connect-src)
- [Beacon specification](https://w3c.github.io/beacon/)

## Conclusion

Navigation-time beacons are lost because the page and network are not durable infrastructure. Flush throughout the session and when visibility becomes hidden, keep encoded batches far below the shared keepalive limit, use Beacon's Boolean only as a queue result, and choose Beacon or keepalive Fetch according to the request requirements. Idempotent ingestion, explicit CSP/CORS configuration, and end-to-end acceptance counters make the remaining loss measurable. The target is bounded, observable best-effort delivery—not a promise the browser APIs do not make.
