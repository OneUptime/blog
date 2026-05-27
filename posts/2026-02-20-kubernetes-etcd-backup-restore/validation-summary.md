# Validation Summary: How to Backup and Restore etcd for Kubernetes Disaster Recovery

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- etcd
- etcdctl and etcdutl
- Kubernetes CronJob
- Amazon S3 and AWS CLI
- Boto3
- S3 Lifecycle configuration

## Sources Consulted
- etcd disaster recovery documentation: https://etcd.io/docs/v3.6/op-guide/recovery/
- Kubernetes etcd operation and restore documentation: https://kubernetes.io/docs/tasks/administer-cluster/configure-upgrade-etcd/
- Kubernetes CronJob API reference: https://kubernetes.io/docs/reference/kubernetes-api/batch/cron-job-v1/
- AWS CLI `s3 cp` command reference: https://docs.aws.amazon.com/cli/latest/reference/s3/cp.html
- Amazon S3 SSE-KMS documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingKMSEncryption.html
- Boto3 S3 `ListObjectsV2` paginator documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/s3/paginator/ListObjectsV2.html
- Amazon S3 Lifecycle configuration documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/intro-lifecycle-rules.html

## Issues Found
- The snapshot examples used kubeadm etcd server certificates as client credentials. Updated them to use kubeadm's `healthcheck-client.crt` and `healthcheck-client.key`, which are client credentials intended for local etcd health and client access.
- The examples used `etcdctl snapshot status` and `etcdctl snapshot restore`. Updated status and restore commands to use `etcdutl`, matching current etcd and Kubernetes restore guidance where `etcdctl` restore is deprecated and slated for removal.
- The CronJob connected to `https://127.0.0.1:2379` from a pod without host networking, which would target the pod network namespace rather than the host's static-pod etcd. Added `hostNetwork: true` and `dnsPolicy: ClusterFirstWithHostNet`.
- The CronJob used an etcd image while also invoking the AWS CLI. Updated the image reference and comment to make clear that the backup container image must include `etcdctl`, `etcdutl`, and `aws`.
- The CronJob used `hostPath.type: DirectoryOrCreate` for `/etc/kubernetes/pki/etcd`, which could create an empty certificate directory on an incorrectly scheduled node. Changed it to `Directory` so missing certs fail visibly.
- The Boto3 verification script listed only one `list_objects_v2` response page, which could miss backups when more than one page exists. Updated it to use the official Boto3 paginator.
- The restore command wrote to `/var/lib/etcd` without `sudo` and used hard-coded single-node membership values that would not match most kubeadm static pod manifests. Updated it to use `sudo etcdutl` and explicit variables for the etcd member name and peer URL from the static pod manifest.
- The restore ownership command used `etcd:etcd`, which is not generally correct for kubeadm static pods. Updated it to `root:root` for the kubeadm static pod case described by the post.
- The retention diagram described 7-day, daily, and weekly retention behavior that the provided S3 Lifecycle JSON did not implement. Updated the diagram to match the age-based transitions and 365-day expiration in the JSON.

## Review Notes
The post is technically relevant and contains implementation details. The CronJob remains a template because users must provide a real container image containing both etcd utilities and the AWS CLI, and they must set IAM credentials or a workload identity appropriate for their environment.
