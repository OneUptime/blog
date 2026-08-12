# How to Control High-Cardinality Browser Telemetry from URLs, User IDs, and Session Attributes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Browser Monitoring, OpenTelemetry, Cardinality, Real User Monitoring, Data Governance

Description: Keep browser telemetry queryable and affordable by normalizing URLs, separating identities from dimensions, and enforcing attribute budgets.

---

Browser telemetry begins with harmless-looking strings: the current URL, a user ID, a session ID, a component name, and a few feature flags. If those values become metric labels or indexed tags, each new metric label set can create another time series, while unique indexed values enlarge backend index structures. A URL containing an order UUID combined with a user ID and observability session ID is often near-unique across the event population. Storage grows, dashboards slow down, and the dimensions operators actually need are buried in noise.

Cardinality control is a schema-design problem, not a cleanup job for the billing dashboard. Decide which fields are aggregatable dimensions, which are high-cardinality correlation keys, and which must never leave the browser. Normalize before the telemetry SDK observes a value, enforce limits again at the collector or intake service, and measure what is dropped.

## Understand the Multiplication

Ten route templates, five browser families, three device classes, and four release channels have at most 600 combinations. Add 500,000 user IDs and that theoretical space becomes 300 million combinations. Prometheus's official naming guidance warns that each unique label set is a new time series and specifically says not to use unbounded values such as user IDs or email addresses as labels.

The same risk exists outside metrics. A tracing or RUM backend may permit high-cardinality attributes, but indexing every session ID, full URL, DOM selector, and exception message still consumes resources. Apply a field policy by signal:

| Field class | Metrics | Traces/events | Replay |
| --- | --- | --- | --- |
| route template | label | indexed attribute | metadata |
| release ID | label if bounded | indexed attribute | metadata |
| raw user ID | never | restricted correlation field, if justified | normally omit |
| random observability session ID | never | correlation field with retention limit | replay key |
| full URL | never | scrubbed, non-indexed detail if needed | sanitized navigation event |
| query or fragment | never | allowlisted and scrubbed only | normally remove |

Here, an observability session ID is a dedicated correlation identifier, never an authentication session token.

“High cardinality” and “sensitive” are separate properties. A country code is low-cardinality but may still be sensitive in context. A random cache-buster need not be personal, yet it is disastrous as a metric label.

## Normalize URLs to Route Templates

Do not group by `location.href` or raw pathname. Prefer the application's router template, such as `/orders/:orderId`, because the router knows which segments are variables. OpenTelemetry defines `url.template` specifically as a low-cardinality path template, though its current registry marks that attribute as development status; pin the semantic-convention version used by your pipeline.

When a router cannot expose a template, use an explicit ordered route table:

~~~javascript
const routes = [
  { pattern: new URLPattern({ pathname: '/products/:sku' }), name: '/products/:sku' },
  { pattern: new URLPattern({ pathname: '/orders/:orderId' }), name: '/orders/:orderId' },
  { pattern: new URLPattern({ pathname: '/account' }), name: '/account' },
];

function routeTemplate(input = location.href) {
  const url = new URL(input, location.origin);
  return routes.find(({ pattern }) => pattern.test(url))?.name ?? '/__unmatched__';
}
~~~

Do not replace every numeric or UUID-looking segment with a wildcard blindly. `/v2` and `/2026/08` may be meaningful bounded routes, while product slugs should be treated as variables unless they come from a reviewed bounded set. An allowlisted route table is safer, and `/__unmatched__` makes schema drift observable without exporting the unknown path as a new label.

Normalize network destinations separately. Keep bounded fields such as `http.request.method=GET`, `server.address=api.example.com`, and `url.template=/orders/{id}` rather than grouping by the entire URL. OpenTelemetry's URL conventions say `url.full` must not contain URL credentials and that identifiable sensitive content in full URLs, paths, and queries should be scrubbed. They also define a default list of signed-URL query values that should be redacted, but that short list is not a complete policy for an application.

## Strip Queries and Fragments by Default

Query strings routinely contain search terms, email addresses, tokens, document IDs, and signed-cloud credentials. Fragments are not sent in HTTP requests, but browser code can still record them. Start with neither, then allowlist low-cardinality keys whose values have a closed vocabulary.

~~~javascript
const allowedQueryValues = {
  sort: new Set(['price', 'rating', 'newest']),
  view: new Set(['grid', 'list']),
};

function safeUrlFields(input) {
  const url = new URL(input, location.origin);
  const query = {};

  for (const [key, allowed] of Object.entries(allowedQueryValues)) {
    const value = url.searchParams.get(key);
    if (value && allowed.has(value)) query[key] = value;
  }

  return {
    origin: url.origin,
    route: routeTemplate(url.href),
    query,
  };
}
~~~

Never send a redacted secret's length, prefix, or stable digest unless there is a reviewed need; those can still aid correlation or guessing. If investigation needs a particular request, correlate through a random request or trace ID generated for observability, not a credential already present in the URL.

## Keep Identity Out of Aggregation Dimensions

A user ID can help support investigate one reported session, but it should not be a metric label or a default dashboard facet. Use three distinct concepts:

