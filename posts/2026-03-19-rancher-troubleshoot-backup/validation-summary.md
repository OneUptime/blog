# Validation Summary: How to Troubleshoot Backup and Restore Issues in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- Rancher Backups
- Helm
- RKE2
- etcd snapshots
- Amazon S3 / S3-compatible object storage
- Bash

## Sources Consulted
- Rancher backup, restore, and disaster recovery overview: https://documentation.suse.com/cloudnative/rancher-manager/latest/en/rancher-admin/back-up-restore-and-disaster-recovery/back-up-restore-and-disaster-recovery.html
- Rancher backup configuration reference: https://documentation.suse.com/external-tree/en-us/cloudnative/rancher-manager/latest/en/rancher-admin/back-up-restore-and-disaster-recovery/configuration/backup.html
- Rancher backup and restore examples: https://documentation.suse.com/cloudnative/rancher-manager/latest/en/rancher-admin/back-up-restore-and-disaster-recovery/configuration/examples.html
- Rancher backup restore usage guide: https://documentation.suse.com/cloudnative/rancher-manager/v2.13/en/rancher-admin/back-up-restore-and-disaster-recovery/usage-guide.html
- Rancher migration to a new cluster: https://documentation.suse.com/external-tree/en-us/cloudnative/rancher-manager/v2.10/en/rancher-admin/back-up-restore-and-disaster-recovery/migrate-to-a-new-cluster.html
- Rancher webhook documentation: https://documentation.suse.com/external-tree/en-us/cloudnative/rancher-manager/latest/en/security/rancher-webhook/rancher-webhook.html
- RKE2 backup and restore: https://docs.rke2.io/datastore/backup_restore
- RKE2 logging reference: https://docs.rke2.io/reference/logging
- RKE2 CLI tools reference: https://docs.rke2.io/reference/cli_tools
- Kubernetes API health endpoints: https://kubernetes.io/docs/reference/using-api/health-checks/
- `kubectl run` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- `kubectl describe` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_describe/
- `kubectl get` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- `kubectl logs` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Helm upgrade command reference: https://helm.sh/docs/helm/helm_upgrade/

## Issues Found
- The RBAC remediation incorrectly said to reinstall only the CRDs. I changed it to upgrading or reinstalling both `rancher-backup-crd` and `rancher-backup` with a supported chart version, because RBAC comes from the chart installation, not the CRDs alone.
- The S3 connectivity test did not actually use the S3 credentials stored in the Kubernetes Secret. I updated the example to read `accessKey` and `secretKey` from `s3-creds` and pass them into the temporary AWS CLI pod.
- The backup-size section implied that increasing the operator PV always applies and described S3 as having effectively unlimited size. I narrowed the advice so PV resizing only applies when PVC storage is in use, and clarified that S3-compatible object storage removes the operator PVC as the bottleneck.
- The version-mismatch section incorrectly told readers to grep operator logs for version information and to install Rancher before restore. I replaced it with the documented guidance: restore only with the same Rancher version, and during migration restore first, then install that same Rancher version on the target cluster.
- The encryption-error section used a fixed Secret name, `rancher-backup-encryption`, which is not required by Rancher. I changed it to a placeholder secret name and documented the actual requirement: the Restore must reference the same `encryptionConfigSecretName`, and the Secret must contain the `encryption-provider-config.yaml` key.
- The restore-conflict section was missing Rancher’s documented warning that Rancher should not already be installed on the migration target cluster. I added that caveat and tightened the deletion advice so it applies only to confirmed stale Rancher-managed resources.
- The etcd snapshot and restore sections mixed RKE2-specific guidance with kubeadm-style etcd paths and deprecated Kubernetes health commands. I replaced those with RKE2-supported snapshot inventory, restore flow, and current API health checks.

## Review Notes
- The etcd snapshot troubleshooting in this post is now explicitly RKE2 embedded-etcd specific. It does not apply to external datastores or to non-RKE2 Kubernetes distributions.
- Rancher’s restore and migration docs also caution that Kubernetes API compatibility matters in addition to matching the Rancher version, especially when restoring onto a different Kubernetes version.
