# Validation Summary: How to Use OpenTelemetry Semantic Conventions for Standardized Telemetry

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- OpenTelemetry Semantic Conventions
- OpenTelemetry Python API, SDK, and semantic convention constants
- OpenTelemetry JavaScript API and `@opentelemetry/semantic-conventions`
- OpenTelemetry Go API and semantic convention package
- OpenTelemetry Java API
- HTTP, database, messaging, RPC/gRPC, metrics, resources, and exception telemetry

## Sources Consulted
- OpenTelemetry Semantic Conventions 1.42.0: https://opentelemetry.io/docs/specs/semconv/
- OpenTelemetry resource semantic conventions: https://opentelemetry.io/docs/specs/semconv/resource/
- OpenTelemetry deployment attributes registry: https://opentelemetry.io/docs/specs/semconv/registry/attributes/deployment/
- OpenTelemetry HTTP semantic conventions and HTTP metrics: https://opentelemetry.io/docs/specs/semconv/http/ and https://opentelemetry.io/docs/specs/semconv/http/http-metrics/
- OpenTelemetry database spans and database metrics: https://opentelemetry.io/docs/specs/semconv/db/database-spans/ and https://opentelemetry.io/docs/specs/semconv/db/database-metrics/
- OpenTelemetry messaging semantic conventions and messaging attributes registry: https://opentelemetry.io/docs/specs/semconv/messaging/ and https://opentelemetry.io/docs/specs/semconv/registry/attributes/messaging/
- OpenTelemetry RPC and gRPC semantic conventions: https://opentelemetry.io/docs/specs/semconv/registry/attributes/rpc/ and https://opentelemetry.io/docs/specs/semconv/rpc/grpc/
- OpenTelemetry exception semantic conventions: https://opentelemetry.io/docs/specs/semconv/exceptions/exceptions-spans/ and https://opentelemetry.io/docs/specs/semconv/registry/attributes/exception/
- OpenTelemetry JavaScript semantic conventions package README: https://github.com/open-telemetry/opentelemetry-js/blob/main/semantic-conventions/README.md
- Go OpenTelemetry semconv package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/semconv/v1.34.0
- Maven Central OpenTelemetry Java API artifact: https://central.sonatype.com/artifact/io.opentelemetry/opentelemetry-api

## Issues Found
- The post used deprecated HTTP span attributes such as `http.method`, `http.url`, `http.target`, `http.status_code`, and old JavaScript `SEMATTRS_*` exports. Updated examples to current stable names including `http.request.method`, `http.response.status_code`, `url.full`, `url.path`, `url.scheme`, `server.address`, `server.port`, and `client.address`, and changed JavaScript imports to `ATTR_*`.
- The JavaScript HTTP example used `trace.SpanKind` and `trace.SpanStatusCode`, which are not exposed that way by `@opentelemetry/api`. Updated it to import `SpanKind` and `SpanStatusCode` directly.
- The resource examples used deprecated `deployment.environment`. Updated Python and Go examples to `deployment.environment.name` and current semantic convention constants.
- Database examples used deprecated attributes such as `db.system`, `db.name`, `db.operation`, `db.statement`, `db.sql.table`, and non-standard `db.rows_affected`. Updated to `db.system.name`, `db.namespace`, `db.operation.name`, `db.query.text`, and `db.collection.name`, and removed the non-standard row-count span attribute.
- The Java database example used missing imports and an invalid `ResultSet.getRowCount()` call. Added required imports, used `AttributeKey` for current semantic names, and removed the invalid row-count call.
- Messaging examples used older attributes such as `messaging.destination`, `messaging.destination_kind`, `messaging.operation`, and `messaging.message_payload_size_bytes`. Updated to current names including `messaging.destination.name`, `messaging.operation.name`, `messaging.operation.type`, `messaging.message.body.size`, `messaging.message.id`, and `messaging.message.conversation_id`.
- The gRPC example used deprecated RPC attributes `rpc.system`, `rpc.service`, and `rpc.grpc.status_code`, plus old network peer attributes. Updated to `rpc.system.name`, fully qualified `rpc.method`, `rpc.response.status_code`, `server.address`, and `server.port`.
- The package usage sections showed deprecated Python `SpanAttributes` / `ResourceAttributes`, JavaScript `SemanticAttributes` / `SemanticResourceAttributes`, and old Java semconv classes. Updated examples to current Python attribute modules, JavaScript `ATTR_*` constants, and Java `AttributeKey` usage.
- Metric examples used outdated HTTP and database metric names such as `http.server.request.size`, `http.server.response.size`, and `db.client.connections.*`. Updated to `http.server.request.body.size`, `http.server.response.body.size`, and `db.client.connection.*`.
- Best-practice and migration snippets mixed old and new convention names. Updated current examples to use current names and made migration examples explicitly show deprecated names only in backward-compatibility code.

## Review Notes
- Messaging semantic conventions are still marked Development by OpenTelemetry, so future changes remain possible.
- Some generated semantic convention constants differ by language and package version. The revised examples use stable package exports where available and literal `AttributeKey` / string names where that is the clearest current approach.
- Python and JavaScript snippets were syntax-checked locally. Go and Java compilation could not be run because `go` and `javac` are not installed in the review environment.
