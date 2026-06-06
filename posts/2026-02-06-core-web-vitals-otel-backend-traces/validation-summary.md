# Validation Summary: How to Correlate Core Web Vitals with Backend OpenTelemetry Traces for

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry
- Core Web Vitals
- web-vitals JavaScript library
- JavaScript Browser APIs
- Flask
- OpenTelemetry Python Metrics API
- Prometheus / PromQL

## Sources Consulted
- GoogleChrome web-vitals README and API documentation: https://github.com/GoogleChrome/web-vitals
- web.dev Core Web Vitals documentation: https://web.dev/articles/vitals
- MDN Navigator.sendBeacon documentation: https://developer.mozilla.org/en-US/docs/Web/API/Navigator/sendBeacon
- OpenTelemetry JavaScript instrumentation documentation: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry Python metrics API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/metrics.html
- OpenTelemetry Prometheus and OpenMetrics compatibility specification: https://opentelemetry.io/docs/specs/otel/compatibility/prometheus_and_openmetrics/
- Prometheus histogram_quantile documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/#histogram_quantile

## Issues Found
- The post described Core Web Vitals responsiveness as FID/INP and used `onFID`, but current Core Web Vitals are LCP, INP, and CLS, and `web-vitals` v5 documents the Core Web Vitals imports as `onLCP`, `onINP`, and `onCLS`. Removed FID references from the code and updated the metadata tag to INP.
- The browser example said it sent metrics directly to an OpenTelemetry Collector, but the code posts custom JSON to `/api/v1/browser-metrics`. Updated the text to say it sends to an application endpoint that records metrics with OpenTelemetry.
- The `sendBeacon` example sent a JSON string without a JSON content type, which can cause Flask `request.get_json()` to fail. Wrapped the payload in a `Blob` with `type: 'application/json'`.
- The Python example imported `trace` without using it and described the trace ID as a metric link. Removed the unused import and changed the explanation to describe the trace ID as a metric attribute.
- The PromQL examples queried `browser_lcp` directly even though the Python code records an OpenTelemetry histogram, which Prometheus commonly exposes as `_sum`, `_count`, and `_bucket` series with unit suffixes. Updated the LCP average query to use `browser_lcp_milliseconds_sum` and `browser_lcp_milliseconds_count`.
- The alert expressions compared page-grouped LCP vectors with backend latency vectors that had different labels. Updated the alerts to use `and on (page_url)` and `label_replace()` so backend route labels can match the browser page label.

## Review Notes
Using `server.trace_id` as a metric attribute can create very high cardinality if exported to Prometheus labels. It is useful for point debugging and trace lookup, but production systems should usually control cardinality carefully or rely on exemplars and trace/log links where supported.
