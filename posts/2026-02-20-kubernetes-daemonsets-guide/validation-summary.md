# Validation Summary: How to Use Kubernetes DaemonSets for Node-Level Services

## Status
validated

## Post Type
Guide

## Technologies Covered
- Kubernetes DaemonSets
- Kubernetes node selectors and node affinity
- Kubernetes taints and tolerations
- Kubernetes DaemonSet update strategies
- Kubernetes PriorityClass and pod priority
- Kubernetes logging and monitoring agents

## Sources Consulted
- Kubernetes DaemonSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/
- Kubernetes DaemonSet API reference: https://kubernetes.io/docs/reference/kubernetes-api/apps/daemon-set-v1/
- Kubernetes rolling update for DaemonSets task: https://kubernetes.io/docs/tasks/manage-daemon/update-daemon-set/
- Kubernetes taints and tolerations documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/
- Kubernetes pod priority and preemption documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/pod-priority-preemption/
- Kubernetes node-pressure eviction documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/node-pressure-eviction/
- Kubernetes logging architecture documentation: https://kubernetes.io/docs/concepts/cluster-administration/logging/
- Kubernetes dockershim removal notice: https://kubernetes.io/blog/2022/04/07/upcoming-changes-in-kubernetes-1-24/

## Issues Found
- The Fluentd example mounted `/var/lib/docker/containers`, which is Docker-runtime-specific and outdated for Kubernetes clusters using CRI runtimes after dockershim removal. I removed that volume and clarified that `/var/log` includes Kubernetes container logs under `/var/log/pods`.
- The node affinity comment referred to `us-east-1a` and `us-east-1b` as the `us-east-1` zone. I changed the wording to "selected us-east-1 zones" because those values are availability zones in the region.
- The priority section said high-priority DaemonSet pods are not evicted under resource pressure. Kubernetes uses priority as one factor in node-pressure eviction ordering, but higher-priority pods can still be evicted depending on requests and usage. I changed the statement to say they are less likely to be evicted before lower-priority pods.

## Review Notes
The DaemonSet API version, selector/template structure, node selector, node affinity, toleration, update strategy, `PriorityClass`, `hostNetwork`, `hostPID`, `hostPort`, and privileged security context examples use valid current Kubernetes fields. The node-exporter and network plugin examples are simplified and would typically need additional RBAC, service accounts, and production-specific host mounts or arguments in a real cluster, but the shown Kubernetes fields are technically valid for the article's scope.
