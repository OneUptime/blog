# Proxy Sentry Envelopes Through a Secure Tunnel Without an Open Relay

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Sentry, JavaScript, Security, Proxy, Error Tracking

Description: Build a bounded Sentry browser tunnel with an exact DSN allowlist, a fixed upstream, byte-preserving forwarding, and visible rejection outcomes.

A Sentry tunnel receives telemetry on your application's domain and forwards it to Sentry. That can help when browser extensions block the public ingestion hostname. It also creates a public HTTP endpoint, so an implementation that trusts a destination supplied in the request can become an open proxy.

The central rule is simple: the request selects only from destinations you configured. It must never construct an arbitrary outbound URL. Pair that rule with body limits, edge rate limits, and honest upstream responses.

## Keep the DSN in the browser configuration

The `tunnel` option changes the transport destination. It does not replace the DSN, which the SDK still needs to describe the receiving project. Sentry documents this distinction in its [SDK options](https://docs.sentry.io/platforms/javascript/configuration/options/#tunnel) and [tunnel guide](https://docs.sentry.io/platforms/javascript/troubleshooting/#using-the-tunnel-option).

```javascript
import * as Sentry from "@sentry/browser";

Sentry.init({
  dsn: "https://PUBLIC_KEY@o123.ingest.sentry.io/456",
  tunnel: "/telemetry",
});
```

Replace the DSN in both browser and server configuration. Use the exact hostname shown in your project, including its region if present. Do not put a Sentry API token in this configuration.

## Forward bytes to a fixed destination

The example below is a Web `Request`/`Response` handler for a browser-only route. Adapt the export to your framework. Configure the gateway in front of it with a request-body timeout, a concurrency limit, and a shared rate limiter before exposing the route.

The one-mebibyte body limit is an example application policy, not Sentry's maximum. Choose limits for the telemetry categories you use. Large attachments or replay payloads may need a different policy.

```javascript
const EXPECTED_DSN = "https://PUBLIC_KEY@o123.ingest.sentry.io/456";
const UPSTREAM = "https://o123.ingest.sentry.io/api/456/envelope/";
const APP_ORIGIN = "https://app.example.com";
const MAX_BYTES = 1024 * 1024;
const MAX_HEADER_BYTES = 8192;

async function readBoundedBody(request) {
  const declared = request.headers.get("content-length");
  if (declared !== null &&
      (!/^\d+$/.test(declared) || Number(declared) > MAX_BYTES)) {
    throw new Response(null, { status: 413 });
  }
  if (!request.body) throw new Response(null, { status: 400 });

  const reader = request.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_BYTES) {
        await reader.cancel();
        throw new Response(null, { status: 413 });
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

export async function handleTelemetry(request) {
  if (request.method !== "POST") {
    return new Response(null, { status: 405, headers: { Allow: "POST" } });
  }
  if (request.headers.get("origin") !== APP_ORIGIN) {
    return new Response(null, { status: 403 });
  }
  const encoding = request.headers.get("content-encoding");
  if (encoding && encoding !== "identity") {
    return new Response(null, { status: 415 });
  }

  let bytes;
  try {
    bytes = await readBoundedBody(request);
  } catch (error) {
    return error instanceof Response
      ? error
      : new Response(null, { status: 400 });
  }

  const newline = bytes.indexOf(10);
  if (newline < 1 || newline > MAX_HEADER_BYTES) {
    return new Response(null, { status: 400 });
  }

  let header;
  try {
    header = JSON.parse(new TextDecoder("utf-8", { fatal: true })
      .decode(bytes.subarray(0, newline)));
  } catch {
    return new Response(null, { status: 400 });
  }
  if (!header || header.dsn !== EXPECTED_DSN) {
    return new Response(null, { status: 403 });
  }

  try {
    const upstream = await fetch(UPSTREAM, {
      method: "POST",
      headers: { "Content-Type": "application/x-sentry-envelope" },
      body: bytes,
      redirect: "manual",
      signal: AbortSignal.timeout(5000),
    });
    const headers = new Headers({ "Cache-Control": "no-store" });
    for (const name of ["retry-after", "x-sentry-rate-limits"]) {
      const value = upstream.headers.get(name);
      if (value !== null) headers.set(name, value);
    }
    await upstream.body?.cancel();
    const status = upstream.status >= 300 && upstream.status < 400
      ? 502
      : upstream.status;
    return new Response(null, { status, headers });
  } catch {
    return new Response(null, { status: 502 });
  }
}
```

The endpoint inspects only the first envelope header and preserves the original body. Splitting the entire envelope into text lines and serializing it again can corrupt attachments or length-delimited payloads. Sentry's [envelope implementation](https://github.com/getsentry/sentry-javascript/blob/10.74.0/packages/core/src/utils/envelope.ts) handles both text and binary payloads; a proxy should not need to reinterpret them.

## Know what the checks establish

Exact DSN comparison binds the public key, host, and project together. A request containing another project or an internal IP address fails before `fetch`. The actual destination remains a constant even after validation. Redirects are not followed, so a misconfigured upstream cannot redirect the proxy elsewhere.

The `Origin` check restricts ordinary browser submissions to the application origin. It is not authentication: a non-browser client can forge the header, and the DSN is public. Attackers can still submit junk to your allowed project. Enforce request-rate and byte-rate limits at a shared gateway, consider an existing application session when appropriate, and monitor rejection counts. Do not embed a supposed secret token in browser JavaScript.

The handler intentionally rejects compressed request bodies. If you add compression support, bound the decompressed size as well as the compressed size. Similarly, verify how your framework transforms incoming bodies before using a raw-body handler. Avoid middleware that parses the envelope as one JSON object.

## Preserve failure signals and test the boundary

Forwarding `429` and rate-limit headers lets the SDK respond to upstream limits. Sentry's [transport rate-limit code](https://github.com/getsentry/sentry-javascript/blob/10.74.0/packages/core/src/utils/ratelimit.ts) interprets both category-specific limits and retry delays. Returning success unconditionally creates silent data loss and unnecessary continued traffic during rate-limit windows.

Use a stub upstream for local checks. Send a valid envelope containing binary bytes and assert that the outgoing bytes are identical. Then test malformed JSON, no newline, an oversized body without `Content-Length`, a different DSN, a forged destination, an upstream redirect, a `429`, and a timeout. Rejected destinations must result in zero outbound requests.

Finally, send one controlled error through the real deployed route and confirm it in the expected project. Record tunnel latency and status counts using infrastructure metrics. Avoid capturing tunnel failures back through the same tunnel, which can create recursive reporting. A failed tunnel should remain visible without making the monitoring endpoint generate more monitoring traffic.

## References

- [Sentry tunnel configuration](https://docs.sentry.io/platforms/javascript/troubleshooting/#using-the-tunnel-option)
- [Sentry SDK transport options](https://docs.sentry.io/platforms/javascript/configuration/options/)
- [Sentry JavaScript envelope encoding](https://github.com/getsentry/sentry-javascript/blob/10.74.0/packages/core/src/utils/envelope.ts)
- [Sentry JavaScript rate-limit handling](https://github.com/getsentry/sentry-javascript/blob/10.74.0/packages/core/src/utils/ratelimit.ts)
