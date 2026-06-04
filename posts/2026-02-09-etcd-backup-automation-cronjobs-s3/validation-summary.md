# Validation Summary: How to Implement etcd Backup Automation Using Cronjobs and S3 Storage

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- etcd
- Kubernetes CronJob
- Kubernetes ConfigMap and Secret
- AWS CLI
- Amazon S3
- S3 Lifecycle rules
- Docker
- Prometheus Operator PrometheusRule
- kube-state-metrics
- Bash

## Sources Consulted
- Kubernetes documentation: Operating etcd clusters for Kubernetes - https://kubernetes.io/docs/tasks/administer-cluster/configure-upgrade-etcd/
- Kubernetes API reference: CronJob batch/v1 - https://kubernetes.io/docs/reference/kubernetes-api/batch/cron-job-v1/
- etcd v3.6 disaster recovery documentation - https://etcd.io/docs/v3.6/op-guide/recovery/
- etcd GitHub releases - https://github.com/etcd-io/etcd/releases
- AWS CLI documentation: aws s3 cp - https://docs.aws.amazon.com/cli/latest/reference/s3/cp.html
- AWS CLI documentation: put-bucket-lifecycle-configuration - https://docs.aws.amazon.com/cli/latest/reference/s3api/put-bucket-lifecycle-configuration.html
- Amazon S3 documentation: Lifecycle configuration elements - https://docs.aws.amazon.com/AmazonS3/latest/userguide/intro-lifecycle-rules.html
- Amazon S3 documentation: Data protection in Amazon S3 - https://docs.aws.amazon.com/AmazonS3/latest/userguide/DataDurability.html
- Prometheus Operator API reference: PrometheusRule - https://prometheus-operator.dev/docs/api-reference/api/
- kube-state-metrics metrics documentation - https://github.com/kubernetes/kube-state-metrics/blob/main/docs/README.md
- Alpine Linux release branches - https://alpinelinux.org/releases/

## Issues Found
- The backup upload commands used `aws s3 cp --server-side-encryption AES256`, which is not a valid high-level `aws s3 cp` option. Changed it to `--sse AES256`, which is the documented AWS CLI option.
- The scripts used `etcdctl snapshot status` for snapshot inspection. Current etcd documentation uses `etcdutl snapshot status`, so the examples now use `etcdutl` for status checks while retaining `etcdctl snapshot save` for live snapshots.
- The initial CronJob used `amazon/aws-cli:latest`, which does not provide the etcd tools required by the script. Updated the CronJob to use the custom image that includes AWS CLI, `etcdctl`, and `etcdutl`.
- The custom Dockerfile only installed `etcdctl` and pinned an older etcd release. Updated it to install both `etcdctl` and `etcdutl` from etcd v3.6.11.
- The Dockerfile used `alpine:3.19`, which is out of support as of the validation date. Updated it to `alpine:3.22`, a supported Alpine branch.
- The S3 credentials Secret example placed `region` inside the shared credentials file. Removed that entry and added `AWS_DEFAULT_REGION` to the CronJob environments.
- The S3 cleanup code used `grep -P`, which is not available in Alpine's default grep. Changed it to `grep -E`.
- The monitoring and restore test scripts did not handle an empty backup prefix. Added explicit checks for missing backups.
- The restore test script downloaded into a directory that might not exist. Added `mkdir -p`.
- The Prometheus missing-backup alert could fire on older retained successful Jobs even when a newer backup existed. Changed it to compare the latest completion timestamp and also alert when no completion metric exists.
- The S3 lifecycle example used the older top-level `Prefix` field. Updated it to use the recommended `Filter` form with a prefix.
- The introductory S3 storage claim described S3 as geographically redundant. Clarified it as multi-Availability Zone storage, matching AWS's documented durability model for standard multi-AZ S3 storage classes.

## Review Notes
The examples assume a kubeadm-style control plane where etcd certificates are available on the host under `/etc/kubernetes/pki/etcd` and where the CronJob can be pinned to the control-plane node. Managed Kubernetes services often do not expose etcd directly, so this approach applies mainly to self-managed clusters.
