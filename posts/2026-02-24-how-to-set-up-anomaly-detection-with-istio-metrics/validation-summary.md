# Validation Summary: How to Set Up Anomaly Detection with Istio Metrics

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio service mesh telemetry
- Prometheus and PromQL
- Prometheus Operator PrometheusRule resources
- Grafana time series visualizations
- Statistical anomaly detection concepts

## Sources Consulted
- Istio Standard Metrics: https://istio.io/latest/docs/reference/config/metrics/
- Prometheus query functions: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus querying basics and subquery syntax: https://prometheus.io/docs/prometheus/latest/querying/basics/
- Prometheus alerting rules: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Grafana time series visualization documentation: https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/visualizations/time-series/

## Issues Found
- The rate-of-change alert used `deriv(service:error_rate:5m[15m]) > 0.01` and described that as 1 percentage point per second. Since the error rate is represented as a fraction, this threshold would require an extremely steep increase. Changed the threshold to `0.00005` and updated the explanation to 0.005 percentage points per second, or about 0.3 percentage points per minute.
- The seasonal detection section said a 7-day average captures weekly seasonal patterns. A plain `avg_over_time(...[7d])` smooths across a week but does not compare traffic to the same time of day or same weekday. Updated the wording to describe it as a longer smoothing baseline rather than true same-time-of-week seasonality.

## Review Notes
The Istio metric names and labels used in the examples match the official Istio standard metrics documentation. The PromQL functions and subquery syntax are current, and the Grafana fill guidance matches the current "Fill below to" override terminology. In a production setup, teams should tune thresholds per service and consider explicit traffic-volume gates for latency and error-rate alerts as well as request-rate alerts.
