# Validation Summary: How to Build an OpenTelemetry Training Curriculum with Hands-On Labs

## Status
validated

## Post Type
Tutorial / training guide

## Technologies Covered
- OpenTelemetry
- OpenTelemetry Demo / Astronomy Shop
- Docker Compose
- Jaeger
- Grafana
- Prometheus and PromQL
- OpenFeature / flagd feature flags
- Python OpenTelemetry instrumentation

## Sources Consulted
- OpenTelemetry Demo Docker deployment documentation: https://opentelemetry.io/docs/demo/docker-deployment/
- OpenTelemetry Demo documentation index and service/language matrix: https://opentelemetry.io/docs/demo/
- OpenTelemetry Demo GitHub repository: https://github.com/open-telemetry/opentelemetry-demo
- OpenTelemetry Demo Compose files and `.env`: https://github.com/open-telemetry/opentelemetry-demo/blob/main/compose.yaml, https://github.com/open-telemetry/opentelemetry-demo/blob/main/compose.observability.yaml, https://github.com/open-telemetry/opentelemetry-demo/blob/main/.env
- OpenTelemetry Demo feature flag configuration: https://github.com/open-telemetry/opentelemetry-demo/blob/main/src/flagd/demo.flagd.json
- OpenTelemetry Demo Grafana dashboards: https://github.com/open-telemetry/opentelemetry-demo/tree/main/src/grafana/provisioning/dashboards/demo
- OpenTelemetry Demo recommendation service source: https://github.com/open-telemetry/opentelemetry-demo/blob/main/src/recommendation/recommendation_server.py
- OpenTelemetry Python tracing documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python metrics API documentation: https://opentelemetry-python.readthedocs.io/en/latest/api/metrics.html
- Docker Compose CLI help output for `docker compose up` and `docker compose ps`

## Issues Found
- The setup command used plain `docker compose up -d`, but the current repository splits the full stack and observability stack into layered Compose files. Changed it to `docker compose -f compose.yaml -f compose.full.yaml -f compose.observability.yaml up -d` so Jaeger, Grafana, and Prometheus are included.
- The browser access URLs for Jaeger, Grafana, and feature flags were stale. Updated them to the current proxy paths under `http://localhost:8080/` and added the Prometheus URL used later in the labs.
- The Jaeger and Grafana lab instructions used stale direct ports. Updated them to the current proxy URLs.
- The product catalog failure lab did not identify the product needed to trigger the flag scenario. Added the product ID `OLJCESPC7Z`, which is the current documented target for `productCatalogFailure`.
- The PromQL request-rate query used `http_server_request_duration_seconds_count` and `checkoutservice`, which do not match the current demo dashboards. Updated it to use the current spanmetrics metric `traces_span_metrics_calls_total` and service name `checkout`.
- The recommendation service path and Compose service name were outdated. Updated `src/recommendationservice/recommendation_server.py` to `src/recommendation/recommendation_server.py`, and `recommendationservice` to `recommendation`.
- The custom span snippet referenced a non-existent `get_recommendations` function and `filter_products` helper. Updated it to match the current `get_product_list` filtering logic in the Python recommendation service.
- The performance-regression lab referenced a non-existent `paymentServiceSlowResponse` feature flag. Replaced it with the current `intlShippingSlowdown` flag and adjusted the simulated root-cause service from payment to shipping.

## Review Notes
The demo changes frequently, so labs that name exact feature flags, service paths, metric names, and dashboard URLs should be checked against the OpenTelemetry Demo repository before each training run.
