# Validation Summary: How to Create Application Metrics

## Status
validated

## Post Type
Tutorial / technical implementation guide

## Technologies Covered
- OpenTelemetry metrics concepts and SDKs
- OpenTelemetry Python metrics API and OTLP exporter
- OpenTelemetry JavaScript metrics SDK and OTLP gRPC exporter
- FastAPI
- Express.js
- Prometheus Go client
- Prometheus histograms and PromQL alert rules
- Spring MVC
- Micrometer timers, counters, and percentile histograms

## Sources Consulted
- OpenTelemetry Metrics API: https://opentelemetry.io/docs/specs/otel/metrics/api/
- OpenTelemetry Metrics SDK: https://opentelemetry.io/docs/specs/otel/metrics/sdk/
- OpenTelemetry Python metrics API: https://opentelemetry-python.readthedocs.io/en/latest/api/metrics.html
- OpenTelemetry JavaScript instrumentation docs: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry JavaScript resources docs: https://opentelemetry.io/docs/languages/js/resources/
- OpenTelemetry JavaScript SDK 2.x migration guide: https://github.com/open-telemetry/opentelemetry-js/blob/main/doc/upgrade-to-2.x.md
- OpenTelemetry resource semantic conventions: https://opentelemetry.io/docs/specs/semconv/resource/
- Prometheus Go client documentation: https://pkg.go.dev/github.com/prometheus/client_golang/prometheus
- Prometheus promhttp documentation: https://pkg.go.dev/github.com/prometheus/client_golang/prometheus/promhttp
- Prometheus histogram and query function documentation: https://prometheus.io/docs/practices/histograms/ and https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus metric naming best practices: https://prometheus.io/docs/practices/naming/
- Micrometer histograms and percentiles documentation: https://docs.micrometer.io/micrometer/reference/concepts/histogram-quantiles.html
- Spring MVC HandlerMapping Javadoc: https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/web/servlet/HandlerMapping.html
- Related OneUptime links in the post were checked and resolved successfully.

## Issues Found
- The post said each language example used OpenTelemetry, but the Go example uses the Prometheus client and the Java example uses Micrometer. Updated the sentence to describe the actual libraries used.
- The Python FastAPI example decorated an async route with a synchronous wrapper. That would record duration before the coroutine completed and would not catch async handler exceptions. Updated the decorator to detect coroutine functions and await them in an async wrapper.
- The Python histogram comments described custom latency buckets, but the instrument did not pass bucket advice. Added `explicit_bucket_boundaries_advisory` with the documented OpenTelemetry Python parameter.
- The resource attribute `deployment.environment` is superseded by the current semantic convention `deployment.environment.name`. Updated both Python and Node.js examples.
- The Node.js OpenTelemetry setup used the older `new Resource(...)` and `SemanticResourceAttributes` style. Updated it to current JS SDK documentation using `resourceFromAttributes`, `ATTR_SERVICE_NAME`, `ATTR_SERVICE_VERSION`, and `metrics.setGlobalMeterProvider`.
- The Node.js histogram tried to configure bucket boundaries on `createHistogram`; current OpenTelemetry JS SDK documentation configures explicit bucket boundaries through Metric Views. Moved the boundaries into a `MeterProvider` view.
- The Spring MVC interceptor was declared as a component but was not registered, so it would not observe requests. Updated `MetricsConfig` to implement `WebMvcConfigurer` and register the interceptor.
- The Spring example used a literal request attribute name for the best matching route pattern. Replaced it with `HandlerMapping.BEST_MATCHING_PATTERN_ATTRIBUTE`.
- The Python unit test snippet inspected metric attributes as keyword arguments, while the examples pass attributes positionally. Updated the assertions to inspect the second positional argument.
- The Prometheus alert rules grouped by `service` without stating the label assumption. Added a comment that the scrape config or metrics pipeline must provide that label.

## Review Notes
The examples are intentionally illustrative and omit production concerns such as shutdown flushing, package installation, authentication headers for OTLP backends, and full framework-native HTTP instrumentation. The Go middleware uses `r.URL.Path` as a fallback endpoint label, which is technically valid for a simple example but should be replaced with router-provided route patterns in production to avoid high cardinality.
