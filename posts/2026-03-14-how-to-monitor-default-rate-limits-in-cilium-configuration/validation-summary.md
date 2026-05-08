# Validation Summary: How to Monitor Default Rate Limits in Cilium configuration

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Kubernetes
- Helm
- Prometheus
- Prometheus Operator
- Grafana
- Hubble
- eBPF

## Sources Consulted
- Cilium Monitoring & Metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium Helm values reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium Prometheus & Grafana documentation: https://docs.cilium.io/en/stable/observability/grafana/
- Cilium CLI command reference for `cilium status`: https://docs.cilium.io/en/stable/cmdref/cilium_status/
- Cilium CLI command reference for `cilium connectivity test`: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/
- Cilium CLI command reference for `cilium sysdump`: https://docs.cilium.io/en/latest/cmdref/cilium_sysdump/
- Cilium `cilium-dbg` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg/
- Cilium `cilium-dbg metrics list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_metrics_list/
- Cilium `cilium-health status` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-health_status/
- Cilium troubleshooting documentation: https://docs.cilium.io/en/stable/operations/troubleshooting/
- Cilium system requirements: https://docs.cilium.io/en/stable/operations/system_requirements/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The Hubble metrics Helm example enabled OpenMetrics but did not enable any Hubble metrics. Added `hubble.metrics.enabled` with an explicit metric list, matching Cilium's documented static exporter configuration.
- The metrics endpoint verification used `kubectl exec -l`, which is not a portable `kubectl exec` invocation. Replaced it with a pod lookup via `kubectl get pods -l k8s-app=cilium` followed by `kubectl exec` against the selected pod.
- Several examples used `cilium metrics`, `cilium identity`, `cilium endpoint`, `cilium policy`, and `cilium bpf` as local commands. Current Cilium documentation exposes those agent-local operations through `cilium-dbg`, so the examples now run `cilium-dbg` inside a Cilium agent pod.
- The dashboard example used `hubble.ui.enabled=true`, which enables Hubble UI rather than Grafana dashboard ConfigMaps. Replaced it with the documented dashboard Helm values: `dashboards.enabled`, `operator.dashboards.enabled`, and `hubble.metrics.dashboards.enabled`.
- The alert rule used deprecated or removed policy regeneration metrics. Replaced the expression with the current endpoint regeneration histogram metric and renamed the alert to `CiliumEndpointRegenerationSlow`.
- The health check script used `cilium status --brief`, but the Kubernetes-facing `cilium status` command does not document a `--brief` flag. Replaced it with `cilium status`.
- The verification section used `cilium health status`, but Cilium documents this command as `cilium-health status`. Updated the example to run `cilium-health status` inside a Cilium agent pod.
- The troubleshooting section claimed a fixed Linux kernel minimum of 4.19. Current Cilium requirements are release-specific and currently document Linux kernel >= 5.10 or an equivalent distribution kernel such as RHEL 8.10's 4.18. Reworded the guidance to check the requirement for the installed Cilium release.
- The configuration troubleshooting command used `cilium config view`, which is not documented in the current command reference. Replaced it with checking the `cilium-config` ConfigMap and using `cilium-dbg config get <key>` for specific active settings.

## Review Notes
The post is technically relevant and now uses current Cilium command families and metric names. The title and introduction emphasize "default rate limits", but most examples cover broader Cilium monitoring rather than a dedicated walkthrough of Cilium Kubernetes client QPS/burst rate-limit settings; that is a content-scope improvement rather than a correctness blocker.
