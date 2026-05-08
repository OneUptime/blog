# Validation Summary: Troubleshooting Errors in calicoctl datastore migrate lock

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Calico
- calicoctl
- Calico datastore migration
- etcd
- Kubernetes API datastore
- Kubernetes RBAC

## Sources Consulted
- Calico documentation: calicoctl datastore migrate overview - https://docs.tigera.io/calico/latest/reference/calicoctl/datastore/migrate/overview
- Calico documentation: calicoctl datastore migrate lock - https://docs.tigera.io/calico/latest/reference/calicoctl/datastore/migrate/lock
- Calico documentation: calicoctl datastore migrate import - https://docs.tigera.io/calico/latest/reference/calicoctl/datastore/migrate/import
- Calico documentation: Migrate Calico data from an etcdv3 datastore to a Kubernetes datastore - https://docs.tigera.io/calico/latest/operations/datastore-migration
- Calico documentation: calicoctl user reference - https://docs.tigera.io/calico/latest/reference/calicoctl/overview
- Calico documentation: Configure calicoctl to connect to an etcd datastore - https://docs.tigera.io/calico/latest/operations/calicoctl/configure/etcd
- Calico documentation: Configure calicoctl to connect to the Kubernetes API datastore - https://docs.tigera.io/calico/latest/operations/calicoctl/configure/kdd

## Issues Found
- The "Resource Already Exists" section incorrectly suggested `calicoctl datastore migrate lock --allow-version-mismatch`. The `lock` subcommand only accepts `--config`, and `--allow-version-mismatch` addresses calicoctl client/cluster version mismatches, not duplicate resources. Changed the example to retry `calicoctl datastore migrate import -f etcd-data` only after resolving duplicates.
- The troubleshooting table incorrectly listed `--allow-version-mismatch` as a fix for resources already existing in the target datastore. Changed the fix to resolving duplicate resources or clearing an empty/new target.
- The "Data Format Mismatch" section did not show the correct placement or purpose of `--allow-version-mismatch`. Added the top-level form, `calicoctl --allow-version-mismatch datastore migrate import -f etcd-data`, and clarified that it is only for an acceptable client/cluster version mismatch.
- The connectivity example referred to a "Kubernetes source," but Calico's datastore migration flow is from etcdv3 to the Kubernetes datastore. Changed the wording to "Kubernetes datastore."

## Review Notes
The RBAC snippet is a minimal example and may need a ClusterRoleBinding and additional permissions depending on how `calicoctl` is authenticated and which migration step is being run. The post remains a troubleshooting overview rather than a complete migration procedure.
