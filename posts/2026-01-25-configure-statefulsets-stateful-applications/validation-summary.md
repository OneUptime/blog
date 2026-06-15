# Validation Summary: How to Configure StatefulSets for Stateful Applications

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes StatefulSets
- Kubernetes Services and DNS
- Kubernetes PersistentVolumeClaims and StorageClasses
- kubectl
- PostgreSQL containers
- Redis Cluster
- PodDisruptionBudgets

## Sources Consulted
- Kubernetes StatefulSets documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes StatefulSet basics tutorial: https://kubernetes.io/docs/tutorials/stateful-application/basic-stateful-set/
- Kubernetes Persistent Volumes documentation: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes Debug Services task: https://kubernetes.io/docs/tasks/debug/debug-application/debug-service/
- Kubernetes Scale a StatefulSet task: https://kubernetes.io/docs/tasks/run-application/scale-stateful-set/
- Kubernetes 1.27 StatefulSet PVC auto-deletion beta announcement: https://kubernetes.io/blog/2023/05/04/kubernetes-1-27-statefulset-pvc-auto-deletion-beta/
- Redis Cluster scaling documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/scaling/

## Issues Found
- The post described ordered pod deletion too broadly. StatefulSets provide reverse-order termination during scale down, but deleting the StatefulSet object itself does not provide the same ordered shutdown guarantee. Updated the wording to specify scale-down behavior.
- The DNS test commands created the test pod in the default namespace while the short DNS form was described as working in the same namespace as the StatefulSet. Added `-n database` and `--command` so the BusyBox pod runs `nslookup` directly in the correct namespace.
- The PVC cleanup command selected PVCs with `-l app=postgres`, but the PostgreSQL `volumeClaimTemplates` did not label generated PVCs. Added `app: postgres` labels to the PVC template metadata so the cleanup selector matches.
- The PVC retention policy heading implied Kubernetes 1.27+ as the current status. Updated it to say the feature is stable in Kubernetes 1.32+, while the consulted Kubernetes 1.27 announcement confirms the earlier beta status.
- The Redis example called the manifest "production-ready" and implied six replicas automatically become three masters and three replicas. Redis Cluster requires running cluster-enabled Redis instances and then initializing the cluster. Updated the wording and replica comment to clarify that the StatefulSet creates Redis nodes suitable for later cluster initialization.
- Added `app: redis` labels to the Redis PVC template metadata for consistency with selector-based PVC management patterns.

## Review Notes
The PostgreSQL example is valid as a StatefulSet manifest, but it does not configure PostgreSQL replication or high availability. In a future revision, the post could note that running three PostgreSQL pods this way creates separate instances unless a database replication or operator layer is added.
