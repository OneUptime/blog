# Validation Summary: Using calicoctl datastore migrate lock with Practical Examples

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico
- calicoctl
- Calico datastore migration
- Kubernetes API datastore
- etcdv3
- kubectl
- Bash

## Sources Consulted
- Calico datastore migration guide: https://docs.tigera.io/calico/latest/operations/datastore-migration
- Calico calicoctl datastore migrate overview: https://docs.tigera.io/calico/latest/reference/calicoctl/datastore/migrate/overview
- Calico calicoctl datastore migrate lock reference: https://docs.tigera.io/calico/latest/reference/calicoctl/datastore/migrate/lock
- Calico calicoctl datastore migrate export reference: https://docs.tigera.io/calico/latest/reference/calicoctl/datastore/migrate/export
- Calico calicoctl datastore migrate import reference: https://docs.tigera.io/calico/latest/reference/calicoctl/datastore/migrate/import
- Calico calicoctl datastore migrate unlock reference: https://docs.tigera.io/calico/latest/reference/calicoctl/datastore/migrate/unlock

## Issues Found
- The post stated that `calicoctl datastore migrate lock` prevents `calicoctl apply`, `create`, `delete`, and `replace` from modifying resources. The official command reference says the lock prevents new Calico resource changes from affecting the cluster but does not prevent updating or creating Calico resources. Updated the description, basic usage explanation, and lock mechanism list to reflect the documented behavior.
- The post used `calicoctl datastore migrate lock --check` to verify the lock. The official `lock` command only documents `--config` and has no `--check` option. Removed the unsupported command and replaced it with a successful-command completion note.
- The post suggested testing the lock by expecting `calicoctl apply` to fail. This contradicts the official lock behavior, so the test was replaced with a note to keep the lock in place while exporting and importing migration data.
- The post said existing Calico runtime components continue to operate without caveat. The official migration guide notes that after locking, cluster configuration cannot be changed and new pods will not be started until migration completes. Updated the runtime bullet to mention existing dataplane state and the new-pod limitation.
- The troubleshooting section described resource conflicts as something addressed by `--allow-version-mismatch`. That option is for Calico/calicoctl version mismatches, not target datastore resource conflicts. Reworded the item as a version mismatch warning.

## Review Notes
The post now matches the current Calico Open Source documentation for the etcdv3-to-Kubernetes datastore migration workflow. The examples remain high-level and should be tested in a maintenance window with a `calicoctl` binary installed directly on a host that can access both etcd and the Kubernetes API, as recommended by the official migration guide.
