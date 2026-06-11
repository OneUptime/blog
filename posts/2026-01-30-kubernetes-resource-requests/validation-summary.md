# Validation Summary: How to Create Kubernetes Resource Requests

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Pods, Deployments, and StatefulSets
- Kubernetes resource requests and limits
- Kubernetes QoS classes
- LimitRange and ResourceQuota
- Vertical Pod Autoscaler
- Metrics Server and kubectl resource metrics
- Prometheus / PromQL
- Linux cgroups
- JVM container memory settings

## Sources Consulted
- Kubernetes documentation: Resource Management for Pods and Containers - https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes documentation: Pod Quality of Service Classes - https://kubernetes.io/docs/concepts/workloads/pods/pod-qos/
- Kubernetes documentation: Limit Ranges - https://kubernetes.io/docs/concepts/policy/limit-range/
- Kubernetes documentation: Resource Quotas - https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes documentation: Vertical Pod Autoscaling - https://kubernetes.io/docs/concepts/workloads/autoscaling/vertical-pod-autoscale/
- Kubernetes autoscaler VPA quickstart - https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/quickstart.md
- Prometheus documentation: Querying basics and subquery syntax - https://prometheus.io/docs/prometheus/latest/querying/basics/
- Prometheus documentation: Query functions - https://prometheus.io/docs/prometheus/latest/querying/functions/
- Linux kernel documentation: Control Group v2 - https://www.kernel.org/doc/html/latest/admin-guide/cgroup-v2.html
- Metrics Server repository and installation manifest URL - https://github.com/kubernetes-sigs/metrics-server

## Issues Found
- The VPA example used `updateMode: "Auto"` as a current option. Current Kubernetes/VPA documentation marks `Auto` as deprecated since VPA 1.4.0 and recommends explicit modes such as `Recreate` or `InPlaceOrRecreate`. Changed the example to `Recreate`, adjusted the options comment, and marked `Auto` as a deprecated alias for `Recreate`.
- The PromQL CPU query attempted to apply a 7-day range to `rate(...)` using `[7d]`. Prometheus subqueries require the `<range>:` syntax when applying a range to an instant query result. Changed it to `rate(...[5m])[7d:]`.
- The CPU throttling commands only used the older cgroup v1 path `/sys/fs/cgroup/cpu/cpu.stat`. Modern cgroup v2 exposes CPU stats as `/sys/fs/cgroup/cpu.stat` and uses `throttled_usec`; cgroup v1 uses `throttled_time`. Updated the examples to show both paths and both field names.

## Review Notes
The remaining Kubernetes resource request/limit examples, QoS criteria, LimitRange and ResourceQuota field names, `kubectl get`/`describe` command shapes, Metrics Server installation URL, and JVM memory flags are consistent with the consulted documentation. Local `kubectl`, `promtool`, and YAML schema validation tooling were not installed in this environment, so validation was performed by documentation review and direct snippet inspection rather than live cluster API validation.
