# Expose Response Correlation IDs to Browsers with CORS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Correlation ID, CORS, HTTP, JavaScript, Security

Description: Expose an opaque support ID through CORS, configure credentialed origins correctly, and keep internal trace metadata out of public HTTP responses.

---

A response can contain `X-Correlation-ID` in the browser's network panel while `response.headers.get('X-Correlation-ID')` returns `null`. Cross-origin JavaScript only sees the response headers allowed by the Fetch/CORS rules.

Expose the public support header explicitly and keep internal trace context out of the response. CORS visibility is a browser access rule, not a mechanism for making data sent over the network secret.

## Distinguish allow headers from expose headers

Two similarly named CORS headers serve different directions:

| Header | What it controls |
| --- | --- |
| `Access-Control-Allow-Headers` | request headers the browser may send after preflight |
| `Access-Control-Expose-Headers` | response headers browser JavaScript may read |

To read an ID assigned by the server, configure `Access-Control-Expose-Headers: X-Correlation-ID`. You do not need to add that field to `Access-Control-Allow-Headers` unless the browser also sends it as a request header.

If the application uses credentials, explicitly name the exposed header. Under the Fetch standard, `*` does not act as an unrestricted exposure wildcard for credentialed requests. Also use the allowed origin's exact value rather than `Access-Control-Allow-Origin: *` with credentials.

The [Fetch standard](https://fetch.spec.whatwg.org/#http-access-control-expose-headers) defines these response visibility rules.

## Return one public support ID

This complete Express 5 example serves a local API for a frontend at `http://localhost:3001`. Save it as `api.mjs` after installing `express@5`:

```javascript
import express from 'express';
import { randomUUID } from 'node:crypto';

const app = express();
const allowedOrigins = new Set(['http://localhost:3001']);

app.use((req, res, next) => {
  const correlationId = randomUUID();
  res.locals.correlationId = correlationId;
  res.setHeader('X-Correlation-ID', correlationId);
  res.vary('Origin');
  const origin = req.get('Origin');
  const allowed = origin && allowedOrigins.has(origin);
  if (allowed) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Expose-Headers', 'X-Correlation-ID');
  }
  if (req.method === 'OPTIONS') {
    if (!allowed) return res.sendStatus(403);
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    return res.sendStatus(204);
  }
  next();
});

app.get('/example', (req, res) => {
  console.log(JSON.stringify({
    event: 'request.failed',
    correlation_id: res.locals.correlationId,
  }));
  res.status(503).json({ error: 'temporarily_unavailable' });
});
app.listen(3000, '127.0.0.1');
```

The route deliberately returns an error so you can verify that the support header remains readable on failure. Add your normal authentication, authorization, and complete route-specific CORS request policy for a real API.

The example allows a credentialed GET without custom request headers. If your frontend sends `Authorization`, JSON POST requests, or other non-safelisted request fields, configure the corresponding allowed methods and headers for preflight. Do not reflect arbitrary requested header names without a policy.

## Read the ID from the frontend

Serve this code from the allowed frontend origin:

```javascript
const response = await fetch('http://localhost:3000/example', {
  credentials: 'include',
});
const correlationId = response.headers.get('X-Correlation-ID');
if (!response.ok) {
  document.querySelector('#error').textContent =
    `Request failed. Support reference: ${correlationId ?? 'unavailable'}`;
}
```

A 503 still produces a `Response` when CORS succeeds. A CORS failure or network failure can reject `fetch` instead, leaving no readable response headers. Handle that separate path with a generic connection error and any client-side diagnostic reference you maintain.

Do not switch to `mode: 'no-cors'` to solve exposure. An opaque response is not a way to access the hidden header or error body.

## Keep internal tracing metadata internal

Return an opaque application support ID and record its association with `trace_id` and `span_id` in server logs. Do not echo `tracestate`, baggage, internal service names, or arbitrary incoming headers into public responses.

Simply omitting a header from `Access-Control-Expose-Headers` does not prevent a command-line client, proxy, extension, or same-origin script from reading bytes the server sent. If internal trace context must not be public, remove it from the actual response at the application or gateway.

An opaque correlation ID must also remain a lookup key, not an authorization capability. Any support or trace retrieval endpoint needs its normal access controls even when a user provides a valid-looking reference.

## Make caches and gateways preserve the policy

When allowed origins vary by request, `Vary: Origin` prevents a shared cache from confusing responses prepared for different origins. Coordinate with existing `Vary` fields rather than replacing them.

For cached API responses, decide whether the support ID represents the original application computation or the current edge delivery. A cached header can otherwise refer to an earlier request. Generate the current delivery ID at the serving edge if that is the intended support contract.

Configure CORS on gateway-generated errors too. If an upstream timeout is produced by the gateway without CORS headers, the browser may hide the response even though normal application errors work. Check authentication rejection, rate limiting, and body-size failure paths at their actual owner.

## Verify from a real browser

Use developer tools to compare the wire response with what JavaScript can read. Test the allowed origin, a disallowed origin, credentials enabled, application 503 responses, and gateway errors. Confirm there is exactly one public correlation header and that it matches a searchable server record.

A command-line request is useful for inspecting headers but does not enforce browser CORS rules. Keep a browser-based check for the behavior that matters to the frontend.

## Conclusion

Expose `X-Correlation-ID` explicitly as a response header, configure origin and credential rules consistently, and test error paths from the browser. Keep internal trace metadata out of public responses and use the support ID to navigate to authorized server-side diagnostics.

## Official Documentation

- [Fetch standard: CORS response headers](https://fetch.spec.whatwg.org/#http-access-control-expose-headers)
- [Express middleware](https://expressjs.com/en/guide/using-middleware/)
- [W3C Trace Context security considerations](https://www.w3.org/TR/trace-context/#security-considerations)
