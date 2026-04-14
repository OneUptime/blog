# Validation Summary: How to Configure Dapr Scheduler for High Availability

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr Scheduler service
- Embedded etcd (used by Dapr Scheduler)
- Kubernetes StatefulSets, PodDisruptionBudgets, pod anti-affinity
- Helm (Dapr Helm chart)
- Dapr Jobs API (alpha)

## Sources Consulted
- Dapr Scheduler concept docs: https://docs.dapr.io/concepts/dapr-services/scheduler/
- Dapr Helm chart values.yaml and StatefulSet template: https://github.com/dapr/dapr/tree/master/charts/dapr/charts/dapr_scheduler
- Dapr Jobs API reference: https://docs.dapr.io/reference/api/jobs_api/
- Dapr Helm chart README: https://github.com/dapr/dapr/blob/master/charts/dapr/README.md
- Kubernetes PodDisruptionBudget API: https://kubernetes.io/docs/tasks/run-application/configure-pdb/

## Issues Found

1. **`dapr_scheduler.replicaCount` does not exist**: The Scheduler replica count is hardcoded to 3 in the Helm chart StatefulSet template. The original `--set dapr_scheduler.replicaCount=3` flag would be silently ignored. Removed the flag and added a note that the Scheduler always runs as a 3-replica StatefulSet.

2. **Volume claim Helm paths incorrect**: The original used `dapr_scheduler.volumeclaim.storageClassName` and `dapr_scheduler.volumeclaim.requestsStorage`. The correct Helm values are `dapr_scheduler.cluster.storageClassName` and `dapr_scheduler.cluster.storageSize`. Fixed both paths.

3. **Pod label incorrect**: The original used `app: dapr-scheduler` in the PDB selector, affinity rules, and topology spread constraints. The actual label on Scheduler pods is `app: dapr-scheduler-server`. Fixed all occurrences.

4. **`etcdctl` command would fail**: The Dapr Scheduler container is built on `distroless/static:nonroot`, which contains no shell or etcdctl binary. The embedded etcd is compiled into the Go scheduler binary as a library. Replaced the etcdctl command with `kubectl get pods` and `kubectl logs` commands that actually work.

5. **`dapr_scheduler.affinity` is not a Helm value**: Pod anti-affinity is hardcoded in the Scheduler StatefulSet template, not configurable via Helm values. Removed the custom affinity block from the Helm values example and added a note that affinity is built into the chart.

6. **`dapr_scheduler.topologySpreadConstraints` is not a Helm value**: The chart does not support this parameter. Zone spreading is handled by the built-in pod anti-affinity using `global.ha.topologyKey`. Replaced the section with the correct `global.ha.topologyKey` configuration.

7. **"3 or 5 replicas" claim misleading**: Since the replica count is hardcoded to 3, stating users can "deploy 3 or 5 replicas" is inaccurate. Fixed to reflect the hardcoded 3-replica configuration.

8. **StatefulSet pod names**: Updated pod names from `dapr-scheduler-0`/`dapr-scheduler-1` to `dapr-scheduler-server-0`/`dapr-scheduler-server-1` to match the actual StatefulSet naming.

## Review Notes
- The Jobs API endpoint (`v1.0-alpha1/jobs/<name>`) is correctly identified as alpha. This may change in future Dapr releases when the API is promoted to stable.
- The `global.ha.enabled=true` setting primarily affects other control plane services (operator, sentry, injector). The Scheduler always runs 3 replicas regardless of this setting, though enabling it is still recommended for full control plane HA.
- The embedded etcd uses mTLS for inter-node communication, which is handled automatically by the Helm chart. Users connecting an external etcd would need to configure TLS certificates.
