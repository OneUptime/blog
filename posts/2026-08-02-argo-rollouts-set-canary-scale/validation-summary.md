# Validation Summary: Scaling Canary Pods Independently from Traffic Weight with `setCanaryScale`

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- Argo Rollouts
- Kubernetes Rollouts and ReplicaSets
- Canary deployment strategies
- Traffic routing with Istio and other supported traffic providers
- Horizontal Pod Autoscaling (HPA)
- Argo Rollouts kubectl plugin
- Progressive delivery analysis steps

## Sources Consulted

- [Argo Rollouts: Canary Deployment Strategy](https://argo-rollouts.readthedocs.io/en/stable/features/canary/)
- [Argo Rollouts: Rollout Specification](https://argo-rollouts.readthedocs.io/en/stable/features/specification/)
- [Argo Rollouts: Traffic Management](https://argo-rollouts.readthedocs.io/en/stable/features/traffic-management/)
- [Argo Rollouts: Istio Traffic Routing](https://argo-rollouts.readthedocs.io/en/stable/features/traffic-management/istio/)
- [Argo Rollouts: Horizontal Pod Autoscaling](https://argo-rollouts.readthedocs.io/en/stable/features/hpa-support/)
- [Argo Rollouts: Analysis and Progressive Delivery](https://argo-rollouts.readthedocs.io/en/stable/features/analysis/)
- [Argo Rollouts: `kubectl argo rollouts get rollout`](https://argo-rollouts.readthedocs.io/en/release-1.8/generated/kubectl-argo-rollouts/kubectl-argo-rollouts_get_rollout/)
- [Argo Rollouts v1.9.1 canary replica calculation source](https://github.com/argoproj/argo-rollouts/blob/v1.9.1/utils/replicaset/canary.go)
- [Argo Rollouts v1.9.1 Rollout validation source](https://github.com/argoproj/argo-rollouts/blob/v1.9.1/pkg/apis/rollouts/validation/validation.go)
- [Kubernetes: Horizontal Pod Autoscaling](https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/)
- [Kubernetes: `kubectl get`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/)

## Issues Found
No technical issues found.

## Review Notes
All five YAML snippets parsed successfully. The `setCanaryScale` field names and forms, the Istio traffic-routing fragment, pause durations, inline analysis reference, and diagnostic commands are current and valid. The post was checked against Argo Rollouts v1.9.1, the latest release at review time.

The current HPA documentation's `setCanaryScale` subsection describes the stable count as the HPA-selected count minus the pinned canary count. That conflicts with both the general traffic-routing documentation and the v1.9.1 controller implementation: when `dynamicStableScale` is false, the stable ReplicaSet remains at the Rollout's desired replica count and the pinned canary is additional capacity. The post follows the controller implementation and is correct on this point.
