# Validation Summary: Troubleshooting Errors in calicoctl datastore migrate export

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Calico Open Source
- calicoctl
- Calico datastore migration
- etcdv3
- Kubernetes API datastore
- Kubernetes RBAC

## Sources Consulted
- Calico documentation: calicoctl datastore migrate overview: https://docs.tigera.io/calico/latest/reference/calicoctl/datastore/migrate/overview
- Calico documentation: calicoctl datastore migrate export: https://docs.tigera.io/calico/latest/reference/calicoctl/datastore/migrate/export
- Calico documentation: calicoctl datastore migrate import: https://docs.tigera.io/calico/latest/reference/calicoctl/datastore/migrate/import
- Calico documentation: migrate Calico data from an etcdv3 datastore to a Kubernetes datastore: https://docs.tigera.io/calico/latest/operations/datastore-migration
- Calico documentation: configure calicoctl for etcd: https://docs.tigera.io/calico/latest/operations/calicoctl/configure/etcd
- Calico documentation: configure calicoctl for the Kubernetes API datastore: https://docs.tigera.io/calico/latest/operations/calicoctl/configure/kdd
- Calico documentation: resource definitions: https://docs.tigera.io/calico/latest/reference/resources/overview
- Kubernetes documentation: RBAC authorization: https://kubernetes.io/docs/reference/access-authn-authz/rbac/

## Issues Found
- The post implied that `calicoctl datastore migrate export` could use a Kubernetes source datastore. Calico's documented migration flow exports from an etcdv3 datastore and imports into a Kubernetes datastore, so the Kubernetes check was changed to target access before import.
- The etcd health check appended `/health` directly to `ETCD_ENDPOINTS`, which can be a comma-separated list. The command now selects the first endpoint before calling `/health`.
- The Resource Already Exists example used `calicoctl datastore migrate export --allow-version-mismatch`, but the official export command only supports `--config`; `--allow-version-mismatch` is not a valid option for this command. The example now shows the relevant import command.
- The troubleshooting table recommended `--allow-version-mismatch` for existing target resources. This was replaced with guidance to clear the target or import into an empty Kubernetes datastore.
- The RBAC example only defined a ClusterRole, which does not grant permissions by itself. A ClusterRoleBinding was added, and the Calico API groups were adjusted to cover current `projectcalico.org` resources as well as `crd.projectcalico.org`.

## Review Notes
The diagnostic script is a lightweight connectivity and inventory check rather than a complete migration validator. Future improvements could mention the documented lock/export/import/verify/unlock sequence explicitly, but the existing post remains technically valid after the corrections above.
