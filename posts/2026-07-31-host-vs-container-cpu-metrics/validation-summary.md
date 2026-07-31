# Validation Summary: Why Host and Container CPU Metrics Disagree—and How to Compare Them Correctly

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Prometheus
- PromQL
- Prometheus Node Exporter
- Kubernetes
- kubelet
- cAdvisor
- Linux procfs CPU accounting
- Linux cgroup v1 and cgroup v2 CPU accounting

## Sources Consulted

- [Prometheus Node Exporter guide](https://prometheus.io/docs/guides/node-exporter/)
- [Prometheus `rate()` and `irate()` function documentation](https://prometheus.io/docs/prometheus/latest/querying/functions/#rate)
- [Prometheus configuration and Kubernetes service-discovery reference](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#kubernetes_sd_config)
- [Node Exporter Linux CPU collector source](https://github.com/prometheus/node_exporter/blob/master/collector/cpu_linux.go)
- [Node Exporter changelog for the guest CPU metric split](https://github.com/prometheus/node_exporter/blob/master/CHANGELOG.md#0160--2018-05-15)
- [cAdvisor Prometheus metric reference](https://github.com/google/cadvisor/blob/master/docs/storage/prometheus.md)
- [Linux kernel procfs CPU mode definitions](https://docs.kernel.org/filesystems/proc.html#miscellaneous-kernel-statistics-in-proc-stat)
- [Linux kernel cgroup v2 CPU accounting](https://docs.kernel.org/admin-guide/cgroup-v2.html#cpu)
- [Linux kernel cgroup v1 CPU accounting](https://docs.kernel.org/admin-guide/cgroup-v1/cpuacct.html)
- [Kubernetes resource requests, limits, and CPU units](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/#meaning-of-cpu)
- [Kubernetes metrics reference](https://kubernetes.io/docs/reference/instrumentation/metrics/)
- [Kubernetes resource metrics pipeline](https://kubernetes.io/docs/tasks/debug/debug-cluster/resource-metrics-pipeline/)

## Issues Found

- The host queries attempted to exclude `guest` and `guest_nice` modes from `node_cpu_seconds_total`. Current Node Exporter exposes guest time through the separate `node_cpu_guest_seconds_total` metric, while guest time remains included in the user and nice counters. Removed the nonexistent mode exclusions from all three host queries and clarified that the separate guest metric must not be added to the total.
- The host query was described as busy CPU without explicitly saying that its selector includes `steal`. Clarified that the shown definition includes steal so the later virtualization guidance and the query use an explicit, consistent accounting boundary.
- The relabeling example used `__meta_kubernetes_node_name` without stating that this meta label belongs to Kubernetes service discovery with `role: node`. Scoped the example to that role and noted that other discovery roles need their available node-name meta label or an explicit equivalent mapping.
- The residual explanation listed all kernel work as outside application-container accounting, even though system CPU executed on behalf of tasks in a container is charged to that cgroup, and some listed agents can themselves run in selected containers. Narrowed the statement to kernel work not charged to the selected cgroups and made the component list explicitly deployment- and selector-dependent.

## Review Notes

The PromQL expressions are syntactically consistent and correctly apply `rate()` before aggregation. The cAdvisor leaf-container selector is intentionally deployment-dependent; as the post states, readers must inspect their own kubelet/cAdvisor labels to confirm that root, Pod sandbox, and parent cgroups are excluded exactly once. All eight documentation links in the post returned successful HTTP responses during validation.
