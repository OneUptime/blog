# Validation Summary: How to Set Up Business Metrics with Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio Telemetry API
- Istio standard metrics
- Envoy request attributes
- Prometheus and PromQL
- Prometheus Operator PrometheusRule
- Grafana dashboards

## Sources Consulted
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio Customizing Metrics task: https://istio.io/latest/docs/tasks/observability/metrics/customize-metrics/
- Istio Classifying Metrics Based on Request or Response task: https://istio.io/latest/docs/tasks/observability/metrics/classify-metrics/
- Istio Standard Metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Envoy attributes reference: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/advanced/attributes.html
- Prometheus query functions reference: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus recording and alerting rules reference: https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/
- PrometheusRule monitoring API reference: https://docs.redhat.com/en/documentation/openshift_container_platform/4.13/html/monitoring_apis/prometheusrule-monitoring-coreos-com-v1
- Grafana dashboard JSON model reference: https://grafana.com/docs/grafana/latest/reference/dashboard/
- Grafana pie chart visualization documentation: https://grafana.com/docs/grafana/latest/panels-visualizations/visualizations/pie-chart/

## Issues Found
- The `customer_tier` tag override used `request.headers['x-customer-tier'] | 'standard'`. Istio Telemetry metric tag values are CEL expressions, and Istio's documentation explicitly notes that the pipe operator is not supported. Changed it to a CEL map-key check: `'x-customer-tier' in request.headers ? request.headers['x-customer-tier'] : 'standard'`.
- The post queried `istio_request_duration_milliseconds_bucket` by `customer_tier`, but the original Telemetry configuration only added `customer_tier` to `REQUEST_COUNT`. Added a matching `REQUEST_DURATION` tag override so the latency query can group by that label.
- The API-version traffic distribution PromQL divided a vector grouped by `api_version` by an ungrouped total vector. PromQL's default vector matching would not match those label sets, so the query could return no data. Added `ignoring(api_version) group_left` for the intended per-version-to-total calculation.

## Review Notes
- The post correctly warns about metric cardinality. Header-derived labels should remain tightly bounded, because high-cardinality request headers can cause serious Prometheus storage and query overhead.
- The Grafana JSON is a simplified dashboard fragment rather than a complete export with panel layout, datasource UIDs, and full metadata. It is technically plausible as an example, but a production import should include the complete dashboard JSON model.
