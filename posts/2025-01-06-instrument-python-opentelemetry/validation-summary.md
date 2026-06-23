# Validation Summary: How to Instrument Python Applications with OpenTelemetry

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry (API, SDK, OTLP exporter, auto-instrumentation, distro/bootstrap)
- Python (3.8+)
- Flask (`opentelemetry-instrumentation-flask`)
- FastAPI + Uvicorn (`opentelemetry-instrumentation-fastapi`)
- Django (`opentelemetry-instrumentation-django`)
- `requests` and `httpx` client instrumentation
- Context propagation (W3C trace context via `opentelemetry.propagate`)
- Trace sampling (`TraceIdRatioBased`)

## Sources Consulted
- OpenTelemetry Environment Variable Specification — https://opentelemetry.io/docs/specs/otel/configuration/sdk-environment-variables/
- OpenTelemetry General SDK Configuration — https://opentelemetry.io/docs/languages/sdk-configuration/general/
- OpenTelemetry Python SDK environment variables — https://opentelemetry-python.readthedocs.io/en/latest/sdk/environment_variables.html
- OpenTelemetry Python documentation (TracerProvider, BatchSpanProcessor, OTLP HTTP exporter, Resource, propagators, sampling) — https://opentelemetry-python.readthedocs.io/
- OpenTelemetry Python Contrib instrumentation (Flask, FastAPI, Django, requests, httpx) — https://opentelemetry-python-contrib.readthedocs.io/

## Issues Found
- **Invalid environment variable `OTEL_SERVICE_VERSION`** (Environment Variables Reference section). The OpenTelemetry specification defines `OTEL_SERVICE_NAME` as a dedicated variable, but there is **no** `OTEL_SERVICE_VERSION` variable — setting it has no effect on the SDK. Service version must be supplied as a resource attribute. Fixed by removing the bogus `OTEL_SERVICE_VERSION` line (with an explanatory note) and adding `service.version=1.0.0` to the existing `OTEL_RESOURCE_ATTRIBUTES` example, which is the correct mechanism.

## Review Notes
- All package names and install commands are correct: `opentelemetry-api`, `opentelemetry-sdk`, `opentelemetry-exporter-otlp`, `opentelemetry-distro`, `opentelemetry-instrumentation`, the per-framework instrumentation packages, and `opentelemetry-bootstrap -a install`.
- The `opentelemetry-instrument python app.py` / `opentelemetry-instrument uvicorn main:app ...` wrapper usage is correct and current.
- Instrumentor API usage is accurate: `FlaskInstrumentor().instrument_app(app)`, `FastAPIInstrumentor.instrument_app(app)` (a static method, so calling it on the class is correct), `DjangoInstrumentor().instrument()`, `RequestsInstrumentor().instrument()`, `HTTPXClientInstrumentor().instrument()`.
- The HTTP/protobuf OTLP exporter import (`opentelemetry.exporter.otlp.proto.http.trace_exporter`) and the full `/v1/traces` endpoint path are correct for the HTTP exporter. (Note for readers: when using the auto-instrumentation env var `OTEL_EXPORTER_OTLP_ENDPOINT`, supply the base endpoint without `/v1/traces`, since the SDK appends the signal path — the post already shows the base URL in those examples, which is consistent.)
- `Resource.create`, `TracerProvider`, `BatchSpanProcessor`, `trace.get_tracer`, `start_as_current_span`, `set_attribute`, `add_event`, `record_exception`, `set_status`, `Status`/`StatusCode`, and `propagate.extract`/`inject` are all used correctly.
- `OTEL_LOG_LEVEL`, `OTEL_TRACES_SAMPLER`, `OTEL_TRACES_SAMPLER_ARG`, `OTEL_EXPORTER_OTLP_PROTOCOL`, and `OTEL_RESOURCE_ATTRIBUTES` are all valid SDK environment variables.
- The async decorator wrapping `await` inside a synchronous `with start_as_current_span(...)` block is acceptable — the span is set as current synchronously around the awaited call and detached on block exit, so the span remains current for the duration of the awaited coroutine. This is fine for the single-task pattern shown.
- Minor stylistic note (not changed): the `deployment.environment` resource attribute has since been superseded by `deployment.environment.name` in newer semantic conventions, but `deployment.environment` remains widely used and backend-compatible, so it was left as-is.
