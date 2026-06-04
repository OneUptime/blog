# Validation Summary: How to Handle Pod Eviction Caused by Node Memory Pressure

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Kubernetes node-pressure eviction
- Kubernetes kubelet eviction thresholds
- Kubernetes Pod QoS classes
- Kubernetes PriorityClass
- Kubernetes PodDisruptionBudget
- Kubernetes ResourceQuota and LimitRange
- kubectl
- Prometheus alerting rules
- Kubernetes Python client

## Sources Consulted
- Kubernetes Node-pressure Eviction documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/node-pressure-eviction/
- Kubernetes Pod Quality of Service Classes documentation: https://kubernetes.io/docs/concepts/workloads/pods/pod-qos/
- Kubernetes Resource Management for Pods and Containers documentation: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes Pod Priority and Preemption documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/pod-priority-preemption/
- Kubernetes Disruptions documentation: https://kubernetes.io/docs/concepts/workloads/pods/disruptions/
- Kubernetes PodDisruptionBudget API reference: https://kubernetes.io/docs/reference/kubernetes-api/policy/pod-disruption-budget-v1/
- Kubernetes Field Selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Kubernetes Resource Quotas documentation: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes LimitRange memory defaults task: https://kubernetes.io/docs/tasks/administer-cluster/manage-resources/memory-default-namespace/
- kubectl top pod reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/kubectl_top_pod/

## Issues Found
- The post said kubelet uses two memory-pressure signals and included `nodefs.available` as one of them. Updated the text to identify `memory.available` as the memory-pressure signal and clarify that filesystem and PID signals map to other node-pressure conditions.
- The post presented soft eviction thresholds as Kubernetes defaults. Kubernetes documents default hard eviction thresholds, while soft thresholds are configured separately. Replaced the example with Linux default hard thresholds.
- The node condition `kubectl get nodes -o custom-columns=...` example used an unquoted expression that could be interpreted incorrectly by the shell. Quoted the custom columns argument.
- The post said memory requests guarantee that amount of memory. Kubernetes uses requests for scheduling and eviction decisions; memory limits are enforced by the kernel and can result in OOM kills. Updated the explanation.
- The post stated that QoS classes determine eviction order. Kubernetes documentation says kubelet ranks pods by whether usage exceeds requests, pod priority, and usage relative to requests; QoS is useful for estimating likely eviction risk. Updated the QoS explanation and priority wording.
- The QoS class definitions were too broad. Updated them to use the CPU and memory criteria from Kubernetes documentation.
- The CronJob cleanup example used `jq` inside the `bitnami/kubectl` container. Replaced that pipeline with kubectl JSONPath and a shell loop so the example does not depend on `jq` being present in the image.

## Review Notes
The remaining examples use current Kubernetes API versions such as `policy/v1` for PodDisruptionBudget, `batch/v1` for CronJob, and `scheduling.k8s.io/v1` for PriorityClass. The Prometheus alerts assume kube-state-metrics and node-exporter metric names are available in the cluster. The `kubectl top` and raw metrics examples require Metrics Server or another provider for the `metrics.k8s.io` API.
