# Validation Summary: How Sidecar Resource Requests Affect Scheduling, HPA, and Cluster Cost

## Status
validated

## Post Type
Technical guide / reference

## Technologies Covered

- Kubernetes Pods and native sidecar containers
- CPU and memory resource requests, limits, Pod overhead, and Pod-level resources
- Kubernetes scheduler and Node autoscaling
- Horizontal Pod Autoscaler (`autoscaling/v2`)
- Resource Metrics API and Metrics Server
- `ResourceQuota`, `LimitRange`, and Pod Quality of Service classes
- `kubectl` resource-inspection commands
- Kubernetes cluster capacity and cloud-cost modeling

## Sources Consulted

- [Kubernetes: Sidecar Containers](https://kubernetes.io/docs/concepts/workloads/pods/sidecar-containers/)
- [Kubernetes: Resource Management for Pods and Containers](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/)
- [Kubernetes: Assign Pod-level CPU and memory resources](https://kubernetes.io/docs/tasks/configure-pod-container/assign-pod-level-resources/)
- [Kubernetes: Horizontal Pod Autoscaling](https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/)
- [Kubernetes: Node Autoscaling](https://kubernetes.io/docs/concepts/cluster-administration/node-autoscaling/)
- [Kubernetes: Resource Quotas](https://kubernetes.io/docs/concepts/policy/resource-quotas/)
- [Kubernetes: Limit Ranges](https://kubernetes.io/docs/concepts/policy/limit-range/)
- [Kubernetes: Pod Quality of Service Classes](https://kubernetes.io/docs/concepts/workloads/pods/pod-qos/)
- [Kubernetes: `kubectl top pod`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/kubectl_top_pod/)
- [Kubernetes Enhancement Proposal 753: Sidecar Containers](https://github.com/kubernetes/enhancements/tree/master/keps/sig-node/753-sidecar-containers#resources-calculation-for-scheduling-and-pod-admission)
- [Kubernetes HPA controller: `replica_calculator.go`](https://github.com/kubernetes/kubernetes/blob/master/pkg/controller/podautoscaler/replica_calculator.go)
- [Kubernetes Metrics Server](https://github.com/kubernetes-sigs/metrics-server)

## Issues Found
No technical issues found.

## Review Notes

- The native-sidecar request formula matches KEP-753: each regular init phase includes already-started restartable init containers, and the final effective request is the larger of the largest ordered init phase and the steady-state app-plus-sidecar sum, with Pod overhead added.
- The HPA calculations and examples are correct. Current controller code includes restartable init-container requests in the container-derived denominator for Pod `Resource` utilization metrics, excludes completed regular init containers, uses an explicit Pod-level request when configured, and gives a selected `ContainerResource` metric precedence over that Pod-level request.
- The version statements are current: native sidecars are stable from Kubernetes 1.33, `ContainerResource` metrics are stable from Kubernetes 1.30, and `PodLevelResources` is beta from Kubernetes 1.34.
- The `autoscaling/v2` HPA manifest uses current field names and target structure. The listed `kubectl` commands and the `--containers` flag are current; `kubectl top` requires the Resource Metrics API, commonly supplied by Metrics Server.
- During an in-place resource resize, Kubernetes can also consider allocated resources reported in Pod status. That advanced transient case does not invalidate the post's normal admitted-Pod calculations but is worth keeping in mind if the article is expanded later.
