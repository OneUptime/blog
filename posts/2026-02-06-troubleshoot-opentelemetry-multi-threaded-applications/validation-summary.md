# Validation Summary: How to Troubleshoot OpenTelemetry in Multi-Threaded Applications

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- OpenTelemetry tracing and context propagation
- Java OpenTelemetry API and `ExecutorService`
- Python OpenTelemetry API, `contextvars`, `threading`, `concurrent.futures`, and `asyncio`
- Go OpenTelemetry API and `context.Context`
- Prometheus-style span metrics
- Project Reactor / Spring WebFlux context propagation

## Sources Consulted
- OpenTelemetry Java `Context` Javadoc: https://www.javadoc.io/static/io.opentelemetry/opentelemetry-context/1.48.0/io/opentelemetry/context/Context.html
- OpenTelemetry Python context API: https://opentelemetry-python.readthedocs.io/en/latest/api/context.html
- OpenTelemetry Python threading instrumentation source/docs: https://opentelemetry-python-contrib.readthedocs.io/en/latest/_modules/opentelemetry/instrumentation/threading.html
- Python `contextvars` documentation: https://docs.python.org/3/library/contextvars.html
- Python 3.14 `threading.Thread` documentation: https://docs.python.org/3.14/library/threading.html
- OpenTelemetry Go getting started and tracing API docs: https://opentelemetry.io/docs/languages/go/getting-started/
- OpenTelemetry trace API specification: https://opentelemetry.io/docs/specs/otel/trace/api/
- OpenTelemetry Collector spanmetrics connector README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/spanmetricsconnector/README.md
- Reactor Core context propagation reference: https://docs.spring.io/projectreactor/reactor-core/docs/current-SNAPSHOT/reference/html/advanced-contextPropagation.html
- Micrometer context propagation reference: https://docs.micrometer.io/context-propagation/reference/purpose.html

## Issues Found
- The Python section incorrectly stated that `contextvars` propagates to `threading.Thread` in Python 3.12+. Python documentation states each thread has a different top-level context, and the `threading.Thread(context=...)` parameter was added in Python 3.14. Updated the wording to describe per-thread contexts, Python 3.14's explicit context support, manual propagation, and OpenTelemetry's threading instrumentation.
- The Go code block defined `handleRequest` twice in the same fenced snippet, which is not syntactically valid if copied as a single file. Renamed the fixed example to `handleRequestFixed`.
- The PromQL example used `parent_span_id=""` on OpenTelemetry Collector spanmetrics. The spanmetrics connector's default dimensions do not include `parent_span_id`. Updated the snippet to explain that a backend or Collector pipeline must add an explicit root-span dimension before this ratio can be queried.
- The asyncio example assigned `ctx = context.get_current()` but never used it. Removed the unused variable and updated `asyncio.get_event_loop()` to `asyncio.get_running_loop()` inside the coroutine.

## Review Notes
The remaining Java, Python, Go, and Reactor examples are technically plausible as illustrative snippets, assuming the usual surrounding imports, tracer initialization, and OpenTelemetry dependencies are present. The Reactor section should be treated as version-dependent because automatic context propagation relies on Reactor's Micrometer context-propagation support and applies to new subscriptions after the hook is enabled.
