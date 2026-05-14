# Validation Summary: Common Mistakes to Avoid with Calico Namespace-Based Network Policies

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico NetworkPolicy and GlobalNetworkPolicy
- Kubernetes namespaces and namespace labels
- Kubernetes and Calico network policy selectors
- `kubectl`
- `calicoctl`

## Sources Consulted
- Calico documentation: Use namespace rules in policy - https://docs.tigera.io/calico/latest/network-policy/policy-rules/namespace-policy
- Calico documentation: Get started with Calico network policy - https://docs.tigera.io/calico/latest/network-policy/get-started/calico-policy/calico-network-policy
- Calico documentation: Network policy resource - https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico documentation: Global network policy resource - https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico documentation: Calico automatic labels - https://docs.tigera.io/calico/latest/network-policy/get-started/calico-policy/calico-labels
- Calico documentation: calicoctl get - https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Kubernetes documentation: Namespaces - https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/
- Kubernetes documentation: Well-Known Labels, Annotations and Taints - https://kubernetes.io/docs/reference/labels-annotations-taints/

## Issues Found
- The post said an unlabeled namespace bypasses all isolation policies. Changed this to say it can bypass isolation policies that select namespaces by those labels, because global or default-deny policies that do not depend on those labels may still apply.
- The post presented `kubernetes.io/metadata.name` as categorically worse than custom labels and said custom labels survive namespace renames. Kubernetes namespaces cannot be renamed, and Calico documents the Kubernetes namespace label as valid for targeting a specific namespace. Updated the wording to distinguish exact namespace targeting from semantic policy grouping.
- The post said cross-namespace traffic always needs both an egress rule in the source namespace and an ingress rule in the destination namespace. Updated this to match Kubernetes and Calico isolation semantics: the rule is required only when that endpoint is isolated for that traffic direction.
- The post said an A->B allow rule does not automatically allow B->A. Clarified that this means new B->A connections, not return traffic for an established A->B connection.
- The post said lower `order` always wins for conflicts between namespace-scoped and global policies. Updated this to account for same-tier evaluation and terminal Allow or Deny actions.

## Review Notes
The Calico YAML uses the current `projectcalico.org/v3` API form and valid `NetworkPolicy` fields. The `calicoctl get globalnetworkpolicies -o wide` and `calicoctl get networkpolicies --all-namespaces -o wide` commands are consistent with Calico CLI documentation.
