# Validation Summary: How to Automate Command Cheatsheet

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium CLI
- Cilium agent diagnostics with `cilium-dbg` and `cilium-health`
- Kubernetes and `kubectl`
- Helm
- GitHub Actions
- Cron
- eBPF-based Kubernetes networking

## Sources Consulted
- Cilium CLI command reference: https://docs.cilium.io/en/latest/cmdref/cilium/
- Cilium `status` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_status/
- Cilium `connectivity test` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/
- Cilium `sysdump` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_sysdump/
- Cilium `cilium-dbg` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg.html
- Cilium `cilium-dbg endpoint list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list/
- Cilium `cilium-dbg identity list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_identity_list.html
- Cilium `cilium-health status` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-health_status.html
- Cilium Kubernetes requirements: https://docs.cilium.io/en/stable/network/kubernetes/requirements.html
- Cilium system requirements: https://docs.cilium.io/en/stable/operations/system_requirements.html
- Cilium Helm installation documentation: https://docs.cilium.io/en/stable/installation/k8s-install-helm/
- Cilium Endpoint CRD documentation: https://docs.cilium.io/en/stable/network/kubernetes/ciliumendpoint.html

## Issues Found
- The post used several node-local agent commands as top-level `cilium` CLI commands, including `cilium health status`, `cilium endpoint list`, `cilium identity list`, `cilium metrics list`, `cilium policy get`, and `cilium bpf tunnel list`. Updated the examples to use cluster-level `cilium` commands where appropriate and `kubectl exec ... -- cilium-dbg` or `cilium-health` for agent-local diagnostics.
- The prerequisites pinned Kubernetes v1.21+ and Cilium v1.14+, which is not accurate for current Cilium support matrices. Replaced this with a version-neutral requirement to use a Kubernetes version supported by the installed Cilium release.
- The GitHub Actions Helm template example referenced `cilium/cilium` without adding or updating the Cilium Helm repository. Added `helm repo add cilium https://helm.cilium.io/` and `helm repo update cilium`.
- The endpoint count verification used `cilium endpoint list -o json`, which is not a current top-level Cilium CLI command and only reflects agent-local endpoint state when run through `cilium-dbg`. Replaced it with `kubectl get ciliumendpoints -A`, which is the documented cluster-wide CiliumEndpoint CRD view.
- The troubleshooting guidance hard-coded Linux kernel 4.19 or later. Current Cilium releases have release-specific kernel requirements, so this was changed to refer to the minimum kernel version required by the installed Cilium release.

## Review Notes
The examples still assume standard Cilium labels and namespace defaults, such as `kube-system`, `k8s-app=cilium`, and a DaemonSet named `cilium`. Those defaults match common installations, but customized deployments may need adjusted selectors or namespaces.
