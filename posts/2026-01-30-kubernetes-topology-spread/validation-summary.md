# Validation Summary: How to Build Kubernetes Topology Spread

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Kubernetes topology spread constraints
- Kubernetes scheduler and kube-scheduler configuration
- Kubernetes Deployments, StatefulSets, Pods, PodDisruptionBudgets, affinity, anti-affinity, taints, and tolerations
- kubectl commands and JSONPath output
- YAML Kubernetes manifests

## Sources Consulted
- Kubernetes documentation: Pod Topology Spread Constraints - https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/
- Kubernetes API reference: Pod v1 / TopologySpreadConstraint - https://kubernetes.io/docs/reference/kubernetes-api/core/pod-v1/
- Kubernetes kube-scheduler configuration v1 reference - https://kubernetes.io/docs/reference/config-api/kube-scheduler-config.v1/
- Kubernetes documentation: Node Labels Populated By The Kubelet - https://kubernetes.io/docs/reference/node/node-labels/
- Kubernetes kubectl reference: kubectl label - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_label/
- Kubernetes kubectl reference: kubectl describe - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_describe/
- Kubernetes blog: Kubernetes 1.27 fine-grained pod topology spread policies - https://kubernetes.io/blog/2023/04/17/fine-grained-pod-topology-spread-features-beta/
- Kubernetes blog: Kubernetes v1.30 release notes for minDomains stability - https://kubernetes.io/blog/2024/04/17/kubernetes-v1-30-release/

## Issues Found
- The field reference marked `labelSelector` as required. In the current Kubernetes Pod API reference, `labelSelector` is optional, although it is normally set for workload-level constraints. Updated the table to mark it optional.
- The post said `minDomains` was available since Kubernetes 1.25. Official Kubernetes sources show it was introduced as alpha in 1.24, enabled by default starting in 1.28, and stable in 1.30. Updated the version note.
- The `minDomains` example and behavior matrix implied that pods remain entirely pending when fewer than `minDomains` eligible domains exist. Kubernetes instead treats the global minimum as 0 and allows up to `maxSkew` matching pods per eligible domain. Updated the explanation, comments, and table.
- The cluster-level defaults section said Kubernetes 1.24 introduced the ability to set default topology spread constraints. Kubernetes 1.24 made the built-in default constraints stable; explicit default constraints are configured through the scheduler plugin. Updated the sentence.
- The `defaultingType` table described `List` and `System` imprecisely. Updated it to match the kube-scheduler configuration reference: `List` uses `defaultConstraints`, while `System` uses Kubernetes-defined node and zone spreading constraints.

## Review Notes
The Kubernetes manifest snippets use current API versions and valid topology spread fields. The example container images and registry names are illustrative and were reviewed as examples, not as guaranteed runnable production applications. Some workload-specific examples, such as Kafka and ZooKeeper, would still require complete service, identity, and application configuration outside the scope of topology spread constraints.
