# Validation Summary: How to Monitor Istio SLOs with OneUptime

## Status
validated

## Post Type
Guide

## Technologies Covered
- Istio service mesh metrics
- Prometheus and PromQL
- OneUptime metrics monitoring
- Service Level Objectives, Service Level Indicators, error budgets, and burn-rate alerting

## Sources Consulted
- Istio Standard Metrics: https://istio.io/latest/docs/reference/config/metrics/
- Istio Telemetry API metrics reference: https://istio.io/latest/docs/reference/config/telemetry/
- Prometheus Histograms and Summaries: https://prometheus.io/docs/practices/histograms/
- Prometheus Query Functions: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Google SRE Workbook, Prometheus Alerting: Turn SLOs into Alerts: https://sre.google/workbook/alerting-on-slos/
- OneUptime Metrics Monitor Docs: https://oneuptime.com/docs/monitor/metrics-monitor
- OneUptime Metrics product page: https://oneuptime.com/product/metrics

## Issues Found
- The OneUptime setup example used an undocumented YAML shape with `metric`, `filters`, and a multi-assignment `calculation` block. OneUptime's metrics monitor documentation describes metric queries, formulas, and PromQL-compatible querying rather than that configuration format. Replaced the example with a PromQL-backed metrics monitor query and threshold check.
- The OneUptime availability example filtered `destination_service` outside the query but did not apply it to both the successful and total request calculations. The corrected PromQL query applies the same `destination_service` and `reporter="destination"` filters to both numerator and denominator.
- The SLO table labeled latency objectives as `p99` while the targets were expressed as percentages of requests under a threshold, including a 99.5% target that would be p99.5 rather than p99. Updated the labels to `Latency` while keeping the original targets.

## Review Notes
- Istio metric names `istio_requests_total` and `istio_request_duration_milliseconds`, along with labels such as `response_code`, `destination_service`, and `reporter`, match the current Istio documentation.
- The latency SLI query uses Prometheus classic histogram bucket and count series in the standard way.
- The multi-window burn-rate thresholds of 14.4 for a 1-hour/5-minute page and 6 for a 6-hour/30-minute page match Google SRE Workbook guidance for a 30-day SLO window.
