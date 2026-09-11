# Prevent Correlation ID Injection, Cardinality, and Header Abuse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Correlation ID, Security, Logging, HTTP, Observability

Description: Bound correlation metadata at trust boundaries, reject ambiguous headers, emit structured logs, and avoid turning unique request IDs into expensive metric or Loki labels.

---

Correlation IDs come from a transport boundary and often reach every log line produced by a request. That amplification makes them worth validating: a long or malicious value can spread across services, corrupt text logs, or create expensive telemetry dimensions.

Protect three separate surfaces. Limit the transport before parsing, normalize the chosen identifier before propagation, and store it in telemetry fields suited to unique values. A valid-looking ID still does not authenticate the caller.

## Use a narrow, bounded identifier contract

The following Node.js function accepts one 32-character lowercase hexadecimal value only when the caller is already trusted to supply it. Otherwise it generates a fresh value:

```javascript
import { randomBytes } from 'node:crypto';

export function selectCorrelationId(values, trusted) {
  const generated = () => randomBytes(16).toString('hex');
  if (!trusted) return { id: generated(), reason: 'untrusted' };
  if (values.length === 0) return { id: generated(), reason: 'missing' };
  if (values.length !== 1) return { id: generated(), reason: 'duplicate' };
  const value = values[0];
  if (typeof value !== 'string' || value.length !== 32
      || !/^[0-9a-f]{32}$/.test(value)) {
    return { id: generated(), reason: 'invalid' };
  }
  return { id: value, reason: 'accepted' };
}
```

Use the header occurrences supplied by your HTTP stack. On current supported Node releases, `request.headersDistinct['x-correlation-id']` provides an array without the normal joining behavior. Validate duplicates before choosing a value.

Do not truncate a long value to fit the contract. Two distinct attacker-chosen strings can collapse to the same truncated ID, and the logged value would no longer describe what downstream services received. Replace or reject the entire value according to policy.

A UUID or another opaque format is also suitable if consistently bounded. The critical properties are predictable syntax, reasonable size, clear ownership, and no sensitive business data encoded into the value.

## Limit headers before application middleware

Application validation happens after the HTTP server parses the request. Configure parser and proxy limits so oversized metadata cannot consume unrestricted resources first.

For a Node HTTP server, a configuration can include:

```javascript
import http from 'node:http';

const server = http.createServer({
  maxHeaderSize: 16 * 1024,
  headersTimeout: 10_000,
  requestTimeout: 30_000,
}, (req, res) => {
  const values = req.headersDistinct['x-correlation-id'] ?? [];
  const selected = selectCorrelationId(values, false);
  res.setHeader('X-Correlation-ID', selected.id);
  console.log(JSON.stringify({
    event: 'http.received',
    correlation_id: selected.id,
    correlation_reason: selected.reason,
  }));
  res.end('ok');
});
server.listen(3000, '127.0.0.1');
```

Combine this with the function above in one `.mjs` file. The public server deliberately passes `false`; an authenticated internal listener can use its verified trust decision.

These are illustrative limits, not universal capacity settings. Align them with legitimate cookies, authentication headers, proxies, and the actual request budget. Configure corresponding limits at the outer gateway because an application limit cannot protect an earlier proxy.

The [Node HTTP documentation](https://nodejs.org/api/http.html) describes parser size limits, timeouts, and distinct header values. A rejected malformed request may never reach this callback, so its diagnostics belong to the HTTP server or edge error path.

## Use structured serialization for logs

Write selected metadata as a field through the logger's JSON encoder. Do not build a raw line like `correlation_id=` followed by an unchecked header value. Line breaks and delimiters can create fake-looking records in text-oriented pipelines.

Also avoid writing the rejected raw value into an “invalid ID” log. Record a bounded reason such as `duplicate`, `invalid`, or `untrusted`, and optionally a safely bounded length. Diagnostic rejection paths need the same input discipline as normal logging paths.

JSON escaping is defense in depth, not permission to accept unlimited values. A properly escaped megabyte string can still increase ingestion cost and overwhelm a viewer. Validation and serialization solve different parts of the problem.

OWASP's [logging guidance](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html) discusses input validation, sanitization, and avoiding sensitive data in logs.

## Keep unique IDs out of metric and stream labels

A unique correlation ID per request is naturally high cardinality. That is useful for exact searches in log fields but expensive as a Prometheus-style metric label or a Loki stream label.

Use bounded dimensions for counters:

```text
correlation_ids_total{source="generated",reason="missing"} 142
correlation_ids_total{source="generated",reason="invalid"} 3
correlation_ids_total{source="accepted",reason="valid"} 920
```

Do not add `correlation_id` to that label set. In Loki, retain it in JSON content or supported structured metadata and select streams using stable labels such as service and environment.

In Elasticsearch, use a bounded `keyword` field for exact ID matching. Do not create a new field name, index, or dynamic object path for every ID. Field names must be stable even when field values are unique.

Grafana's [Loki cardinality guidance](https://grafana.com/docs/loki/latest/get-started/labels/cardinality/) explains why high-cardinality labels fragment streams and increase overhead.

## Test abusive values and normal concurrency

Exercise missing values, duplicate fields, whitespace, control characters where your test client permits them, Unicode, and very large values. Some malformed cases will be rejected by the HTTP parser before your application sees them; that is expected.

Verify that no raw rejected input appears in logs, accepted internal values propagate consistently, and public requests receive fresh IDs. Inspect telemetry series and Loki label sets after a high-volume test to confirm unique IDs were not promoted into unbounded dimensions.

## Conclusion

Bound correlation metadata at the parser and application layers, normalize it before propagation, and emit it through structured logging. Use exact IDs in searchable fields while keeping metric and stream labels bounded, so request correlation stays useful under both normal traffic and abusive input.

## Official Documentation

- [Node.js HTTP limits and header APIs](https://nodejs.org/api/http.html)
- [OWASP logging cheat sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)
- [Loki label cardinality](https://grafana.com/docs/loki/latest/get-started/labels/cardinality/)
- [Elasticsearch keyword fields](https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/keyword)
