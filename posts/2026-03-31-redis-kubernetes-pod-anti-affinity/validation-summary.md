# Validation Summary: How to Configure Redis Pod Anti-Affinity in Kubernetes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis
- Kubernetes (StatefulSets, Pod Anti-Affinity, Node Affinity, Topology Spread Constraints)
- kubectl CLI

## Sources Consulted
- Kubernetes API reference for StatefulSet spec: https://kubernetes.io/docs/reference/kubernetes-api/workload-resources/stateful-set-v1/
- Kubernetes documentation on pod anti-affinity: https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/#inter-pod-affinity-and-anti-affinity
- Kubernetes documentation on topology spread constraints: https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/
- Kubernetes well-known labels: https://kubernetes.io/docs/reference/labels-annotations-taints/

## Issues Found
1. **Missing `serviceName` in StatefulSet spec**: The StatefulSet YAML was missing the required `serviceName` field. Without this field, `kubectl apply` would reject the manifest with a validation error since `serviceName` is a mandatory field in the StatefulSet spec. Added `serviceName: redis` to the spec.

2. **Text/code mismatch in "Combining with Node Affinity" section**: The introductory text said "Require Redis to run on SSD nodes" but the actual node label used in the code was `node-type=memory-optimized`. Changed the text to "Require Redis to run on memory-optimized nodes" to match the code example.

## Review Notes
- The post states topology spread constraints are available in "Kubernetes 1.19+". The feature was introduced as beta in 1.19 and became GA in 1.24. The claim is technically correct since the feature was usable from 1.19, but readers on older clusters should be aware it was beta until 1.24.
- The zone-checking shell script in the "Verifying Placement" section works but is somewhat fragile — it depends on the exact output format of the jsonpath template. This is acceptable for a tutorial example.
