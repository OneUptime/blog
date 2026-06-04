# Validation Summary: How to Deploy MinIO in Distributed Mode for High-Availability Object Storage

## Status
validated

## Post Type
Tutorial / Deployment guide

## Technologies Covered
- MinIO distributed object storage
- MinIO Operator and Tenant CRDs
- Kubernetes StatefulSets, Services, Ingress, PersistentVolumeClaims, and ServiceMonitor
- MinIO Client (`mc`)
- MinIO Python SDK
- Prometheus metrics
- MinIO bucket replication and rebalancing

## Sources Consulted
- MinIO Operator installation documentation: https://min.io/docs/minio/kubernetes/upstream/operations/installation.html
- MinIO Operator v7.1.1 release metadata and source: https://github.com/minio/operator/releases/tag/v7.1.1
- MinIO Operator Tenant example and CRD source: https://github.com/minio/operator/tree/v7.1.1/examples/kustomization/base and https://github.com/minio/operator/blob/v7.1.1/pkg/apis/minio.min.io/v2/types.go
- MinIO server command reference: https://min.io/docs/minio/linux/reference/minio-server/minio-server.html
- MinIO metrics v3 reference: https://docs.min.io/aistor/operations/monitoring/metrics-and-alerts/metrics-v3/
- MinIO `mc replicate add` reference: https://min.io/docs/minio/linux/reference/minio-mc/mc-replicate-add.html
- MinIO expansion and rebalance documentation: https://min.io/docs/minio/linux/operations/install-deploy-manage/expand-minio-deployment.html and https://docs.min.io/community/minio-object-store/reference/minio-mc-admin/mc-admin-rebalance.html
- MinIO Python SDK reference: https://docs.min.io/enterprise/aistor-object-store/developers/sdk/python/api/

## Issues Found
- The Operator install command used a latest-release `operator.yaml` URL that now redirects to a missing asset. Replaced it with the documented Kustomize install form pinned to `v7.1.1`.
- The Tenant YAML used an outdated `spec.console` block and did not define the required root configuration secret. Replaced it with `configuration`, `users`, and `serviceMetadata` fields supported by the current Tenant CRD, and added the matching secret creation commands.
- The MinIO image tag was outdated. Updated the Operator and manual StatefulSet examples to the current MinIO image used by the v7.1.1 Operator examples.
- The Ingress service ports and console service name did not match the current Operator-created services when `requestAutoCert: false`. Updated the API service port to `80` and the console service to `minio-console:9090`.
- The monitoring section used older v2 metric endpoint and metric names. Updated the ServiceMonitor to `/minio/metrics/v3` and replaced the PromQL examples with current v3 metric names.
- The post claimed MinIO automatically rebalances data across pools. Updated the wording to clarify that existing-object rebalancing is a manual `mc admin rebalance` operation.

## Review Notes
The `users` field in the open-source Tenant CRD is still present but deprecated in the v7.1.1 source; it remains usable for this tutorial's initial user example. The local environment did not have `kubectl`, so Kubernetes commands were checked against documentation and source rather than executed against a cluster. Embedded YAML blocks were parsed successfully with PyYAML.
