# Validation Summary: Validating Identity-Relevant Labels Configuration in Cilium Performance

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Kubernetes
- Cilium security identities
- CiliumNetworkPolicy and CiliumClusterwideNetworkPolicy
- eBPF policy maps
- iperf3 and netperf benchmarking
- Prometheus and Grafana monitoring
- Bash, jq, awk, and kubectl

## Sources Consulted
- Cilium documentation: Limiting Identity-Relevant Labels - https://docs.cilium.io/en/stable/operations/performance/scalability/identity-relevant-labels/
- Cilium documentation: Identity Management Mode - https://docs.cilium.io/en/stable/network/kubernetes/identity-management-mode.html
- Cilium command reference: cilium config - https://docs.cilium.io/en/latest/cmdref/cilium_config/
- Cilium command reference: cilium-dbg identity list - https://docs.cilium.io/en/stable/cmdref/cilium-dbg_identity_list/
- Cilium command reference: cilium-dbg policy get - https://docs.cilium.io/en/latest/cmdref/cilium-dbg_policy_get/
- Cilium documentation: Overview of Network Policy - https://docs.cilium.io/en/stable/security/policy/
- Cilium documentation: Kubernetes Network Policy - https://docs.cilium.io/en/latest/network/kubernetes/policy/
- Kubernetes kubectl reference: kubectl drain, exec, and taint - https://kubernetes.io/docs/reference/kubectl/generated/

## Issues Found
- The validation script said that a missing `labels` setting means all labels are identity-relevant. Cilium documents default label exclusions, so this was changed to warn that only the Cilium defaults are configured.
- The post used `cilium identity list`, but current Cilium documentation exposes identity listing through the agent-local `cilium-dbg identity list` command. The examples now run `cilium-dbg` via `kubectl exec` against the Cilium DaemonSet and request JSON output for accurate counting.
- The post used `cilium policy get -o json` to count policies. Cilium documents direct policy import/API usage as deprecated in recent versions, and `cilium-dbg policy get` itself is marked deprecated. The example now counts Kubernetes `NetworkPolicy`, `CiliumNetworkPolicy`, and `CiliumClusterwideNetworkPolicy` resources instead.
- The validation report used `cilium identity list` for identity counts. This was updated to the same `cilium-dbg identity list -o json` pattern used elsewhere in the post.

## Review Notes
- The benchmarking methodology is reasonable as a validation workflow, but the sample throughput and transaction-rate thresholds are environment-specific and should be treated as examples rather than universal Cilium targets.
- The `awk` percentile calculation uses `asort`, which is available in GNU awk. Environments with a different awk implementation may need `gawk`.
