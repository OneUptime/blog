# Validation Summary: How to Roll Out Staged Network Policies in Calico Safely

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico (v3.26+) — `projectcalico.org/v3` API
- Calico `StagedNetworkPolicy` resource
- `calicoctl` CLI
- `kubectl` CLI
- Felix (Calico policy enforcement component) Prometheus metrics endpoint
- Kubernetes (`NetworkPolicy` concepts)
- Mermaid (for architecture diagram)

## Sources Consulted
- Calico documentation: Staged Network Policy resource — https://docs.tigera.io/calico/latest/reference/resources/stagednetworkpolicy
- Calico documentation: Global Network Policy / Network Policy resources — https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico documentation: `calicoctl` command reference — https://docs.tigera.io/calico/latest/reference/calicoctl/overview
- Calico documentation: Felix Prometheus metrics (default port 9091) — https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Sibling posts in this repo that use `StagedNetworkPolicy` correctly (e.g., `2026-03-14-create-the-calico-stagednetworkpolicy-resource/README.md`)

## Issues Found
1. **Incorrect `kind` in YAML manifest** — The post is titled "Staged Network Policies" and the introduction/prerequisites explicitly describe the Staged Policies feature, but the example manifest used `kind: NetworkPolicy`. In Calico, staged policies use the dedicated `StagedNetworkPolicy` (or `StagedGlobalNetworkPolicy`) resource — a regular `NetworkPolicy` is enforced immediately. Changed `kind: NetworkPolicy` to `kind: StagedNetworkPolicy` so the example actually demonstrates a staged policy.
2. **Verification command used wrong resource type** — The implementation step used `calicoctl get networkpolicies -n production -o wide`, which would not show the staged resource created by the manifest. Updated to `calicoctl get stagednetworkpolicies -n production -o wide`.
3. **Operational commands targeted the wrong resource type** — The "Operational Commands" section listed/described/deleted plain `networkpolicies` / `globalnetworkpolicies`. Updated to `stagednetworkpolicies` / `stagedglobalnetworkpolicies`, and aligned the resource name used in the `get` / `delete` examples (`roll-out-staged-policies`) with the name in the manifest (previously referenced the non-existent `roll-out-policy`).

## Review Notes
- The Mermaid architecture diagram labels Felix as "Enforces" the staged policy and shows a "Default Deny → Blocked" path. Staged policies in Calico do **not** enforce — they preview/record what an equivalent enforced policy would do (and Felix emits separate `staged_*` denied/allowed packet counters). The diagram is therefore conceptually misleading for staged policies, though the wiring of components is otherwise accurate. Considered editing but it would require restructuring the diagram, which the review guidelines say to avoid; flagging here for future revision.
- The "Order conflicts" troubleshooting step suggests inspecting `globalnetworkpolicies` for ordering issues. For a staged-policy-focused guide this is incomplete (staged variants are evaluated alongside their non-staged counterparts but in their own resource group); inspecting `stagednetworkpolicies` / `stagedglobalnetworkpolicies` would be more directly relevant. Left as-is since it is not strictly incorrect.
- `grep felix_denied` in the Prometheus metrics step will return no output on a stock Felix install — Felix does not export a metric literally named `felix_denied`. The closest standard metrics are policy/packet counters that are only exposed when `PrometheusReporterEnabled` / detailed metrics are turned on (and they have different names). The command will silently produce no matches rather than fail, so it is not actively wrong, but readers should not expect output from it as written.
- `calicoctl apply --dry-run` is supported, but `--dry-run=client|server` syntax (similar to kubectl) is the modern preferred form when validation is the goal.
- Calico v3.26+ is a reasonable floor — `StagedNetworkPolicy` has actually been available since much earlier (around v3.5), so the version requirement is conservative rather than wrong.
