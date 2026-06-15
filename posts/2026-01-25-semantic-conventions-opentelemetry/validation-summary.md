# Validation Summary: How to Implement Semantic Conventions in OpenTelemetry

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- OpenTelemetry semantic conventions
- OpenTelemetry JavaScript SDK and semantic convention constants
- OpenTelemetry Python SDK and semantic convention constants
- OpenTelemetry Collector processors
- HTTP, database, messaging, and resource telemetry attributes

## Sources Consulted
- OpenTelemetry Semantic Conventions overview: https://opentelemetry.io/docs/concepts/semantic-conventions/
- OpenTelemetry resource semantic conventions: https://opentelemetry.io/docs/specs/semconv/resource/
- OpenTelemetry HTTP span semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-spans/
- OpenTelemetry database client span semantic conventions: https://opentelemetry.io/docs/specs/semconv/db/database-spans/
- OpenTelemetry database migration guide: https://opentelemetry.io/docs/specs/semconv/non-normative/db-migration/
- OpenTelemetry messaging span semantic conventions: https://opentelemetry.io/docs/specs/semconv/messaging/messaging-spans/
- OpenTelemetry JavaScript semantic conventions package README: https://github.com/open-telemetry/opentelemetry-js/blob/main/semantic-conventions/README.md
- OpenTelemetry JavaScript resources documentation: https://opentelemetry.io/docs/languages/js/resources/
- OpenTelemetry Python semantic convention generated constants: https://github.com/open-telemetry/opentelemetry-python/tree/main/opentelemetry-semantic-conventions/src/opentelemetry/semconv/attributes
- OpenTelemetry Collector attributes processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/attributesprocessor/README.md
- OpenTelemetry Collector filter processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- OpenTelemetry Collector transforming telemetry documentation: https://opentelemetry.io/docs/collector/transforming-telemetry/

## Issues Found
- The post used deprecated JavaScript semantic convention constants such as `SEMRESATTRS_*` and `SEMATTRS_*`. Updated examples to current `ATTR_*` constants and used the incubating entry point where the attributes are not stable.
- The JavaScript resource example used `new Resource(...)`, which is not current JS SDK 2.x style. Updated it to `resourceFromAttributes(...)`.
- The Python examples used deprecated aggregate classes such as `ResourceAttributes` and `SpanAttributes`. Updated imports to generated per-namespace constants under `opentelemetry.semconv.attributes`.
- HTTP examples used older attributes such as `http.method`, `http.url`, `http.target`, `net.peer.name`, and `net.peer.port`. Updated them to stable attributes such as `http.request.method`, `url.full`, `url.scheme`, `server.address`, and `server.port`.
- HTTP server span naming defaulted to raw request paths, which can create high-cardinality span names. Updated the server example to use the route template when available and otherwise only the method. Updated the client example to avoid using the raw URL path as the span name.
- HTTP server status handling marked all 4xx responses as span errors. Updated it so server spans only default to error for 5xx responses, matching current HTTP span status guidance.
- Database examples used outdated attributes such as `db.system`, `db.name`, `db.statement`, and `db.operation`. Updated them to `db.system.name`, `db.namespace`, `db.query.text`, and `db.operation.name`.
- Database example extracted the operation name directly from SQL text without caveat. Updated the signature and comment to prefer a client-provided or call-site operation name, with SQL parsing only as a simple example fallback.
- Messaging examples used outdated attributes such as `messaging.destination`, `messaging.destination_kind`, `messaging.operation`, and payload-size names. Updated them to current messaging attributes such as `messaging.destination.name`, `messaging.operation.name`, `messaging.operation.type`, and `messaging.message.body.size`.
- Messaging propagation helper functions and `pika` were referenced without imports or definitions. Updated the snippet to use `opentelemetry.propagate.inject` and `extract`, import `pika`, and define a simple message ID helper.
- Collector config copied attributes after deleting their source keys. Reordered processor actions so `from_attribute` copies happen before deletion.
- Collector config attempted to normalize `service.name` with the span attributes processor even though `service.name` is a resource attribute. Updated the config to use the resource processor for `service.name` and the attributes processor for span attributes.
- Collector filter example checked `attributes["service.name"]`; updated it to `resource.attributes["service.name"]`.
- Collector filter example used the old `http.method` name and legacy filter style. Updated it to `http.request.method` and current OTTL `trace_conditions`.
- Collector snippet was missing receiver/exporter/service pipeline structure. Added a minimal valid OTLP receiver, debug exporter, and traces pipeline.
- Reference table used outdated HTTP, database, and messaging attribute names. Updated the table to current names.

## Review Notes
The messaging semantic conventions are still marked development by OpenTelemetry, so examples that use messaging constants may require the incubating semantic convention package entry point or may change in future releases. JavaScript and Python snippets were syntax-checked locally, and the Collector YAML parsed successfully.
