# Validation Summary: How to Keep StatefulSets and Persistent Volumes Off Spot Nodes

## Status

validated

## Post Type

Tutorial

## Technologies Covered

- Kubernetes StatefulSets and PVCs
- ValidatingAdmissionPolicy and CEL
- Node selectors, taints, and StorageClasses
- Karpenter

## Sources Consulted

- [Kubernetes ValidatingAdmissionPolicy](https://kubernetes.io/docs/reference/access-authn-authz/validating-admission-policy/)
- [Kubernetes taints and tolerations](https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/)
- [Kubernetes node assignment](https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/)
- [Kubernetes StorageClasses](https://kubernetes.io/docs/concepts/storage/storage-classes/)
- [Karpenter NodePools](https://karpenter.sh/docs/concepts/nodepools/)

## Issues Found

No technical issues found.

## Review Notes

- Reviewed the policy and binding schema, guarded CEL field access, protected-workload predicate, positive selector, and nodeName/default-scheduler restriction.
- The rule applies to Pod CREATE requests in opted-in namespaces and deliberately excludes several other storage forms; the article describes those boundaries and existing-Pod migration correctly.
- All YAML documents parsed and shell snippets passed bash -n. CEL was reviewed against the documented API, not evaluated by a live Kubernetes API server; the article includes server-side acceptance/rejection tests.
