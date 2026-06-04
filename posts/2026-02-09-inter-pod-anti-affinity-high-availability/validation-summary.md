# Validation Summary: How to Use Inter-Pod Anti-Affinity for High-Availability Deployment Patterns

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Kubernetes scheduler
- Inter-pod affinity and anti-affinity
- Pod topology spread constraints
- Deployments
- StatefulSets
- kubectl
- jq

## Sources Consulted
- Kubernetes documentation: Assigning Pods to Nodes, inter-pod affinity and anti-affinity: https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/
- Kubernetes documentation: Pod Topology Spread Constraints: https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/
- Kubernetes documentation: Node Labels Populated By The Kubelet: https://kubernetes.io/docs/reference/node/node-labels/
- Kubernetes documentation: Admission Control in Kubernetes, LimitPodHardAntiAffinityTopology: https://kubernetes.io/docs/reference/access-authn-authz/admission-controllers/
- Kubernetes documentation: kubectl drain: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/
- Kubernetes documentation: Field Selectors: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/

## Issues Found
- The rolling-update anti-affinity example used `${POD_TEMPLATE_HASH}` as if Kubernetes would substitute it into the `labelSelector`. Kubernetes does not perform that substitution. I changed the example to use `matchLabelKeys: [pod-template-hash]`, which is the documented way to match the incoming Pod's Deployment revision when applying pod affinity or anti-affinity.

## Review Notes
- The anti-affinity and topology spread examples use current Kubernetes API fields and valid topology label keys. Nodes must be consistently labeled with the referenced topology keys, especially for zone and region placement.
- Required pod anti-affinity with zone or region topology keys can be rejected if the optional `LimitPodHardAntiAffinityTopology` admission controller is enabled. The current Kubernetes documentation lists that admission controller as disabled by default.
- The `kubectl drain`, `kubectl get --field-selector`, JSONPath, and monitoring commands use current flags and supported Pod field selectors.
