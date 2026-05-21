# Validation Summary: How to Set Up Alerting for High Error Rate in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio service mesh
- Istio standard metrics and telemetry labels
- Prometheus and PromQL
- Prometheus Operator PrometheusRule resources
- Kubernetes custom resources
- Istio VirtualService fault injection
- SLO burn-rate alerting

## Sources Consulted
- Istio Standard Metrics: https://istio.io/latest/docs/reference/config/metrics/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Prometheus Operator API reference for PrometheusRule: https://prometheus-operator.dev/docs/api-reference/api/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus operators and vector matching documentation: https://prometheus.io/docs/prometheus/latest/querying/operators/
- Prometheus template reference: https://prometheus.io/docs/prometheus/latest/configuration/template_reference/
- Google SRE Workbook, Alerting on SLOs: https://sre.google/workbook/alerting-on-slos/

## Issues Found
- The introductory mesh-wide error-rate query omitted the `reporter` label. Because Istio emits request metrics from both source and destination reporters, the query could double-count traffic and mix client-side and server-side perspectives. Updated the query to use `reporter="destination"` consistently.
- The SLO fast-burn comment said `14.4 * 0.001` represented a 2% error rate for a 99.9% SLO. The actual threshold is a 1.44% error rate; 2% is the fraction of a 30-day error budget consumed in one hour at a 14.4x burn rate. Updated the comment.
- The fast-burn annotation said the monthly budget would be exhausted in less than 2 days. At a 14.4x burn rate, a 30-day budget is exhausted in about 2.1 days. Updated the description to "about 2 days."

## Review Notes
- The PrometheusRule structure, alerting rule fields, PromQL aggregation syntax, `humanizePercentage` template usage, Istio metric labels, and VirtualService fault-injection fields match current official documentation.
- The gRPC error-rate example is valid because Istio documents `grpc_response_status` as present only on gRPC metrics; future revisions could make it clearer by explicitly adding `request_protocol="grpc"` to the numerator as well.
