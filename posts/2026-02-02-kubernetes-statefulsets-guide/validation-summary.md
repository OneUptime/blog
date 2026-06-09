# Validation Summary: How to Configure Kubernetes StatefulSets

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes StatefulSets (apps/v1)
- Kubernetes Services (headless services, ClusterIP: None)
- Kubernetes PersistentVolumeClaims and volumeClaimTemplates
- Kubernetes RollingUpdate / OnDelete update strategies
- Kubernetes Pod Management Policies (OrderedReady, Parallel)
- Kubernetes VolumeSnapshot CRD (snapshot.storage.k8s.io/v1)
- Kubernetes CronJob (batch/v1)
- PostgreSQL 15 (official `postgres` Docker image)
- Apache Kafka via Confluent `cp-kafka` image
- prometheus-community/postgres-exporter
- kubectl CLI (scale, patch, apply, describe, logs, etc.)
- BusyBox init containers

## Sources Consulted
- Kubernetes StatefulSets concept docs — https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- "Maximum Unavailable Replicas for StatefulSet" (K8s 1.24 blog) — https://kubernetes.io/blog/2022/05/27/maxunavailable-for-statefulset/
- Kubernetes StatefulSet `persistentVolumeClaimRetentionPolicy` (1.23 alpha → 1.27 beta → 1.32 GA)
- Kubernetes issue #40846 — env var substitution not performed in probe `exec.command`
- Kubernetes API reference for `apps/v1` StatefulSet
- VolumeSnapshot v1 GA in Kubernetes 1.20 — https://kubernetes.io/blog/2020/12/10/kubernetes-1.20-volume-snapshot-moves-to-ga/
- CronJob `batch/v1` GA in Kubernetes 1.21
- Confluent Docker image config reference — https://docs.confluent.io/platform/current/installation/docker/config-reference.html
- Official PostgreSQL Docker image docs — https://hub.docker.com/_/postgres (`-c config_file=...` usage)
- PostgreSQL 15 documentation for `wal_keep_size`, `wal_level`, `checkpoint_*` parameters
- pg_isready documentation

## Issues Found

1. **Probe exec commands used `$(POSTGRES_USER)` / `$(POSTGRES_DB)` substitution.**
   Kubernetes performs `$(VAR_NAME)` substitution in container `command`/`args`/`env.value` but **not** inside probe `exec.command` (long-standing limitation, see kubernetes/kubernetes#40846). The original probes would have passed the literal strings `$(POSTGRES_USER)` and `$(POSTGRES_DB)` to `pg_isready`. Fixed by wrapping each probe in `sh -c "pg_isready -U \"$POSTGRES_USER\" -d \"$POSTGRES_DB\""`, which performs shell expansion at probe runtime. Added a one-line comment explaining why the shell wrapper is required.

2. **PostgreSQL ConfigMap was mounted but would not be loaded.**
   The production example mounts the tuning `postgresql.conf` ConfigMap at `/etc/postgresql/postgresql.conf` via `subPath`, but the official `postgres` image only reads `$PGDATA/postgresql.conf` by default. Without an explicit `-c config_file=...` flag, the ConfigMap is effectively dead weight. Fixed by adding `args: ["postgres", "-c", "config_file=/etc/postgresql/postgresql.conf"]` to the postgres container so the entrypoint passes the flag to the postgres process. This is the pattern documented in the official postgres Docker Hub README.

## Review Notes

- `maxUnavailable` for StatefulSet `rollingUpdate` is correctly noted as "Kubernetes 1.24+". It was alpha in 1.24 (behind `MaxUnavailableStatefulSet` feature gate) and is beta in current releases (enabled by default). Acceptable as-is.
- `persistentVolumeClaimRetentionPolicy` is correctly noted as "Kubernetes 1.23+". Alpha in 1.23, beta in 1.27, GA in 1.32. Acceptable as-is.
- The Kafka example uses `$(POD_NAME)` substitution inside `env.value` for `KAFKA_ADVERTISED_LISTENERS` — this *is* supported by Kubernetes (later env vars can reference earlier ones), so it is correct.
- The Kafka `KAFKA_ADVERTISED_LISTENERS` uses an unqualified `kafka-headless` hostname (no namespace/svc.cluster.local). This works for in-namespace clients due to DNS search domains; cross-namespace or external clients would need the FQDN. Not an error in context.
- The `cp-kafka` env var `KAFKA_BROKER_ID_GENERATION_ENABLE` correctly maps to broker config `broker.id.generation.enable` per the Confluent translation rules.
- The bash ordinal extraction `${POD_NAME##*-}` is syntactically correct.
- The headless-service / serviceName pattern, PVC naming (`<template>-<pod>`), DNS pattern (`<pod>.<svc>.<ns>.svc.cluster.local`), ordered scale-up/scale-down semantics, and partition behavior for RollingUpdate are all stated correctly per the upstream docs.
- The post mentions `subPath` mounts for the ConfigMap — note that `subPath` mounts will not pick up live ConfigMap updates without a pod restart. This is intentional Kubernetes behavior, not an error, and is appropriate for a postgres tuning file that requires a restart anyway.
- PostgreSQL 15 tuning parameters (`wal_keep_size`, `wal_level`, `checkpoint_*`, `shared_buffers`, etc.) are all valid for the version shown.
