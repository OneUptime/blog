# Validation Summary: How to Back Up and Restore kOps etcd with `etcd-manager-ctl`

## Status
validated

## Post Type
Disaster-recovery guide and operational tutorial

## Technologies Covered

- kOps
- Kubernetes
- etcd and etcd-manager
- `etcd-manager-ctl`
- AWS S3, S3 Versioning, and S3 replication
- `kubectl` and the kOps CLI

## Sources Consulted

- [kOps: etcd backup, restore, and encryption](https://kops.sigs.k8s.io/operations/etcd_backup_restore_encryption/)
- [kOps: etcd administration](https://kops.sigs.k8s.io/operations/etcd_administration/)
- [kOps: Cluster resource etcd configuration](https://kops.sigs.k8s.io/cluster_spec/#etcdclusters)
- [kOps: `kops validate cluster`](https://kops.sigs.k8s.io/cli/kops_validate_cluster/)
- [etcd-manager: `etcd-manager-ctl` command implementation](https://github.com/kubernetes-sigs/etcd-manager/blob/main/cmd/etcd-manager-ctl/main.go)
- [etcd-manager: backup store implementation](https://github.com/kubernetes-sigs/etcd-manager/blob/main/pkg/backup/vfs.go)
- [etcd-manager: new-cluster and quorum implementation](https://github.com/kubernetes-sigs/etcd-manager/blob/main/pkg/controller/newcluster.go)
- [etcd-manager: backup and restore internals](https://github.com/kubernetes-sigs/etcd-manager/blob/main/docs/backup-restore.md)
- [etcd-manager: official releases](https://github.com/kubernetes-sigs/etcd-manager/releases)
- [Kubernetes: `kubectl events`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_events/)
- [Kubernetes: Endpoints deprecation](https://kubernetes.io/blog/2025/04/24/endpoints-deprecation/)
- [Kubernetes: operating etcd clusters](https://kubernetes.io/docs/tasks/administer-cluster/configure-upgrade-etcd/)
- [AWS: S3 Versioning](https://docs.aws.amazon.com/AmazonS3/latest/userguide/Versioning.html)
- [AWS: S3 replication](https://docs.aws.amazon.com/AmazonS3/latest/userguide/replication.html)

## Issues Found

- The introduction implied that backups always share the kOps configuration store. Clarified that this is the default because each etcd cluster can override `spec.etcdClusters[].backups.backupStore`.
- The installation guidance referred generally to releases linked by kOps, while the current project lives under `kubernetes-sigs`. Pointed readers directly to the current official release repository.
- The retention text implied that `backupRetentionDays` configures all retention tiers. Clarified that it configures daily-backup retention; the hourly tier remains separately controlled.
- The backup-path example was derived only from `KOPS_STATE_STORE`. Added the required check of each configured `backups.backupStore` value before using the default path convention.
- The post could be read as claiming that `list-backups` validates backup contents. Clarified that it enumerates names from metadata-object paths and does not parse metadata or download snapshot data.
- S3 Versioning was presented as a way to preserve backup prefixes before recovery. etcd-manager retention cleanup calls an all-version removal operation, so versioning alone is insufficient. Changed the preservation step to require an independent copy and documented the limitation in the protection guidance.
- The restore trigger was described as occurring only after every peer restarted, and the peer wait was described as requiring the full configured count. Clarified the leader-refresh behavior and the current implementation's ability to proceed one member short only when the required quorum is unchanged, while retaining kOps's instruction to restart every control-plane member.
- Replaced `kubectl get events --sort-by=.lastTimestamp`, which relies on a deprecated Event timestamp field, with the current `kubectl events --all-namespaces` command.
- Qualified the Kubernetes API `Endpoints` lookup with the `default` namespace. Also documented that Endpoints is deprecated in Kubernetes 1.33+, but is intentionally used here because the official kOps master-lease recovery procedure targets that legacy object.

## Review Notes

- The current upstream `etcd-manager-ctl` source was compiled and its relevant packages were tested successfully. Its `list-backups`, `restore-backup`, `list-commands`, and `delete-command <backupname>` interfaces match the corrected post.
- The Docker container-name example remains in the official kOps recovery documentation. The post correctly treats it as a Docker-era example and requires operators to use the actual runtime and supervisor on their nodes.
- The legacy Endpoints diagnostic may emit a deprecation warning on Kubernetes 1.33 and later. It remains served and is the object named by the current kOps master-lease instructions.
