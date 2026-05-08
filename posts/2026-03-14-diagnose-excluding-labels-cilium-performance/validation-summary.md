# Validation Summary: Diagnosing Excluding Labels in Cilium Performance

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Kubernetes
- Cilium security identities
- Cilium CLI and cilium-dbg
- Hubble
- eBPF, BPF maps, bpftool, and bpftrace
- jq

## Sources Consulted
- Cilium documentation: Limiting Identity-Relevant Labels, https://docs.cilium.io/en/stable/operations/performance/scalability/identity-relevant-labels/
- Cilium documentation: cilium-dbg identity list command reference, https://docs.cilium.io/en/stable/cmdref/cilium-dbg_identity_list/
- Cilium documentation: cilium-dbg monitor command reference, https://docs.cilium.io/en/stable/cmdref/cilium-dbg_monitor/
- Cilium documentation: Command Reference, https://docs.cilium.io/en/stable/cmdref/
- Cilium documentation: Hubble setup and port-forwarding, https://docs.cilium.io/en/stable/observability/hubble/setup/
- Cilium documentation: Cilium Operator and CiliumIdentity CRD identity allocation, https://docs.cilium.io/en/stable/internals/cilium_operator/
- Cilium documentation: Endpoint CRD, https://docs.cilium.io/en/stable/network/kubernetes/ciliumendpoint/
- Linux kernel documentation: BPF redirect and XDP tracepoint examples, https://docs.kernel.org/bpf/redirect.html

## Issues Found
- The post described `pod-template-hash` and `controller-revision-hash` as labels users commonly need to exclude. Cilium already excludes these labels by default, so the post now states that clearly and uses custom high-cardinality labels such as `rollout-hash` and `build-id` for examples.
- The exclusion syntax used `k8s:!label-name` and mentioned `-` as an exclusion prefix. Current Cilium documentation uses `!label-name` label patterns for exclusions, so the examples and troubleshooting note were corrected.
- The high-cardinality discovery command counted how often label keys appeared, not how many distinct values each label had, and piped pretty JSON through `head`. The command now calculates `uniqueValues` per label and limits results inside jq.
- The identity count examples used `cilium identity list`, which is not part of the current external Cilium CLI. They now use the Kubernetes `CiliumIdentity` CRD via `kubectl get ciliumidentities`.
- The BPF map, endpoint, and monitor commands used daemon-local subcommands as if they were external Cilium CLI commands. They now execute `cilium-dbg` inside a Cilium agent pod with `kubectl exec`.
- The bpftrace example used `args->action` for the `xdp_redirect` tracepoint. The kernel tracepoint field is `act`, so the example now uses `args->act`.
- The conclusion claimed users can typically reduce identity count by 50% or more by excluding Kubernetes-generated labels that are already excluded by default. The conclusion now makes a more accurate, non-quantified claim about reducing identities by excluding additional custom high-cardinality labels.

## Review Notes
The Hubble examples are valid assuming Hubble Relay is enabled and reachable through the default local port-forward. The identity reduction estimate remains approximate because it inspects Kubernetes pod labels and does not fully model every default Cilium identity-relevant label rule, namespace label, or cluster label.
