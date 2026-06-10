# Validation Summary: How to Implement the Strangler Fig Pattern

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Express.js (Node.js)
- http-proxy-middleware
- LaunchDarkly Node.js Server SDK
- NGINX (upstream, map, split_clients directives)
- axios (Node.js HTTP client)
- Debezium (PostgreSQL connector / Kafka Connect)
- Apache Kafka
- Kubernetes
- Istio (VirtualService)
- kubectl (JSON patch)
- Prometheus / prom-client
- PromQL / Grafana
- Mermaid diagrams

## Sources Consulted
- Debezium PostgreSQL connector documentation: https://debezium.io/documentation/reference/stable/connectors/postgresql.html
- Debezium Docker images on Docker Hub: https://hub.docker.com/r/debezium/connect/tags
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- http-proxy-middleware (npm): https://www.npmjs.com/package/http-proxy-middleware
- prom-client (GitHub): https://github.com/siimon/prom-client
- NGINX directive index: https://nginx.org/en/docs/dirindex.html
- Express.js routing docs: https://expressjs.com/en/guide/routing.html
- LaunchDarkly Node.js Server SDK docs: https://docs.launchdarkly.com/sdk/server-side/node-js

## Issues Found
1. **Debezium Docker image tag** — The post used `debezium/connect:2.4`, but Debezium does not publish a bare `2.4` floating tag on Docker Hub. Actual published tags use the `.Final` suffix (e.g., `2.4.0.Final`, `2.4.2.Final`). Updated the tag to `debezium/connect:2.4.2.Final`, which is a real released tag and matches Debezium's official tagging convention.

## Review Notes
- The Debezium connector configuration uses the modern `topic.prefix` key (introduced in Debezium 2.0 to replace `database.server.name`), which is correct for the 2.x line referenced.
- The Istio VirtualService uses `apiVersion: networking.istio.io/v1alpha3`. This is still accepted by current Istio versions for backward compatibility, but `networking.istio.io/v1beta1` (or `v1` in Istio 1.22+) is the more current choice. Not a factual error, just slightly dated.
- The `http-proxy-middleware` import pattern (`require('http-proxy-middleware')` then `httpProxy.createProxyMiddleware(...)`) works for v2 and v3. The more commonly documented form is the named import `const { createProxyMiddleware } = require('http-proxy-middleware')`, but both are valid.
- The LaunchDarkly example uses the legacy user context shape `{ key: userId }`. The Node.js SDK v7+ introduced LDContext objects with a `kind` field (e.g., `{ kind: 'user', key: userId }`), but the legacy user object is still backward compatible.
- `app.use('/api/*', ...)` patterns combined with `req.baseUrl` / `req.path` parsing can be fragile depending on Express version and the exact path. The examples convey the architectural pattern correctly, but production code would typically use parameterized routes or explicit path inspection via `req.originalUrl`.
- All NGINX directives (`upstream`, `map`, `split_clients`, `proxy_pass http://$variable`) are valid and documented.
- The prom-client constructor signatures (Counter / Histogram / Gauge with `name`, `help`, `labelNames`, optional `buckets`) match the current API.
- The Istio JSON patch in the shell script correctly targets `/spec/http/1/route/{0,1}/weight`, which aligns with the YAML structure earlier in the post (the products rule is at `http[1]` with legacy at `route[0]` and new at `route[1]`).
