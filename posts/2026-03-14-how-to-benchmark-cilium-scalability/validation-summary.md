# Validation Summary: How to Benchmark Cilium Scalability

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Kubernetes
- eBPF
- Helm
- Prometheus metrics
- CiliumNetworkPolicy

## Sources Consulted
- Cilium Kubernetes requirements: https://docs.cilium.io/en/stable/network/kubernetes/requirements.html
- Cilium system requirements: https://docs.cilium.io/en/stable/operations/system_requirements.html
- Cilium metrics documentation: https://docs.cilium.io/en/stable/observability/metrics.html
- CiliumNetworkPolicy examples and Layer 4 policy syntax: https://docs.cilium.io/en/latest/security/policy/layer4/
- Cilium troubleshooting documentation: https://docs.cilium.io/en/stable/operations/troubleshooting/
- Cilium CLI status reference: https://docs.cilium.io/en/latest/cmdref/cilium_status/
- Cilium CLI connectivity test reference: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test.html
- Cilium CLI sysdump reference: https://docs.cilium.io/en/latest/cmdref/cilium_sysdump/
- cilium-dbg endpoint list reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list.html
- cilium-dbg metrics list reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_metrics_list.html
- cilium-health status reference: https://docs.cilium.io/en/stable/cmdref/cilium-health_status.html
- Kubernetes kubectl create deployment reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_deployment/

## Issues Found
- The prerequisite Kubernetes/Cilium version claim was too broad. Replaced the fixed `v1.21+`/`v1.14+` wording with guidance to use a Cilium version supported for the Kubernetes release.
- Several commands used top-level `cilium` subcommands for daemon-local inspection operations that are documented as `cilium-dbg` or `cilium-health` commands. Updated those commands to run the documented binaries inside a Cilium agent pod with `kubectl exec`.
- Cluster-wide identity and endpoint counts were originally based on Cilium CLI-style commands. Updated the benchmark counts to use the Kubernetes `CiliumIdentity` and `CiliumEndpoint` resources so the counts reflect the cluster rather than a single agent.
- The network policy benchmark loop reused the same `metadata.name` for every generated policy in a namespace, causing each apply to overwrite the previous policy. Updated the loop to generate a unique policy name for each iteration.
- The metrics grep included deprecated policy regeneration metric names. Updated it to use current endpoint regeneration metric names documented by Cilium.
- The verification command `cilium health status` was not a valid top-level Cilium CLI command. Replaced it with `cilium-health status --verbose` run inside a Cilium pod.
- The operator health check used a label selector that is not the documented stable way to check the operator. Replaced it with `kubectl get deployment cilium-operator -n kube-system`.
- The troubleshooting section referenced the outdated Linux kernel 4.19 baseline. Updated it to refer to the kernel requirements for the installed Cilium release and noted the current 5.10-or-equivalent requirement.
- Troubleshooting examples referenced deprecated or incorrect `cilium policy`, `cilium endpoint`, `cilium metrics`, and `cilium bpf tunnel` commands. Replaced them with `kubectl get` checks or documented `cilium-dbg` commands.

## Review Notes
The post is technically relevant and contains working command and configuration examples after the corrections. In a future revision, the benchmark methodology could be improved by adding repeat counts, timing measurements, per-node resource aggregation, and Prometheus queries, but those are methodology improvements rather than correctness issues.
