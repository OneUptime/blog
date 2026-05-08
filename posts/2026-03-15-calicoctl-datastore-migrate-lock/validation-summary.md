# Validation Summary: How to Use calicoctl datastore migrate lock with Practical Examples

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source
- calicoctl
- Calico datastore migration
- Kubernetes API datastore
- etcdv3 datastore
- Calico IPAM
- Kubernetes kubectl

## Sources Consulted
- Calico documentation: calicoctl datastore migrate lock - https://docs.tigera.io/calico/latest/reference/calicoctl/datastore/migrate/lock
- Calico documentation: calicoctl datastore migrate unlock - https://docs.tigera.io/calico/latest/reference/calicoctl/datastore/migrate/unlock
- Calico documentation: Migrate Calico data from an etcdv3 datastore to a Kubernetes datastore - https://docs.tigera.io/calico/latest/operations/datastore-migration
- Calico documentation: calicoctl datastore migrate overview - https://docs.tigera.io/calico/latest/reference/calicoctl/datastore/migrate/overview
- Calico documentation: calicoctl get - https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico documentation: calicoctl delete - https://docs.tigera.io/calico/latest/reference/calicoctl/delete
- Calico documentation: calicoctl ipam check - https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check
- Project Calico source: calicoctl datastore migrate lock implementation - https://raw.githubusercontent.com/projectcalico/calico/master/calicoctl/calicoctl/commands/datastore/migrate/lock.go
- Project Calico source: calicoctl datastore migrate unlock implementation - https://raw.githubusercontent.com/projectcalico/calico/master/calicoctl/calicoctl/commands/datastore/migrate/unlock.go
- Project Calico source: calicoctl datastore migrate export implementation - https://raw.githubusercontent.com/projectcalico/calico/master/calicoctl/calicoctl/commands/datastore/migrate/export.go
- Project Calico source: calicoctl datastore migrate import implementation - https://raw.githubusercontent.com/projectcalico/calico/master/calicoctl/calicoctl/commands/datastore/migrate/import.go

## Issues Found
- The post incorrectly described `calicoctl datastore migrate lock` as putting the datastore into read-only mode and blocking `apply`, `create`, `replace`, and `delete`. Updated the text to match Calico documentation: the lock prevents new or updated Calico resources from affecting the cluster but does not prevent creating or updating those resources in the datastore.
- The example success output for lock and unlock was inaccurate. Updated it to the output shown by the implementation: `Datastore locked.` and `Datastore unlocked.`
- The monitoring section attempted to detect lock status by rerunning `calicoctl datastore migrate lock` and by expecting writes to fail. Replaced this with checking the `ClusterInformation` resource and its `spec.datastoreReady` field.
- The emergency recovery section claimed the lock was stored at `/calico/migration/lock` in etcd or as a `calico-migration-lock` ConfigMap in Kubernetes. Removed those inaccurate datastore-specific examples and replaced them with verification of the `ClusterInformation` resource.
- Several command examples used undocumented shorthand or flags, including `gnp`, `np`, and `--no-headers`. Replaced them with documented resource names and shell counting using `tail -n +2`.
- Troubleshooting text said the lock prevents new policy creation. Updated it to say policy changes do not affect the cluster while the datastore is locked.

## Review Notes
The migration workflow is intentionally high level and assumes an etcdv3-to-Kubernetes datastore migration. The Calico migration documentation notes that `calicoctl datastore migrate export` exports from etcdv3 and `import` imports to the Kubernetes datastore, so future revisions could make that scope explicit in the prerequisites.
