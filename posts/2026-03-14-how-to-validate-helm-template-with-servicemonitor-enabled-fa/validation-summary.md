# Validation Summary: How to Validate Helm template with serviceMonitor enabled fails

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cilium
- Cilium CLI and cilium-dbg
- Kubernetes
- kubectl
- Helm
- Prometheus Operator ServiceMonitor
- CiliumNetworkPolicy

## Sources Consulted
- Cilium Helm values reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium monitoring and metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium CLI command reference for connectivity tests: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/
- Cilium cilium-dbg command reference: https://docs.cilium.io/en/stable/cmdref/
- Cilium cilium-dbg metrics list reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_metrics_list.html
- Cilium Endpoint CRD documentation: https://docs.cilium.io/en/latest/network/kubernetes/ciliumendpoint.html
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Cilium policy language documentation: https://docs.cilium.io/en/stable/security/policy/language/
- Cilium sysdump command reference: https://docs.cilium.io/en/latest/cmdref/cilium_sysdump/

## Issues Found
- The introduction stated that Helm template rendering requires ServiceMonitor CRDs to be present in the cluster. I clarified that Cilium's chart requires the CRDs when ServiceMonitor resources are enabled, and noted the chart's `prometheus.serviceMonitor.trustCRDsExist=true` option for template rendering workflows.
- Several examples used workstation `cilium` CLI commands for agent-side inspection commands such as endpoint, identity, metrics, policy, and BPF map inspection. I changed these to use Kubernetes CRDs where appropriate or `kubectl exec ... -- cilium-dbg ...` inside a selected Cilium agent pod.
- The verification section used `cilium health status`, but current Cilium command references expose health checks through the agent-side `cilium-health` command. I changed this to run `cilium-health status` inside the selected agent pod.
- The operator health check used the selector `name=cilium-operator`, which is not the current Cilium operator label used by the chart and tooling. I changed it to `io.cilium/app=operator`.
- The troubleshooting guidance referenced a `cilium-init` init container name that is not reliable for current Cilium pods. I changed the log command to collect previous logs from all containers.

## Review Notes
The commands require a live Kubernetes cluster with Cilium installed and appropriate RBAC permissions. The local environment did not have `helm`, `kubectl`, or `cilium` installed, so command availability was verified against official documentation rather than local CLI help.
