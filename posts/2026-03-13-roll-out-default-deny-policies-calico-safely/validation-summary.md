# Validation Summary: How to Roll Out Default Deny Policies in Calico Safely

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico (open source, v3.26+)
- Kubernetes NetworkPolicy / GlobalNetworkPolicy (Calico CRDs)
- `calicoctl` CLI
- `kubectl` CLI
- Mermaid (for the rollout diagram)

## Sources Consulted
- Calico FelixConfiguration reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico FelixConfiguration v3.26 archive: https://archive-os-3-26.netlify.app/calico/3.26/reference/resources/felixconfig
- Calico StagedGlobalNetworkPolicy reference: https://docs.tigera.io/calico/latest/reference/resources/stagedglobalnetworkpolicy
- Calico staged network policies guide: https://docs.tigera.io/calico/latest/network-policy/staged-network-policies
- Calico open-source FelixConfiguration API source: https://github.com/projectcalico/calico/blob/master/api/pkg/apis/projectcalico/v3/felixconfig.go

## Issues Found

1. **Incorrect claim that `StagedGlobalNetworkPolicy` is only available in Calico Enterprise.**
   - The introduction stated: "Calico's `StagedGlobalNetworkPolicy` feature (available in Calico Enterprise) lets you preview the impact of a policy before enforcing it."
   - Per the official Calico open source documentation, staged policy resources (`StagedNetworkPolicy`, `StagedGlobalNetworkPolicy`, `StagedKubernetesNetworkPolicy`) are part of Calico open source.
   - Fixed by rewriting the sentence to correctly state that staged policy resources are available and listing the three concrete kinds.

2. **Phase 1 used a non-existent `flowLogsEnabled` field in `FelixConfiguration`.**
   - The original command was: `kubectl patch felixconfiguration default --type=merge -p '{"spec":{"flowLogsEnabled":true}}'`.
   - The Calico v3.26 FelixConfiguration reference contains no `flowLogsEnabled` field, and the current Calico open source FelixConfiguration spec only exposes flow log fields like `FlowLogsPolicyEvaluationMode`, `FlowLogsFlushInterval`, `FlowLogsLocalReporter`, `FlowLogsGoldmaneServer`, and `FlowLogsCollectorDebugTrace` — none of which is a simple boolean toggle named `flowLogsEnabled`. Additionally, `kubectl logs -l k8s-app=calico-node | grep CALICO` would not actually surface per-flow data in open source.
   - Fixed by replacing the patch-based "enable flow logs" approach with the canonical open-source approach: applying a `StagedGlobalNetworkPolicy` selecting `all()` with `Ingress` and `Egress` types. Staged policies are evaluated as if enforced but do not drop traffic, which is the documented mechanism for auditing impact before enforcement.

## Review Notes
- The Calico-flavored YAML (`apiVersion: projectcalico.org/v3`, `kind: NetworkPolicy`/`GlobalNetworkPolicy`, `selector: all()`, `selector: app == 'backend'`, `types: [Ingress, Egress]`, action `Allow`) is syntactically correct.
- The Phase 5 `order: 1000` for the default-deny `GlobalNetworkPolicy` is correct: lower-order policies in Calico are evaluated first, so a high-order default deny lets more specific allow rules take effect ahead of it.
- The bash one-liner in Phase 4 (`sed "s/namespace: staging/namespace: $ns/" default-deny.yaml | calicoctl apply -f -`) assumes a `default-deny.yaml` file exists with `namespace: staging` — readers should rename or adjust accordingly, but the syntax itself is valid.
- The post targets Calico v3.26+. Calico is now at v3.32, and the staged policy + Whisker observability story has continued to evolve. Readers on newer versions may have richer tooling (e.g., Goldmane / Whisker) available for the audit phase than what is shown here, but the approach in the post remains valid.
