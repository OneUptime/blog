# Validation Summary: How to Troubleshoot Solution in Cilium configuration

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Cilium
- Kubernetes
- eBPF
- Helm
- kubectl
- Prometheus and Grafana

## Sources Consulted
- Cilium command reference for `cilium` CLI: https://docs.cilium.io/en/latest/cmdref/
- Cilium command reference for `cilium-dbg`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg.html
- Cilium command reference for `cilium-dbg endpoint list`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list/
- Cilium command reference for `cilium-dbg endpoint get`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_get/
- Cilium command reference for `cilium-dbg metrics list`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_metrics_list.html
- Cilium command reference for `cilium-dbg bpf lb list`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_bpf_lb_list.html
- Cilium command reference for `cilium-health status`: https://docs.cilium.io/en/stable/cmdref/cilium-health_status.html
- Cilium troubleshooting guide: https://docs.cilium.io/en/stable/operations/troubleshooting/
- Cilium Kubernetes requirements: https://docs.cilium.io/en/stable/network/kubernetes/requirements.html
- Cilium system requirements: https://docs.cilium.io/en/stable/operations/system_requirements.html
- Cilium Helm reference: https://docs.cilium.io/en/stable/helm-reference/
- Cilium identity-relevant labels guide: https://docs.cilium.io/en/stable/operations/performance/scalability/identity-relevant-labels.html

## Issues Found
- The prerequisite listed fixed Kubernetes and Cilium minimum versions that are not generally accurate for current Cilium releases. Changed it to require a Kubernetes version supported by the selected Cilium release.
- Several examples used the cluster-level `cilium` CLI for local agent commands such as identities, metrics, BPF maps, policies, and endpoints. Changed these to run `cilium-dbg` through `kubectl -n kube-system exec ds/cilium -- ...`, matching the official command reference.
- The inter-node health check used `cilium health status`, which is not the documented command. Changed it to `kubectl -n kube-system exec ds/cilium -- cilium-health status`.
- Operator examples selected pods with `name=cilium-operator`; current Cilium CLI/sysdump defaults use `io.cilium/app=operator`. Updated the operator log and pod checks to use that selector.
- The Helm example used `labels.exclude`, which is not the documented Helm value for identity-relevant label patterns. Changed it to the documented `labels` value with exclusion patterns.
- The troubleshooting note claimed Cilium requires kernel 4.19 or later. Replaced that fixed version with guidance to check the system requirements for the installed Cilium release, because current stable Cilium documents Linux kernel 5.10 or equivalent vendor kernels.

## Review Notes
The guide is technically relevant and contains actionable troubleshooting commands. Some examples intentionally inspect one Cilium agent through `ds/cilium`; for full multi-node diagnosis, operators may need to run the same local `cilium-dbg` checks against specific Cilium pods or nodes.
