# Validation Summary: How to Create a Frontend Performance Dashboard with Core Web Vitals from

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry JavaScript browser tracing
- OpenTelemetry JavaScript metrics
- OpenTelemetry Collector
- OTLP/HTTP
- Core Web Vitals
- web-vitals JavaScript library
- Prometheus remote write
- PromQL
- W3C Trace Context

## Sources Consulted
- OpenTelemetry JavaScript API and SDK package documentation: https://open-telemetry.github.io/opentelemetry-js/
- OpenTelemetry JavaScript npm package metadata for current package versions: https://www.npmjs.com/org/opentelemetry
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector connector documentation: https://opentelemetry.io/docs/collector/components/connector/
- OpenTelemetry Collector processor documentation: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry OTLP specification: https://opentelemetry.io/docs/specs/otlp/
- web-vitals package documentation: https://github.com/GoogleChrome/web-vitals
- Google Chrome Core Web Vitals documentation: https://web.dev/articles/vitals
- Prometheus histogram_quantile documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/#histogram_quantile
- W3C Trace Context specification: https://www.w3.org/TR/trace-context/

## Issues Found
- The OpenTelemetry JavaScript setup used older 1.x APIs. `new Resource(...)` is no longer the current public resource creation pattern in `@opentelemetry/resources` 2.x, and `provider.addSpanProcessor(...)` is not present on the current `WebTracerProvider`. Updated the example to use `resourceFromAttributes(...)` and pass `spanProcessors` to the `WebTracerProvider` constructor.
- The install command omitted packages that were imported later, including `@opentelemetry/api`, `@opentelemetry/instrumentation`, `@opentelemetry/sdk-trace-base`, and `@opentelemetry/instrumentation-fetch`. Added the missing packages.
- The post described converting span attributes into dashboard metrics with `spanmetrics`, but the current Collector uses `spanmetrics` as a connector, not a processor, and spanmetrics aggregates span duration rather than arbitrary `web_vital.value` attributes. Updated the implementation to record Core Web Vitals as OpenTelemetry histograms and export them through OTLP metrics.
- The Collector configuration used outdated filter processor syntax and an invalid `spanmetrics` processor pipeline. Replaced it with current OTTL filter processor syntax and a metrics pipeline that receives OTLP metrics and exports them with `prometheusremotewrite`.
- The PromQL examples referenced metric names that would not be produced by the corrected instrumentation. Updated the queries to use the histogram metric names created by the JavaScript code.
- The post referred to FID as a current Core Web Vital in the description. Updated the description and introduction to state that INP replaced FID.
- The trace propagation explanation implied that the SDK always injects `traceparent` for fetch requests. Updated it to clarify that fetch instrumentation injects trace context only for configured URLs and that the API CORS configuration must allow `traceparent` and `tracestate`.

## Review Notes
- JavaScript snippets were checked with `node --check`.
- The Collector YAML snippet was parsed successfully as YAML.
- The Prometheus metric names assume the Prometheus remote write exporter preserves the OpenTelemetry metric names shown in the examples. If a deployment enables exporter-specific name translation or unit suffixing, the query names may need to be adjusted.
