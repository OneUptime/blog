# Validation Summary: How to Roll Out Staged GlobalNetworkPolicy in Calico Safely

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico (open source) — `projectcalico.org/v3` API
- Calico StagedGlobalNetworkPolicy resource
- `calicoctl` CLI
- `kubectl` CLI
- Felix Prometheus metrics endpoint (port 9091)
- Kubernetes network policy concepts

## Sources Consulted
- Calico StagedGlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/stagedglobalnetworkpolicy
- `calicoctl apply` command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico v3.26 archive docs for resource definitions

## Issues Found
1. **Wrong resource Kind in the YAML.** The post is about "Staged GlobalNetworkPolicy" but the example used `kind: NetworkPolicy`. Changed to `kind: StagedGlobalNetworkPolicy`, which is the documented kind under `projectcalico.org/v3`.
2. **Invalid `namespace` on a cluster-scoped resource.** `StagedGlobalNetworkPolicy` is cluster-scoped ("not a namespaced resource" per the official reference) and applies to all namespaces plus host endpoints. Removed `namespace: production` from `metadata`.
3. **CLI commands referenced the wrong resource type.** Several `calicoctl` examples used `networkpolicies` (namespaced) or `networkpolicy ... -n production` to list/get/delete the policy created in the YAML. Updated them to `stagedglobalnetworkpolicies` / `stagedglobalnetworkpolicy <name>` with no namespace flag, matching the actual kind being managed. The example object name was also corrected to match the YAML (`roll-out-staged-globalnetworkpolicy`).
4. **`calicoctl apply --dry-run` does not exist.** Verified against the official `calicoctl apply` reference — supported flags are `-f/--filename`, `-R/--recursive`, `--skip-empty`, `-n/--namespace`, `-c/--config`, `--context`, `-h/--help`. Changed the troubleshooting tip to use `kubectl apply --dry-run=server -f roll-out-staged-globalnetworkpolicy.yaml`, which performs server-side validation against the Calico CRDs.
5. **Architecture diagram implied enforcement.** Staged policies in Calico are non-enforcing — they evaluate rules and produce flow log entries (would-allow / would-deny) without blocking traffic. The diagram previously labeled Felix as "Enforces" and showed a "Blocked" terminal node. Updated the labels to "Evaluates non-enforcing", "Logged: would-allow", and "Logged: would-deny" so the diagram is consistent with how staged policies actually behave.

## Review Notes
- The post's introductory wording ("provides fine-grained network security controls", "policy hit counters") still leans toward language used for enforcing policies. Staged policies do not enforce traffic; they exist precisely to preview what an active GlobalNetworkPolicy would do. Future revisions could make this clearer in prose.
- The `curl ... | grep felix_denied` example is left as-is. Felix's Prometheus reporter exposes metrics on :9091 with the `felix_` prefix, but the specific `felix_denied*` metric is not part of default Calico OSS metrics and typically requires additional configuration (or Calico Enterprise / Calico Cloud). Authors should adjust the grep to a metric available in their deployment.
- The single line "Calico v3.26+" appears twice in the Prerequisites block — minor stylistic duplication, not a technical defect, so left untouched per the "only fix technical errors" guidance.
- The `calicoctl get globalnetworkpolicies -o wide` tip in the Common Issues section is intentionally retained: ordering conflicts between a staged policy and the live `GlobalNetworkPolicy` set are exactly what you want to inspect.
