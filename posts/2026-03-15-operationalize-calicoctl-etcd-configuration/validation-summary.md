# Validation Summary: How to Operationalize Calicoctl etcd Configuration

## Status
validated

## Post Type
Technical operations guide

## Technologies Covered
- Calico
- calicoctl
- etcd
- etcdctl
- etcdutl
- Bash
- cron
- OpenSSL certificates

## Sources Consulted
- Calico documentation: Configure calicoctl to connect to an etcd datastore - https://docs.tigera.io/calico/latest/operations/calicoctl/configure/etcd
- Calico documentation: calicoctl get - https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico documentation: calicoctl apply - https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico documentation: Resource definitions - https://docs.tigera.io/calico/latest/reference/resources/overview
- etcd documentation: How to save the database - https://etcd.io/docs/v3.6/tasks/operator/how-to-save-database/
- etcd documentation: Disaster recovery - https://etcd.io/docs/v3.6/op-guide/recovery/
- etcd documentation: Maintenance - https://etcd.io/docs/v3.6/op-guide/maintenance/

## Issues Found
- The prerequisites only listed `etcdctl`, but current etcd documentation uses `etcdutl` for snapshot status and restore operations. Updated the prerequisite to include both `etcdctl` and `etcdutl`.
- The backup script used `ETCD_ENDPOINTS` directly for `etcdctl snapshot save`. etcd documentation states that snapshot save should use only one endpoint, so the script now derives a single `SNAPSHOT_ENDPOINT` from `ETCD_SNAPSHOT_ENDPOINT` or the first value in `ETCD_ENDPOINTS`.
- The backup and verification examples used `etcdctl snapshot status`, but current etcd documentation uses `etcdutl snapshot status`. Updated both examples.
- The restore example used `etcdctl snapshot restore`, but current etcd documentation uses `etcdutl snapshot restore`. Updated the command.
- The restore example omitted an initial cluster token. Added `--initial-cluster-token` to match etcd disaster recovery guidance for constructing a new logical cluster.
- The post referenced `/var/backups/calico/etcd-snapshot-latest.db`, but the backup script only created timestamped snapshots. Added a `etcd-snapshot-latest.db` symlink after each successful snapshot.
- The cron installation example overwrote the user's existing crontab. Updated it to preserve existing entries before adding the backup job.

## Review Notes
The Calico resource export and restore examples align with the documented `calicoctl get -o yaml` and `calicoctl apply -f` behavior. The maintenance commands align with etcd manual compaction and defragmentation examples. Operators should still validate restore procedures in a non-production environment and confirm their `calicoctl` configuration includes `DATASTORE_TYPE=etcdv3` when using environment variables.
