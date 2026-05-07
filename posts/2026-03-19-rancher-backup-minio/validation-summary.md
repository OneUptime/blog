# Validation Summary: How to Back Up Rancher to MinIO

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Manager Backup and Restore Operator
- Kubernetes
- MinIO
- Helm
- `kubectl`
- MinIO Client (`mc`)
- TLS
- S3-compatible object storage

## Sources Consulted
- Rancher Backup and Restore Operator repository - https://github.com/rancher/backup-restore-operator
- Rancher Backup CRD template - https://raw.githubusercontent.com/rancher/backup-restore-operator/main/charts/rancher-backup-crd/templates/backup.yaml
- Rancher default full ResourceSet template - https://raw.githubusercontent.com/rancher/backup-restore-operator/main/charts/rancher-backup/templates/rancher-resourceset-full.yaml
- Rancher MinIO backup example - https://raw.githubusercontent.com/rancher/backup-restore-operator/main/examples/create-minio-backup.yaml
- Rancher recurring backup example - https://raw.githubusercontent.com/rancher/backup-restore-operator/main/examples/create-s3-def-recurring-backup.yaml
- Rancher S3/MinIO object-store implementation - https://raw.githubusercontent.com/rancher/backup-restore-operator/main/pkg/objectstore/s3minio.go
- SUSE Rancher Manager backup configuration docs - https://documentation.suse.com/cloudnative/rancher-manager/v2.14/en/rancher-admin/back-up-restore-and-disaster-recovery/configuration/backup.html
- MinIO Community Helm Chart README - https://raw.githubusercontent.com/minio/minio/master/helm/minio/README.md
- MinIO Community Helm Chart values - https://raw.githubusercontent.com/minio/minio/master/helm/minio/values.yaml
- MinIO Community Helm Chart deployment template - https://raw.githubusercontent.com/minio/minio/master/helm/minio/templates/deployment.yaml
- MinIO Community Helm Chart StatefulSet template - https://raw.githubusercontent.com/minio/minio/master/helm/minio/templates/statefulset.yaml
- MinIO Community Helm Chart console service template - https://raw.githubusercontent.com/minio/minio/master/helm/minio/templates/console-service.yaml

## Issues Found
- The post used `resourceSetName: rancher-resource-set`, but the current Rancher backup chart and examples use named ResourceSets such as `rancher-resource-set-full` and `rancher-resource-set-basic`. The backup examples in the post were updated to use `rancher-resource-set-full`.
- The MinIO TLS secret example used `kubectl create secret tls`, which creates `tls.crt` and `tls.key`. The current MinIO community chart expects `public.crt` and `private.key` by default, so the command was corrected to create a generic secret with those keys.
- The guide applied the Rancher `Backup` resource before MinIO TLS was enabled, while the Rancher operator’s MinIO/S3 example and current object-store implementation assume TLS-backed endpoints in normal operation. The post was corrected so the backup is applied only after Step 8, and the TLS guidance now explains when to keep or remove `insecureTLSSkipVerify`.
- The post’s post-TLS verification and connectivity examples still used `http://` URLs. Those commands were updated to use `https://` with `mc --insecure`, which matches a self-signed or private-CA MinIO deployment.
- The standalone MinIO values snippet included `replicas: 1`, but the current standalone deployment template already hardcodes a single replica. The misleading no-op field was removed.
- The disk-space troubleshooting command used `/data` and targeted `deploy/minio`. The current chart mounts storage at `/export`, and distributed mode uses pods from a StatefulSet, so the command was updated to exec into a MinIO pod and check `/export`.

## Review Notes
- MinIO’s community Helm chart README states that the chart is community maintained and that MinIO strongly recommends the MinIO Kubernetes Operator for production Kubernetes deployments. The post’s high-availability step is workable with the chart, but a future revision could mention that recommendation explicitly.
- The dedicated `rancher-backup` user is assigned the built-in `readwrite` policy, which works but is broader than least-privilege access. A future hardening pass could replace it with a bucket-scoped custom policy.
