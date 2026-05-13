# Validation Summary: How to Monitor Calico Datastore Export and Import Operations

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico
- calicoctl
- Kubernetes
- etcdv3 datastore
- Kubernetes API datastore

## Sources Consulted
- Calico documentation: Migrate Calico data from an etcdv3 datastore to a Kubernetes datastore, https://docs.tigera.io/calico/latest/operations/datastore-migration
- Calico documentation: calicoctl datastore migrate overview, https://docs.tigera.io/calico/latest/reference/calicoctl/datastore/migrate/overview
- Calico documentation: calicoctl datastore migrate export, https://docs.tigera.io/calico/latest/reference/calicoctl/datastore/migrate/export
- Calico documentation: calicoctl datastore migrate import, https://docs.tigera.io/calico/latest/reference/calicoctl/datastore/migrate/import
- Calico documentation: calicoctl datastore migrate lock, https://docs.tigera.io/calico/latest/reference/calicoctl/datastore/migrate/lock
- Calico documentation: calicoctl datastore migrate unlock, https://docs.tigera.io/calico/latest/reference/calicoctl/datastore/migrate/unlock
- Calico documentation: calicoctl get, https://docs.tigera.io/calico/latest/reference/calicoctl/get

## Issues Found
- The post described `calicoctl datastore migrate export` as a general backup/restore workflow. Official Calico documentation describes this workflow as migrating from an etcdv3 datastore to the Kubernetes datastore, so the wording was changed to migration export/import language.
- The export example wrote to a dated filename but verification commands read `calico-backup.yaml`. Updated the example to use a single `export_file` variable consistently.
- The command sequence showed `calicoctl datastore migrate lock` after export. Official migration documentation locks the datastore before export, so the command sequence and flow diagram were updated.
- The workflow did not include `calicoctl datastore migrate unlock`. Added the unlock step after import verification and Calico rollout to avoid leaving the datastore locked after migration.
- The statement that a smaller export file means a partial export that would fail restore was too absolute. Changed it to say a smaller export can indicate missing resources or a partial export problem that should be investigated before import.

## Review Notes
- The monitoring recommendations around failed jobs, export size trends, and export recency are operationally reasonable, but the post remains high level and does not include concrete CronJob or alerting configuration.
