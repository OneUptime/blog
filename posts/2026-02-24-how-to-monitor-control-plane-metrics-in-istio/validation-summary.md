# Validation Summary: How to Monitor Control Plane Metrics in Istio

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- Istiod / Pilot control plane
- Envoy xDS
- Prometheus and PromQL
- Prometheus Operator `PrometheusRule`
- Kubernetes and `kubectl`
- IstioOperator

## Sources Consulted
- Istio `pilot-discovery` exported metrics reference: https://istio.io/latest/docs/reference/commands/pilot-discovery/
- Istio `istioctl` command reference, including `proxy-status` and exported metrics: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio Application Requirements, ports used by istiod: https://istio.io/latest/docs/ops/deployment/application-requirements/
- Istio Performance and Scalability guide: https://istio.io/latest/docs/ops/deployment/performance-and-scalability/
- Istio installation customization and IstioOperator Kubernetes settings: https://istio.io/latest/docs/setup/additional-setup/customize-installation/
- IstioOperator API reference: https://istio.io/latest/docs/reference/config/istio.operator.v1alpha1/
- Prometheus query functions, including `rate()` and `histogram_quantile()`: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus Operator API reference for `PrometheusRule`: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- Replaced the nonexistent `pilot_xds_push_errors` metric with current Istio error metrics `pilot_total_xds_internal_errors` and `pilot_total_xds_rejects`.
- Fixed the `pilot_push_triggers` breakdown query from invalid PromQL using `by (type)` after `rate()` to `sum by (reason) (rate(...))`, matching Istio's documented `reason` label.
- Changed the description of `pilot_xds_expired_nonce` from connection terminations to expired nonce requests, matching the Istio metric description.
- Fixed the sidecar-count command so it counts pods containing an `istio-proxy` container instead of relying on a label selector and then counting all selected pods.
- Corrected certificate signing errors to use `citadel_server_csr_sign_err_count`; kept `citadel_server_authentication_failure_count` as a separate authentication failure metric.
- Removed older outbound conflict metrics that are not listed in the current Istio exported metrics reference and kept the currently documented conflict metrics.
- Changed the proxies-per-istiod query to use `sum(pilot_xds) / count(up{job="istiod"} == 1)` so it computes a per-instance average instead of dividing each series independently.
- Replaced the unsupported "1000-2000 proxies" capacity claim with Istio's documented general guidance that the control plane supports thousands of proxies and scales with configuration size, change rate, and connected proxies.

## Review Notes
The Prometheus job label `job="istiod"` depends on the local scrape configuration; the queries are correct for common Istio/Prometheus setups but may need label adjustment in clusters with custom scrape jobs.
