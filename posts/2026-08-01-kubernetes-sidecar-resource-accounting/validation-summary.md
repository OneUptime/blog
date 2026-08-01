# Validation Summary: Kubernetes Pod Resource Requests with Init and Sidecar Containers

## Status
validated

## Post Type
Technical guide and reference

## Technologies Covered
- Kubernetes Pods and resource accounting
- Native sidecar containers (`initContainers` with `restartPolicy: Always`)
- Regular init containers
- CPU, memory, ephemeral-storage, huge-page, and extended-resource requests and limits
- Kubernetes scheduling and Pod-level cgroups
- RuntimeClass Pod overhead
- Pod-level resources (`PodLevelResources`)
- In-place Pod resource resizing
- LimitRange, ResourceQuota, admission webhooks, and HorizontalPodAutoscaler behavior
- `kubectl`

## Sources Consulted
- [Kubernetes: Sidecar Containers](https://kubernetes.io/docs/concepts/workloads/pods/sidecar-containers/)
- [Kubernetes Enhancement Proposal 753: Sidecar Containers](https://github.com/kubernetes/enhancements/tree/master/keps/sig-node/753-sidecar-containers)
- [Kubernetes v1.36 component helper resource-accounting implementation](https://github.com/kubernetes/kubernetes/blob/v1.36.0/staging/src/k8s.io/component-helpers/resource/helpers.go)
- [Kubernetes v1.36 kubelet Pod cgroup resource configuration](https://github.com/kubernetes/kubernetes/blob/v1.36.0/pkg/kubelet/cm/helpers_linux.go)
- [Kubernetes: Resource Management for Pods and Containers](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/)
- [Kubernetes v1.34: Pod Level Resources Graduated to Beta](https://kubernetes.io/blog/2025/09/22/kubernetes-v1-34-pod-level-resources/)
- [Kubernetes: Pod Overhead](https://kubernetes.io/docs/concepts/scheduling-eviction/pod-overhead/)
- [Kubernetes: Init Containers](https://kubernetes.io/docs/concepts/workloads/pods/init-containers/)
- [Kubernetes API reference: Pod v1](https://kubernetes.io/docs/reference/kubernetes-api/workload-resources/pod-v1/)
- [Kubernetes: Resize CPU and Memory Resources Assigned to Containers](https://kubernetes.io/docs/tasks/configure-pod-container/resize-container-resources/)
- [Kubernetes: Configure Default CPU Requests and Limits for a Namespace](https://kubernetes.io/docs/tasks/administer-cluster/manage-resources/cpu-default-namespace/)
- [Kubernetes: Horizontal Pod Autoscaling](https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/)
- [Kubernetes: kubectl get reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/)

## Issues Found
No technical issues found.

## Review Notes
- The order-aware request formula matches KEP 753 and the Kubernetes v1.36 `PodRequests` implementation: each init phase includes previously started native sidecars, steady state includes all app containers and native sidecars, the maximum is selected independently per resource, and Pod overhead is added afterward.
- The worked example's phase sums, per-resource peaks, steady-state sums, and final values with overhead are arithmetically correct.
- Native sidecars are stable and enabled by default as of Kubernetes 1.33. The `restartPolicy: Always` field on an init container is valid in the versions relevant to this post.
- `PodLevelResources` became beta and enabled by default in Kubernetes 1.34 and remains beta in the current Kubernetes 1.36 documentation. Pod-level resources support CPU, memory, and huge pages, not ephemeral storage or arbitrary extended resources.
- The limits discussion correctly avoids treating a missing container limit as a finite workload ceiling. Kubernetes helpers can still expose a numeric aggregate of the limits that are declared, but without an explicit Pod-level limit the kubelet only applies a Pod cgroup CPU or memory ceiling when every relevant container declares that limit.
- The admitted-resource defaulting claims, RuntimeClass overhead behavior, in-place resize caveat, QoS statement, quota behavior, and percentage-based HPA warning agree with the official documentation and implementation.
- All listed documentation links returned successfully, and the `kubectl get` commands use valid resources, output formats, namespace flags, and JSONPath syntax.
- The registry image references are illustrative placeholders; the YAML is presented as a `spec` fragment rather than as a complete standalone Pod manifest.
