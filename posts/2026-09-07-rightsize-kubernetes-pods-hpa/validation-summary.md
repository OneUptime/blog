# Validation Summary: How to Rightsize Kubernetes Pods Without Breaking HPA Scaling Behavior

## Status

validated

## Post Type

Technical guide with a Kubernetes HPA configuration example and capacity calculations.

## Technologies Covered

- Kubernetes Pods, Deployments, and workload controllers
- Horizontal Pod Autoscaler (HPA), autoscaling/v2, Resource and ContainerResource metrics
- CPU and memory requests and limits
- PodLevelResources and native sidecars
- Resource metrics, node scheduling, and node autoscaling

## Sources Consulted

- Kubernetes Horizontal Pod Autoscaling: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- HorizontalPodAutoscaler v2 API reference: https://kubernetes.io/docs/reference/kubernetes-api/autoscaling/horizontal-pod-autoscaler-v2/
- Resource Management for Pods and Containers: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Assign Pod-level CPU and memory resources: https://kubernetes.io/docs/tasks/configure-pod-container/assign-pod-level-resources/
- Kubernetes Node Autoscaling: https://kubernetes.io/docs/concepts/cluster-administration/node-autoscaling/
- Kubernetes v1.34.0 HPA controller implementation, including calculateRequests and calculatePodRequestsFromContainers: https://raw.githubusercontent.com/kubernetes/kubernetes/v1.34.0/pkg/controller/podautoscaler/replica_calculator.go
- Kubernetes v1.36.0 HPA controller implementation, including resource utilization and absolute usage calculations: https://raw.githubusercontent.com/kubernetes/kubernetes/v1.36.0/pkg/controller/podautoscaler/replica_calculator.go
- Author profile link: https://github.com/nawazdhandala

## Issues Found

1. **Pod creation responsibility:** The post said HPA creates Pods. Corrected this to explain that HPA updates the workload's desired replica count and workload controllers create Pods. This accurately describes the controller responsibilities.
2. **Sidecar signal isolation:** The post implied that independently rightsizing containers prevents a noisy proxy from distorting the main application's scaling signal. Corrected this to acknowledge that proxy usage still affects a Pod-wide signal. The existing following sentence correctly identifies ContainerResource as the way to select a named container.
3. **Example metric scope:** The example was described as absolute CPU per Pod, despite using ContainerResource for `application`. Corrected the description to specify application-container CPU averaged across Pods. The YAML itself required no changes.
4. **Aggregate capacity accounting:** The four-at-600m versus six-at-400m example mixed total Pod requests with additional sidecar requests and asserted unconditional increases in memory and connections. Specified that 2.4 cores refers to application-container requests, made additional requested-resource growth conditional on unchanged per-replica requests, and qualified connection and overhead growth.

## Review Notes

- Parsed the YAML successfully with PyYAML and checked its fields against the official autoscaling/v2 API. The Deployment reference, replica bounds, ContainerResource CPU metric, AverageValue target of 350m, 300-second stabilization window, and 25-percent policy over 60 seconds are valid.
- Confirmed 300m / 600m = 50% and 300m / 400m = 75%. The simplified equation recommends five replicas for four replicas at 75% against a 60% target. The later six-replica example is an independent capacity illustration, not the result of that calculation. Both 4 × 600m and 6 × 400m equal 2.4 CPU cores.
- The control equation is explicitly simplified. Readiness, unavailable samples, tolerance, stabilization, scaling policies, and replica bounds affect actual outcomes. Preserving the earlier 360m utilization control point at a 400m request would require a 90% target; the example's 350m target is a separate illustrative choice.
- PodLevelResources is documented as beta since Kubernetes v1.34 and enabled by default. Checked versioned controller source to confirm Pod-level request selection, named-container precedence, and inclusion of restartable init containers in the container-derived request path.
- Missing requests and missing metric samples have different handling. With multiple HPA metrics, another valid metric can still permit scale-up when one metric fails; metric failures can prevent scale-down.
- CPU throttling, memory OOM behavior, request-based placement, and node autoscaler provisioning/consolidation explanations agree with the official documentation. Reduced scheduling requests alone do not establish cost savings or improved availability.
- The example assumes an existing `checkout` Deployment with an `application` container and a functioning resource metrics API, usually supplied by Metrics Server. No live cluster deployment or load test was performed; this review validates syntax, documented semantics, and calculations.
- All five documentation links resolved to the intended official resources, and the author profile resolved. There are no terminal commands or deprecated API versions in the post.
