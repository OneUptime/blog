# Validation Summary: How to Implement DaemonSet with Node Selector for Specific Node Pools

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes DaemonSets
- Kubernetes node labels and node selectors
- Kubernetes node affinity
- kubectl
- Kubernetes CronJobs
- Kubernetes RBAC
- kube-state-metrics / Prometheus alerting
- Go client-go

## Sources Consulted
- Kubernetes DaemonSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/
- Kubernetes Assigning Pods to Nodes documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/
- Kubernetes kubectl label reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_label/
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes Node Labels Populated By The Kubelet: https://kubernetes.io/docs/reference/node/node-labels/
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes registry migration notice: https://kubernetes.io/blog/2023/03/10/image-registry-redirect/
- kube-state-metrics DaemonSet metrics documentation: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/daemonset-metrics.md
- kube-state-metrics Node metrics documentation: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/cluster/node-metrics.md

## Issues Found
- The post stated that DaemonSets schedule pods on every node by default. Updated this to every eligible node to match Kubernetes scheduling behavior and DaemonSet documentation.
- The Ceph CSI example used the legacy `k8s.gcr.io` image registry. Updated it to `registry.k8s.io`, the current Kubernetes community-owned registry.
- The Go node-labeling snippet imported unused packages, which would prevent compilation if copied as shown. Removed the unused imports and added a nil-labels guard before writing to `node.Labels`.
- The CronJob example referenced a `node-labeler` service account but did not include the RBAC needed to list and update cluster-scoped Node resources. Added ServiceAccount, ClusterRole, and ClusterRoleBinding objects.
- The Prometheus alert compared a DaemonSet desired-count metric directly against `kube_node_labels` series. Changed it to compare against `count(kube_node_labels{label_node_type="gpu"})`, which matches the kube-state-metrics node-label metric shape.

## Review Notes
The examples are technically valid as targeted demonstrations, but the container images such as `compliance-agent:latest`, `performance-monitor:latest`, and `node-labeler:latest` are placeholders that users would need to replace with real images. The kube-state-metrics node-label alert also depends on exposing the relevant node labels through the kube-state-metrics label allowlist.
