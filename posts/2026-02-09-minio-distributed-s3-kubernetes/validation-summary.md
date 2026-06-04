# Validation Summary: Deploy MinIO Distributed Mode on Kubernetes for S3-Compatible Object Storage

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MinIO
- MinIO Kubernetes Operator
- Kubernetes
- Prometheus Operator ServiceMonitor
- MinIO Client (`mc`)
- AWS CLI S3 commands
- Python boto3
- S3-compatible object storage

## Sources Consulted
- MinIO Operator GitHub README and installation instructions: https://github.com/minio/operator
- MinIO Operator generated Tenant CRD documentation: https://raw.githubusercontent.com/minio/operator/master/docs/tenant_crd.adoc
- MinIO Tenant CRD manifest: https://raw.githubusercontent.com/minio/operator/master/resources/base/crds/minio.min.io_tenants.yaml
- MinIO Operator service generation source for service names and ports: https://raw.githubusercontent.com/minio/operator/master/pkg/resources/services/service.go and https://raw.githubusercontent.com/minio/operator/master/pkg/apis/minio.min.io/v2/constants.go
- MinIO Tenant deployment documentation: https://min.io/docs/minio/kubernetes/upstream/operations/install-deploy-manage/deploy-minio-tenant.html
- MinIO erasure coding documentation: https://min.io/docs/minio/linux/operations/concepts/erasure-coding.html
- MinIO `mc mb` documentation: https://min.io/docs/minio/linux/reference/minio-mc/mc-mb.html
- MinIO `mc admin policy` documentation: https://min.io/docs/minio/linux/reference/minio-mc-admin/mc-admin-policy.html
- MinIO `mc replicate add` documentation: https://min.io/docs/minio/linux/reference/minio-mc/mc-replicate-add.html
- MinIO `mc encrypt set` documentation: https://min.io/docs/minio/linux/reference/minio-mc/mc-encrypt-set.html
- MinIO `mc ilm rule import` and `mc ilm rule add` documentation: https://min.io/docs/minio/linux/reference/minio-mc/mc-ilm-rule-import.html and https://min.io/docs/minio/linux/reference/minio-mc/mc-ilm-rule-add.html
- MinIO `mc admin cluster iam export` documentation: https://min.io/docs/minio/linux/reference/minio-mc-admin/mc-admin-cluster-iam-export.html
- MinIO metrics v3 reference: https://docs.min.io/aistor/operations/monitoring/metrics-and-alerts/metrics-v3/
- Prometheus Operator ServiceMonitor API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Kubernetes ServiceAccount and Secret documentation: https://kubernetes.io/docs/concepts/security/service-accounts/ and https://kubernetes.io/docs/concepts/configuration/secret/

## Issues Found
- The operator install URL pointed to `releases/latest/download/minio-operator.yaml`, which currently returns 404. Replaced it with MinIO's documented Kustomize install command pinned to `v7.1.1`.
- The Tenant YAML used invalid current CRD fields (`s3`, `console`, `monitoring`, `podSecurityContext`, and `strategyType`). Replaced them with valid `serviceAccountName`, `prometheusOperator`, `serviceMetadata`, and pool-level `securityContext` fields.
- The Tenant referenced `admin-user` without creating the required Kubernetes opaque secret containing `CONSOLE_ACCESS_KEY` and `CONSOLE_SECRET_KEY`. Added commands to create the service account and user secret before applying the Tenant.
- The access examples used the wrong service/port and HTTP scheme for an auto-TLS Tenant. Updated them to port-forward the headless service on port 9000 and use HTTPS with certificate verification disabled for local testing.
- Several `mc` examples omitted `--insecure` even though the tutorial configures access through an auto-generated Kubernetes CA certificate. Added `--insecure` to affected commands.
- The erasure coding inspection example attempted to run `mc admin info myminio` inside a MinIO pod without configuring the alias in that pod. Updated it to run against the locally configured alias.
- The encryption description incorrectly implied auto-generated encryption keys. Clarified that SSE-S3/SSE-KMS require the deployment's configured KMS/default key support.
- The replication example used an incomplete `--remote-bucket` URL without credentials and later referenced an undefined backup alias. Updated both examples.
- The monitoring section used older v2 metric paths and metric names, and the ServiceMonitor used the wrong service port for a TLS-enabled Tenant. Updated the ServiceMonitor port, HTTPS settings, paths, and PromQL examples to current v3 metrics.
- The lifecycle section used deprecated `mc ilm import` and XML. Replaced it with current `mc ilm rule add` syntax and a remote tier caveat.
- The backup section incorrectly used `mc admin update` as a backup command. Replaced it with `mc admin cluster iam export`.
- The boto3 example used the wrong in-cluster endpoint. Updated it to use the headless service endpoint with TLS.

## Review Notes
- MinIO's public documentation has partly shifted toward AIStor branding, while the community Operator repository remains the authoritative source for the `minio.min.io/v2` Tenant CRD used in this article.
- The examples still assume a storage class named `fast-ssd` and a remote lifecycle tier named `MINIOTIER-1`; those must exist in the target cluster/deployment.
- Using `--insecure` and `verify=False` is appropriate for the local auto-cert demonstration but should be replaced with trusted CA configuration in production.
