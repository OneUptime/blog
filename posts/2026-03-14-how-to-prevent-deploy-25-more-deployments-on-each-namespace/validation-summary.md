# Validation Summary: How to Prevent Deploy 25 more deployments on each namespace

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Kubernetes
- Helm
- Prometheus
- Grafana
- eBPF

## Sources Consulted
- Cilium Command Reference: https://docs.cilium.io/en/stable/cmdref/
- Cilium CLI Command Reference: https://docs.cilium.io/en/latest/cmdref/cilium/
- Cilium Metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium Helm values reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium identity-relevant labels documentation: https://docs.cilium.io/en/stable/operations/performance/scalability/identity-relevant-labels.html
- Cilium Kubernetes requirements: https://docs.cilium.io/en/stable/network/kubernetes/requirements.html
- Cilium system requirements: https://docs.cilium.io/en/stable/operations/system_requirements/
- Cilium sysdump command reference: https://docs.cilium.io/en/latest/cmdref/cilium_sysdump/
- Cilium connectivity test command reference: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test.html
- Cilium endpoint CRD documentation: https://docs.cilium.io/en/stable/network/kubernetes/ciliumendpoint.html

## Issues Found
- The prerequisite version statement used a broad Kubernetes v1.21+ and Cilium v1.14+ combination that is not generally valid across current Cilium support matrices. Changed it to require a Cilium version compatible with the Kubernetes version in use.
- The post used `cilium metrics list`, `cilium identity list`, `cilium endpoint list`, `cilium endpoint get`, `cilium policy get`, and `cilium bpf tunnel list` as top-level Cilium CLI commands. Current official command references expose these agent-level diagnostics through `cilium-dbg`, `cilium-health`, or Kubernetes CRDs, so the commands were updated accordingly.
- The Helm values snippet used `labels.exclude`, but Cilium documents `labels` as a space-separated string of include or exclude label patterns. Replaced the object form with `labels: "!job-name"` and kept the default exclusions for deployment hash labels implicit.
- The Prometheus alert used `cilium_identity_count`, which is not the documented metric name. Updated it to `sum(cilium_identity)`, matching the documented metric namespace and identity metric.
- The ServiceMonitor example enabled only agent metrics discovery. Added the corresponding operator ServiceMonitor setting under the existing `operator` key.
- The troubleshooting section referenced a fixed `cilium-init` init container and a hard-coded kernel 4.19 minimum. Updated those notes to use the failing init container name and the requirements for the installed Cilium version.
- Endpoint counting used `cilium endpoint list -o json`; updated it to count `CiliumEndpoint` CRDs with `kubectl get ciliumendpoints --all-namespaces`, matching the Kubernetes-facing endpoint documentation.

## Review Notes
The guide is now technically valid as a general operational guide, but several thresholds and resource values remain examples. Production users should tune CPU, memory, identity-count alerts, and connectivity checks to their cluster size and Cilium version.
