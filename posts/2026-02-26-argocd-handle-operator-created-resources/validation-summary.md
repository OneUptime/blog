# Validation Summary: How to Handle Resources Created by Operators in ArgoCD

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- Kubernetes
- Kubernetes operators and owner references
- CustomResourceDefinitions and custom resources
- Argo CD custom health checks
- Argo CD diff customization and sync options
- Argo CD resource exclusions
- Argo CD custom resource actions
- Horizontal Pod Autoscaler and Vertical Pod Autoscaler
- Crunchy Data Postgres Operator
- cert-manager Certificate resources

## Sources Consulted
- Argo CD Resource Health documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/
- Argo CD Diffing Customization documentation: https://argo-cd.readthedocs.io/en/release-3.4/user-guide/diffing/
- Argo CD Sync Options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD Sync Phases and Waves documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-waves/
- Argo CD Resource Actions documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/resource_actions/
- Argo CD Declarative Setup resource exclusions documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- Argo CD Resource Tracking documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/resource_tracking/
- Kubernetes garbage collection and owner references documentation: https://kubernetes.io/docs/concepts/architecture/garbage-collection/
- Kubernetes Horizontal Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes Vertical Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/vertical-pod-autoscale/
- cert-manager API reference for Certificate conditions: https://cert-manager.io/docs/reference/api-docs/
- Crunchy Data PostgresCluster CRD reference: https://access.crunchydata.com/documentation/postgres-operator/latest/references/crd/5.0.x/postgrescluster
- Crunchy Data backup management documentation: https://access.crunchydata.com/documentation/postgres-operator/latest/tutorials/backups-disaster-recovery/backup-management
- Crunchy Data administrative tasks documentation: https://access.crunchydata.com/documentation/postgres-operator/latest/tutorials/cluster-management/administrative-tasks

## Issues Found
- The PostgresCluster health check used condition names such as `PostgresClusterProgressing` and reason `PostgresClusterHealthy`, but the current Crunchy Data PostgresCluster CRD reference documents different status fields and known condition types. I replaced the example with a health check based on documented fields: `status.observedGeneration`, `status.instances[].readyReplicas`, and `status.instances[].updatedReplicas`.
- The HPA/VPA section described both HPA and VPA as built-in Kubernetes operators. I corrected this to describe HPA as a built-in Kubernetes controller and VPA as an installed autoscaling component that uses admission/update components for resource request changes.
- The custom resource action for `restart-cluster` wrote a `postgres-operator.crunchydata.com/restart` metadata annotation, but current Crunchy Data documentation describes manual PostgreSQL restarts by changing `spec.metadata.annotations`. I updated the action to set `obj.spec.metadata.annotations["restarted"]`.
- The backup action used a static annotation value of `trigger`, which would not reliably trigger repeat one-off backups because PGO expects the annotation to be added or updated. I changed it to write a timestamp value, matching the documented pattern.

## Review Notes
The Argo CD examples for custom health checks, diff customization, `RespectIgnoreDifferences=true`, resource exclusions, sync waves, and custom resource actions match current Argo CD documentation. The cert-manager Certificate health example aligns with the documented `Ready` condition. The resource exclusion for `coordination.k8s.io` `Lease` objects is technically valid, but should be used carefully because excluding a whole common resource kind can hide Leases unrelated to a specific operator.
