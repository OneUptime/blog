# Validation Summary: How to Debug Staged GlobalNetworkPolicy in Calico

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- Calico StagedGlobalNetworkPolicy
- Calico GlobalNetworkPolicy
- kubectl
- Calico flow logs

## Sources Consulted
- Calico Staged global network policy resource reference: https://docs.tigera.io/calico/latest/reference/resources/stagedglobalnetworkpolicy
- Calico Stage, preview impacts, and enforce policy guide: https://docs.tigera.io/calico/latest/network-policy/staged-network-policies
- Calico Global network policy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico calicoctl apply reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Kubernetes kubectl apply reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/

## Issues Found
- The main YAML used `kind: NetworkPolicy` with a namespace, which is a namespaced enforced Calico policy rather than a staged global policy. Changed it to `kind: StagedGlobalNetworkPolicy`, removed `metadata.namespace`, and used `namespaceSelector` to scope the global policy to the `production` namespace.
- The article implied staged policies enforce or block traffic. Updated the description, introduction, architecture diagram, and conclusion to clarify that staged policies preview what would happen without enforcing traffic.
- The commands used `calicoctl` to apply and manage the staged policy. Calico staged policy documentation uses Kubernetes custom resources with `kubectl`, so the apply, get, view, and delete commands were updated to `kubectl`.
- The article referenced `calicoctl apply --dry-run`, but the official `calicoctl apply` reference does not document that flag. Replaced it with `kubectl apply --dry-run=server -f debug-staged-globalnetworkpolicy.yaml`.
- The monitoring example used Felix denied metrics for staged-policy debugging. Updated it to direct readers to Calico flow logs and the `policies.pending` field, which the Calico staged policy guide documents for previewing staged policy impact.
- The DNS egress example allowed only UDP port 53. Added TCP port 53 as well because DNS may use TCP, especially for large responses or fallback.
- The selector troubleshooting command used a placeholder that was not directly valid as a Kubernetes label selector. Replaced it with a concrete `kubectl get pods -n production -l app=authorized-source` example matching the policy labels.

## Review Notes
The post is now technically aligned with current Calico staged policy behavior. The Calico documentation reviewed was the current latest documentation available on May 13, 2026; future Calico releases may add or change CLI support for staged resources.
