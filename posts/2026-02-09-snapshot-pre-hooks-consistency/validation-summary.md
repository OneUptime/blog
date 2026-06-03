# Validation Summary: How to Implement Volume Snapshot Pre-Hooks for Application Consistency

## Status
validated

## Post Type
Tutorial / Implementation Guide

## Technologies Covered
- Kubernetes Jobs, Deployments, Services, and ConfigMaps
- Kubernetes CSI VolumeSnapshot API
- Kubernetes CustomResourceDefinitions
- PostgreSQL 15 backup and checkpoint behavior
- Shell scripting with `kubectl`, `curl`, and `psql`
- Python Flask HTTP hook endpoint

## Sources Consulted
- PostgreSQL 15 CHECKPOINT documentation: https://www.postgresql.org/docs/15/sql-checkpoint.html
- PostgreSQL 15 continuous archiving and low-level backup API documentation: https://www.postgresql.org/docs/15/continuous-archiving.html#BACKUP-LOWLEVEL-BASE-BACKUP
- PostgreSQL filesystem-level backup documentation: https://www.postgresql.org/docs/15/backup-file.html
- PostgreSQL 15 system administration functions: https://www.postgresql.org/docs/15/functions-admin.html
- Kubernetes Volume Snapshots documentation: https://kubernetes.io/docs/concepts/storage/volume-snapshots/
- Kubernetes CustomResourceDefinition v1 API reference: https://kubernetes.io/docs/reference/kubernetes-api/extend-resources/custom-resource-definition-v1/

## Issues Found
- The PostgreSQL examples used `pg_start_backup()` and `pg_stop_backup()` with the `postgres:15` image. Those function names are not available in PostgreSQL 15; PostgreSQL 15 uses `pg_backup_start()` and `pg_backup_stop()` for the low-level backup API. More importantly, that low-level API requires the same database connection to remain open from start to stop and requires backup label/tablespace map handling, which the Kubernetes snippets did not do. Replaced the examples with `CHECKPOINT`-based pre-hooks, which match PostgreSQL's documented filesystem snapshot guidance when PGDATA and WAL are included in the same atomic snapshot.
- The first Job's post-hook attempted to install `postgresql-client` in a `bitnami/kubectl` container and read a secret path that was not mounted. Removed the invalid PostgreSQL post-hook and left the post-hook as a completion point for application-specific cleanup.
- The sidecar, HTTP hook, custom resource, and timeout examples used the same invalid PostgreSQL backup-mode calls. Replaced the pre-hook commands with `CHECKPOINT` and adjusted post-hook examples away from `pg_stop_backup()`.
- The post did not mention that Kubernetes VolumeSnapshot resources require the VolumeSnapshot CRDs, snapshot controller, and CSI snapshotter. Added that prerequisite.
- The CRD schema defined `preHook.timeoutSeconds` but the sample custom resource also used `postHook.timeoutSeconds`. Added `postHook.timeoutSeconds` to the schema so the sample matches the CRD.
- The introduction overstated that hooks prevent corruption and ensure clean restores. Reworded it to describe hooks as reducing restore risk and helping applications reach a recoverable state.

## Review Notes
- The YAML snippets parse successfully after the edits.
- PostgreSQL `CHECKPOINT` requires a superuser or a role with `pg_checkpoint` privileges; this is now noted in the post.
- The examples are still illustrative. Production use should include complete RBAC for the snapshot Jobs and application-specific quiesce/unquiesce logic where writes must actually be paused.
