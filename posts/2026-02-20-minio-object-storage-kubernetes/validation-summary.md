# Validation Summary: How to Deploy MinIO Object Storage on Kubernetes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MinIO
- MinIO Operator for Kubernetes
- Kubernetes custom resources, Services, Pods, and Persistent Volumes
- Helm and Kustomize
- MinIO Client (`mc`)
- S3 API and boto3
- Prometheus metrics
- JSON bucket lifecycle configuration

## Sources Consulted
- MinIO Operator v6.0.0 CRD: https://raw.githubusercontent.com/minio/operator/v6.0.0/resources/base/crds/minio.min.io_tenants.yaml
- MinIO Operator v6.0.0 example tenant: https://raw.githubusercontent.com/minio/operator/v6.0.0/examples/kustomization/base/tenant.yaml
- MinIO Operator v6.0.0 configuration secret example: https://raw.githubusercontent.com/minio/operator/v6.0.0/examples/kustomization/base/tenant-config.yaml
- MinIO Operator Helm repository index: https://operator.min.io/index.yaml
- MinIO Client documentation: https://min.io/docs/minio/linux/reference/minio-mc.html
- `mc mb` documentation: https://min.io/docs/minio/linux/reference/minio-mc/mc-mb.html
- `mc ilm rule import` documentation: https://min.io/docs/minio/linux/reference/minio-mc/mc-ilm-rule-import.html
- MinIO deprecated `mc` commands list: https://min.io/docs/minio/linux/reference/minio-mc-deprecated.html
- `mc admin heal` documentation: https://min.io/docs/minio/linux/reference/minio-mc-admin/mc-admin-heal.html
- MinIO metrics documentation: https://min.io/docs/minio/linux/operations/monitoring/metrics-and-alerts.html
- MinIO erasure coding concepts: https://min.io/docs/minio/windows/operations/concepts.html

## Issues Found
- The Tenant manifest used `credsSecret`, which was removed in MinIO Operator v6.0.0. Replaced it with `spec.configuration` and a Secret containing `config.env` with `MINIO_ROOT_USER`, `MINIO_ROOT_PASSWORD`, and related MinIO environment variables.
- The sample enabled `requestAutoCert: true` but later used plain HTTP for `mc`, boto3, and metrics examples. Changed the tutorial manifest to `requestAutoCert: false` so the local HTTP examples are internally consistent.
- The erasure coding explanation said an 8-drive deployment could tolerate 4 drive failures, but the sample config sets `MINIO_STORAGE_CLASS_STANDARD="EC:2"`. Updated the claim to 2 drive failures.
- The lifecycle policy block was labeled as YAML even though it is JSON. Changed the code fence to `json`.
- The lifecycle example used deprecated `mc ilm import` and `mc ilm ls` commands. Updated them to `mc ilm rule import` and `mc ilm rule ls`.
- The lifecycle rule ID said `transition-to-archive` while the rule only expires objects. Renamed it to `expire-old-backups`.
- The healing example used unsupported `mc admin heal --recursive`. Removed the invalid flag.
- The production consideration stated erasure coding always tolerates up to `N/2` drive failures. Reworded it to recommend choosing parity based on availability requirements.
- The S3 compatibility statement was overly broad. Reworded it to say standard S3 API applications can work with MinIO after configuring the endpoint and credentials.

## Review Notes
MinIO metrics v3 is recommended for newer deployments, while the Operator v6 sample and ServiceMonitor defaults still commonly reference v2 metrics paths. A future refresh could update the monitoring section for current MinIO AIStor or newer Operator guidance.
