# Validation Summary: How to Manage and Troubleshoot etcd in Kubernetes

## Status
validated

## Post Type
Technical operations guide

## Technologies Covered
- Kubernetes
- kubeadm static pods
- etcd
- etcdctl
- etcdutl
- Kubernetes CronJob
- Raft consensus

## Sources Consulted
- Kubernetes documentation: Operating etcd clusters for Kubernetes - https://kubernetes.io/docs/tasks/administer-cluster/configure-upgrade-etcd/
- Kubernetes documentation: Set up a High Availability etcd Cluster with kubeadm - https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/setup-ha-etcd-with-kubeadm/
- etcd documentation: Disaster recovery - https://etcd.io/docs/v3.7/op-guide/recovery/
- etcd documentation: Maintenance - https://etcd.io/docs/v3.7/op-guide/maintenance/
- etcd documentation: Hardware recommendations - https://etcd.io/docs/v3.7/op-guide/hardware/
- etcd documentation: Tuning - https://etcd.io/docs/v3.7/tuning/
- etcd documentation: System limits - https://etcd.io/docs/v3.7/dev-guide/limit/

## Issues Found
- Snapshot status examples used `etcdctl snapshot status`. Current etcd documentation recommends `etcdutl snapshot status`, so the manual backup verification and CronJob verification commands were updated.
- The restore example used `etcdctl snapshot restore`, which Kubernetes documentation notes is deprecated since etcd v3.5.x and recommends replacing with `etcdutl`. The restore command was updated to use `etcdutl snapshot restore`.
- The restore example showed a single-member `--initial-cluster` value while the post discusses multi-member etcd clusters. The example was updated to show a three-member `--initial-cluster` and a comment explaining that each member should restore with its own `--name`.
- The backup CronJob comment said it uploads to S3, but the manifest only writes snapshots to a PVC and contains no S3 upload command or credentials. The comment was corrected to say it stores backups on a PVC.
- The post said to always deploy an odd number of etcd nodes. This was narrowed to production high availability guidance to avoid overstating the rule outside HA deployments.
- The restore example ran `chown -R etcd:etcd` on the restored kubeadm data directory. kubeadm static-pod deployments do not require an `etcd` host user in the documented restore flow, so that command was removed.

## Review Notes
The examples assume kubeadm-managed static pods, conventional kubeadm certificate paths, and pod names such as `etcd-master-1`; operators may need to adjust node names, pod names, member names, peer URLs, and image versions for their own cluster. The CronJob is structurally valid, but production usage should pin the etcd image tag and define the referenced `etcd-backup-pvc`.
