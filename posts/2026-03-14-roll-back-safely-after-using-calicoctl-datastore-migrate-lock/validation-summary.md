# Validation Summary: Rolling Back Safely After Using calicoctl datastore migrate lock

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico
- calicoctl
- Calico datastore migration
- Kubernetes
- kubectl
- Bash

## Sources Consulted
- Calico documentation: Migrate Calico data from an etcdv3 datastore to a Kubernetes datastore - https://docs.tigera.io/calico/latest/operations/datastore-migration
- Calico documentation: calicoctl datastore migrate lock - https://docs.tigera.io/calico/latest/reference/calicoctl/datastore/migrate/lock
- Calico documentation: calicoctl datastore migrate unlock - https://docs.tigera.io/calico/latest/reference/calicoctl/datastore/migrate/unlock
- Calico documentation: calicoctl apply - https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico documentation: calicoctl get - https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico documentation: Configure calicoctl to connect to the Kubernetes API datastore - https://docs.tigera.io/calico/latest/operations/calicoctl/configure/kdd
- Kubernetes documentation: kubectl run - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes documentation: kubectl delete - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_delete/

## Issues Found
- The rollback procedure incorrectly implied that reconnecting to the original datastore was sufficient before finalization. Calico's documented rollback path requires locking the Kubernetes datastore, deleting imported Calico CRDs, reconfiguring Calico to read from the original etcd datastore, configuring calicoctl for etcd, and unlocking the etcd datastore. Updated the rollback commands to match the official sequence.
- The partial migration section restored a limited set of resource backups using a quoted wildcard directory pattern that would not expand in Bash. Replaced it with the documented rollback flow for partially imported Kubernetes datastore resources that have not been unlocked.
- The emergency restore script only restored selected resource types. Replaced the loop with `calicoctl apply -f "$BACKUP_DIR"`, which is supported for directories containing YAML or JSON manifests.
- The verification cleanup command used `kubectl delete pod rollback-test --grace-period=0`. Current kubectl documentation says `--grace-period=0` can only be used with `--force`; changed it to `kubectl delete pod rollback-test --now`.
- The conclusion overstated rollback guarantees after migration. Updated it to note that the documented datastore rollback path is only available before the Kubernetes datastore has been unlocked.

## Review Notes
The post now follows Calico's official etcdv3-to-Kubernetes datastore rollback guidance. The `calico-etcd.yaml` filename remains a placeholder for the user's version-appropriate etcd-backed Calico manifest, which is consistent with the official documentation's instruction to apply the relevant Calico manifest for the original datastore.
