# Validation Summary: How to Send OpenTelemetry Traces and Logs to Baselime via OTLP

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Protocol (OTLP)
- Baselime OTLP ingestion
- AWS Lambda
- Python OpenTelemetry SDK
- OpenTelemetry JavaScript SDK
- Serverless Framework Lambda environment configuration

## Sources Consulted
- Baselime OpenTelemetry documentation: https://baselime.io/docs/sending-data/platforms/opentelemetry/
- OpenTelemetry Protocol exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python exporters documentation: https://opentelemetry.io/docs/languages/python/exporters/
- OpenTelemetry Python trace API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.html
- OpenTelemetry JavaScript documentation: https://opentelemetry.io/docs/languages/js/
- OpenTelemetry JavaScript API reference for SpanStatusCode: https://open-telemetry.github.io/opentelemetry-js/enums/_opentelemetry_api._opentelemetry_api.SpanStatusCode.html
- OpenTelemetry JavaScript NodeTracerProvider API reference: https://open-telemetry.github.io/opentelemetry-js/classes/_opentelemetry_sdk-node.node.NodeTracerProvider.html
- OpenTelemetry JavaScript resourceFromAttributes API reference: https://open-telemetry.github.io/opentelemetry-js/functions/_opentelemetry_resources.resourceFromAttributes.html
- OpenTelemetry AWS Lambda semantic conventions: https://opentelemetry.io/docs/specs/semconv/faas/aws-lambda/
- OpenTelemetry FaaS attribute registry: https://opentelemetry.io/docs/specs/semconv/registry/attributes/faas/

## Issues Found
- The Baselime gRPC endpoint was outdated. Baselime's current documentation lists `otel-ingest.baselime.io:8443` for gRPC, so I replaced the old `otel.baselime.io:4317` value and made the HTTP signal paths explicit.
- The Node.js example used `new Resource(...)`, but current OpenTelemetry JavaScript exposes `Resource` as an interface and uses `resourceFromAttributes(...)` to create resources. I updated the example accordingly.
- The Node.js example called `provider.addSpanProcessor(...)`, which is not part of the current OpenTelemetry JavaScript v2 `NodeTracerProvider` API. I moved the `SimpleSpanProcessor` into the provider constructor's `spanProcessors` option.
- The Node.js example used `trace.SpanStatusCode.ERROR`, but `SpanStatusCode` is exported directly from `@opentelemetry/api`. I updated the import and status call.
- The Node.js example started the handler span with `startSpan(...)` but did not make it active, so the `process_request` span would not reliably be a child span. I changed the handler and child span creation to use `startActiveSpan(...)`.
- The Node.js example referenced `processRequest(...)` without defining it. I added a small helper function matching the Python example's shape.
- The Node.js child span could be left open if processing threw an exception. I wrapped it in `try/finally` so it always ends.
- The Serverless Framework environment snippet configured Baselime's OTLP/HTTP base endpoint but did not specify the protocol. I added `OTEL_EXPORTER_OTLP_PROTOCOL: http/protobuf` to keep the environment configuration aligned with the HTTP endpoint.

## Review Notes
OpenTelemetry Python logs are still documented as under development in the language docs, although the Logs API and SDK specifications are stable except for noted areas. The Python logging example uses current documented `LoggerProvider`, `LoggingHandler`, `SimpleLogRecordProcessor`, and OTLP HTTP log exporter APIs.
