# Validation Summary: How to Implement Kubernetes Pod Scheduling

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes scheduler
- Kubernetes Pod specs
- Kubernetes node selectors and node affinity
- Kubernetes pod affinity and anti-affinity
- Kubernetes taints and tolerations
- Kubernetes topology spread constraints
- Kubernetes PriorityClass and preemption
- kubectl

## Sources Consulted
- Kubernetes Scheduler: https://kubernetes.io/docs/concepts/scheduling-eviction/kube-scheduler/
- Assigning Pods to Nodes: https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/
- Taints and Tolerations: https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/
- Pod Topology Spread Constraints: https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/
- Pod Priority and Preemption: https://kubernetes.io/docs/concepts/scheduling-eviction/pod-priority-preemption/
- kubectl label reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_label/
- kubectl taint reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_taint/
- Kubernetes API Reference: https://kubernetes.io/docs/reference/generated/kubernetes-api/

## Issues Found
- The required node affinity example said it also preferred SSD storage, but the YAML only required zones and excluded small instance types. Changed the sentence to match the manifest.
- The `DoesNotExist` node affinity operator example referred to tainted node classes, but node affinity matches labels, not taints. Changed it to labeled node classes.
- The `NoExecute` taint effect description was too broad. Clarified that eviction and scheduling prevention apply to pods without matching tolerations.
- The `maxSkew` description was simplified in a way that could be misleading. Updated it to describe skew relative to the global minimum.
- The `minDomains` version note was incomplete. Updated it to reflect that the field is stable in Kubernetes 1.30 and was beta and enabled by default since 1.28.
- The `matchLabelKeys` comment said it only counted pods on matching nodes. Updated it to explain that `pod-template-hash` limits spread calculations to pods from the same Deployment revision.
- The batch PriorityClass description said the class could preempt or be preempted while setting `preemptionPolicy: Never`. Updated the PriorityClass comments and description to clarify that these pods cannot preempt other pods, though higher-priority pods can still preempt them.

## Review Notes
The Kubernetes manifests use current stable API versions and the YAML examples parse successfully. Some workload examples intentionally focus on scheduling behavior and omit application-specific runtime configuration such as database credentials or production image choices.
