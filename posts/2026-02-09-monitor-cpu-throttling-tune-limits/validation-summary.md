# Validation Summary: How to Monitor Pod CPU Throttling and Tune CPU Limits Accordingly

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Kubernetes CPU requests and limits
- Linux cgroups v1 and cgroups v2
- CFS bandwidth control
- cAdvisor container metrics
- Prometheus scrape configuration, PromQL, and alerting rules
- Grafana dashboard queries
- Metrics Server and `kubectl top`
- Vertical Pod Autoscaler

## Sources Consulted
- Kubernetes Resource Management for Pods and Containers: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes `kubectl top` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/
- Kubernetes Resource Metrics Pipeline: https://kubernetes.io/docs/tasks/debug/debug-cluster/resource-metrics-pipeline/
- Kubernetes Vertical Pod Autoscaling: https://kubernetes.io/docs/concepts/workloads/autoscaling/vertical-pod-autoscale/
- Linux kernel CFS Bandwidth Control documentation: https://www.kernel.org/doc/html/latest/scheduler/sched-bwc.html
- Linux kernel cgroup v2 documentation: https://www.kernel.org/doc/html/latest/admin-guide/cgroup-v2.html
- cAdvisor Prometheus metrics documentation: https://github.com/google/cadvisor/blob/master/docs/storage/prometheus.md
- Prometheus configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/

## Issues Found
- The post described Kubernetes CPU limits only in terms of cgroups v1 CFS files. Updated the explanation to say those file names apply to cgroups v1 and added the cgroups v2 `cpu.max` representation.
- The direct cgroup inspection command used the full CRI container ID, which may include a runtime prefix such as `containerd://`. Added prefix stripping before `crictl inspect`.
- The cgroup `cpu.stat` field description used cgroups v1 field names and units for both versions. Clarified that cgroups v2 reports throttled time as `throttled_usec` in microseconds.
- The `kubectl top` section implied node or Metrics API access could provide throttling data. Updated it to state that Metrics API exposes basic CPU and memory usage and that throttling requires cAdvisor or another full monitoring pipeline.
- The Prometheus cAdvisor scrape example omitted common kubelet HTTPS authentication and address relabeling. Added service account bearer token, TLS settings, and relabeling to kubelet port `10250`.
- The P99 PromQL example applied a subquery directly to an aggregate expression without grouping parentheses. Added parentheses around the aggregate expression before `[7d:5m]`.
- The VPA example claimed it would only update limits and used `mode: Auto`, which is not the field for controlling requests versus limits. Changed the section to describe updating CPU requests and limits and used `controlledValues: RequestsAndLimits`.
- The testing section said `kubectl top` monitored throttling. Updated it to use `kubectl top` only as a CPU usage spot check and direct throttling checks to Prometheus.

## Review Notes
The 5% throttling threshold remains a heuristic rather than a Kubernetes-defined standard. It is reasonable as operational guidance, but future revisions could note that acceptable throttling depends on workload latency sensitivity and SLOs.
