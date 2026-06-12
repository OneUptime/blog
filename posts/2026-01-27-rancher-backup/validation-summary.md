# Validation Summary: How to Configure Rancher Backup

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rancher Manager
- Rancher Backup and Restore Operator
- Kubernetes custom resources, RBAC, Secrets, and CronJobs
- Helm
- Amazon S3 and S3-compatible storage
- MinIO
- Kubernetes EncryptionConfiguration
- OneUptime Incoming Request / heartbeat monitoring

## Sources Consulted
- Rancher Manager docs: Backing up Rancher: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/backup-restore-and-disaster-recovery/back-up-rancher
- Rancher Manager docs: Restoring Rancher: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/backup-restore-and-disaster-recovery/restore-rancher
- Rancher Manager docs: Backup Configuration: https://ranchermanager.docs.rancher.com/reference-guides/backup-restore-configuration/backup-configuration
- Rancher Manager docs: Backup Storage Location Configuration: https://ranchermanager.docs.rancher.com/reference-guides/backup-restore-configuration/storage-configuration
- Rancher Manager docs: Backup and Restore Examples: https://ranchermanager.docs.rancher.com/reference-guides/backup-restore-configuration/examples
- Rancher backup-restore-operator upstream repository and CRDs: https://github.com/rancher/backup-restore-operator
- Rancher backup Helm chart values: https://raw.githubusercontent.com/rancher/backup-restore-operator/main/charts/rancher-backup/values.yaml
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes encryption at rest documentation: https://kubernetes.io/docs/tasks/administer-cluster/encrypt-data/
- OneUptime Incoming Request Monitor documentation: https://oneuptime.com/docs/en/monitor/incoming-request-monitor

## Issues Found
- The post used the deprecated `rancher-resource-set` ResourceSet. Updated examples to use the current `rancher-resource-set-basic` or `rancher-resource-set-full` names documented by Rancher.
- The local PVC backup example used `storageLocation: s3: null`. Updated it to omit `storageLocation`, which is the documented way to use the default operator-level storage location.
- The S3 example left `endpoint` empty for AWS. Updated the example to use the AWS regional S3 endpoint format shown in Rancher examples.
- The MinIO example said `region` is required. Rancher documents region as optional and not needed for MinIO, so the field and comment were removed.
- The restore filename example omitted the UUID component commonly produced by Rancher backup filenames. Updated it to match the documented filename format.
- The complete cluster recovery procedure installed the backup operator without first adding/updating the Rancher charts repository in the new cluster workflow. Added the missing commands.
- The complete cluster recovery procedure did not mention matching the Rancher version during restore. Added a concise technical note because Rancher documents that restores into a new setup should use the same Rancher version as the backup source.
- The OneUptime heartbeat CronJob used a `curl` image while invoking `kubectl`, and it did not grant RBAC permission to read Backup resources. Added a ServiceAccount, ClusterRole, ClusterRoleBinding, and changed the image to one that includes Kubernetes tooling.

## Review Notes
Local `helm` and `kubectl` binaries were not installed in the review environment, so CLI checks were performed against official Helm/Kubernetes command documentation and Rancher chart/CRD sources rather than by executing against a live Rancher cluster. YAML snippets were parsed successfully after the fixes.
