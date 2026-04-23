# Validation Summary: How to Back Up and Restore RKE2 etcd - A Practical Guide

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- RKE2
- Kubernetes
- etcd
- S3-compatible object storage
- systemd
- Linux shell commands

## Sources Consulted
- RKE2 Backup and Restore documentation: https://docs.rke2.io/datastore/backup_restore
- RKE2 Server Configuration Reference: https://docs.rke2.io/reference/server_config
- RKE2 CLI Tools documentation: https://docs.rke2.io/reference/cli_tools
- RKE2 Token Management documentation: https://docs.rke2.io/security/token
- RKE2 Embedded Datastore documentation: https://docs.rke2.io/datastore/embedded
- etcd v3.6 Disaster Recovery documentation: https://etcd.io/docs/v3.6/op-guide/recovery/
- etcd v3.6 "How to save the database" documentation: https://etcd.io/docs/v3.6/tasks/operator/how-to-save-database/
- Kubernetes "Operating etcd clusters for Kubernetes" documentation: https://kubernetes.io/docs/tasks/administer-cluster/configure-upgrade-etcd/
- Rancher RKE2 source for etcd snapshot command wiring: https://github.com/rancher/rke2/blob/master/pkg/cli/cmds/etcd_snapshot.go
- K3s managed etcd/S3 snapshot implementation used by RKE2: https://github.com/k3s-io/k3s/tree/master/pkg/etcd

## Issues Found
- The automatic snapshot config set a custom `etcd-snapshot-dir` while later commands used the default snapshot directory. I commented out the optional custom directory so the examples remain consistent.
- The S3 listing example omitted the configured S3 folder. I added `--s3-folder production-cluster` to match the earlier configuration.
- The snapshot status example used `etcdctl snapshot status` with endpoint certificate environment variables. Current etcd documentation uses `etcdutl snapshot status` for inspecting snapshot files, so I replaced the command, added a note that `etcdutl` may need to be installed, and removed the unnecessary endpoint variables.
- The local restore examples did not disable S3 even though the earlier configuration enabled S3. RKE2 treats `--cluster-reset-restore-path` as an S3 snapshot name when S3 is configured, so I added `--etcd-s3=false` to local restore commands.
- The single-node restore section described the cluster reset command as "restore and start in one command." RKE2 restores/resets and then must be restarted normally, so I corrected the comment.
- The HA restore notes said the reset command starts RKE2 in single-member mode. I changed this to say it resets etcd membership to the primary node, matching RKE2's documented restore behavior.
- The HA restore token example used `/var/lib/rancher/rke2/server/node-token` and described it as a new token. RKE2 documents the server token at `/var/lib/rancher/rke2/server/token`, so I updated the path and wording.
- The S3 restore command used an `s3://...` URI for `--cluster-reset-restore-path`. RKE2 expects only the snapshot filename when restoring from S3, with bucket/folder supplied by S3 flags or config, so I corrected the command.
- The `kubectl` verification examples assumed kubeconfig and PATH were already configured. I added the RKE2 admin kubeconfig and bundled binary path exports before those commands.

## Review Notes
The guide is technically relevant and valid after the fixes. Future improvements could mention that `etcd-s3-config-secret` cannot be used during restore because the Kubernetes API is unavailable, and could add a tested restore drill against a non-production cluster.