- **cohort dimensions:** bounded values such as `plan_tier=free|team|enterprise`;
- **correlation identifiers:** random observability session, trace, and request IDs stored in controlled fields;
- **business identity:** account or user keys held in the application system of record.

If support needs a lookup from a known account to telemetry, perform it through an access-controlled service that returns short-lived correlation IDs. Do not make the observability index a shadow customer database. A one-way hash of a user ID does not materially reduce cardinality and is usually pseudonymous rather than anonymous; if the input space is guessable, an unkeyed hash can be matched by enumeration.

When a stable pseudonym is justified, create it server-side using a keyed construction, rotate the key according to policy, scope it to a tenant or purpose, and keep it out of metric dimensions. Browser bundles cannot safely hold a secret HMAC key.

## Put a Budget on Attributes

OpenTelemetry's common specification recommends limits because erroneous instrumentation can exhaust memory. For attribute collections covered by those limits, it defines a default general attribute-count limit of 128 and an unlimited default value-length limit, while allowing model-specific limits. Resource attributes should be exempt, and metric attributes are exempt; the Metrics SDK specification instead defines a separate aggregation cardinality limit and recommends a default of 2,000 data points per metric per collection cycle when neither a View nor MetricReader supplies one. These are specification defaults and safeguards, not good browser application defaults.

Create a much smaller application contract, for example:

~~~javascript
const allowed = {
  'app.release': { max: 64 },
  'page.route': { max: 120 },
  'browser.family': { max: 24 },
  'device.class': { max: 16 },
  'feature.checkout': { max: 16 },
};

function sanitizeAttributes(candidate) {
  const output = {};
  for (const [key, policy] of Object.entries(allowed)) {
    const value = candidate[key];
    if (typeof value === 'string') output[key] = value.slice(0, policy.max);
  }
  return output;
}
~~~

An allowlist prevents arbitrary component props, `data-*` attributes, and experiment parameters from becoming telemetry. Truncation controls size but not cardinality: the first 64 characters of a UUID-bearing URL are still likely unique. Apply value-set checks to bounded dimensions and route normalization before length limits.

Also cap event counts, breadcrumbs, stack frames, and replay metadata according to the SDK's supported options. For Prometheus, emit a counter such as `browser_telemetry_attributes_dropped_total{reason="unknown_key"}` using only bounded reason values.

## Enforce the Contract Twice

Client-side control reduces CPU and bandwidth, but a browser is an untrusted source and old cached bundles remain active. Repeat policy at the intake boundary or OpenTelemetry Collector:

1. Delete prohibited attributes.
2. Replace raw paths with a trusted route if one is available.
3. Drop query strings and fragments.
4. Validate enumerated values.
5. Limit string sizes and attribute counts.
6. Route correlation keys to restricted, short-retention storage.
7. Reject or quarantine schema versions that violate hard policy.

Collector processors can transform or redact telemetry, but do not postpone obvious secret removal until after data has crossed the network. A backend rule is defense in depth, not permission for the browser to send everything.

Version the schema with an application-owned attribute such as `myapp.telemetry.schema_version`. Roll out new keys through review, document their purpose, owner, allowed values, sensitivity, indexing status, and retention. Remove stale dimensions; giving a bounded flag a new attribute name every week creates schema and series churn and increases the number of retained label sets over time.

## Detect a Cardinality Incident Early

Monitor the telemetry pipeline itself:

- distinct values per field over a fixed window;
- new values per minute, not just total distinct values;
- active time series and index size by application and release;
- top route templates plus the `/__unmatched__` rate;
- events rejected, truncated, or stripped by rule;
- average payload bytes and attributes per browser event;
- query latency for standard dashboards.

Set budgets based on expected bounded sets. A browser-family field with 4,000 new values in an hour is probably carrying a raw user-agent string. A release field should use one immutable application build ID, not a per-request timestamp. Stop the offending field at intake while preserving safe core telemetry.

## Official Documentation

- [OpenTelemetry URL semantic-convention attributes](https://opentelemetry.io/docs/specs/semconv/registry/attributes/url/)
- [OpenTelemetry common attribute limits](https://opentelemetry.io/docs/specs/otel/common/#attribute-limits)
- [OpenTelemetry Metrics SDK cardinality limits](https://opentelemetry.io/docs/specs/otel/metrics/sdk/#cardinality-limits)
- [OpenTelemetry browser resource semantic conventions](https://opentelemetry.io/docs/specs/semconv/resource/browser/)
- [OpenTelemetry guidance for handling sensitive data](https://opentelemetry.io/docs/security/handling-sensitive-data/)
- [Prometheus metric and label naming](https://prometheus.io/docs/practices/naming/)
- [MDN `URLPattern` API](https://developer.mozilla.org/en-US/docs/Web/API/URLPattern)
- [OWASP Logging Cheat Sheet data-exclusion guidance](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html#data-to-exclude)

## Conclusion

Control browser cardinality by making aggregation intentional. Use router-derived templates instead of raw URLs, omit queries and fragments unless a bounded allowlist proves their value, and keep user and session identities out of metric labels. Enforce a small attribute schema in the client and again at intake, while monitoring distinct-value growth and dropped fields. The goal is not merely fewer bytes: it is telemetry whose dimensions remain safe, affordable, and useful during an incident.
