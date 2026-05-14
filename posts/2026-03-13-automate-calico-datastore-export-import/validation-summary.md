# Validation Summary: How to Automate Calico Datastore Export and Import

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico
- calicoctl
- Kubernetes
- etcdv3 datastore
- Kubernetes datastore
- S3/GCS backup storage

## Sources Consulted
- Calico Open Source documentation: calicoctl datastore migrate overview: https://docs.tigera.io/calico/latest/reference/calicoctl/datastore/migrate/overview
- Calico Open Source documentation: calicoctl datastore migrate export: https://docs.tigera.io/calico/latest/reference/calicoctl/datastore/migrate/export
- Calico Open Source documentation: calicoctl datastore migrate import: https://docs.tigera.io/calico/latest/reference/calicoctl/datastore/migrate/import
- Calico Open Source documentation: calicoctl datastore migrate lock: https://docs.tigera.io/calico/latest/reference/calicoctl/datastore/migrate/lock
- Calico Open Source documentation: Migrate Calico data from an etcdv3 datastore to a Kubernetes datastore: https://docs.tigera.io/calico/latest/operations/datastore-migration
- Calico Open Source documentation: calicoctl get: https://docs.tigera.io/calico/latest/reference/calicoctl/get

## Issues Found
- The post described `calicoctl datastore migrate export` and `import` as a generic backup/restore workflow. Calico's official documentation scopes these commands to migration from an etcdv3 datastore to a Kubernetes datastore, so the post was updated to describe migration exports and import testing rather than generic disaster recovery.
- The key command example wrote to `calico-backup-$(date +%Y%m%d).yaml` but verified and imported `calico-backup.yaml`. The example now assigns the generated name to `BACKUP_FILE` and uses it consistently.
- The migration flow mentioned locking the datastore but omitted the corresponding unlock step. The key commands and flow now include `calicoctl datastore migrate unlock` after verification.

## Review Notes
The `calicoctl get felixconfiguration` and `calicoctl get globalnetworkpolicy` verification commands use valid Calico resource types. Future improvements could show the required `calicoctl` datastore configuration for the source etcdv3 datastore and destination Kubernetes datastore, but the current post remains technically correct at its stated level of detail.
