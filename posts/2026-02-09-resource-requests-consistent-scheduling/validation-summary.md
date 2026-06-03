# Validation Summary: How to Configure Kubernetes Resource Requests for Consistent Pod Scheduling

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes resource requests and limits
- Kubernetes scheduler behavior
- Kubernetes QoS classes
- Kubernetes PriorityClass and preemption
- Kubernetes Metrics API and metrics-server
- Vertical Pod Autoscaler
- Prometheus and PromQL
- kubectl

## Sources Consulted
- Kubernetes Resource Management for Pods and Containers: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes Pod Quality of Service Classes: https://kubernetes.io/docs/concepts/workloads/pods/pod-qos/
- Kubernetes Pod Priority and Preemption: https://kubernetes.io/docs/concepts/scheduling-eviction/pod-priority-preemption/
- Kubernetes Vertical Pod Autoscaling: https://kubernetes.io/docs/concepts/workloads/autoscaling/vertical-pod-autoscale/
- Kubernetes Metrics Server documentation: https://kubernetes-sigs.github.io/metrics-server/
- Kubernetes kubectl top pod reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/kubectl_top_pod/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- kube-state-metrics pod metrics documentation: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md

## Issues Found
- The `apps/v1` Deployment examples omitted the required `.spec.selector` field and matching pod template labels. Added selectors and `template.metadata.labels` to the Deployment snippets so they are valid Kubernetes manifests.
- The Job example omitted `restartPolicy`. Added `restartPolicy: Never`, because Job pod templates must use `Never` or `OnFailure` rather than the Pod default of `Always`.
- The Metrics API command was described as retrieving historical usage from metrics-server. Changed the comment to say it returns current usage from the Metrics API; metrics-server is not intended as a historical monitoring store.
- The CPU average PromQL used `avg_over_time()` directly on `container_cpu_usage_seconds_total`, which is a counter. Updated it to average `rate(container_cpu_usage_seconds_total[5m])` over a 24-hour subquery.
- The CPU percentile PromQL used `histogram_quantile()` on `container_cpu_usage_seconds_total`, which is not a histogram bucket metric. Replaced it with `quantile_over_time()` over CPU usage rates.
- The VPA example used deprecated `updateMode: "Auto"` and the prose referenced a non-existent `updateMode: "Recommender"`. Updated the example to `updateMode: "Recreate"` and the recommendation-only guidance to `updateMode: "Off"`.
- The resource request accuracy PromQL divided CPU usage by `container_spec_cpu_quota`, which represents CPU quota/limit rather than requested CPU. Replaced the CPU and memory request comparisons with `kube_pod_container_resource_requests` from kube-state-metrics.
- The load-test monitoring command used an unsupported `kubectl top pods --watch` flag. Replaced it with a shell loop that repeatedly runs the supported `kubectl top pods` command.

## Review Notes
The main Kubernetes resource model explanations are consistent with current documentation. The PromQL examples assume kube-state-metrics is scraped alongside cAdvisor or kubelet container usage metrics, which is common for Kubernetes Prometheus installations but should be documented explicitly in a future broader rewrite.
