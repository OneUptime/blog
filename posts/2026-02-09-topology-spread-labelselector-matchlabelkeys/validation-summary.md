# Validation Summary: How to Tune Topology Spread Constraints with labelSelector and matchLabelKeys

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Kubernetes scheduler
- Pod topology spread constraints
- Kubernetes label selectors
- kubectl
- YAML manifests for Deployments and StatefulSets

## Sources Consulted
- Kubernetes documentation: Pod Topology Spread Constraints - https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/
- Kubernetes API reference: Pod v1, TopologySpreadConstraint - https://kubernetes.io/docs/reference/kubernetes-api/core/pod-v1/
- Kubernetes documentation: Labels and Selectors - https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/
- Kubernetes kubectl reference: kubectl get - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes kubectl reference: kubectl wait - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait
- Kubernetes documentation: JSONPath Support - https://kubernetes.io/docs/reference/kubectl/jsonpath/
- Kubernetes blog: Kubernetes 1.27 fine-grained pod topology spread features beta - https://kubernetes.io/blog/2023/04/17/fine-grained-pod-topology-spread-features-beta/
- Kubernetes feature gates reference - https://kubernetes.io/docs/reference/command-line-tools-reference/feature-gates/

## Issues Found
- The post said that without `labelSelector`, the constraint only applies to the pod being scheduled. Updated this to state that no existing pods are selected for the skew calculation, which matches the Kubernetes API behavior for a null selector.
- The basic example stated that 9 replicas and 3 zones always results in 3 pods per zone. Qualified this with eligible zones and available resources, because topology spread constraints only operate over eligible topology domains and can still be affected by scheduling feasibility.
- The `matchLabelKeys` section only said the field was introduced in Kubernetes 1.25. Updated it to clarify that it was introduced as alpha in 1.25 and became beta and enabled by default in 1.27.
- The `matchLabelKeys` explanation said the keys are added to `labelSelector` without noting version-specific behavior. Updated it to explain that Kubernetes 1.34 explicitly merges the matching key-value labels into `labelSelector`, while earlier versions handled the matching implicitly.
- The multiple-constraint explanation described node spreading as "within each zone." Updated it to say the second constraint adds a softer node-spreading preference, since the hostname constraint is evaluated as another constraint combined with the zone constraint.
- The debugging command for viewing zone distribution used `kubectl get pods -o wide | awk '{print $7}'`, which reports node names, not zone labels. Replaced it with a command that looks up each scheduled pod's node and reads the node's `topology.kubernetes.io/zone` label.
- The testing command attempted to show a zone using `.spec.nodeSelector`, which is the pod's node selector map, not the selected node's zone. Replaced it with pod-to-node placement output and a separate zone-skew calculation based on node labels.
- The skew calculation counted pods per node while the section was validating zone spread. Replaced it with a zone-label aggregation command.

## Review Notes
The remaining examples use current Kubernetes API fields and valid `topologySpreadConstraints` syntax. The example images such as `api:v2` and `worker:latest` are illustrative placeholders and may need to be replaced with real images for a live cluster test.
