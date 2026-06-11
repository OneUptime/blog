# Validation Summary: How to Create Kubernetes Deployments Best Practices

## Status
validated

## Post Type
Guide

## Technologies Covered
- Kubernetes Deployments
- Kubernetes resource requests and limits
- Kubernetes liveness, readiness, and startup probes
- Kubernetes rolling update strategy
- Kubernetes PodDisruptionBudget
- Kubernetes affinity and anti-affinity
- Kubernetes labels and annotations

## Sources Consulted
- Kubernetes Deployments documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes Deployment API reference: https://kubernetes.io/docs/reference/kubernetes-api/apps/deployment-v1/
- Kubernetes Resource Management for Pods and Containers: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes Pods documentation for CPU throttling and memory OOM behavior: https://kubernetes.io/docs/concepts/workloads/pods/
- Kubernetes Liveness, Readiness, and Startup Probes: https://kubernetes.io/docs/concepts/workloads/pods/probes/
- Kubernetes Configure Liveness, Readiness and Startup Probes: https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- Kubernetes PodDisruptionBudget task documentation: https://kubernetes.io/docs/tasks/run-application/configure-pdb/
- Kubernetes PodDisruptionBudget API reference: https://kubernetes.io/docs/reference/kubernetes-api/policy/pod-disruption-budget-v1/
- Kubernetes Assigning Pods to Nodes documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/
- Kubernetes Recommended Labels documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/common-labels/
- Kubernetes Annotations documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/annotations/
- Kubernetes Labels and Selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/

## Issues Found
- The first Deployment manifest defined `spec.selector.matchLabels.app: my-app` but did not define the matching `spec.template.metadata.labels.app: my-app`. Kubernetes requires a Deployment selector to match the pod template labels, so the manifest would be rejected. Added the missing pod template label.

## Review Notes
The post's examples use current Kubernetes APIs such as `apps/v1` Deployments and `policy/v1` PodDisruptionBudgets. The Prometheus scrape annotations shown are common tool-consumed annotations, not Kubernetes-defined annotations.
