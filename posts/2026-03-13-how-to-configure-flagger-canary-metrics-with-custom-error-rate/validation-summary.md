# Validation Summary: How to Configure Flagger Canary Metrics with Custom Error Rate

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flagger Canary resources
- Flagger MetricTemplate resources
- Prometheus and PromQL
- Istio standard metrics
- Kubernetes Deployments and Services

## Sources Consulted
- Flagger Metrics Analysis documentation: https://docs.flagger.app/main/usage/metrics
- Flagger How It Works documentation: https://docs.flagger.app/usage/how-it-works
- Flagger Canary API source: https://raw.githubusercontent.com/fluxcd/flagger/main/pkg/apis/flagger/v1beta1/canary.go
- Istio Standard Metrics documentation: https://istio.io/latest/docs/reference/config/metrics/
- Prometheus Operators documentation: https://prometheus.io/docs/prometheus/latest/querying/operators/
- Prometheus Query Functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/

## Issues Found
- The prerequisites implied that a matching Kubernetes Service must already exist for the Deployment targeted by the Canary. Flagger's Canary service configuration defines generated services, so the wording was changed to require only a Deployment targeted by a Canary resource.
- The no-traffic PromQL example used `or vector(0)` directly after a ratio. Prometheus logical/set operators do not replace a present `NaN` sample, so this does not reliably handle `0/0` when existing time series have a zero rate. The query was changed to drop samples where the total request rate is zero with `and on() (...) > 0`, then fall back to `vector(0)`.

## Review Notes
The Flagger `MetricTemplate` and `Canary` fields, template variables, threshold range usage, and Istio metric labels used in the examples match the current official documentation. The application-level metric example remains intentionally generic because label names depend on the application's exported metrics.
