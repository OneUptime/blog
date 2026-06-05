# Validation Summary: How to Compare gRPC vs REST vs GraphQL Performance

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry tracing and metrics
- Express / Node.js
- gRPC and Protocol Buffers
- Apollo Server / GraphQL
- Python benchmarking with requests, grpcio, and NumPy
- Prometheus / PromQL

## Sources Consulted
- OpenTelemetry JavaScript instrumentation docs: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry RPC semantic conventions: https://opentelemetry.io/docs/specs/semconv/rpc/rpc-spans/
- OpenTelemetry Python metrics SDK docs: https://opentelemetry-python.readthedocs.io/en/latest/sdk/metrics.html
- OpenTelemetry Prometheus exporter and compatibility specs: https://opentelemetry.io/docs/specs/otel/metrics/sdk_exporters/prometheus/ and https://opentelemetry.io/docs/specs/otel/compatibility/prometheus_and_openmetrics/
- gRPC Node basics tutorial: https://grpc.io/docs/tutorials/basic/node.html
- gRPC introduction and performance docs: https://grpc.io/docs/what-is-grpc/introduction/ and https://grpc.io/docs/guides/performance/
- Apollo Server previous versions / EOL docs: https://www.apollographql.com/docs/apollo-server/previous-versions/
- Apollo Server Express middleware docs: https://www.apollographql.com/docs/apollo-server/api/express-middleware/
- Prometheus histogram docs: https://prometheus.io/docs/practices/histograms/
- Prometheus querying basics: https://prometheus.io/docs/prometheus/latest/querying/basics/
- GraphQL specification / validation and execution concepts: https://spec.graphql.org/

## Issues Found
- The GraphQL example used the end-of-life `apollo-server-express` package and its `gql` helper. Updated it to `@apollo/server` with the supported Express middleware package and `express.json()` body parsing.
- The REST and GraphQL examples assumed `trace.getActiveSpan()` always returns a span. Updated those custom attribute calls to use optional chaining so the snippets do not throw when no active span is present.
- The REST list endpoint passed `req.query.limit` through as a string. Converted it to a number before passing it to `fetchProducts`.
- The GraphQL list resolver recorded the requested limit as `response.item_count` rather than the actual returned count. Updated it to record `products.length`.
- The gRPC example used older RPC semantic attribute names. Updated `rpc.system` to the current `rpc.system.name` convention and made `rpc.method` a fully qualified method name.
- The gRPC `listProducts` handler did not record exceptions or reliably end spans on errors. Wrapped it in `try` / `catch` / `finally`, matching the `getProduct` handler.
- The Python benchmark used generated protobuf modules without importing them. Added `product_pb2` and `product_pb2_grpc` imports.
- The benchmark recorded response size for REST and GraphQL but not for gRPC. Added `response.ByteSize()` recording for gRPC responses.
- The PromQL average response-size query treated a histogram as if it were a gauge. Replaced it with `_sum` divided by `_count` rates, per Prometheus histogram guidance.
- The throughput query referenced an HTTP server metric that would not cover all three protocols consistently. Replaced it with the benchmark request-duration histogram count grouped by protocol.

## Review Notes
- The snippets still assume surrounding setup exists, including OpenTelemetry SDK/exporter configuration, generated protobuf files, a `product.proto`, and `fetchProduct` / `fetchProducts` implementations.
- The PromQL metric names assume the default OpenTelemetry-to-Prometheus translation strategy that escapes dots and appends unit suffixes.
- The high-level performance claims are directionally correct but workload-dependent, as the post already notes.
