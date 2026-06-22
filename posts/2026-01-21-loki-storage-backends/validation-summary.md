# Validation Summary: How to Configure Loki Storage Backends

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Grafana Loki
- Loki TSDB storage schema
- Filesystem storage
- AWS S3 and IAM Roles for Service Accounts
- Google Cloud Storage and GKE Workload Identity
- Azure Blob Storage and Azure Workload Identity
- MinIO S3-compatible object storage
- Kubernetes PersistentVolumeClaims
- Docker Compose
- Prometheus metrics / PromQL

## Sources Consulted
- Grafana Loki configuration reference: https://grafana.com/docs/loki/latest/configure/
- Grafana Loki configuration examples: https://grafana.com/docs/loki/latest/configure/examples/configuration-examples/
- Grafana Loki upgrade guide: https://grafana.com/docs/loki/latest/setup/upgrade/
- Grafana Loki storage documentation: https://grafana.com/docs/loki/latest/configure/storage/
- Grafana Loki caching documentation: https://grafana.com/docs/loki/latest/operations/caching/
- Grafana Loki retention documentation: https://grafana.com/docs/loki/latest/operations/storage/retention/
- Grafana Loki Azure deployment guide: https://grafana.com/docs/loki/latest/setup/install/helm/deployment-guides/azure/
- Grafana Loki release notes: https://grafana.com/docs/loki/latest/release-notes/
- Amazon EKS IRSA documentation: https://docs.aws.amazon.com/eks/latest/userguide/associate-service-account-role.html
- Google GKE Workload Identity Federation documentation: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/workload-identity
- Azure AKS Workload Identity documentation: https://learn.microsoft.com/en-us/azure/aks/workload-identity-overview
- MinIO distributed mode documentation: https://github.com/minio/minio/blob/master/docs/distributed/README.md

## Issues Found
- The introduction claimed the guide covered all supported Loki storage backends, but Loki supports additional object stores such as BOS, Swift, Alibaba Cloud, and IBM COS. Changed the wording to "most common supported storage backends."
- The architecture section said chunks and indexes can use different backends. For current TSDB configurations, Loki uses the schema period's `object_store` for both chunks and index, and the old shipper `shared_store` setting has been removed. Updated the explanation.
- Multiple Loki examples used removed `tsdb_shipper.shared_store` and `compactor.shared_store` fields. Removed those fields and kept `delete_request_store` where retention/delete requests require it.
- The S3 example used removed `sse_encryption: true`. Replaced it with the current `sse.type: SSE-S3` configuration.
- The Docker example used the old `grafana/loki:2.9.4` image while the snippets use current TSDB/v13 and Loki 3.x-compatible configuration. Updated the image to `grafana/loki:3.7.2`.
- The Azure AKS section mixed managed identity wording with Workload Identity. Updated it to use `use_federated_token: true`, which is the Loki setting for Azure Workload Identity.
- The Azure SAS token example referenced an environment variable that Loki does not consume directly as shown. Replaced it with `connection_string`, which Loki documents for SAS-token authentication.
- The MinIO TLS example nested `ca_file` under `tls_config`, but Loki's S3 HTTP config expects `http_config.ca_file`. Corrected the field placement.
- The verification and PromQL examples referenced BoltDB shipper metrics despite using TSDB examples. Replaced the metric grep with TSDB/compactor/chunk-oriented filtering and replaced the BoltDB shipper error query with an ingester chunk flush failure metric.
- The conclusion still referred to Azure Managed Identity after the AKS example was corrected to Workload Identity. Updated the recommendation wording.

## Review Notes
The snippets are accurate for modern Loki 3.x TSDB-style deployments. In future updates, consider noting that Helm chart values differ from raw Loki YAML and that filesystem storage is not recommended for clustered production deployments unless backed by carefully managed shared storage.
