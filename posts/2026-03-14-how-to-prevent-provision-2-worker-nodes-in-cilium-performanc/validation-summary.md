# Validation Summary: How to Prevent Provision 2 worker nodes in Cilium performance

## Status
validated

## Post Type
Tutorial / Operational guide

## Technologies Covered
- Cilium
- Kubernetes
- Helm
- Prometheus / Prometheus Operator
- eBPF

## Sources Consulted
- Cilium Helm values reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium identity-relevant labels documentation: https://docs.cilium.io/en/stable/operations/performance/scalability/identity-relevant-labels/
- Cilium command reference for `cilium`, `cilium connectivity test`, and `cilium sysdump`: https://docs.cilium.io/en/latest/cmdref/
- Cilium command reference for `cilium-dbg`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg.html
- Cilium command reference for `cilium-health status`: https://docs.cilium.io/en/stable/cmdref/cilium-health_status/
- Cilium system requirements: https://docs.cilium.io/en/stable/operations/system_requirements/
- Kubernetes `kubectl` generated reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Kubernetes `kubectl exec` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes `kubectl logs` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/

## Issues Found
- The baseline metrics examples used `cilium metrics list`, but the Kubernetes Cilium CLI does not expose that node-local agent command. Changed the example to run `cilium-dbg metrics list` inside the Cilium DaemonSet pod.
- The Helm label-exclusion example used an object with `labels.exclude`, which is not the Cilium Helm value format. Changed it to the documented space-separated `labels` string with exclusion patterns.
- The Prometheus alert used `cilium_identity_count`, which is not the documented Cilium metrics namespace pattern. Changed it to `sum(cilium_identity)`.
- Several troubleshooting and verification examples used node-local agent commands such as `cilium endpoint list`, `cilium identity list`, and `cilium policy get` as though they were Kubernetes Cilium CLI commands. Changed them to `kubectl exec ... cilium-dbg ...`.
- The inter-node health check used `cilium health status`, but the documented command is `cilium-health status`. Updated the command accordingly.
- The troubleshooting section referenced `cilium bpf tunnel list`, which is not present in the current Cilium command reference. Replaced it with `cilium-health status` and `cilium-dbg bpf ipcache list`.
- The kernel requirement said 4.19 or later. Current Cilium system requirements recommend kernel 5.10 or later, with documented distribution-equivalent exceptions such as RHEL 8.10's 4.18 kernel. Updated the wording.

## Review Notes
The article title and description are awkwardly phrased, but the review scope was technical correctness, so wording was left unchanged except where needed to fix technical inaccuracies.
