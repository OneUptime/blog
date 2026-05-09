# Validation Summary: How to Troubleshoot Calico Datastore Export and Import Failures

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Calico Open Source
- calicoctl
- Kubernetes
- etcdv3 datastore
- Kubernetes API datastore

## Sources Consulted
- Calico documentation: calicoctl datastore migrate overview - https://docs.tigera.io/calico/latest/reference/calicoctl/datastore/migrate/overview
- Calico documentation: calicoctl datastore migrate export - https://docs.tigera.io/calico/latest/reference/calicoctl/datastore/migrate/export
- Calico documentation: calicoctl datastore migrate import - https://docs.tigera.io/calico/latest/reference/calicoctl/datastore/migrate/import
- Calico documentation: calicoctl datastore migrate lock - https://docs.tigera.io/calico/latest/reference/calicoctl/datastore/migrate/lock
- Calico documentation: calicoctl datastore migrate unlock - https://docs.tigera.io/calico/latest/reference/calicoctl/datastore/migrate/unlock
- Calico documentation: Migrate Calico data from an etcdv3 datastore to a Kubernetes datastore - https://docs.tigera.io/calico/latest/operations/datastore-migration

## Issues Found
- The post described the export/import workflow as a general backup, restore, and disaster recovery process. Official Calico documentation describes `calicoctl datastore migrate export` and `import` as migration commands for moving data from an etcdv3 datastore to the Kubernetes datastore. Updated the description, introduction, command comments, flow labels, and conclusion to make that migration scope explicit.
- The key commands wrote to a dated filename but verified and imported `calico-backup.yaml`, which would fail unless a separate file with that name existed. Changed the example to store the filename in `export_file` and reuse it consistently.
- The migration command sequence locked the source datastore after export and did not show the documented `calicoctl datastore migrate unlock` step after verification. Moved the lock before export and added the unlock command after the import checks.

## Review Notes
The command flags shown for `calicoctl datastore migrate export`, `import -f`, `lock`, and `unlock` match the official Calico Open Source 3.31 command reference. The troubleshooting guidance remains high level and does not enumerate every possible calicoctl connection or RBAC error.
