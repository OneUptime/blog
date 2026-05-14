# Validation Summary: Common Mistakes to Avoid with Calico Datastore Export and Import

## Status
validated

## Post Type
Operational guide

## Technologies Covered
- Calico
- calicoctl
- Calico etcdv3 datastore
- Kubernetes datastore
- Kubernetes networking policy operations

## Sources Consulted
- Calico documentation: Migrate Calico data from an etcdv3 datastore to a Kubernetes datastore - https://docs.tigera.io/calico/latest/operations/datastore-migration
- Calico calicoctl datastore migrate reference - https://docs.tigera.io/calico/latest/reference/calicoctl/datastore/migrate/overview
- Calico calicoctl datastore migrate export reference - https://docs.tigera.io/calico/latest/reference/calicoctl/datastore/migrate/export
- Calico calicoctl datastore migrate import reference - https://docs.tigera.io/calico/latest/reference/calicoctl/datastore/migrate/import
- Calico calicoctl datastore migrate unlock reference - https://docs.tigera.io/calico/latest/reference/calicoctl/datastore/migrate/unlock
- Calico calicoctl get reference - https://docs.tigera.io/calico/latest/reference/calicoctl/get

## Issues Found
- The post described `calicoctl datastore migrate export` and `import` as generic backup and restore operations. Calico documents these commands as part of migration from an etcdv3 datastore to a Kubernetes datastore, so the wording was narrowed throughout the post.
- The example exported to a date-stamped file but verified `calico-backup.yaml`, which would not exist unless manually renamed. The commands now use a single `MIGRATION_FILE` variable consistently.
- The command order locked the source datastore after export. Calico's migration procedure locks the etcd datastore before export to prevent changes during migration, so the command order and flow diagram were corrected.
- The post omitted the `calicoctl datastore migrate unlock` step after successful verification. Calico documents unlock as the step that completes migration and allows Calico resources to take effect again, so the command and checklist now include it.
- The flow diagram used restore-oriented wording. It now describes the documented migration sequence: lock, export, configure calicoctl for the Kubernetes datastore, import, verify, and unlock.

## Review Notes
The `calicoctl get felixconfiguration` and `calicoctl get globalnetworkpolicy` verification commands are valid examples, but production migrations should compare all Calico resource types relevant to the cluster, not only those two resource kinds.
