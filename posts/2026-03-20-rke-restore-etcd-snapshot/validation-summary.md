# Validation Summary: How to Restore RKE from an etcd Snapshot

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- RKE/RKE1
- Kubernetes
- Rancher
- etcd snapshots and restores
- RKE CLI
- kubectl
- AWS S3 / AWS CLI
- Docker

## Sources Consulted
- RKE1 Restoring from Backup documentation: https://rke.docs.rancher.com/etcd-snapshots/restoring-from-backup
- RKE1 Backups and Disaster Recovery documentation: https://rke.docs.rancher.com/etcd-snapshots
- RKE1 One-time Snapshots documentation: https://rke.docs.rancher.com/etcd-snapshots/one-time-snapshots
- RKE1 Example Scenarios documentation: https://rke.docs.rancher.com/etcd-snapshots/example-scenarios
- RKE source, etcd CLI command definitions: https://github.com/rancher/rke/blob/master/cmd/etcd.go
- RKE source, etcd backup preparation and restore flow: https://github.com/rancher/rke/blob/master/cluster/etcd.go
- RKE source, etcd snapshot restore implementation: https://github.com/rancher/rke/blob/master/services/etcd.go
- Kubernetes Persistent Volumes documentation: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Kubernetes Images documentation: https://kubernetes.io/docs/concepts/containers/images/
- Kubernetes `kubectl get` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes `kubectl rollout restart` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_restart/
- AWS CLI `s3 ls` command reference: https://docs.aws.amazon.com/cli/latest/reference/s3/ls.html
- AWS CLI `s3 cp` command reference: https://docs.aws.amazon.com/cli/latest/reference/s3/cp.html

## Issues Found
- The post did not state that RKE/RKE1 is end-of-life. Added a legacy-cluster caveat and changed the conclusion from "well-supported" to "documented" to reflect current RKE1 support status.
- The prerequisites named the wrong RKE state file, `cluster-rkestate.json`. Updated it to `cluster.rkestate` and clarified that RKE v1.1.4+ snapshots can include the state file, while older snapshots or `--use-local-state` restores need the local state file.
- The post used `rke etcd snapshot-list`, but current RKE1 exposes `snapshot-save` and `snapshot-restore`, not `snapshot-list`. Replaced those commands with listing `/opt/rke/etcd-snapshots/` on an etcd node.
- The S3 local-copy example listed S3 objects but did not download one, and it copied directly into `/opt/rke/etcd-snapshots/` as an unprivileged user. Added `aws s3 cp` and changed the copy flow to upload to `/tmp` and move into place with `sudo`.
- The local snapshot names were inconsistent and included `.zip` in copy examples while restore used a different name. Standardized examples on snapshot names without a `.zip` suffix, matching RKE's CLI warning that `--name` should be the snapshot name, not the `.zip` filename.
- The restore workflow description said RKE starts etcd with `--force-new-cluster`. RKE restores via `etcdctl snapshot restore` and then runs the cluster-up flow, so the workflow list was corrected to match the official documentation and RKE source.
- The post implied a separate `rke up` is required after every restore. Updated this to state that RKE v0.2.0+ runs the `rke up` flow during `snapshot-restore`, and that a manual `rke up` is only a reconciliation step when needed.
- The "Container images must be re-pulled" wording was too absolute. Updated it to say images are not restored from etcd and are pulled or reused according to Kubernetes image pull policy.
- The single-node manual stop command stopped every Docker container on the host despite saying RKE-managed containers. Narrowed the command to common RKE-managed container name prefixes.
- The rollout restart examples were adjusted to the official `resource/name` form.

## Review Notes
- RKE1 reached end of life on July 31, 2025. This guide remains technically useful for existing legacy RKE1 clusters, but new clusters should use a supported distribution such as RKE2.
- The local environment did not have an `rke` binary installed, so CLI validation was done against the current official RKE documentation and Rancher RKE source code.
- Restoring etcd restores Kubernetes API objects, including PV and PVC objects, but not storage backend data. Operators still need storage-specific backups or snapshots for PersistentVolume contents.
- The S3 examples use placeholder credentials inline for illustration. In production, use IAM instance profiles or secure secret handling where possible.
