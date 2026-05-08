# Validation Summary: Troubleshooting Errors in calicoctl datastore migrate import

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Calico
- calicoctl
- Calico datastore migration
- Kubernetes API datastore
- etcdv3 datastore
- Kubernetes RBAC

## Sources Consulted
- Calico documentation: Migrate Calico data from an etcdv3 datastore to a Kubernetes datastore - https://docs.tigera.io/calico/latest/operations/datastore-migration
- Calico documentation: calicoctl datastore migrate import - https://docs.tigera.io/calico/latest/reference/calicoctl/datastore/migrate/import
- Calico documentation: Configure calicoctl to connect to an etcd datastore - https://docs.tigera.io/calico/latest/operations/calicoctl/configure/etcd
- Calico documentation: Configure calicoctl to connect to the Kubernetes API datastore - https://docs.tigera.io/calico/latest/operations/calicoctl/configure/kdd
- Calico documentation: calicoctl get - https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico documentation: calicoctl user reference - https://docs.tigera.io/calico/latest/reference/calicoctl/overview

## Issues Found
- The post showed `calicoctl datastore migrate import` without the required `-f/--filename` option. Updated import examples to use `calicoctl datastore migrate import -f etcd-data`, matching the official command reference and datastore migration guide.
- The post suggested `--allow-version-mismatch` for `calicoctl datastore migrate import`, but that option is not present in the official command reference. Removed the flag and changed the guidance to retry after resolving conflicting target resources.
- The connection-refused example described a "Kubernetes source" for datastore migration import. Calico datastore migration is from etcdv3 to the Kubernetes datastore, and import targets Kubernetes from an exported file. Updated the section to check the target Kubernetes datastore first and kept the etcd check only for cases where re-exporting is needed.
- The etcd health check used `$ETCD_ENDPOINTS/health`, which can fail when `ETCD_ENDPOINTS` contains multiple comma-separated endpoints. Updated it to use the first endpoint with `"${ETCD_ENDPOINTS%%,*}/health"`.
- The format mismatch example checked `calico-export.yaml`, while the corrected import examples use `etcd-data`. Updated the filename for consistency.

## Review Notes
The RBAC example is intentionally broad for troubleshooting. In a production migration, operators should bind it only to the service account or user performing the migration and remove it after the maintenance task if it is no longer needed.
