# Validation Summary: How to Monitor Argo CD show resources permanently out-of-sync

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Cilium
- Cilium CLI and in-agent debugging tools
- Argo CD
- Helm
- Prometheus and Prometheus Operator
- Grafana

## Sources Consulted
- Cilium documentation: Troubleshooting Cilium deployed with Argo CD, https://docs.cilium.io/en/latest/configuration/argocd-issues.html
- Cilium documentation: Running Prometheus & Grafana, https://docs.cilium.io/en/stable/observability/grafana/
- Cilium documentation: Monitoring & Metrics, https://docs.cilium.io/en/stable/observability/metrics/
- Cilium documentation: Helm Reference, https://docs.cilium.io/en/stable/helm-values/
- Cilium command reference: cilium status, cilium connectivity test, cilium sysdump, cilium-dbg metrics list, cilium-dbg status, cilium-health status, https://docs.cilium.io/en/stable/cmdref/
- Argo CD documentation: Resource Exclusion/Inclusion, https://argo-cd.readthedocs.io/en/release-2.5/operator-manual/declarative-setup/#resource-exclusioninclusion
- Kubernetes documentation: kubectl exec reference, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Prometheus Operator API documentation for PrometheusRule, https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The post discussed Argo CD showing Cilium resources out of sync but did not include the Argo CD configuration recommended by Cilium. Added a minimal `resource.exclusions` example for `CiliumIdentity`, Argo CD rollout restart commands, and Cilium's `nonIdempotentAnnotations` Helm value for generated resources.
- The Hubble metrics Helm command enabled OpenMetrics but did not enable any Hubble metrics. Added `hubble.metrics.enabled` with a concrete metric list.
- The Grafana dashboard command enabled Hubble UI instead of Cilium dashboard ConfigMaps. Replaced it with `dashboards.enabled`, `operator.dashboards.enabled`, and `hubble.metrics.dashboards.enabled`.
- Several examples used top-level `cilium` CLI commands for functionality that belongs to in-agent tools such as `cilium-dbg` and `cilium-health`. Updated metric, endpoint, identity, health, and tunnel examples to use `kubectl exec` into a Cilium agent pod where appropriate.
- The `cilium status --brief` command used an option that belongs to `cilium-dbg status`, not the Kubernetes `cilium status` command. Replaced it with `cilium status`.
- The Prometheus alert used the non-existent `cilium_policy_regeneration_time_stats_seconds_*` metric. Replaced it with the documented endpoint regeneration metric, `cilium_endpoint_regeneration_time_stats_seconds_*`.
- Some troubleshooting checks used deprecated or invalid policy and endpoint commands. Replaced them with Kubernetes resource queries for CiliumNetworkPolicy, CiliumClusterwideNetworkPolicy, NetworkPolicy, and CiliumEndpoint.

## Review Notes
The prerequisites still mention broad historical minimum versions (`Kubernetes v1.21+` and `Cilium v1.14+`). Operators should confirm the supported Kubernetes versions for their specific Cilium release before applying this in production.
