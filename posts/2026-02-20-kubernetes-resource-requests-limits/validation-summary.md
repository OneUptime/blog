# Validation Summary: How to Set Kubernetes Resource Requests and Limits Correctly

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes Pods
- Kubernetes CPU and memory requests and limits
- Kubernetes QoS classes
- Kubernetes LimitRange
- Kubernetes ResourceQuota
- kubectl
- Prometheus/cAdvisor container metrics

## Sources Consulted
- Kubernetes Resource Management for Pods and Containers: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes Pod Quality of Service Classes: https://kubernetes.io/docs/concepts/workloads/pods/pod-qos/
- Kubernetes LimitRange API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/limit-range-v1/
- Kubernetes Limit Ranges concept documentation: https://kubernetes.io/docs/concepts/policy/limit-range/
- Kubernetes Resource Quotas concept documentation: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes Init Containers documentation: https://kubernetes.io/docs/concepts/workloads/pods/init-containers/
- Kubernetes Field Selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Kubernetes kubectl top pod reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/kubectl_top_pod/
- Prometheus cAdvisor metrics guide: https://prometheus.io/docs/guides/cadvisor/
- cAdvisor Prometheus metrics reference: https://github.com/google/cadvisor/blob/master/docs/storage/prometheus.md

## Issues Found
- The requests explanation and diagram referred to node "capacity" broadly. Updated this to "allocatable capacity" to match Kubernetes scheduling behavior, where scheduling is based on allocatable resources and declared requests.
- The memory unit explanation implied Kubernetes memory quantities use only binary units. Updated it to state that both binary units such as `Mi` and decimal units such as `M` are supported.
- The QoS diagram described Burstable pods as requiring requests and `Requests != Limits`. Updated the diagram to match Kubernetes criteria: a Burstable pod is not Guaranteed and has at least one CPU or memory request or limit.
- The memory limit example recommended 1.5-2x the request but used `512Mi` for a `384Mi` request. Updated the example limit to `768Mi`.
- The no-CPU-limit example said memory limits prevent OOM. Updated the wording to say memory limits prevent unbounded memory use, because exceeding a memory limit can itself cause an OOM kill.
- The OOMKilled monitoring command grepped the default pod table, which can miss restarted containers whose current pod status is no longer `OOMKilled`. Replaced it with a JSONPath command that checks each container's last terminated reason.

## Review Notes
The YAML examples use current Kubernetes API versions and valid resource fields. The `kubectl get events --field-selector reason=Evicted --all-namespaces` command is valid because `reason` is a supported Event field selector. `kubectl` was not installed in the local workspace, so command validation was performed against official Kubernetes CLI documentation rather than local `--help` output.
