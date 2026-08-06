# Validation Summary: Run a Production JetStream EventBus for Argo Events

## Status
validated

## Post Type
Production operations guide

## Technologies Covered
- Argo Events
- Argo Events EventBus custom resources
- NATS JetStream
- Kubernetes StatefulSets and persistent volumes
- Kubernetes pod anti-affinity and topology labels
- Kubernetes PodDisruptionBudgets
- TLS and Kubernetes Secrets
- Prometheus NATS exporter metrics
- JetStream stream backup, restore, replication, and Raft quorum

## Sources Consulted
- [Argo Events JetStream EventBus documentation](https://argoproj.github.io/argo-events/eventbus/jetstream/)
- [Argo Events API reference](https://argoproj.github.io/argo-events/APIs/)
- [Argo Events upstream controller configuration](https://github.com/argoproj/argo-events/blob/master/manifests/base/controller-manager/controller-config.yaml)
- [Argo Events JetStream EventBus API type](https://github.com/argoproj/argo-events/blob/master/pkg/apis/events/v1alpha1/jetstream_eventbus.go)
- [Argo Events managed JetStream installer](https://github.com/argoproj/argo-events/blob/master/pkg/reconciler/eventbus/installer/jetstream.go)
- [Argo Events JetStream client and stream creation logic](https://github.com/argoproj/argo-events/blob/master/pkg/eventbus/jetstream/base/jetstream.go)
- [Argo Events HA and DR recommendations](https://argoproj.github.io/argo-events/dr_ha_recommendations/)
- [Argo Events EventBus anti-affinity documentation](https://argoproj.github.io/argo-events/eventbus/antiaffinity/)
- [NATS stream backup and restore documentation](https://docs.nats.io/learn/backup-recovery/stream-backup-restore)
- [NATS JetStream clustering documentation](https://docs.nats.io/learn/topologies/jetstream-in-a-cluster)
- [NATS JetStream cluster administration documentation](https://docs.nats.io/running-a-nats-service/configuration/clustering/jetstream_clustering/administration)
- [NATS JetStream monitoring documentation](https://docs.nats.io/learn/monitoring/jetstream-health)
- [NATS Prometheus exporter repository](https://github.com/nats-io/prometheus-nats-exporter)
- [Kubernetes disruption documentation](https://kubernetes.io/docs/concepts/workloads/pods/disruptions/)
- [Kubernetes API-initiated eviction documentation](https://kubernetes.io/docs/concepts/scheduling-eviction/api-eviction/)
- [Kubernetes PodDisruptionBudget task](https://kubernetes.io/docs/tasks/run-application/configure-pdb/)
- [Kubernetes persistent volume documentation](https://kubernetes.io/docs/concepts/storage/persistent-volumes/)

## Issues Found
- The disaster-recovery section listed surviving quorum and spare placement as the requirements for automatic replica recovery, but it omitted the NATS requirement to remove a permanently lost server from the JetStream meta Raft group before NATS places a replacement. The text now distinguishes a temporarily unavailable replica, which can catch up after returning, from a permanently lost replica, which requires surviving quorum, placement capacity, and meta-group peer removal.

## Review Notes
- The upstream `master` controller configuration maps the `2.10.29` key to the `nats:2.10.29` image. Installed Argo Events releases can ship a different version table, so the post correctly tells readers to inspect their own controller ConfigMap.
- The current API accepts the shown managed JetStream fields, including `replicas`, `persistence`, `affinity`, `priorityClassName`, `containerTemplate`, `streamConfig`, and `maxPayload`. The shown pod labels also match the current installer.
- Argo reads `maxBytes` with Viper's integer conversion before building the NATS stream configuration. The numeric 80 GiB value is valid; a size string such as `80GB` converts to zero and does not establish the intended byte limit.
- The current Argo Events admission validator treats `spec.jetstream.streamConfig` as immutable after creation. The example is valid for initial creation, but a later retention change needs migration or recreation planning.
- The post's legacy NATS documentation URLs currently redirect to the corresponding current NATS documentation pages.
