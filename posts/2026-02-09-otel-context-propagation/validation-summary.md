# Validation Summary: How to use OpenTelemetry context propagation across services

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry
- W3C Trace Context
- Python
- Flask
- requests
- gRPC
- Kafka / kafka-python
- OpenTelemetry propagators: Trace Context, Baggage, B3, Jaeger

## Sources Consulted
- OpenTelemetry Python propagation documentation: https://opentelemetry.io/docs/languages/python/propagation/
- OpenTelemetry Python propagation API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/propagate.html
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Flask instrumentation documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/flask/flask.html
- OpenTelemetry requests instrumentation documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/requests/requests.html
- OpenTelemetry gRPC instrumentation documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/grpc/grpc.html
- OpenTelemetry kafka-python instrumentation documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/kafka_python/kafka_python.html
- W3C Trace Context Recommendation: https://www.w3.org/TR/trace-context/
- OpenTelemetry Python B3 propagator source: https://github.com/open-telemetry/opentelemetry-python/tree/main/propagator/opentelemetry-propagator-b3
- OpenTelemetry Python Jaeger propagator source: https://github.com/open-telemetry/opentelemetry-python/tree/main/propagator/opentelemetry-propagator-jaeger

## Issues Found
- Removed an unused `request` import from the Flask HTTP client example. The snippet only uses `Flask`, and the OpenTelemetry Flask documentation shows `FlaskInstrumentor().instrument_app(app)` with that import pattern.
- Changed the Service B comment and prose from "linked" language to "same trace" language. OpenTelemetry span links are a distinct concept; these examples describe normal parent-child trace continuity through extracted context.
- Fixed the gRPC server example by adding the missing `from opentelemetry import trace` import. The example calls `trace.get_tracer(__name__)`, so it would otherwise raise `NameError`.
- Fixed the gRPC server instrumentation call. `GrpcInstrumentorServer` is globally enabled with `.instrument()` before creating the server, or by manually adding `server_interceptor()`. The previous `.instrument_server(server)` call is not part of the current documented API.
- Clarified that Kafka message propagation requires manual header injection when Kafka instrumentation is not being used. OpenTelemetry provides kafka-python instrumentation, so the original blanket statement was too broad.
- Added `RequestsInstrumentor().instrument()` to the standalone propagation test snippet so the `requests.get()` call actually injects propagation headers as described.

## Review Notes
The Python code blocks were syntax-checked with `python3` AST parsing. The examples intentionally omit full SDK exporter setup in several snippets; that is acceptable for a propagation-focused guide, but production examples should include a configured `TracerProvider`, span processor, and exporter.
