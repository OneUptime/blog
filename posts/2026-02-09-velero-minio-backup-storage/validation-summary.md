# Validation Summary: How to Configure Velero with MinIO as an S3-Compatible Backup Storage Backend

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- Velero
- Velero AWS plugin
- MinIO
- MinIO Operator
- MinIO Client (`mc`)
- Prometheus Operator `ServiceMonitor`
- AWS S3-compatible object storage

## Sources Consulted
- Velero MinIO contribution guide: https://velero.io/docs/v1.15/contributions/minio/
- Velero v1.18 self-signed certificate documentation: https://velero.io/docs/v1.18/self-signed-certificates/
- Velero AWS plugin BackupStorageLocation configuration: https://github.com/velero-io/velero-plugin-for-aws/blob/main/backupstoragelocation.md
- Velero AWS plugin releases: https://github.com/velero-io/velero-plugin-for-aws/releases
- MinIO Operator README and install guidance: https://github.com/minio/operator
- MinIO Operator Tenant CRD reference: https://github.com/minio/operator/blob/master/docs/tenant_crd.adoc
- MinIO Operator example Tenant manifests: https://github.com/minio/operator/tree/master/examples/kustomization/base
- MinIO `mc ilm rule add` documentation: https://docs.min.io/aistor/reference/cli/mc-ilm-rule/mc-ilm-rule-add/
- AWS S3 pricing: https://aws.amazon.com/s3/pricing/

## Issues Found
- The MinIO Operator install URL returned 404. Replaced it with the documented `kubectl kustomize github.com/minio/operator?ref=v7.1.1 | kubectl apply -f -` installation method and changed the readiness command to a deployment rollout check.
- The Tenant credential example used the obsolete `credsSecret` field and `accesskey`/`secretkey` secret keys. Updated it to use the current `configuration` secret with `config.env` and a `users` secret with `CONSOLE_ACCESS_KEY` and `CONSOLE_SECRET_KEY`.
- The MinIO lifecycle command used the older `mc ilm add --expiry-days` form. Updated it to `mc ilm rule add --expire-days`.
- The Velero AWS plugin image was pinned to older `v1.9.0`. Updated examples to `v1.14.1`, the current release checked during validation.
- The verification command tried to use an `mc` alias in a new disposable pod where the alias did not exist. Updated the command to set the alias before listing objects.
- The HA Tenant example placed resource requests at the wrong Tenant level and used the removed `credsSecret` field. Moved resources under the pool and added a current configuration secret.
- The TLS section read `.data.ca.crt` from a Kubernetes TLS secret created by `kubectl create secret tls`, but that secret contains `tls.crt` and `tls.key`. Updated the command to read `tls.crt`, added a SAN to the self-signed certificate, and changed Velero trust configuration to use `BackupStorageLocation.spec.objectStorage.caCertRef`.
- The `ServiceMonitor` snippet used `apiVersion: v1`. Updated it to `monitoring.coreos.com/v1`.
- The troubleshooting command assumed the Velero container includes `curl`. Replaced it with a disposable `curlimages/curl` pod in the Velero namespace.
- The migration command used `velero backup-location set` for bucket and config fields. Replaced it with a `kubectl patch backupstoragelocation` command.
- Cost and bandwidth claims were too absolute for MinIO running on cloud disks or across networks. Qualified those statements and removed the unsupported fixed break-even claim.

## Review Notes
`kubectl` is not installed in this workspace, so Kubernetes manifests and kustomize output could not be rendered locally. The commands and fields were checked against upstream documentation and repository examples instead.
