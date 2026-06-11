# Validation Summary: How to Implement Service Maps

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- OpenTelemetry JavaScript SDK (`@opentelemetry/api`, `@opentelemetry/sdk-node`, `@opentelemetry/auto-instrumentations-node`, `@opentelemetry/sdk-trace-base`, `@opentelemetry/resources`, `@opentelemetry/semantic-conventions`)
- OTLP HTTP trace exporter (`@opentelemetry/exporter-trace-otlp-http`)
- OpenTelemetry semantic conventions (resource attributes, span kinds, HTTP/DB/messaging attributes, `peer.service`)
- W3C Trace Context (`traceparent` header propagation)
- TypeScript / Node.js
- PostgreSQL (`pg` driver, schema with `ON CONFLICT` upsert, `JSONB`, hourly rollup tables)
- React + D3.js (force-directed graph visualization, drag handlers, arrow markers)
- Mermaid diagrams (graph, flowchart, sequenceDiagram)
- AWS Lambda / Kubernetes / canary deployment naming patterns

## Sources Consulted
- OpenTelemetry JS exporters on npm — `@opentelemetry/exporter-trace-otlp-http` is the correct per-signal package for trace OTLP/HTTP export; `@opentelemetry/exporter-otlp-http` is not a published package.
- OpenTelemetry semantic conventions package — https://www.npmjs.com/package/@opentelemetry/semantic-conventions (stable `ATTR_SERVICE_NAME`, `ATTR_SERVICE_VERSION`, and `ATTR_DEPLOYMENT_ENVIRONMENT_NAME` constants).
- OpenTelemetry resource semantic conventions — https://opentelemetry.io/docs/specs/semconv/resource/ (`deployment.environment.name` superseded `deployment.environment`).
- OpenTelemetry SDK trace `ReadableSpan` definition — https://open-telemetry.github.io/opentelemetry-js/ (confirms `kind`, `parentSpanId`, `spanContext()`, `startTime`, `endTime`, `resource`, `attributes`, `status`).
- OpenTelemetry API `SpanKind` (`CLIENT = 2`, `SERVER = 1`) and `SpanStatusCode` (`UNSET = 0`, `OK = 1`, `ERROR = 2`) enums.
- D3.js v7 docs — `forceSimulation`, `forceLink`, `forceManyBody`, `forceCenter`, `forceCollide`, `drag()` (https://d3js.org/d3-force, https://d3js.org/d3-drag).
- PostgreSQL `ON CONFLICT ... DO UPDATE` and `JSONB` docs — https://www.postgresql.org/docs/current/sql-insert.html.
- `pg` (node-postgres) `Pool.connect()` / transaction pattern — https://node-postgres.com/features/transactions.

## Issues Found

1. **Non-existent OTLP exporter package** (section 5, Installing dependencies + Telemetry initialization). Both the `npm install` command and the `import { OTLPTraceExporter } from '@opentelemetry/exporter-otlp-http'` line referenced `@opentelemetry/exporter-otlp-http`, which is not a published package. The OpenTelemetry JS OTLP/HTTP exporters are split per signal. Replaced both occurrences with `@opentelemetry/exporter-trace-otlp-http`, which is the correct package that exports `OTLPTraceExporter`.

2. **Deprecated semantic-conventions constant `ATTR_DEPLOYMENT_ENVIRONMENT`** (section 5, Telemetry initialization). The `deployment.environment` resource attribute was superseded by the stable `deployment.environment.name`, exposed in `@opentelemetry/semantic-conventions` as `ATTR_DEPLOYMENT_ENVIRONMENT_NAME`. The old constant is soft-deprecated and only available from the `/incubating` subpath in current versions. Replaced both the import and the resource-attribute key with `ATTR_DEPLOYMENT_ENVIRONMENT_NAME` so the snippet uses the stable convention.

## Review Notes

- **`new Resource({...})` constructor** is still supported by `@opentelemetry/resources`, but recent versions encourage `resourceFromAttributes({...})`. The snippet works as-is; not changed to avoid unrelated churn.
- **`SpanKind` enum** is imported from `@opentelemetry/sdk-trace-base` in the dependency-extractor snippet. It is also re-exported from `@opentelemetry/api` (and the api export is the more conventional source), but the sdk-trace-base re-export is valid and the snippet compiles.
- **`SpanStatusCode` numeric check** (`span.status.code === 2`) is correct — `SpanStatusCode.ERROR === 2` per the OTel API enum. Using the named constant would be clearer, but the magic number is correct and accompanied by a comment.
- **`span.startTime[0] * 1000`** converts the `HrTime` seconds component to milliseconds for a `Date` constructor. This drops sub-second precision but is acceptable for a timestamp used in hourly aggregation. The full-precision `calculateDurationMs` helper correctly accounts for both seconds and nanoseconds.
- **Self-loop guard `caller !== callee`** filters out same-service spans, but it will also drop legitimate intra-service async hops (e.g., a service calling its own queue worker). Acceptable for an introductory example.
- **`http.status_code` vs `http.response.status_code`** — the snippet checks both, which correctly handles the older convention and the current stable HTTP semantic-conventions naming.
- **PostgreSQL `latencyP99` approximation** (`avg_latency_ms * 2`) is explicitly labeled as an approximation; in practice a true P99 needs histogram/sketch storage (e.g., `t-digest`, OTel exponential histogram, or a metrics backend). Worth highlighting to readers planning production use.
- **Kubernetes pod regex** `/^(.+)-[a-z0-9]{5,}$/` matches the typical ReplicaSet hash suffix, but Kubernetes pod names from Deployments actually use a `{replicaset-hash}-{pod-hash}` pattern (e.g., `my-svc-7d4b9c5f8d-x2k9p`). The current regex captures most ephemeral-pod cases adequately for grouping.
- The post does not pin package versions; readers should consult the OpenTelemetry JS release notes for the most current APIs (Resource construction, semantic-convention subpath imports, etc.).
