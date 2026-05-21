# Validation Summary: How to Create Runbook for Istio Performance Issues

## Status
validated

## Post Type
Technical runbook

## Technologies Covered
- Istio service mesh
- Kubernetes
- Envoy proxy
- Prometheus and PromQL
- Istio Telemetry, DestinationRule, Sidecar, and IstioOperator resources
- istioctl and kubectl CLI commands

## Sources Consulted
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio DestinationRule API reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio Sidecar API reference: https://istio.io/latest/docs/reference/config/networking/sidecar/
- Istio Envoy statistics operations documentation: https://istio.io/latest/docs/ops/configuration/telemetry/envoy-stats/
- Istio resource annotations reference: https://istio.io/latest/docs/reference/config/annotations/
- Istio command reference and control plane metrics list: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio bug reporting documentation: https://istio.io/latest/docs/releases/bugs/
- Kubernetes kubectl generated reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Kubernetes kubectl patch reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- Prometheus histogram documentation: https://prometheus.io/docs/practices/histograms/

## Issues Found
- The sidecar Envoy admin examples used `curl` inside the `istio-proxy` container. Istio's current documentation recommends `pilot-agent request GET stats`, and proxy images may not include `curl`, so the sidecar stats, clusters, and Prometheus endpoint examples were changed to use `pilot-agent request`.
- The quick health assessment attempted to find CPU cgroup throttling counters in Envoy stats with `grep "cfs_throttled"`. Those are not Envoy stats. The sample command was changed to inspect the sidecar concurrency setting, while the existing PromQL section remains the throttling check.
- The post referenced `pilot_proxy_convergence_time`, which is not listed in the current Istio control plane metrics reference. The examples were changed to use the documented `pilot_xds_send_time` metric for config send time and `pilot_worker_queue_depth` for queue depth.
- The Telemetry resource used `apiVersion: networking.istio.io/v1`. The current Telemetry API group is `telemetry.istio.io/v1`, so the YAML snippet was corrected.
- Envoy detailed stats examples could return empty results under current Istio defaults because Istio records a minimal stats set unless `proxyStatsMatcher` includes the desired stats. A short note was added before those commands.
- Envoy's current circuit breaker documentation notes `upstream_rq_active_overflow` for active request overflow, while legacy pending overflow behavior can vary. The connection-pool check was updated to look for both pending and active request overflows.

## Review Notes
The remaining Kubernetes, Istio, DestinationRule, Sidecar, IstioOperator, `istioctl bug-report --full-secrets=false`, and PromQL snippets are technically valid for current Istio and Kubernetes usage. Some values such as CPU limits, connection pool sizes, outlier detection thresholds, and the `> 5 seconds` push-time threshold are operational examples rather than universal defaults and should be tuned per environment.
