# Validation Summary: Understanding OpenTelemetry Traces and Spans

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry tracing concepts
- OpenTelemetry Python API and SDK
- OpenTelemetry JavaScript API and SDK for Node.js
- W3C Trace Context
- OpenTelemetry semantic conventions for HTTP, database, and RPC spans

## Sources Consulted
- OpenTelemetry Tracing API specification: https://opentelemetry.io/docs/specs/otel/trace/api/
- OpenTelemetry traces concepts: https://opentelemetry.io/docs/concepts/signals/traces/
- OpenTelemetry Python trace API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.html
- OpenTelemetry Python instrumentation guide: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python requests instrumentation documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/requests/requests.html
- OpenTelemetry JavaScript NodeTracerProvider API documentation: https://open-telemetry.github.io/opentelemetry-js/classes/_opentelemetry_sdk-node.node.NodeTracerProvider.html
- OpenTelemetry JavaScript TracerConfig API documentation: https://open-telemetry.github.io/opentelemetry-js/interfaces/_opentelemetry_sdk-node.node.TracerConfig.html
- OpenTelemetry HTTP semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-spans/
- OpenTelemetry database semantic conventions: https://opentelemetry.io/docs/specs/semconv/db/sql/
- OpenTelemetry database semantic convention migration guide: https://opentelemetry.io/docs/specs/semconv/non-normative/db-migration/
- OpenTelemetry RPC semantic conventions: https://opentelemetry.io/docs/specs/semconv/rpc/rpc-spans/
- OpenTelemetry RPC semantic convention migration guide: https://opentelemetry.io/docs/specs/semconv/non-normative/rpc-migration/
- W3C Trace Context Recommendation: https://www.w3.org/TR/trace-context/
- OneUptime website: https://oneuptime.com/

## Issues Found
- The post said each arrow in the service diagram would be a span. Updated this to say each operation would be represented by a span, matching OpenTelemetry's definition of spans as units of work.
- The Python example used `service.name` as a span attribute. Replaced it with a custom order workflow attribute because `service.name` is defined as a resource attribute, not ordinary span metadata.
- The Node.js setup used `provider.addSpanProcessor(...)`, which is no longer present on the current `NodeTracerProvider` API. Updated the example to pass `spanProcessors` in the provider configuration.
- The Node.js install command directly imported `@opentelemetry/sdk-trace-base` without listing it as an install dependency. Added it to the install command.
- The database examples used older semantic convention attributes: `db.system`, `db.name`, and `db.statement`. Updated them to `db.system.name`, `db.namespace`, and `db.query.text`.
- The HTTP attributes example used older semantic convention attributes: `http.method`, `http.url`, and `http.status_code`. Updated them to `http.request.method`, `url.full`, and `http.response.status_code`.
- The RPC attributes example used older semantic convention attributes: `rpc.system` and `rpc.service`. Updated it to `rpc.system.name` and a fully qualified `rpc.method`.
- The W3C `traceparent` placeholder used `<parent-span-id>`. Updated it to the W3C field name `<parent-id>`.
- The Python requests instrumentation snippet imported `requests` but the install comment did not list it. Added `requests` to the install command.

## Review Notes
The Python and JavaScript code snippets were syntax-checked successfully after the corrections. The semantic convention examples are current as of the documentation reviewed on 2026-05-27, but OpenTelemetry semantic conventions can change over time, especially release-candidate conventions such as RPC.
