# Replay the Original Status, Headers, and Body on Idempotent Retries

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Idempotency, HTTP, Node.js, PostgreSQL, API Design

Description: Persist response bytes and selected semantic headers with the business result, then replay them safely while regenerating transport and per-request metadata.

---

A duplicate create request should not return a newly invented `200` body if the original response was `201` with a `Location` header. Clients may use the status, resource link, and representation together to decide what happened.

Response replay needs a concrete contract. For a small JSON mutation endpoint, a practical promise is the original status, body bytes, and selected semantic headers. Transport details and metadata about the current HTTP exchange are generated again.

The distinction matters when a response contains an old request ID, a cookie, compressed content, or headers that describe the previous connection.

## Persist the response before sending it

For a local SQL operation, follow this order:

```text
begin database transaction
claim scoped idempotency key and validate fingerprint
perform the business write
serialize the response exactly once
store status, approved headers, and response bytes
commit the transaction
send the stored representation
```

If serialization fails, the business write should still be rollbackable. If sending fails after commit, the complete result remains available for the retry.

Avoid trying to reconstruct the response in a network `finish` callback. At that point the business transaction and response transmission may already have diverged. An explicit result object passed through the transaction is easier to reason about than middleware that intercepts every framework response method.

## Store bytes when bytes are the promise

```sql
CREATE TABLE saved_http_results (
    tenant_id text NOT NULL,
    operation text NOT NULL,
    idempotency_key text NOT NULL,
    request_hash text NOT NULL,
    status_code integer NOT NULL,
    headers jsonb NOT NULL,
    body bytea NOT NULL,
    PRIMARY KEY (tenant_id, operation, idempotency_key),
    CHECK (status_code BETWEEN 200 AND 599)
);
```

The table contains completed results; ownership arbitration must be part of the surrounding transaction design. `headers` can be an array of name/value pairs, while `body` contains the already-serialized bytes.

PostgreSQL's [`bytea` type](https://www.postgresql.org/docs/current/datatype-binary.html) stores binary strings. Storing a JSON object instead and serializing it later can change whitespace, property ordering, escaping, or numeric formatting. It might satisfy a semantic-equivalence contract, but not an exact-byte contract.

Apply a response-size limit before committing. Large exports are usually better represented by an operation ID and a durable artifact reference, with an explicit policy for expired download URLs.

## Select headers by meaning

For this endpoint, save `Content-Type`, `Content-Language`, `Location`, and `ETag` when present. Treat these as server-generated values and validate them before storage.

Regenerate `Date` and the current request ID. Exclude `Connection`, `Transfer-Encoding`, and other connection-specific information. Do not blindly replay `Set-Cookie`, authentication challenges, or old quota headers.

The [HTTP semantics specification](https://www.rfc-editor.org/rfc/rfc9110.html) defines fields such as `Location`, representation metadata, and connection handling. Your endpoint still needs its own allowlist because generic HTTP rules do not know which application headers are safe to reuse.

For authenticated mutation responses, an explicit `Cache-Control: no-store` policy can prevent intermediary caching while your application maintains its private idempotency store. Those are separate mechanisms.

## Send a saved representation with Node.js

This function targets Node's native `ServerResponse` for an endpoint with bounded, identity-encoded response bodies. It expects authorization and fingerprint checks to have completed and a database adapter to return `body` as a `Buffer`.

```javascript
const replayableHeaders = new Set([
  'content-type', 'content-language', 'location', 'etag',
]);

function sendSavedResult(res, saved, currentRequestId, replayed) {
  if (!Buffer.isBuffer(saved.body)) {
    throw new TypeError('saved.body must be a Buffer');
  }
  if (!Number.isInteger(saved.status_code) ||
      saved.status_code < 200 || saved.status_code > 599) {
    throw new TypeError('invalid saved status');
  }
  const bodyForbidden = [204, 205, 304].includes(saved.status_code);
  if (bodyForbidden && saved.body.length !== 0) {
    throw new TypeError('this status requires an empty saved body');
  }
  res.statusCode = saved.status_code;
  for (const [name, value] of saved.headers) {
    const lower = name.toLowerCase();
    if (replayableHeaders.has(lower)) {
      res.setHeader(lower, value);
    }
  }
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Request-ID', currentRequestId);
  res.setHeader('Idempotency-Replayed', replayed ? 'true' : 'false');
  if (![204, 304].includes(saved.status_code)) {
    res.setHeader('Content-Length', String(saved.body.length));
  }
  res.end(saved.body);
}
```

`Idempotency-Replayed` is a custom header in this example. Use a fresh response object with no prewritten body or transport headers, and supply a trusted current request ID. Node documents [`setHeader`, `statusCode`, and `end`](https://nodejs.org/api/http.html#class-httpserverresponse) in its HTTP server API.

Send the first response through this same function with `replayed=false`. That prevents the initial and duplicate paths from acquiring different serialization rules.

## Handle compression and embedded metadata explicitly

The function sends the stored uncompressed representation and does not set `Content-Encoding`. If a proxy compresses responses, network bytes may differ between attempts even though the application representation is identical. Define the promise at the appropriate layer.

If you store compressed bytes instead, persist their content encoding and send those bytes without compressing again. Request negotiation must also be compatible with the saved representation. An endpoint that offers several representation formats should include the relevant negotiation inputs in its fingerprint or constrain the response format.

If the body embeds an original support ID, keep it as the original execution reference. The current `X-Request-ID` identifies the replay attempt. Log their relationship rather than rewriting the body and claiming exact replay.

For an asynchronous `202` result, the stored response can remain the original acceptance acknowledgment while a separate operation URL exposes current progress. Replaying acceptance should not restart the worker.

## Test the wire-facing contract

Capture the original and duplicate responses and compare status, approved headers, and body bytes. Include Unicode text so a character-count `Content-Length` bug becomes visible.

Simulate a disconnected client after commit, an application deployment that changes JSON serialization, and a response containing a deliberately excluded cookie. Verify that the duplicate still returns the stored representation while fresh request metadata changes.

## Conclusion

Serialize once, commit the response with the business result, and replay through an explicit header policy. Keep application representation stable while letting the HTTP server regenerate exchange-specific details. That gives clients a reliable answer after a lost response without repeating the operation.

## Official Documentation

- [PostgreSQL binary data types](https://www.postgresql.org/docs/current/datatype-binary.html)
- [Node.js HTTP ServerResponse](https://nodejs.org/api/http.html#class-httpserverresponse)
- [HTTP semantics](https://www.rfc-editor.org/rfc/rfc9110.html)
