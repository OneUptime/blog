# Validation Summary: How to Restore etcd Snapshots in Rancher

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Rancher Manager
- Rancher Kubernetes Engine (RKE1)
- RKE2
- Kubernetes
- etcd
- S3-compatible object storage

## Sources Consulted
- Rancher documentation: Backing up a Cluster https://ranchermanager.docs.rancher.com/v2.14/how-to-guides/new-user-guides/backup-restore-and-disaster-recovery/back-up-rancher-launched-kubernetes-clusters
- Rancher documentation: Restoring a Cluster from Backup https://ranchermanager.docs.rancher.com/v2.14/how-to-guides/new-user-guides/backup-restore-and-disaster-recovery/restore-rancher-launched-kubernetes-clusters-from-backup
- RKE2 documentation: Backup and Restore https://documentation.suse.com/cloudnative/rke2/latest/en/datastore/backup_restore.html
- RKE2 documentation: Server Configuration Reference https://documentation.suse.com/cloudnative/rke2/latest/en/reference/server_config.html
- RKE1 documentation: Restoring from Backup https://rke.docs.rancher.com/etcd-snapshots/restoring-from-backup
- Rancher documentation: Using API Tokens https://ranchermanager.docs.rancher.com/api/api-tokens
- Kubernetes documentation: Kubernetes API health endpoints https://kubernetes.io/docs/reference/using-api/health-checks/
- etcd documentation: How to save the database https://etcd.io/docs/v3.6/tasks/operator/how-to-save-database/

## Issues Found
- The RKE2 `kubectl` example was incorrect. It referenced `etcdsnapshots.rke.cattle.io` in `fleet-default`, but current RKE2 documentation exposes cluster-scoped `ETCDSnapshotFile` resources. I changed the command to `kubectl get etcdsnapshotfile`.
- The Rancher UI restore steps were incomplete. Current Rancher documentation requires selecting a restore type and then waiting for the cluster to return to `Active`. I updated those steps accordingly.
- The RKE2 local restore procedure was missing an important current-docs caveat: if `etcd-s3` is already configured and you are restoring a local snapshot, you must add `--etcd-s3=false`. I added that note to both the single-node and multi-node restore flows.
- The multi-node RKE2 restore flow deleted only `/var/lib/rancher/rke2/server/db/etcd`, but current RKE2 documentation instructs operators to remove `/var/lib/rancher/rke2/server/db/` on peer servers before they rejoin. I corrected the command.
- The RKE restore section used a Rancher v3 API example instead of the documented RKE restore workflow. I replaced it with the official `rke etcd snapshot-restore` CLI procedure, including the S3 variant.
- The verification step used `kubectl get cs`, which is legacy Kubernetes health-check guidance, and an etcdctl pod-exec example with distribution-specific paths that did not match current Rancher/RKE2 documentation. I replaced that with `kubectl get --raw='/readyz?verbose'`, which current Kubernetes documentation recommends for API server readiness checks and which includes etcd status.
- The snapshot integrity check used `etcdctl snapshot status`, but current etcd documentation uses `etcdutl snapshot status`. I updated the command to `etcdutl snapshot status SNAPSHOT_FILE -w table`.
- The troubleshooting advice told readers to restart `kubelet` for RKE via `systemctl`, which is not reliable guidance for RKE1. I removed that incorrect RKE-specific command and kept the verified RKE2 worker restart command.

## Review Notes
- RKE1 is legacy at this point. The current RKE documentation states that RKE/RKE1 reached end of life on July 31, 2025, and Rancher 2.12.0+ no longer supports provisioning or managing downstream RKE1 clusters. The RKE restore examples remain useful only for existing legacy clusters.
- `ETCDSnapshotFile` resources are documented on current RKE2 releases. Older RKE2 releases may not expose that resource, so the UI and on-node snapshot paths remain the most version-tolerant discovery methods.
- RKE2 restore from S3 requires passing S3 settings on the CLI during restore; the S3 configuration Secret mechanism is not available while the API server is down.
