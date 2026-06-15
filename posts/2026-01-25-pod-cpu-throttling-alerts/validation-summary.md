# Validation Summary: How to Configure Pod CPU Throttling Alerts

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes resource requests and limits
- Linux CFS bandwidth control and cgroups
- Prometheus and PromQL
- Prometheus Operator PrometheusRule resources
- Grafana dashboards
- kube-state-metrics
- Vertical Pod Autoscaler
- kubectl and promtool

## Sources Consulted
- Kubernetes documentation: Resource Management for Pods and Containers - https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes documentation: Control CPU Management Policies on the Node - https://kubernetes.io/docs/tasks/administer-cluster/cpu-management-policies/
- Kubernetes kubectl reference - https://kubernetes.io/docs/reference/kubectl/
- Kubernetes JSONPath support - https://kubernetes.io/docs/reference/kubectl/jsonpath/
- Kubernetes documentation: Vertical Pod Autoscaling - https://kubernetes.io/docs/concepts/workloads/autoscaling/vertical-pod-autoscale/
- Prometheus documentation: Query functions - https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus documentation: Query examples and subqueries - https://prometheus.io/docs/prometheus/latest/querying/examples/
- Prometheus documentation: promtool command line - https://prometheus.io/docs/prometheus/latest/command-line/promtool/
- Prometheus Operator API reference: PrometheusRule - https://prometheus-operator.dev/docs/api-reference/api/
- Linux kernel documentation: CFS Bandwidth Control - https://docs.kernel.org/scheduler/sched-bwc.html
- Linux kernel documentation: cgroup v2 - https://docs.kernel.org/admin-guide/cgroup-v2.html
- cAdvisor Prometheus metrics documentation - https://github.com/google/cadvisor/blob/master/docs/storage/prometheus.md
- kube-state-metrics pod metrics documentation - https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md
- Grafana documentation: Configure thresholds - https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/configure-thresholds/

## Issues Found
- Several throttling queries filtered `container!=""` but did not exclude the Kubernetes sandbox container label `container="POD"`. Updated the tiered alert rules, production alert, Grafana panel, and promtool query to use `container!="", container!="POD"` consistently.
- The "Time Spent Throttled" Grafana panel used `rate(container_cpu_cfs_throttled_seconds_total[5m])`, which returns throttled seconds per second rather than total time over the window. Changed it to `increase(...[5m])` so the panel title and unit match the query.
- The `kubectl get pods -o custom-columns` example only showed the first container's CPU request and limit. Changed it to use `spec.containers[*]` so multi-container pods are represented.
- The direct cgroup stats example only showed a cgroup v1 path and used angle-bracket placeholders that are not shell-safe. Added a cgroup v2 example, retained a cgroup v1 example, and switched placeholders to shell variable syntax.
- The cgroup stats field for throttled time differs between cgroup versions. Added `throttled_usec` for cgroup v2 and kept `throttled_time` for cgroup v1.
- The PromQL example for week-long maximum CPU usage used `[7d]` after a `rate(...)` expression. Changed it to subquery syntax `[7d:]`, which is valid for passing a range vector to `max_over_time`.
- The kube-state-metrics CPU request/limit examples omitted the `unit="core"` label. Added it to CPU resource queries to match current kube-state-metrics labeling.
- The `PodCPUNearLimit` alert compared a ratio to `0.9` but formatted the value as a percentage, which would display about `1%` instead of `90%`. Changed the expression to multiply by 100 and compare against `90`.
- The sustained CPU alert included sandbox container CPU usage. Added `container!="POD"` to match the other container CPU usage queries.

## Review Notes
- The 100ms CFS period statement is accurate for the Kubernetes default, but the period can be changed via kubelet configuration.
- The Prometheus and Grafana snippets are examples and assume the cluster exposes cAdvisor/kubelet container metrics and kube-state-metrics labels in the common Kubernetes format.
