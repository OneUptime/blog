# Validation Summary: How to Use OpenTelemetry to Detect and Diagnose Memory Leaks

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry metrics and traces
- Node.js runtime memory metrics
- Python runtime memory metrics, `gc`, `psutil`, and `tracemalloc`
- Go runtime memory metrics
- Prometheus alerting rules and PromQL

## Sources Consulted
- OpenTelemetry JavaScript instrumentation documentation: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry Python metrics API documentation: https://opentelemetry-python.readthedocs.io/en/latest/api/metrics.html
- OpenTelemetry Go metric API documentation: https://pkg.go.dev/go.opentelemetry.io/otel/metric
- OpenTelemetry runtime and process metric semantic conventions: https://opentelemetry.io/docs/specs/semconv/runtime/ and https://opentelemetry.io/docs/specs/semconv/system/process-metrics/
- OpenTelemetry Go runtime metric semantic conventions: https://opentelemetry.io/docs/specs/semconv/runtime/go-metrics/
- Node.js `process.memoryUsage()` documentation: https://nodejs.org/api/process.html#processmemoryusage
- Node.js `v8.getHeapSpaceStatistics()` documentation: https://nodejs.org/api/v8.html#v8getheapspacestatistics
- Python `gc` documentation: https://docs.python.org/3/library/gc.html
- Python `tracemalloc` documentation: https://docs.python.org/3/library/tracemalloc.html
- psutil documentation: https://psutil.readthedocs.io/en/latest/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus PromQL function documentation for `deriv()`: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus template reference: https://prometheus.io/docs/prometheus/latest/configuration/template_reference/

## Issues Found
- The post overstated that OpenTelemetry traces can "pinpoint" the leaking code path. Traces can correlate memory growth with request patterns and narrow down likely paths, but they do not prove object retention by themselves. Updated the wording to "narrow down" in the description, introduction, and guide summary.
- The Node.js RSS comments described RSS as total OS-allocated memory and mentioned stack/code segments. Node.js documents RSS as resident physical memory used by the process. Updated the comment to describe physical memory currently used by the process and align with Node.js documentation.
- The Node.js external-memory comment implied all Buffer leaks show up directly in `external`. Node.js documents Buffer/ArrayBuffer memory as included in `arrayBuffers`, which is also included in `external`. Updated the wording to say native addon memory and Buffer/ArrayBuffer allocations can show up there.
- The Prometheus alert annotation queried `process_runtime_nodejs_memory_heap_used` without preserving the firing service label, so the displayed current heap could come from an unrelated service. Updated the annotation query to filter by `service_name` using `printf`.
- The request-scoped Python middleware was labeled as WSGI/ASGI, but the implementation used the WSGI callable signature. Updated the text to WSGI middleware.
- The request-scoped middleware took the post-request snapshot immediately after receiving the WSGI iterable, which can miss allocations that happen while the response body is iterated. Updated the example to materialize the response before taking the second snapshot.
- The request-scoped memory section implied it measures all memory allocation. `tracemalloc` traces Python memory allocations, not every native or process-level allocation. Updated the wording to say "traced Python memory."

## Review Notes
- JavaScript and Python code blocks were syntax-checked locally. The local environment did not include `go` or `promtool`, so Go and Prometheus snippets were verified against official documentation rather than executed locally.
- The custom metric names are technically valid OpenTelemetry instrument names, but they are not the current stable OpenTelemetry semantic-convention names for all runtimes. A future revision could either use auto-instrumented runtime metrics where available or explicitly state that these are custom diagnostic metrics.
