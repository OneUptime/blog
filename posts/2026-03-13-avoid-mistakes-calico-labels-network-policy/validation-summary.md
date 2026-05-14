# Validation Summary: Common Mistakes to Avoid with Calico Label-Based Network Policies

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico NetworkPolicy
- Kubernetes labels and selectors
- Kubernetes Deployments and pod templates
- kubectl
- calicoctl

## Sources Consulted
- Calico NetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico service account policy rules: https://docs.tigera.io/calico/latest/network-policy/policy-rules/service-accounts
- Kubernetes Labels and Selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/

## Issues Found
- The first selector example was fenced as `bash` even though it contained YAML-style policy fields. Changed the code fence to `yaml`.
- The service account guidance described service accounts as immutable metadata and referenced a non-existent section. Changed the comment to recommend service account selectors with RBAC controls, matching Calico's documented service account policy model.
- The over-broad selector example said `has(app)` matches any pod in any namespace. Calico namespaced `NetworkPolicy` selectors are scoped to the policy namespace, while `GlobalNetworkPolicy` can select more broadly. Changed the wording to "any in-scope pod" to be accurate for both contexts.

## Review Notes
The remaining examples and commands are technically valid. The Deployment YAML is intentionally partial and shows the correct location for pod template labels, but a future revision could show a complete Deployment manifest if the post needs copy-pasteable examples.
