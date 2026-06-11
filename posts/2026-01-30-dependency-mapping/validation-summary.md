# Validation Summary: How to Build Dependency Mapping

## Status
validated

## Post Type
Technical guide / implementation tutorial

## Technologies Covered
- Dependency mapping and service topology modeling
- Distributed tracing and OpenTelemetry
- Istio service mesh metrics
- Kubernetes workloads, ConfigMaps, and Secrets
- DNS and network-flow based discovery
- PostgreSQL recursive CTEs and JSONB
- TypeScript, React, D3, and Express
- OpenAPI, GraphQL, and gRPC schema analysis

## Sources Consulted
- Kubernetes ConfigMaps documentation: https://kubernetes.io/docs/concepts/configuration/configmap/
- Istio Standard Metrics documentation: https://istio.io/latest/docs/reference/config/metrics/
- OpenTelemetry JavaScript SpanProcessor API: https://open-telemetry.github.io/opentelemetry-js/interfaces/_opentelemetry_sdk-trace-node.SpanProcessor.html
- OpenTelemetry HTTP semantic conventions and migration guide: https://opentelemetry.io/docs/specs/semconv/http/ and https://opentelemetry.io/docs/specs/semconv/non-normative/http-migration/
- OpenTelemetry database semantic conventions and migration guide: https://opentelemetry.io/docs/specs/semconv/registry/attributes/db/ and https://opentelemetry.io/docs/specs/semconv/non-normative/db-migration/
- OpenTelemetry messaging semantic conventions: https://opentelemetry.io/docs/specs/semconv/registry/attributes/messaging/
- Express body-parser middleware documentation: https://expressjs.com/en/resources/middleware/body-parser/

## Issues Found
- The Kubernetes static-analysis example checked `manifest.kind === 'Service'` but then read `.spec.template.spec.containers`, which is a pod-template field found on workload resources such as Deployments, StatefulSets, DaemonSets, Jobs, and CronJobs rather than Services. Updated the snippet to inspect workload kinds, derive the correct pod spec path, and extract both ConfigMap and Secret environment references.
- The OpenTelemetry dependency extraction example used older semantic-convention attribute names: `http.url`, `db.system`, `db.name`, and `messaging.destination`. Updated the snippet to current names: `url.full`, `db.system.name`, `db.namespace`, and `messaging.destination.name`.
- The OpenTelemetry SpanProcessor example used a numeric span kind and an incomplete `onStart` signature. Updated it to import `SpanKind`, `Span`, and `Context` from `@opentelemetry/api`, compare against `SpanKind.CLIENT`, and match the documented `onStart(span, parentContext)` shape.
- The Express API example read `req.body` in a POST handler without registering JSON body parsing middleware. Added `app.use(express.json());` after creating the Express app.

## Review Notes
Several examples remain intentionally simplified and reference application-specific helper types or functions such as `KubeManifest`, `DependencyService`, `dependencyStore`, `findAllPaths`, and `parseDuration`. That is acceptable for a conceptual implementation guide, but production code would need concrete implementations, validation, error handling, and tests around those helpers.
