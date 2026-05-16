# Validation Summary: How to Deploy PostgreSQL on Talos Linux

## Status
validated

## Post Type
Tutorial / Step-by-step guide

## Technologies Covered
- Talos Linux (immutable Kubernetes OS)
- `talosctl` CLI
- PostgreSQL 16 (official `postgres:16-alpine` image)
- Kubernetes (Namespace, Secret, PVC, StatefulSet, Service, ConfigMap, CronJob, Deployment)
- local-path-provisioner (Rancher) as the example CSI/storage driver
- CloudNativePG operator (for HA section)
- Prometheus PostgreSQL exporter (`prometheuscommunity/postgres-exporter`)
- `pg_dump` / `pg_isready` libpq utilities

## Sources Consulted
- Talos disk management docs — https://www.talos.dev/v1.10/talos-guides/configuration/disk-management/
- Talos configuration patching docs — https://www.talos.dev/v1.10/talos-guides/configuration/patching/
- Talos issue #8016 (allowed user mountpoints under `/var/mnt`) — https://github.com/siderolabs/talos/issues/8016
- CloudNativePG releases page — https://cloudnative-pg.io/releases/
- CloudNativePG GitHub releases (verified v1.29.1 published 2026-05-08) — https://github.com/cloudnative-pg/cloudnative-pg/releases
- CloudNativePG Cluster API reference — https://cloudnative-pg.io/documentation/current/cloudnative-pg.v1/
- PostgreSQL libpq environment variables (PGPASSWORD) — https://www.postgresql.org/docs/current/libpq-envars.html
- Official Postgres Docker image env conventions — https://hub.docker.com/_/postgres
- local-path-provisioner README / config schema — https://github.com/rancher/local-path-provisioner

## Issues Found

1. **Invalid Talos mountpoint path.** The original config mounted the extra disk at `/var/local-path-provisioner`. Talos restricts user-defined disk mountpoints to paths under `/var/mnt/`; anything else is rejected by the machine config validator. Changed the mountpoint in both the `talos-machine-patch.yaml` snippet and the `local-path-config` ConfigMap's `nodePathMap` to `/var/mnt/local-path-provisioner`.

2. **Wrong `talosctl` subcommand for a partial patch.** The post used `talosctl apply-config --file talos-machine-patch.yaml`, but `apply-config` expects a complete machine config — feeding it a partial document overwrites or rejects the running config. Replaced with `talosctl patch mc --nodes 10.0.0.2 --patch @talos-machine-patch.yaml`, which is the documented way to apply a partial patch to a running node.

3. **Backup CronJob would fail authentication.** `pg_dump` (libpq) reads `PGPASSWORD`, not `POSTGRES_PASSWORD`. The secret created in Step 2 uses `POSTGRES_PASSWORD` (the Postgres Docker entrypoint convention), so `envFrom` made the password invisible to `pg_dump` and the job would prompt and fail non-interactively. Replaced the `envFrom:` block in the backup container with an explicit `env:` entry that maps `PGPASSWORD` from `secretKeyRef.key: POSTGRES_PASSWORD`.

4. **CloudNativePG version out of date.** The post installed v1.22.0 (June 2024, end-of-life). Bumped to v1.29.1 (published 2026-05-08), which is the current latest stable release and includes the CVE-2026-44477 fix. URL and release-branch pattern were verified to resolve (HTTP 200).

## Review Notes
- **Redundant PVC in Step 3.** The standalone `postgres-data` PVC created in Step 3 is never consumed — the StatefulSet in Step 4 uses `volumeClaimTemplates`, which auto-creates `postgres-data-postgresql-0`. The orphan PVC will just sit idle. Not strictly an error (no failure), so left as-is to avoid restructuring, but consider removing Step 3 in a future revision.
- **`pg_isready -U appuser` without a `-d` flag** falls back to connecting to a database named after the user; with the secret here that database (`appuser`) does not exist, but `pg_isready` only checks server reachability and returns 0 even on FATAL auth/db errors, so the probes still work as intended. Worth noting but not a bug.
- **`image: prometheuscommunity/postgres-exporter:latest`** — pinning to a specific tag would be better practice for reproducibility, but the image and port 9187 are correct.
- **`enablePodMonitor: true` in the CNPG Cluster spec** requires the Prometheus Operator's `PodMonitor` CRD to be installed in the cluster, otherwise CNPG will surface a warning condition. Worth a one-line callout in a future revision.
- **CNPG `storageClass: local-path`** with `instances: 3` mixes a single-node ReadWriteOnce storage backend with a multi-instance HA cluster. It works (each replica gets its own PVC bound to its node), but Pod rescheduling is constrained — for production HA, a network-attached storage class (Rook-Ceph, Longhorn) is preferable.
- Talos `device: /dev/sdb` is still valid but considered fragile; modern Talos guidance recommends `diskSelector` matching on serial/model/UUID to avoid device-name reordering. Not changed since it is still a supported form.
