# Validation Summary: How to Scale PostgreSQL Read Replicas with CloudNativePG

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- CloudNativePG
- Kubernetes
- PostgreSQL
- PostgreSQL streaming replication and hot standby
- PgBouncer / CloudNativePG Pooler
- Prometheus alerting
- HAProxy
- Python psycopg2

## Sources Consulted
- CloudNativePG service management documentation: https://cloudnative-pg.github.io/docs/devel/service_management/
- CloudNativePG 1.29 operator capability levels: https://cloudnative-pg.github.io/docs/1.29/operator_capability_levels/
- CloudNativePG 1.29 replica cluster documentation: https://cloudnative-pg.github.io/docs/1.29/replica_cluster/
- CloudNativePG 1.29 replication documentation: https://cloudnative-pg.github.io/docs/1.29/replication/
- CloudNativePG 1.28 connection pooling documentation: https://cloudnative-pg.github.io/docs/1.28/connection_pooling/
- CloudNativePG 1.29 monitoring documentation: https://cloudnative-pg.github.io/docs/1.29/monitoring/
- CloudNativePG labels and annotations documentation: https://cloudnative-pg.github.io/docs/1.28/labels_annotations/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes dependent environment variable documentation: https://kubernetes.io/docs/tasks/inject-data-application/define-interdependent-environment-variables/
- Kubernetes HorizontalPodAutoscaler v2 API documentation: https://kubernetes.io/docs/reference/kubernetes-api/autoscaling-resources/horizontal-pod-autoscaler-v2/
- PostgreSQL hot standby documentation: https://www.postgresql.org/docs/current/hot-standby.html
- PostgreSQL runtime configuration for replication: https://www.postgresql.org/docs/current/runtime-config-replication.html

## Issues Found
- The Deployment example omitted the required `spec.selector` and matching pod template labels for an `apps/v1` Deployment. Added `spec.selector.matchLabels` and `spec.template.metadata.labels`.
- The Deployment example referenced `$(DB_USER)` and `$(DB_PASS)` before those environment variables were defined. Kubernetes only expands variables already defined earlier in the same `env` list, so the credentials would not expand correctly. Moved `DB_USER` and `DB_PASS` before the connection URL variables.
- The Service example claimed Kubernetes uses round-robin load balancing by default. Kubernetes Services distribute traffic through kube-proxy or the cluster dataplane, and the exact algorithm is implementation dependent. Reworded the comment.
- The dedicated and geo-distributed replica cluster examples used `spec.replica.source` but did not specify a bootstrap method. CloudNativePG replica clusters need a bootstrap source such as `pg_basebackup`, recovery, or volume snapshot. Added `bootstrap.pg_basebackup.source`.
- The replica cluster examples used a password-style `streaming_replica` connection. CloudNativePG normally uses TLS client certificate authentication for streaming replication. Updated the examples to show `sslmode`, `sslKey`, `sslCert`, and `sslRootCert`.
- The HPA example targeted the `Pooler` custom resource directly. Current CloudNativePG documentation describes `Pooler.spec.instances` scaling but does not document Pooler as a recommended HPA target. Replaced the HPA manifest with a `kubectl patch pooler` example for scaling the Pooler declaratively.
- The monitoring section used `cnpg_collector_up{role="replica"}`, but the documented role pod label is `cnpg.io/instanceRole` and `cnpg_collector_up` itself is not documented with a `role` metric label. Changed the metric list to `cnpg_collector_up` and updated replica-count alerts to use `cnpg_pg_replication_in_recovery`.
- Added `cnpg_pg_replication_in_recovery` to the metrics list because the alerting rules now use it to identify replicas.

## Review Notes
- `kubectl` was not available in the local container, so CLI syntax was verified against official Kubernetes documentation rather than local `kubectl --help`.
- The CloudNativePG examples are version-sensitive. The review used current public CloudNativePG documentation available on 2026-06-22, including 1.29 documentation and current/devel pages where the current documentation redirects there.
- The PostgreSQL tuning values are plausible examples, but production values should still be benchmarked for the workload and storage class.
