# Validation Summary: How to Deploy Stateful Applications with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD Kustomization and notifications
- Kubernetes StatefulSet, Service, ConfigMap, Secret, PersistentVolumeClaim, and CronJob resources
- PostgreSQL container deployment
- Redis replication
- SOPS secret decryption
- GitOps workflows

## Sources Consulted
- Kubernetes StatefulSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Alert documentation: https://fluxcd.io/flux/components/notification/alerts/
- Docker PostgreSQL advanced configuration documentation: https://docs.docker.com/guides/postgresql/advanced-configuration-and-initialization/
- Docker PostgreSQL data persistence documentation: https://docs.docker.com/guides/postgresql/immediate-setup-and-data-persistence/
- Redis replication documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/replication/
- Redis Sentinel documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/sentinel/

## Issues Found
- The PostgreSQL StatefulSet used `replicas: 3` without configuring PostgreSQL replication or failover. I changed the example to `replicas: 1` so it no longer implies that plain PostgreSQL containers automatically form a replicated database cluster.
- The PostgreSQL example mounted a custom `postgresql.conf` file but did not tell the official PostgreSQL image to use it. I added `args` with `-c config_file=/etc/postgresql/postgresql.conf`, matching the documented container configuration pattern.
- The PostgreSQL container used `envFrom` with a ConfigMap that also contained `postgresql.conf`; that key is not a valid environment variable name. I replaced `envFrom` with explicit `configMapKeyRef` entries for `POSTGRES_DB`, `POSTGRES_USER`, and `PGDATA`.
- The PostgreSQL primary Service selected `role: primary`, but no pod in the example had that label and Kubernetes would not automatically maintain it. I removed that Service from the example.
- The Flux Kustomization set `wait: true` while also listing `healthChecks`; Flux documentation states that `.spec.healthChecks` is ignored when `.spec.wait` is true. I removed `wait: true` so the explicit StatefulSet health check is meaningful.
- The Redis section was titled "Deploying Redis with Sentinel" but did not deploy Redis Sentinel. I changed the heading to "Deploying Redis with Replication" and added a ConfigMap showing the Redis primary and replica configuration used by the StatefulSet.
- The Redis comments said pod ordinal 0 is always the primary, which is not accurate for Sentinel-managed failover and was too strong even as operational guidance. I changed the wording to say ordinal 0 starts as the primary in this basic replication example.
- The Flux Alert example used deprecated `.spec.summary`. I replaced it with `.spec.eventMetadata.summary`, as recommended by the Flux notification documentation.
- The partitioned rolling update example referenced PostgreSQL ordinal 2 after the PostgreSQL example was corrected to one replica. I changed that staged rollout example to Redis, which has three replicas in the post.

## Review Notes
The examples are now technically coherent as illustrative manifests. For a production PostgreSQL or Redis deployment, an operator or a fully specified replication and failover design would still be preferable to hand-managed StatefulSets.
