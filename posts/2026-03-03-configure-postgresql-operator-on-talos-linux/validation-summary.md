# Validation Summary: How to Configure PostgreSQL Operator on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Kubernetes
- PostgreSQL
- CloudNativePG operator
- Helm
- kubectl
- Barman / S3-compatible object storage (WAL archiving and base backups)

## Sources Consulted
- [CloudNativePG official documentation](https://cloudnative-pg.io/docs/devel/)
- [CloudNativePG bootstrap docs](https://cloudnative-pg.io/docs/devel/bootstrap) — secret type and field structure for `bootstrap.initdb`
- [CloudNativePG labels and annotations](https://cloudnative-pg.io/docs/devel/labels_annotations) — pod role and cluster labels
- [CloudNativePG Helm chart repository](https://github.com/cloudnative-pg/charts) — repo URL, install command
- [CNCF project listing for CloudNativePG](https://www.cncf.io/projects/cloudnativepg/) — maturity level
- [CNCF Sandbox projects list](https://www.cncf.io/sandbox-projects/)
- CloudNativePG backup / barmanObjectStore reference for `wal.maxParallel`, `data.compression`, `retentionPolicy` field names

## Issues Found
1. **Incorrect CNCF maturity level claim.** The intro stated CloudNativePG "graduated from the CNCF sandbox." CloudNativePG was accepted into the CNCF at the Sandbox maturity level in January 2025 and is still a Sandbox project (it has applied for Incubation, but has not graduated; "Graduated" is the highest CNCF tier). Updated the sentence to describe it as "a CNCF Sandbox project."
2. **Deprecated pod label.** The post used `-l role=primary` to identify the primary pod. Per CloudNativePG's labels documentation, the `role` label is deprecated and `cnpg.io/instanceRole` should be used instead. Replaced both occurrences (initial check and post-failover check) with `cnpg.io/instanceRole=primary`.
3. **Missing secret type for bootstrap credentials.** The credentials secret was being created as a default generic Opaque secret. CloudNativePG requires the bootstrap `initdb.secret` to comply with the `kubernetes.io/basic-auth` specification; otherwise the operator rejects it. Added `--type=kubernetes.io/basic-auth` to the `kubectl create secret generic` command and updated the comment.

## Review Notes
- The Helm install (`helm repo add cnpg https://cloudnative-pg.github.io/charts` and `helm install cnpg cnpg/cloudnative-pg ...`) matches the official chart repository.
- The Cluster CRD (`postgresql.cnpg.io/v1`) and its fields (`instances`, `imageName`, `postgresql.parameters`, `storage`, `resources`, `monitoring.enablePodMonitor`, `bootstrap.initdb`) are accurate.
- The `backup.barmanObjectStore` schema (`destinationPath`, `endpointURL`, `s3Credentials.{accessKeyId,secretAccessKey}`, `wal.{compression,maxParallel}`, `data.compression`, `retentionPolicy`) matches the official Barman object store reference.
- `ScheduledBackup` fields (`schedule`, `backupOwnerReference: self`, `cluster.name`, `immediate`) are correct.
- The three services (`-rw`, `-ro`, `-r`) and their semantics are accurate.
- The `ghcr.io/cloudnative-pg/postgresql:16.2` image tag exists, though by mid-2026 newer patch releases (and PostgreSQL 17 images) are available; consider bumping in future revisions.
- Compression option `gzip` is valid; `zstd` is generally recommended for better ratio/speed and could be considered as a future improvement.
