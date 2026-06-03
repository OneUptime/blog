# Validation Summary: How to Scale StatefulSets with HPA and Handle Ordered Pod Creation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes StatefulSets
- Kubernetes HorizontalPodAutoscaler autoscaling/v2
- Kubernetes PersistentVolumeClaims
- Kubernetes CronJobs
- ZooKeeper readiness probes
- Prometheus / kube-state-metrics alerting

## Sources Consulted
- Kubernetes StatefulSets documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes StatefulSet API reference: https://kubernetes.io/docs/reference/kubernetes-api/apps/stateful-set-v1/
- Kubernetes Horizontal Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes HorizontalPodAutoscaler autoscaling/v2 API reference: https://kubernetes.io/docs/reference/kubernetes-api/autoscaling/horizontal-pod-autoscaler-v2/
- Kubernetes kube-state-metrics documentation: https://kubernetes.io/docs/concepts/cluster-administration/kube-state-metrics
- kube-state-metrics pod metrics reference: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md
- Apache ZooKeeper Administrator's Guide, Four Letter Words: https://zookeeper.apache.org/doc/r3.2.2/zookeeperAdmin.pdf

## Issues Found
- The introduction implied HPA primarily targets Deployments. Kubernetes documents that HPA can update scalable workload resources such as Deployments and StatefulSets, so the wording was corrected to state that HPA can target any resource implementing the scale subresource.
- The StatefulSet storage bullet implied every StatefulSet pod always has a persistent volume. StatefulSets only create per-pod PVCs when `volumeClaimTemplates` are used, so the wording was corrected.
- The HPA `periodSeconds` comments described fixed waits between scale operations. Kubernetes defines `periodSeconds` as the policy window over which the scaling limit must hold true, so the comments and explanatory bullets were changed to describe rate limits and stabilization windows accurately.
- The ZooKeeper readiness explanation claimed the `ruok` probe verifies ensemble membership and prevents split-brain. ZooKeeper documents `ruok` as checking whether the local server is running in a non-error state, so the text now says production readiness should also verify ensemble role or quorum health.
- The PVC cleanup section stated PVCs are not deleted automatically without mentioning current StatefulSet PVC retention policy support. Kubernetes now supports `.spec.persistentVolumeClaimRetentionPolicy`, with `Retain` as the default, so the text was updated to distinguish default retention from explicit `whenScaled: Delete`.
- The Prometheus alert used `kube_pod_status_phase{phase!="Running"}` with a binary `and` that would not match correctly against `kube_pod_created` because of the extra `phase` label, and pod phase is less useful than readiness for slow startup. The expression now joins on `namespace,pod` and uses `kube_pod_status_ready{condition="true"} == 0`.

## Review Notes
The YAML snippets use current Kubernetes API versions (`apps/v1`, `autoscaling/v2`, and `batch/v1`) and valid HPA metric structure. The examples remain illustrative; production use would still need workload-specific probes, RBAC for the cleanup CronJob, and application-specific safety checks before deleting retained PVCs.
