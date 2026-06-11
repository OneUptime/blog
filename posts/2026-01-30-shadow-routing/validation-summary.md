# Validation Summary: How to Build Shadow Routing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- TypeScript / Node.js
- Express (web framework)
- axios (HTTP client)
- prom-client (Prometheus metrics library)
- Prometheus (PromQL queries)
- Grafana (dashboard JSON)
- Kubernetes (Deployment, Service, NetworkPolicy, ConfigMap)
- Istio (VirtualService traffic mirroring)
- Mermaid (diagrams)

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio Mirroring task: https://istio.io/latest/docs/tasks/traffic-management/mirroring/
- prom-client README: https://github.com/siimon/prom-client
- MDN `String.prototype.substr` (deprecation): https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/substr
- Express 5 migration guide: https://expressjs.com/en/guide/migrating-5.html
- Kubernetes NetworkPolicy reference: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Prometheus `histogram_quantile` docs: https://prometheus.io/docs/prometheus/latest/querying/functions/#histogram_quantile

## Issues Found
- **Deprecated `String.prototype.substr`**: The `generateRequestId` helper used `Math.random().toString(36).substr(2, 9)`. `substr` is a legacy/deprecated method per MDN. Changed to `slice(2, 11)` to preserve identical behavior (same 9 characters, indices 2–10 inclusive) using a non-deprecated API.

## Review Notes
- The Istio `mirrorPercentage: { value: 10.0 }` syntax under `networking.istio.io/v1beta1` is correct; the older integer `mirrorPercent` field is the deprecated form, not this one.
- `prom-client` usage (Counter / Histogram / Gauge constructor options and `await register.metrics()` returning a Promise<string>) matches the current API.
- The Express route handler uses `app.all('*', ...)`. This works in Express 4 (still widely used) but Express 5 changed path-to-regexp behavior and requires a named wildcard such as `app.all('/{*splat}', ...)`. The post does not specify an Express version, so this is a forward-compatibility caveat rather than an incorrect example.
- Stacking `express.json()` with `express.raw({ type: '*/*' })` will produce a Buffer body for non-JSON requests, which when re-emitted via axios with the original headers spread in can lead to `Content-Length`/`Content-Type` mismatches. Functional in most cases but worth tightening in a production proxy.
- `compareResponses` relies on `JSON.stringify` equality, which is order-sensitive on object keys — the post calls this out implicitly by labeling it a "Deep comparison - customize based on your needs" and follows up with the more robust `ResponseComparator`.
- `isTimestamp` (in `ResponseComparator`) is permissive: `new Date(str).getTime()` returns a valid time for many non-date strings on some engines. Acceptable for an illustrative comparator but could yield false positives in practice.
- The `sleep`, `collectMetrics`, `kubectl.apply`, `User`, and `emailService` symbols in the promotion / service snippets are implied helpers and not defined inline — clearly intended as illustrative pseudocode within real TypeScript.
- The NetworkPolicy egress rule with `cidr: 10.0.0.0/8` is an allow-list (only internal traffic permitted); the inline comment "Block external APIs" describes the effect, not the rule type, which can be slightly confusing on first read but is technically accurate.
