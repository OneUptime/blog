# Validation Summary: How to Monitor Webhook Performance in Istio

## Status
validated

## Post Type
Tutorial / Monitoring guide

## Technologies Covered
- Istio
- Kubernetes admission webhooks
- Prometheus
- PromQL
- Grafana
- Prometheus Operator PrometheusRule
- kubectl

## Sources Consulted
- Istio pilot-discovery exported metrics: https://istio.io/latest/docs/reference/commands/pilot-discovery/
- Istio application requirements and control plane ports: https://istio.io/latest/docs/ops/deployment/application-requirements/
- Istio sidecar injection troubleshooting: https://istio.io/latest/docs/ops/common-problems/injection/
- Kubernetes dynamic admission control and admission webhook metrics: https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/
- Kubernetes metrics reference: https://kubernetes.io/docs/reference/instrumentation/metrics/
- Kubernetes webhook admission configuration reference: https://kubernetes.io/docs/reference/config-api/apiserver-webhookadmission.v1/

## Issues Found
- The post described `sidecar_injection_requests_total` as labeled by success or failure. Istio documents separate `sidecar_injection_success_total` and `sidecar_injection_failure_total` counters, so the metric examples, success-rate query, error-rate query, and high-error-rate alert were updated to use the documented metric names.
- The success-rate query was described as directly returning a percentage. PromQL returns a ratio unless the dashboard formats it as a percentage, so the explanation was corrected.
- The Kubernetes API server webhook examples filtered on one exact Istio webhook name. Istio webhook names vary by installation and revision mode, so the queries now use a sidecar-injector name regex.
- The post stated that API server webhook latency metrics will always be higher than istiod internal metrics. Because timing and scrape behavior can vary, this was softened to "usually higher" and described as an estimate.

## Review Notes
- The remaining commands and configuration snippets are technically valid for current Istio and Kubernetes usage, assuming the cluster has the relevant Prometheus scraping and Prometheus Operator CRDs installed.
- The latency thresholds in the post are operational guidance rather than official Istio service-level guarantees.
