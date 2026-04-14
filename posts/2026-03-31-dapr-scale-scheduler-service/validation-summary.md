# Validation Summary: How to Scale Dapr Scheduler Service

## Status
validated

## Post Type
Tutorial / Operations Guide

## Technologies Covered
- Dapr Scheduler service (embedded etcd)
- Kubernetes (StatefulSets, Helm, pod topology spread constraints)
- etcd (cluster membership, quorum, health checks)
- Prometheus (metrics)

## Sources Consulted
- Dapr Scheduler control plane service overview: https://docs.dapr.io/concepts/dapr-services/scheduler/
- Dapr Kubernetes persistence docs: https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-persisting-scheduler/
- Dapr production guidelines: https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-production/
- Dapr Helm chart README: https://github.com/dapr/dapr/blob/master/charts/dapr/README.md
- Dapr Scheduler StatefulSet template: https://github.com/dapr/dapr/blob/master/charts/dapr/charts/dapr_scheduler/templates/dapr_scheduler_statefulset.yaml
- Dapr Scheduler Service template: https://github.com/dapr/dapr/blob/master/charts/dapr/charts/dapr_scheduler/templates/dapr_scheduler_service.yaml
- Dapr v1.15 release notes: https://blog.dapr.io/posts/2025/02/27/dapr-v1.15-is-now-available/

## Issues Found

1. **Incorrect StatefulSet name in kubectl commands**: The post referenced `statefulset/dapr-scheduler` but the actual Dapr Helm chart creates the StatefulSet as `dapr-scheduler-server`. Fixed `kubectl rollout status` command to use `statefulset/dapr-scheduler-server`.

2. **Incorrect pod names in etcd cluster configuration and exec commands**: The post used `dapr-scheduler-0`, `dapr-scheduler-1`, `dapr-scheduler-2` for pod names, but since the StatefulSet is named `dapr-scheduler-server`, the pods are named `dapr-scheduler-server-0`, `dapr-scheduler-server-1`, `dapr-scheduler-server-2`. Fixed in the etcd initial cluster config and the `kubectl exec` health check commands.

3. **Incorrect headless service name in etcd peer URLs**: The post used `dapr-scheduler-headless` as the headless service name in DNS entries, but the Dapr Helm chart creates the headless service as `dapr-scheduler-server`. Fixed all etcd peer URLs to use `dapr-scheduler-server` instead of `dapr-scheduler-headless`.

4. **Incorrect pod label selector**: The post used `app=dapr-scheduler` as a label selector for `kubectl get pods`, but the Dapr Helm chart uses Kubernetes recommended labels (`app.kubernetes.io/name=dapr-scheduler`). Fixed the label selector in kubectl and topology spread constraint configuration.

## Review Notes
- The `dapr_scheduler.replicaCount` Helm value is used in the post. Since Dapr v1.15, `dapr_scheduler.ha=true` is the documented recommended approach for enabling Scheduler HA (which sets 3 replicas automatically). The `replicaCount` field is still a valid Helm chart parameter, but readers should be aware of the `ha` flag as the preferred method.
- The post correctly notes that etcd requires odd replica counts (1, 3, 5) and that HPA cannot be used with the Scheduler StatefulSet.
- The Prometheus metric `dapr_scheduler_jobs_triggered_total` is a real metric confirmed in Dapr's metrics documentation.
- The etcd ports (2379 client, 2380 peer) are correct.
- The `--etcd-initial-cluster` and `--etcd-initial-cluster-state` flags are valid scheduler arguments, though in production the Helm chart manages these automatically when HA is enabled.
