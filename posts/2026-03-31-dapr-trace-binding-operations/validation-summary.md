# Validation Summary: How to Trace Binding Operations in Dapr

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Bindings (Input and Output)
- Dapr Distributed Tracing with OpenTelemetry
- Apache Kafka (as binding component)
- Azure Blob Storage (as binding component)
- Python / Flask
- Jaeger (trace query API)
- OpenTelemetry Collector

## Sources Consulted
- Dapr Configuration Overview: https://docs.dapr.io/operations/configuration/configuration-overview/
- Dapr OpenTelemetry Collector tracing setup: https://docs.dapr.io/operations/observability/tracing/otel-collector/
- Dapr Bindings API reference: https://docs.dapr.io/reference/api/bindings_api/
- Dapr Kafka binding component: https://docs.dapr.io/reference/components-reference/supported-bindings/kafka/
- Dapr Azure Blob Storage binding component: https://docs.dapr.io/reference/components-reference/supported-bindings/blobstorage/
- Dapr Input Bindings how-to: https://docs.dapr.io/developing-applications/building-blocks/bindings/howto-triggers/
- Dapr tracing overview: https://docs.dapr.io/operations/observability/tracing/tracing-overview/
- Dapr source code (`pkg/api/http/http.go`, `pkg/diagnostics/consts/consts.go`) for span attribute verification
- Jaeger source code (`cmd/jaeger/internal/extension/jaegerquery/`) for API endpoint verification

## Issues Found

### 1. Azure Blob Storage binding metadata field names (lines 101-108)
- **What was wrong:** The component spec used `storageAccount`, `storageAccessKey`, and `container` as metadata field names.
- **What was changed:** Corrected to `accountName`, `accountKey`, and `containerName` respectively.
- **Why:** The official Dapr Azure Blob Storage binding documentation specifies these as the correct field names.

### 2. Binding span attribute names (lines 150-152)
- **What was wrong:** The table listed `db.type` and `db.instance` as span attribute keys, and described `db.statement` as containing the "operation type".
- **What was changed:** Corrected `db.type` to `db.system`, `db.instance` to `db.name`, and updated the `db.statement` example to show the actual format (`POST /v1.0/bindings/kafka-binding`).
- **Why:** Dapr uses OpenTelemetry semantic conventions (semconv v1.25.0). The actual attribute keys are `db.system`, `db.name`, and `db.statement`. The `db.statement` value contains the HTTP method and URL path, not the operation type from the request body.

### 3. Jaeger API endpoint path (lines 158-164)
- **What was wrong:** Used `/api/v2/traces` as the Jaeger query API path.
- **What was changed:** Corrected to `/api/traces`.
- **Why:** The Jaeger Query HTTP API registers trace search at `/api/traces`. The `/api/v2/` prefix belongs to Zipkin compatibility endpoints, not the Jaeger native API.

### 4. Non-existent operation name `DaprOutputBinding` (lines 158-164)
- **What was wrong:** Used `operation=DaprOutputBinding` in Jaeger queries. This operation name does not exist in Dapr's codebase.
- **What was changed:** Replaced with tag-based filtering using `tags={"db.system":"bindings"}` to find binding-related traces, which correctly matches the span attributes Dapr emits.
- **Why:** Dapr does not set a `DaprOutputBinding` span name. The span name for output bindings is the URL path (e.g., `/v1.0/bindings/kafka-binding`). Filtering by the `db.system` tag is more reliable for finding all binding operations.

### 5. Jaeger `tags` query parameter format (line 164)
- **What was wrong:** Used `tags=error:true` format.
- **What was changed:** Corrected to URL-encoded JSON format `tags={"error":"true"}`.
- **Why:** The Jaeger `tags` query parameter expects a JSON object, not a `key:value` string format.

### 6. Jaeger `minDuration` parameter format (line 161)
- **What was wrong:** Used `minDuration=1000000` (raw integer).
- **What was changed:** Corrected to `minDuration=1s` (duration string).
- **Why:** The Jaeger API accepts Go-style duration strings (e.g., `1s`, `500ms`), not raw microsecond integers.

## Review Notes
- The Kafka binding component uses `topics` for input binding topic subscription, but for output bindings the `publishTopic` metadata field is what controls the target topic. The blog's example uses `topics` which works for the input binding case, but a reader using it purely as an output binding may need `publishTopic` instead. This is a minor nuance, not an error in context.
- The input binding example uses `/scheduled-report` as the endpoint path. For Dapr to correctly route input binding events, the component `metadata.name` must match the endpoint path (i.e., the component should be named `scheduled-report`). This is implied but not explicitly stated in the post.
- The `secretKeyRef` usage in the blob storage component is correct in concept but the component should also specify `auth.secretStore` to indicate which secret store to use. This is a common pattern omission in examples.
