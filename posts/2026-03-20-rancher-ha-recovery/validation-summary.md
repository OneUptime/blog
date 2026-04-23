# Validation Summary: How to Recover from Rancher HA Node Failure

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Manager
- RKE2
- etcd
- Kubernetes
- `kubectl`
- `etcdctl`
- systemd

## Sources Consulted
- RKE2 High Availability: https://docs.rke2.io/install/ha
- RKE2 Backup and Restore: https://docs.rke2.io/datastore/backup_restore
- RKE2 Server Configuration Reference: https://docs.rke2.io/reference/server_config
- RKE2 Logging: https://docs.rke2.io/reference/logging
- Rancher Agents: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/launch-kubernetes-with-rancher/about-rancher-agents
- Rancher Registered Clusters troubleshooting: https://ranchermanager.docs.rancher.com/v2.13/troubleshooting/other-troubleshooting-tips/registered-clusters
- Rancher Restoring a Cluster from Backup: https://ranchermanager.docs.rancher.com/v2.14/how-to-guides/new-user-guides/backup-restore-and-disaster-recovery/restore-rancher-launched-kubernetes-clusters-from-backup
- etcd membership operations: https://etcd.io/docs/v3.6/tasks/operator/how-to-deal-with-membership/

## Issues Found
- The `etcdctl` examples placed connection and TLS flags after the subcommands. I rewrote them to use the documented global-flag form before `endpoint` and `member` operations so the commands match current etcdctl usage more reliably.
- The replacement-node step implied that only `token`, `server`, and `tls-san` mattered. I corrected the text to note that replacement servers must match the cluster's critical RKE2 server configuration values as documented by RKE2.
- The snapshot-restore section omitted the required cleanup of `/var/lib/rancher/rke2/server/db/` on peer server nodes before they rejoin after a restore. I added that step to align with current RKE2 restore procedures.
- The snapshot-restore section did not mention two important restore caveats from current RKE2 docs: using `--etcd-s3=false` when restoring a local snapshot while S3 snapshot config is enabled, and supplying the original server token when restoring onto a replacement first server. I added both notes.
- The managed-cluster reconnection check said to inspect `cattle-cluster-agent`, but the command fetched all pods in `cattle-system`. I narrowed the command to the documented `app=cattle-cluster-agent` selector.
- The conclusion stated that single-node failures recover automatically. I softened that wording to the technically accurate condition that recovery is straightforward when etcd quorum remains intact.

## Review Notes
- The post is now technically sound for a generic Rancher-on-RKE2 HA recovery guide, but several commands still assume the operator already has working `kubectl` access to the management cluster and knows which server node is the restore node.
- The examples are intentionally generic placeholders. Operators should substitute their real server names, load balancer address, token, and snapshot filename before execution.
