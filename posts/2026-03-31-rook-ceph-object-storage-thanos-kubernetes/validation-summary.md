# Validation Summary: How to Set Up Ceph Object Storage for Thanos on Kubernetes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph RGW (RADOS Gateway / S3-compatible object storage)
- Thanos (long-term Prometheus storage)
- Kubernetes (container orchestration)
- Prometheus (monitoring)
- Helm (Kubernetes package manager)
- AWS CLI (used for S3-compatible bucket operations)

## Sources Consulted
- Rook CephObjectStore CRD documentation: https://rook.io/docs/rook/latest/CRDs/Object-Storage/ceph-object-store-crd/
- Thanos S3 object store configuration: https://thanos.io/tip/thanos/storage.md/#s3
- Thanos sidecar component documentation: https://thanos.io/tip/components/sidecar.md/
- radosgw-admin user management: https://docs.ceph.com/en/latest/radosgw/admin/
- Bitnami Thanos Helm chart: https://github.com/bitnami/charts/tree/main/bitnami/thanos

## Issues Found
No technical issues found.

## Review Notes
- The `aws s3 mb` and `aws s3 ls` commands use an in-cluster service DNS name as the endpoint URL (`rook-ceph-rgw-thanos-store.rook-ceph:80`), which will only resolve from within the Kubernetes cluster. Users would need to run these from a pod (e.g., the rook-ceph-tools pod) or set up port-forwarding.
- The AWS CLI commands assume credentials are already configured (e.g., via `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` environment variables). This is standard practice and not an error, but readers new to this workflow may need that context.
- Thanos v0.36.0 is used; readers should check for newer releases as the project evolves.
