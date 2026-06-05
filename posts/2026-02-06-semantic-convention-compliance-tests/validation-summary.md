# Validation Summary: How to Validate Semantic Convention Compliance in Your Spans

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry semantic conventions
- OpenTelemetry HTTP spans
- OpenTelemetry database client spans
- OpenTelemetry messaging spans
- OpenTelemetry Python SDK
- pytest
- pre-commit

## Sources Consulted
- OpenTelemetry HTTP span semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-spans/
- OpenTelemetry database client span semantic conventions: https://opentelemetry.io/docs/specs/semconv/db/database-spans/
- OpenTelemetry messaging span semantic conventions: https://opentelemetry.io/docs/specs/semconv/messaging/messaging-spans/
- OpenTelemetry Python SDK trace export documentation: https://opentelemetry-python.readthedocs.io/en/latest/sdk/trace.export.html
- OpenTelemetry Python InMemorySpanExporter source: https://github.com/open-telemetry/opentelemetry-python/blob/main/opentelemetry-sdk/src/opentelemetry/sdk/trace/export/in_memory_span_exporter.py
- pre-commit configuration documentation: https://pre-commit.com/

## Issues Found
- The database example referred to `db.statement` as the correct query-text attribute. Current stable database semantic conventions use `db.query.text`, so the prose and rule set were updated.
- The database rule set used `db.system`, which has been replaced by stable `db.system.name`. The checker now detects current spans with `db.system.name` and flags old `db.system` as deprecated.
- The database optional attributes omitted `db.namespace` and used old `db.statement`. The example now uses `db.namespace` and `db.query.text`.
- The messaging rule set treated `messaging.operation.type` and `messaging.destination.name` as unconditionally required. Current messaging conventions require `messaging.system` and `messaging.operation.name`, while those other attributes are conditional, so the example was adjusted.
- The HTTP rule set over-enforced some conditional or recommended server-span attributes as required. The example now keeps only unconditionally required server attributes in the required list and treats response status, route, and server attributes as optional checks.
- The HTTP client rule set had `server.address` and `server.port` as optional, but current HTTP client conventions require them. They were moved to the required list.
- The Python test imported `InMemorySpanExporter` from `opentelemetry.sdk.trace.export.in_memory`, which is not the current module path. It now imports from `opentelemetry.sdk.trace.export.in_memory_span_exporter`.
- The deprecated-attribute checks did not include old database attributes. `db.system` and `db.statement` were added to the deprecated map and test set.

## Review Notes
The compliance checker is intentionally simplified. It does not model every OpenTelemetry requirement level, such as conditional requirements for errors, response status codes, messaging destinations, or system-specific database conventions. The post now avoids the major outdated attribute names while preserving the tutorial's lightweight example style.
