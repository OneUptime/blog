# Validation Summary: How to Monitor Cilium Scalability report

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
- Cilium CLI command reference: https://docs.cilium.io/en/stable/cmdref/
- Cilium `cilium status` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_status/
- Cilium `cilium-dbg metrics list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_metrics_list.html
- Cilium `cilium-dbg endpoint get` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_get/
- Cilium `cilium-health status` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-health_status.html
- Cilium `cilium sysdump` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_sysdump/
- Cilium `cilium connectivity test` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test.html
- Kubernetes `kubectl exec` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes `kubectl top` reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands

## Issues Found
- The Hubble metrics Helm example enabled Hubble and OpenMetrics output but did not set `hubble.metrics.enabled`, which means Hubble metrics remain disabled. Added an explicit Hubble metrics list.
- The metrics endpoint verification used `kubectl exec -l`, but the documented `kubectl exec` form targets a pod or `TYPE/NAME`. Changed it to execute against `ds/cilium`.
- Several examples used `cilium metrics list`, `cilium identity list`, and `cilium endpoint list`, but those operations are exposed through the agent-local `cilium-dbg` CLI rather than the Kubernetes-facing `cilium` CLI. Updated those examples to run `cilium-dbg` inside a Cilium agent pod.
- The Grafana dashboard example enabled `hubble.ui.enabled`, which deploys Hubble UI rather than Grafana dashboard ConfigMaps. Replaced it with the documented dashboard Helm values for Cilium agent, Cilium operator, and Hubble metrics dashboards.
- The Prometheus alert for policy regeneration used a non-current policy regeneration metric name. Changed it to the documented endpoint regeneration metric and updated the alert summary accordingly.
- The health check script used `cilium status --brief`, but `--brief` is not a flag on the Kubernetes-facing `cilium status` command. Replaced it with `cilium status`.
- The verification section used `cilium health status`, but Cilium documents this as `cilium-health status`. Updated the command to run inside a Cilium agent pod.
- The endpoint count verification used the agent-local endpoint command from the wrong CLI context. Replaced it with a cluster-wide `kubectl get ciliumendpoints --all-namespaces` count.
- Troubleshooting guidance referenced deprecated or wrong CLI commands for policies, endpoints, and tunnel state. Replaced those with Kubernetes CRD queries, `cilium-dbg endpoint get`, and `cilium-health status`.

## Review Notes
- The alert thresholds are example thresholds and should be tuned per cluster size, traffic volume, and baseline behavior.
- The PrometheusRule example assumes Prometheus Operator CRDs are installed.
- Some `cilium-dbg` and `cilium-health` checks inspect the selected Cilium agent pod; operators should repeat node-local checks on affected nodes when debugging node-specific issues.
