# Validation Summary: Operationalizing Calicoctl etcd Configuration

## Status
validated

## Post Type
Technical operations guide

## Technologies Covered
- Calico Open Source
- calicoctl
- etcd and etcdctl
- etcdutl snapshot restore
- Bash scripting
- OpenSSL certificate inspection
- cron scheduling

## Sources Consulted
- Calico documentation: Configure calicoctl to connect to an etcd datastore - https://docs.tigera.io/calico/latest/operations/calicoctl/configure/etcd
- Calico documentation: calicoctl get reference - https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico documentation: calicoctl apply reference - https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico documentation: Resource definitions - https://docs.tigera.io/calico/latest/reference/resources/overview
- etcd documentation: Disaster recovery - https://etcd.io/docs/v3.7/op-guide/recovery/
- etcd documentation: Check cluster status - https://etcd.io/docs/v3.6/tasks/operator/how-to-check-cluster-status/
- etcd documentation: Maintenance - https://etcd.io/docs/v3.4/op-guide/maintenance/

## Issues Found
- The backup and restore scripts exported `DATASTORE_TYPE=etcdv3` for `calicoctl` but did not export the etcd endpoint and TLS file environment variables. Added `ETCD_ENDPOINTS`, `ETCD_CERT_FILE`, `ETCD_KEY_FILE`, and `ETCD_CA_CERT_FILE` so the examples work when using the certificate paths shown in the post.
- The etcd snapshot command used the full `ETCD_ENDPOINTS` list. etcd documentation states that `snapshot save` should request a snapshot from a single endpoint, so the script now derives `ETCD_SNAPSHOT_ENDPOINT` from the first endpoint.
- The restore instructions used `etcdctl snapshot restore`. Current etcd recovery documentation uses `etcdutl snapshot restore`, so the restore message and prerequisites were updated.
- The troubleshooting section said to use `calicoctl replace` instead of `calicoctl apply` for existing resources. Official calicoctl documentation says `apply` creates missing resources and replaces existing resources, so the note now says this error usually indicates `create` was used.

## Review Notes
The etcd maintenance commands are consistent with official etcd guidance for endpoint status, health checks, compaction, and cluster defragmentation. The human-readable Calico export is useful for operational review, but the etcd snapshot remains the authoritative full datastore backup.
