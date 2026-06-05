# Validation Summary: How to Integrate Lighthouse CI Scores with OpenTelemetry for Combined

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Lighthouse CI
- OpenTelemetry Python Metrics API and SDK
- OpenTelemetry JavaScript tracing API
- OpenTelemetry HTTP semantic conventions
- Grafana and Prometheus queries
- GitHub Actions

## Sources Consulted
- Lighthouse CI configuration documentation: https://googlechrome.github.io/lighthouse-ci/docs/configuration.html
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python SDK metrics API documentation: https://opentelemetry-python.readthedocs.io/en/latest/sdk/metrics.html
- OpenTelemetry JavaScript Span API documentation: https://open-telemetry.github.io/opentelemetry-js/interfaces/_opentelemetry_api._opentelemetry_api.Span.html
- OpenTelemetry HTTP metrics semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-metrics/
- OpenTelemetry naming conventions: https://opentelemetry.io/docs/specs/semconv/general/naming/
- OpenTelemetry Prometheus compatibility documentation: https://opentelemetry.io/docs/compatibility/prometheus/client-libraries/
- Grafana Tempo span metrics documentation: https://grafana.com/docs/tempo/latest/metrics-from-traces/span-metrics/span-metrics-metrics-generator/

## Issues Found
- The Lighthouse parser used `glob(f"{results_dir}/*.json")`, which would include LHCI's `manifest.json`. LHCI filesystem uploads create a `manifest.json` plus individual `*.report.json` files, and the manifest is an array rather than a Lighthouse report object. Changed the glob to `*.report.json` so the parser reads only report JSON files.
- The Grafana backend latency examples used `http_server_duration_bucket`, which is not the current OpenTelemetry HTTP server duration metric. Updated the examples to use the current `http.server.request.duration` metric as it is commonly translated for Prometheus classic naming: `http_server_request_duration_seconds_bucket`.
- The dashboard text implied `page.url` would automatically be available as a Prometheus label on backend latency metrics. Added a note that span metrics must be configured to include `page.url` as a dimension before it can be queried as a label.

## Review Notes
The OpenTelemetry metric names in the custom Lighthouse example are valid enough for the tutorial, but future revisions could improve them by setting explicit units during instrument creation instead of encoding units like `milliseconds` in metric names.
