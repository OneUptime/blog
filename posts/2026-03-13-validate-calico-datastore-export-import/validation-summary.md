# Validation Summary: How to Validate Calico Datastore Export and Import

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Open Source
- calicoctl
- Calico datastore migration
- Kubernetes datastore
- etcdv3 datastore
- Kubernetes network policy enforcement

## Sources Consulted
- Calico documentation: Migrate Calico data from an etcdv3 datastore to a Kubernetes datastore - https://docs.tigera.io/calico/latest/operations/datastore-migration
- Calico documentation: calicoctl datastore migrate export - https://docs.tigera.io/calico/latest/reference/calicoctl/datastore/migrate/export
- Calico documentation: calicoctl datastore migrate import - https://docs.tigera.io/calico/latest/reference/calicoctl/datastore/migrate/import
- Calico documentation: calicoctl datastore migrate lock - https://docs.tigera.io/calico/latest/reference/calicoctl/datastore/migrate/lock
- Calico documentation: calicoctl datastore migrate unlock - https://docs.tigera.io/calico/latest/reference/calicoctl/datastore/migrate/unlock
- Calico documentation: calicoctl get - https://docs.tigera.io/calico/latest/reference/calicoctl/get

## Issues Found
- The post described `calicoctl datastore migrate export` as a backup or restore workflow. Calico documents this command for migrating from an etcdv3 datastore to a Kubernetes datastore, so the wording was changed to migration-specific language.
- The command examples wrote to a dated filename but verified and imported `calico-backup.yaml`, which would not exist unless the operator manually renamed it. The examples now store the dated migration filename in a shell variable and reuse it consistently.
- The export verification used `grep '^kind:'`, which can miss indented YAML `kind` fields. The grep pattern now allows leading whitespace or a YAML list marker.
- The example exported before locking the source datastore. Calico's migration procedure locks the datastore before export, so the command order was corrected.
- The lock step did not include the required unlock step after verification. Added `calicoctl datastore migrate unlock` after the import checks.
- The operation flow used disaster recovery and restore terminology. Updated it to describe locking, exporting, secure storage of the migration export, configuring `calicoctl` for the Kubernetes datastore, importing, verifying, and unlocking.
- The checklist referred to kubeconfig or etcd credentials before export. The export step reads the source etcdv3 datastore, so this was narrowed to source etcd credentials.
- The conclusion recommended regular automated exports and monthly restore testing as disaster recovery practice. That is not what the documented migration command is for, so it now recommends test migrations in a non-production environment.

## Review Notes
The command set is valid for Calico datastore migration in current Calico documentation. The export command does not export generated resources such as WorkloadEndpoints and Profiles, so future versions of this post could mention that caveat when explaining count comparisons.
