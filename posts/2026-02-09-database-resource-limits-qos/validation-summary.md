# Validation Summary: How to Configure Database Resource Limits and QoS for Kubernetes StatefulSets

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes StatefulSets
- Kubernetes resource requests and limits
- Kubernetes QoS classes
- Kubernetes PriorityClass
- Kubernetes ResourceQuota and LimitRange
- Kubernetes node affinity, taints, and tolerations
- PostgreSQL 15 configuration
- MySQL 8.0 configuration
- Prometheus Operator PrometheusRule
- kube-state-metrics

## Sources Consulted
- Kubernetes Pod Quality of Service Classes: https://kubernetes.io/docs/concepts/workloads/pods/pod-qos/
- Kubernetes Configure Quality of Service for Pods: https://kubernetes.io/docs/tasks/configure-pod-container/quality-service-pod/
- Kubernetes Node-pressure Eviction: https://kubernetes.io/docs/concepts/scheduling-eviction/node-pressure-eviction/
- Kubernetes Pod Priority and Preemption: https://kubernetes.io/docs/concepts/scheduling-eviction/pod-priority-preemption/
- Kubernetes Resource Management for Pods and Containers: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes StatefulSets: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes Define a Command and Arguments for a Container: https://kubernetes.io/docs/tasks/inject-data-application/define-command-argument-container/
- Kubernetes kubectl taint reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_taint/
- Kubernetes kubectl top reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/
- Kubernetes Assign Pods to Nodes using Node Affinity: https://kubernetes.io/docs/tasks/configure-pod-container/assign-pods-nodes-using-node-affinity/
- Kubernetes Taints and Tolerations: https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/
- Kubernetes Resource Quotas: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes LimitRange API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/limit-range-v1/
- PostgreSQL 15 runtime configuration: https://www.postgresql.org/docs/15/runtime-config.html
- MySQL 8.0 Reference Manual, InnoDB system variables and tuning: https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html
- Prometheus alerting rules: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- kube-state-metrics pod metrics: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md

## Issues Found
- The QoS explanation incorrectly described Guaranteed QoS as providing the highest priority. Kubernetes QoS and Pod priority are separate mechanisms. Updated the wording to describe Guaranteed QoS as the strongest eviction protection rather than priority.
- The post stated that Guaranteed QoS prevents kubelet eviction of database pods. Kubernetes documentation says Guaranteed pods are least likely to be evicted, but node-pressure eviction can still evict pods depending on request usage, priority, and available lower-priority victims. Updated the wording to reflect that Guaranteed pods are last candidates when usage stays within requests.
- The PostgreSQL configuration example used `command` to pass `postgres -c config_file=...`. In Kubernetes, `command` overrides the image entrypoint; for the official PostgreSQL container this can bypass entrypoint initialization behavior. Changed the snippet to use `args`, preserving the image entrypoint while replacing the image command arguments.
- The resource monitoring CronJob referenced `serviceAccountName: resource-monitor` without defining the ServiceAccount or RBAC permissions needed to list pods and read Metrics API pod metrics. Added the ServiceAccount, Role, and RoleBinding to the manifest.
- The OOM alert used container restart count and described it as a possible OOM. That detects any restart, not specifically OOM kills. Changed the expression to use kube-state-metrics' `kube_pod_container_status_last_terminated_reason{reason="OOMKilled"}` metric and updated the alert text.

## Review Notes
- YAML snippets were parsed successfully after the edits.
- `kubectl` is not installed in the local workspace, so CLI checks were verified against official Kubernetes generated command reference documentation instead of local `--help` output.
- `kubectl top` requires Metrics Server or another Metrics API provider to be installed and working in the cluster.
- The MySQL example sets `innodb_flush_log_at_trx_commit = 2`, which is valid for MySQL 8.0 and can improve performance, but it trades off full crash durability compared with the default value of `1`.
