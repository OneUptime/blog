# Validation Summary: How to Fix Kubernetes Node CPU Throttling from Incorrect Resource Limits

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes resource requests and limits
- Linux cgroups and CPU throttling
- cAdvisor metrics
- Prometheus recording and alerting rules
- Horizontal Pod Autoscaler
- Vertical Pod Autoscaler
- Kubernetes CPU Manager
- kubectl

## Sources Consulted
- Kubernetes Resource Management for Pods and Containers: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes Pod Quality of Service Classes: https://kubernetes.io/docs/concepts/workloads/pods/pod-qos/
- Kubernetes CPU Management Policies: https://kubernetes.io/docs/tasks/administer-cluster/cpu-management-policies/
- Kubernetes Horizontal Pod Autoscaling: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes Vertical Pod Autoscaling: https://kubernetes.io/docs/concepts/workloads/autoscaling/vertical-pod-autoscale/
- cAdvisor Prometheus metrics reference: https://github.com/google/cadvisor/blob/master/docs/storage/prometheus.md
- Prometheus recording and alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/
- Linux kernel cgroup v2 documentation: https://www.kernel.org/doc/html/latest/admin-guide/cgroup-v2.html

## Issues Found
- The `kubectl top` example was described as checking throttling metrics, but `kubectl top` reports current resource usage. Updated the comment to say it checks current CPU usage.
- The direct cgroup stats command used the cgroup v1-only path `/sys/fs/cgroup/cpu/cpu.stat` and only mentioned `throttled_time`. Updated the command to try cgroup v2 `/sys/fs/cgroup/cpu.stat` first with a cgroup v1 fallback, and updated the text to mention `throttled_usec` for cgroup v2.
- The Prometheus alert summaries said the ratio represented percent of time, but the expression divides throttled CFS periods by total CFS periods. Updated the summaries to say "CPU periods."
- The QoS section said Burstable pods without CPU limits are throttled less aggressively. Updated it to clarify that they avoid CPU limit throttling.
- The node pressure section described node CPU contention as node-level throttling and said all pods get throttled. Updated the wording to distinguish CPU contention and latency from CPU limit throttling.
- The CPU request summing command miscalculated mixed CPU quantities such as `500m` and `1`. Replaced it with a `jq` expression that normalizes CPU requests to millicores.
- The scheduler wording referred to node capacity instead of node allocatable CPU. Updated the sentence to use node allocatable CPU.
- The CPU Manager section claimed exclusive cores prevent throttling. Updated the wording to say exclusive cores reduce CPU contention, and clarified that containers in Guaranteed pods with whole-number CPU requests get exclusive cores.
- The throttling percentage comment used `throttled_seconds / total_seconds`, while the surrounding metrics fetched CFS periods. Updated the comment to use throttled periods divided by total periods.

## Review Notes
`kubectl` was not installed in the local workspace, so CLI behavior was verified against Kubernetes documentation rather than local `kubectl --help` output. The CPU request summing `jq` expression was tested locally with mixed `m` and whole-core CPU values.
