# Validation Summary: How to Migrate K8s Clusters Between Cloud Providers Using Velero Cross-Cloud

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Velero v1.12
- Velero AWS plugin
- Velero file system backup / node-agent
- AWS S3 and IAM
- Google Kubernetes Engine load balancer annotations
- Route 53 DNS cutover
- kubectl, AWS CLI, jq, curl

## Sources Consulted
- Velero v1.12 Install CLI: https://velero.io/docs/v1.12/velero-install/
- Velero v1.12 File System Backup: https://velero.io/docs/v1.12/file-system-backup/
- Velero v1.12 Restore Reference: https://velero.io/docs/v1.12/restore-reference/
- Velero v1.12 Restore API Type: https://velero.io/docs/v1.12/api-types/restore/
- Velero v1.12 Backup Storage Locations and Volume Snapshot Locations: https://velero.io/docs/v1.12/locations/
- Velero AWS plugin documentation: https://github.com/velero-io/velero-plugin-for-aws
- GKE LoadBalancer Service concepts: https://docs.cloud.google.com/kubernetes-engine/docs/concepts/service-load-balancer
- GKE LoadBalancer Service parameters: https://docs.cloud.google.com/kubernetes-engine/docs/concepts/service-load-balancer-parameters
- Kubernetes kubectl annotate reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_annotate
- Kubernetes kubectl command reference: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/

## Issues Found
- The original migration used AWS EBS volume snapshots for an AWS-to-GCP restore. Velero documents that cross-provider snapshots are not supported, so the examples were changed to use file system backup with `--use-node-agent`, `--use-volume-snapshots=false`, `--snapshot-volumes=false`, and `--default-volumes-to-fs-backup=true`.
- The original Velero `Restore` examples used a non-existent `spec.storageClassMappings` field. Replaced this with Velero's supported storage-class mapping ConfigMap labeled `velero.io/plugin-config` and `velero.io/change-storage-class: RestoreItemAction`.
- The target-cluster install incorrectly created a GCP service account and configured GCS interoperability while still claiming to restore from the same AWS S3 bucket. Replaced it with reuse of AWS credentials and the AWS object-store plugin for the S3 backup location.
- The restore example included `persistentvolumes` while using file system backup and `restorePVs: false`. Removed `persistentvolumes` from the restore resource filter so PVCs can be dynamically provisioned on the target storage class.
- The load balancer migration example added GKE annotations (`cloud.google.com/neg` and `cloud.google.com/backend-config`) that are not general Service `type: LoadBalancer` replacements. Replaced them with a safer GKE internal LoadBalancer annotation example and kept provider-specific annotation selection explicit.
- The DNS cutover monitoring script labeled `kubectl top` CPU values as request counts. Updated the labels to CPU usage.
- The decommissioning script attempted to calculate restart rate from `kubectl top`, which does not expose restart counts. Replaced it with restart-count extraction from pod container statuses.
- The AWS IAM policy attachment used a literal `ACCOUNT_ID` placeholder. Added `aws sts get-caller-identity` to populate the policy ARN.

## Review Notes
Velero v1.12 is no longer actively maintained, but the post explicitly pins that version and uses the compatible AWS plugin version. File system backup has limitations: it backs up mounted pod volumes, excludes hostPath volumes, and may be less point-in-time consistent than provider snapshots. Future updates could modernize the post to the latest Velero release and add application-level quiescing hooks for databases.
