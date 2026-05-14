# Validation Summary: How to Validate Network Policy Fundamentals in Calico in a Lab Cluster

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Calico Open Source NetworkPolicy
- Calico GlobalNetworkPolicy
- Kubernetes NetworkPolicy
- Kubernetes pods and labels
- kubectl
- calicoctl

## Sources Consulted
- Calico NetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico network policy guide: https://docs.tigera.io/calico/latest/network-policy/get-started/calico-policy/calico-network-policy
- Calico automatic labels documentation: https://docs.tigera.io/calico/latest/network-policy/get-started/calico-policy/calico-labels
- Calico calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/

## Issues Found
- The setup captured `pod-alpha`'s IP before waiting for the test pods to be Ready. Added `kubectl wait --for=condition=Ready` before reading the pod IP so the command sequence is reliable.
- Test 2 left a Kubernetes deny-all NetworkPolicy in place, which could block later Calico allow-policy tests. Added cleanup for `deny-all-alpha`.
- Test 3 left a Calico NetworkPolicy with an explicit final `Deny` rule in place, which could affect later tests. Added cleanup for `allow-beta-only`.
- Test 4 incorrectly stated that `tier == 'web'` denied both beta and gamma, but gamma is labeled `tier=data`. Corrected the comment to say it denies beta.
- Test 4 left the ordered Calico policy in place. Added cleanup for `ordered-rules-test`.
- Test 5 ran connectivity from `external-pod` without waiting for it to become Ready and left the GlobalNetworkPolicy active. Added a readiness wait and cleanup.
- Test 6 originally demonstrated "union semantics" with Calico NetworkPolicy and an earlier explicit `Deny` policy. Calico `Allow` and `Deny` actions are immediate and final, so that example could be wrong depending on policy ordering. Rewrote the test to use Kubernetes NetworkPolicy allow semantics with separate allow policies for beta and gamma.

## Review Notes
- `kubectl` was not installed in the local review environment, so commands could not be executed against a live cluster here. CLI syntax and policy behavior were validated against official Kubernetes and Calico documentation.
- The GlobalNetworkPolicy namespace selector uses `kubernetes.io/metadata.name`, which Calico documents as usable for namespace-name matching.
