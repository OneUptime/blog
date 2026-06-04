# Validation Summary: How to Implement HPA with Memory-Based Scaling

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Kubernetes Horizontal Pod Autoscaler
- Kubernetes Metrics Server / resource metrics
- Kubernetes Deployments and StatefulSets
- Kubernetes resource requests and limits
- Kubernetes startup probes and readiness behavior
- Kubernetes PodDisruptionBudget
- kubectl
- Python

## Sources Consulted
- Kubernetes Horizontal Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes HorizontalPodAutoscaler autoscaling/v2 API reference: https://kubernetes.io/docs/reference/kubernetes-api/autoscaling/horizontal-pod-autoscaler-v2/
- Kubernetes HorizontalPodAutoscaler walkthrough: https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale-walkthrough
- Kubernetes kubectl top pod reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/kubectl_top_pod/
- Kubernetes kubectl autoscale reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_autoscale
- Kubernetes kubectl create deployment reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_deployment
- Kubernetes kubectl set resources reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_set/kubectl_set_resources/
- Kubernetes Liveness, Readiness, and Startup Probes documentation: https://kubernetes.io/docs/concepts/workloads/pods/probes/
- Kubernetes Disruptions / PodDisruptionBudget documentation: https://kubernetes.io/docs/concepts/workloads/pods/disruptions/
- Kubernetes PodDisruptionBudget policy/v1 API reference: https://kubernetes.io/docs/reference/kubernetes-api/policy/pod-disruption-budget-v1/

## Issues Found
- The `data-loader` Deployment example omitted the required `.spec.selector` and matching pod template labels. Added `selector.matchLabels` and matching `template.metadata.labels` so the manifest is structurally valid as a Deployment.
- The startup probe explanation said startup probes prevent HPA from seeing high startup memory usage. Kubernetes startup probes delay liveness and readiness probes; they do not hide memory metrics from HPA. Updated the text to describe startup probes and readiness probes accurately.
- The PodDisruptionBudget section implied PDBs prevent HPA from scaling down too far. PDBs protect against voluntary evictions and do not limit workload controller scale-down. Updated the text to point readers to `minReplicas` and HPA scale-down behavior for HPA limits.
- The memory load test used `kubectl run` to create a standalone Pod, then watched an unrelated HPA. A standalone Pod would not be scaled by the HPA shown. Replaced it with commands that create a Deployment, set memory requests and limits, create a memory-based HPA for that Deployment, and watch the matching HPA.

## Review Notes
The HPA `autoscaling/v2` examples, resource metric target fields, multiple-metric behavior, stabilization behavior fields, `kubectl top` usage, and `kubectl autoscale --memory` usage were checked against current Kubernetes documentation and are technically valid. Target memory utilization ranges remain workload-dependent guidance rather than Kubernetes requirements.
