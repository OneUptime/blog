# Validation Summary: How to Troubleshoot Helm template with serviceMonitor enabled fails

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Cilium
- Kubernetes
- Helm
- Prometheus Operator ServiceMonitor
- Prometheus metrics
- eBPF/BPF datapath diagnostics

## Sources Consulted
- Cilium Argo CD troubleshooting: https://docs.cilium.io/en/latest/configuration/argocd-issues/
- Cilium Helm values/reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium Kubernetes requirements: https://docs.cilium.io/en/stable/network/kubernetes/requirements/
- Cilium system requirements: https://docs.cilium.io/en/stable/operations/system_requirements/
- Cilium CLI command reference: https://docs.cilium.io/en/latest/cmdref/cilium/
- Cilium `cilium-dbg` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg/
- Cilium endpoint lifecycle documentation: https://docs.cilium.io/en/stable/security/policy/lifecycle/
- Cilium identity-relevant labels documentation: https://docs.cilium.io/en/stable/operations/performance/scalability/identity-relevant-labels/
- Helm `helm template` command reference: https://helm.sh/docs/helm/helm_template/
- Kubernetes `kubectl logs` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/

## Issues Found
- The introduction incorrectly stated that `helm template` requires the ServiceMonitor CRD to be present in the cluster. Updated it to explain that local rendering needs Helm to be told about `monitoring.coreos.com/v1` through `--api-versions`, or Cilium's `prometheus.serviceMonitor.trustCRDsExist=true` when the CRD is already installed.
- Added a `helm template` example using `--api-versions monitoring.coreos.com/v1` to match the documented Cilium/Argo CD failure mode.
- Several diagnostics used workstation `cilium` commands for agent-local operations such as `identity`, `metrics`, `policy`, `endpoint`, and `bpf`. Updated these to run `cilium-dbg` inside a Cilium agent pod with `kubectl exec`, matching the current Cilium command reference.
- Replaced the obsolete/unsupported `cilium bpf tunnel list` example with `cilium-dbg bpf ipcache list` for datapath routing inspection.
- Replaced `cilium health status` with `cilium-health status` run inside the Cilium agent pod.
- Updated Cilium operator pod selection from `name=cilium-operator` to the documented `io.cilium/app=operator` selector.
- The Helm value `labels.exclude` was not a documented Cilium Helm value. Replaced it with `--set-string 'labels=!controller-uid !job-name'`, using the documented `labels` pattern syntax.
- The prerequisite Kubernetes/Cilium version statement was too broad and stale. Replaced it with a requirement to use a supported Kubernetes/Cilium version combination.
- The troubleshooting note said current Cilium only required kernel 4.19+. Updated it to refer to the Cilium version's system requirements, noting that current Cilium requires Linux 5.10+ or an equivalent vendor kernel such as RHEL 8.10's 4.18.

## Review Notes
The post is technically relevant and contains commands/configuration examples. It remains a broad Cilium troubleshooting guide rather than a narrowly focused ServiceMonitor-only article, but the concrete technical errors found during validation were corrected.
