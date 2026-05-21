# Validation Summary: How to Monitor Istio Configuration Sync Status

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Istio
- istioctl
- Envoy xDS
- Prometheus / PromQL
- Prometheus Operator PrometheusRule
- Grafana
- Kubernetes

## Sources Consulted
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio diagnostic tools for istioctl: https://istio.io/latest/docs/ops/diagnostic-tools/istioctl/
- Istio Debugging Envoy and Istiod: https://istio.io/latest/docs/ops/diagnostic-tools/proxy-cmd/
- Istio pilot-discovery exported metrics reference: https://istio.io/latest/docs/reference/commands/pilot-discovery/
- Istio configuration validation problems: https://istio.io/latest/docs/ops/common-problems/validation/

## Issues Found
- Corrected the explanation of `NOT SENT` in `istioctl proxy-status`. Istio documents this as usually meaning Istiod has nothing to send for that xDS type, not that no configuration was pushed to the proxy at all.
- Replaced stale or misleading Istiod metrics. `pilot_xds_connected_endpoints` was updated to `pilot_xds`; `pilot_xds_pushes` was replaced with `pilot_push_triggers` for push-rate examples; `pilot_xds_push_time_bucket` and `pilot_total_xds_rejects` were added; removed conflict metrics that are not listed in the current Istio metric reference.
- Updated Prometheus alert expressions and Grafana panel queries to use current Istio metric names and a valid aggregate comparison for connected proxies.
- Replaced `istioctl proxy-status deploy/my-app -n default` with a single-proxy example because Istio documents detailed diffs for a specific proxy ID.
- Replaced the troubleshooting curl against `https://istiod.istio-system.svc:15012/debug/connections`. Port 15012 is the xDS mTLS port; the Istio docs use the port 15014 status endpoint, such as `/version`, for simple connectivity checks.

## Review Notes
The post is technically relevant and mostly accurate after the metric and troubleshooting-command updates. The exact `istioctl proxy-status` table columns can vary by Istio version and verbosity, so readers should expect minor output differences across installations.
