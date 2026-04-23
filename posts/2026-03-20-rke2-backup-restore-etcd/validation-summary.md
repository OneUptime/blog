# Validation Summary: How to Back Up and Restore RKE2 etcd

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- RKE2
- Embedded etcd
- RKE2 etcd snapshots
- S3-compatible object storage
- Kubernetes
- kubectl
- etcdctl
- systemd

## Sources Consulted
- RKE2 Backup and Restore documentation: https://docs.rke2.io/datastore/backup_restore
- RKE2 Server Configuration Reference: https://docs.rke2.io/reference/server_config
- RKE2 Token Management documentation: https://docs.rke2.io/security/token
- RKE2 CLI Tools documentation: https://docs.rke2.io/reference/cli_tools
- etcd cluster status documentation: https://etcd.io/docs/v3.5/tutorials/how-to-check-cluster-status/
- Kubernetes kubectl command reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands

## Issues Found
- The opening sentence implied RKE2 snapshots apply generally to all datastore modes. Updated it to specify clusters using embedded etcd, matching RKE2's documented scope for etcd snapshots.
- The S3 configuration used `etcd-snapshot-retention` but did not set the current separate S3 retention option. Added `etcd-s3-retention: 10` so the S3 retention intent matches the local retention example on current RKE2 releases.
- The manual snapshot restore example used a hard-coded snapshot path that would not match RKE2's generated snapshot names, which include the configured base name plus node/timestamp data. Changed the restore path to use `<SNAPSHOT-NAME>` from `rke2 etcd-snapshot ls`.
- The local restore command did not account for clusters with `etcd-s3` configured. Added the official `--etcd-s3=false` flag for restoring a local file when S3 snapshot configuration is present.
- The snapshot list comment said `rke2 etcd-snapshot ls` lists all snapshots. Updated it to say it lists snapshots visible from the current node, matching RKE2's documented behavior.
- The rejoin procedure removed only `/var/lib/rancher/rke2/server/db/etcd`. Updated it to remove `/var/lib/rancher/rke2/server/db/`, which is the directory RKE2 documents deleting on peer etcd servers before rejoining.
- The S3 restore example passed an `s3://...` URI to `--cluster-reset-restore-path`. Updated it to pass only `<SNAPSHOT-NAME>` with S3 flags, as RKE2 requires for S3 restore.
- The S3 listing example in Step 6 omitted the region while the rest of the post used `us-west-2`. Added `--etcd-s3-region us-west-2` for consistency.
- The best practices omitted the RKE2 server token, which is required when restoring snapshots to new hosts. Added a note to back up `/var/lib/rancher/rke2/server/token` with snapshots.

## Review Notes
- The `etcd-s3-retention` option is version-gated in RKE2; it is present in current RKE2 documentation, but older RKE2 patch releases before the documented gates may not support it.
- The S3 examples use config-file credentials. RKE2 also supports S3 configuration Secrets, but those cannot be used during restore because the Kubernetes API server is unavailable.
- The `kubectl` commands assume an admin kubeconfig is available in the environment. RKE2 writes the default admin kubeconfig to `/etc/rancher/rke2/rke2.yaml`.
