# Validation Summary: How to Configure Helm template with serviceMonitor enabled fails

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Cilium
- Helm
- Kubernetes
- Prometheus Operator ServiceMonitor
- Hubble
- eBPF

## Sources Consulted
- Cilium Helm Reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium troubleshooting for Argo CD and `helm template` with `serviceMonitor`: https://docs.cilium.io/en/latest/configuration/argocd-issues/
- Cilium identity-relevant labels documentation: https://docs.cilium.io/en/stable/operations/performance/scalability/identity-relevant-labels/
- Cilium CLI command reference for `cilium status`, `cilium connectivity test`, and `cilium sysdump`: https://docs.cilium.io/en/latest/cmdref/
- Cilium `cilium-dbg` command reference for endpoint, metrics, policy, and BPF commands: https://docs.cilium.io/en/stable/cmdref/
- Prometheus Operator design documentation for ServiceMonitor behavior: https://prometheus-operator.dev/docs/getting-started/design/
- Helm `upgrade` command documentation: https://helm.sh/docs/helm/helm_upgrade/

## Issues Found
- The introduction said Helm template rendering requires ServiceMonitor CRDs to be present in the cluster. For `helm template`, the important requirement is that Helm knows the `monitoring.coreos.com/v1` API exists, commonly by passing `--api-versions=monitoring.coreos.com/v1`, using cluster discovery, or setting Cilium's `prometheus.serviceMonitor.trustCRDsExist` value. Updated the explanation.
- The ServiceMonitor Helm values enabled `prometheus.serviceMonitor.enabled` but did not address Cilium's chart validation for CRD availability. Added `prometheus.serviceMonitor.trustCRDsExist: true`.
- The `labels` Helm value was written as an object with `exclude`, but Cilium expects a space-separated string of label patterns. Replaced it with the valid exclusion string syntax.
- The advanced BPF example used non-existent Helm values `bpf.ctTcpTimeout` and `bpf.ctAnyTimeout`. Replaced them with valid connection tracking map size values `bpf.ctTcpMax` and `bpf.ctAnyMax`.
- The advanced identity garbage collection value was placed at the top level as `identityGCInterval`. Cilium exposes this as `operator.identityGCInterval`, so the example was corrected.
- Several troubleshooting commands used `cilium` CLI subcommands that are actually provided by `cilium-dbg`, or are better queried through Kubernetes CRDs. Replaced those with current `kubectl` and `cilium-dbg` equivalents.
- The endpoint-count command used `cilium endpoint list`, which is not part of the cluster-level Cilium CLI. Replaced it with a `kubectl get ciliumendpoints --all-namespaces -o name` based command.

## Review Notes
The guide is now technically valid for the reviewed Cilium Helm values and commands. The Kubernetes and Cilium version prerequisites are broad; future updates could pin examples to a specific Cilium chart version to reduce version-specific ambiguity.
