# Validation Summary: How to Set Up Ceph Storage for Grafana Mimir on Kubernetes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph RGW (RADOS Gateway / S3-compatible object storage)
- Grafana Mimir (horizontally scalable time-series database)
- Kubernetes
- Helm
- Prometheus remote write
- AWS CLI (for S3 bucket creation)

## Sources Consulted
- Rook CephObjectStore CRD documentation: https://rook.io/docs/rook/latest/CRDs/Object-Storage/ceph-object-store-crd/
- Rook Object Storage overview: https://rook.io/docs/rook/latest/Storage-Configuration/Object-Storage-RGW/object-storage/
- Grafana Mimir object storage configuration: https://grafana.com/docs/mimir/latest/configure/configure-object-storage-backend/
- Grafana Mimir configuration parameters: https://grafana.com/docs/mimir/latest/configure/configuration-parameters/
- mimir-distributed Helm chart configuration: https://grafana.com/docs/helm-charts/mimir-distributed/latest/run-production-environment-with-helm/configuration-with-helm/
- Grafana Mimir HTTP API reference: https://grafana.com/docs/mimir/latest/references/http-api/
- Ceph radosgw-admin documentation: https://docs.ceph.com/en/latest/man/8/radosgw-admin/
- Ceph RGW pool naming: https://docs.ceph.com/en/latest/radosgw/pools/

## Issues Found
1. **Missing AWS credentials for bucket creation**: The `aws s3 mb` commands to create Mimir buckets were missing the `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` environment variables. Without these, the AWS CLI cannot authenticate against the Ceph RGW endpoint and the commands would fail. Added `export AWS_ACCESS_KEY_ID=mimiraccesskey` and `export AWS_SECRET_ACCESS_KEY=mimirsecretkey` before the bucket creation loop.

## Review Notes
- The CephObjectStore YAML, Mimir Helm values, radosgw-admin commands, Helm chart name/repo, remote write endpoint, X-Scope-OrgID header, pool naming convention, and RGW service naming were all verified as correct.
- The `aws s3 mb` commands assume execution from a context with network access to the Kubernetes cluster DNS (e.g., from within a pod or via port-forwarding). This is a common simplification in Kubernetes tutorials and not an error.
- The Prometheus remote write snippet uses camelCase (`remoteWrite`) which is correct for the Prometheus Operator / kube-prometheus-stack CRD format.
