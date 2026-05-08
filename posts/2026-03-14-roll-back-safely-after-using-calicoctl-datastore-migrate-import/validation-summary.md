# Validation Summary: Rolling Back Safely After Using calicoctl datastore migrate import

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico
- calicoctl
- Calico datastore migration
- Kubernetes
- kubectl
- etcdv3 datastore
- Kubernetes API datastore

## Sources Consulted
- Calico datastore migration documentation: https://docs.tigera.io/calico/latest/operations/datastore-migration
- Calico calicoctl datastore migrate command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/datastore/migrate/overview
- Calico calicoctl datastore migrate import reference: https://docs.tigera.io/calico/latest/reference/calicoctl/datastore/migrate/import
- Calico calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico calicoctl apply reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico calicoctl etcd datastore configuration: https://docs.tigera.io/calico/latest/operations/calicoctl/configure/etcd
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes kubectl delete reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_delete/

## Issues Found
- The original rollback procedure implied that no further action was needed before finalization and referred to the "lock step" as the finalization point. Calico's official datastore migration guide states that rollback is only possible if the original etcd datastore still exists and the Kubernetes datastore has not been unlocked. Updated the rollback wording and commands to match the documented rollback flow.
- The original partially migrated rollback example restored selected resources from backup instead of removing the imported Calico CRDs from the Kubernetes datastore and switching Calico back to etcd. Updated the commands to lock the Kubernetes datastore, delete imported Project Calico CRDs, reapply the etcd-backed Calico manifest, reconnect calicoctl to etcd, and unlock the original datastore.
- The backup restore example used `BACKUP_DIR="migration-backup-*"`, which would not work as written because the quoted glob is treated literally. Changed it to require an explicit backup directory argument.
- The backup restore loops covered only a small subset of Calico resource types. Expanded the resource list to include additional resource types documented as valid for `calicoctl apply`, while preserving the post's simple loop style.
- The `kubectl run` connectivity test passed `sleep 10` as container arguments without `--command`. Updated it to use `--command -- sleep 10`, matching current kubectl semantics for overriding the container command.
- The cleanup command used `kubectl delete pod rollback-test --grace-period=0` without `--force`. Current kubectl documentation states that `--grace-period=0` can only be used with `--force`; changed the cleanup to `kubectl delete pod rollback-test --ignore-not-found`.
- The conclusion claimed that backups always allow restoration regardless of what went wrong. Calico documentation explicitly says datastore migration cannot be rolled back after the Kubernetes datastore is unlocked, so the conclusion was narrowed to that supported condition.

## Review Notes
The post now matches the current Calico 3.32 datastore migration documentation. The examples still assume the operator has the correct version-specific `calico.yaml` manifest for switching Calico back to the original etcd datastore.
