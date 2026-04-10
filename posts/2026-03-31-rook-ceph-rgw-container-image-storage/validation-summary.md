# Validation Summary: How to Use Ceph RGW for Container Image Storage

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook-Ceph (CephObjectStore CRD)
- Ceph RADOS Gateway (RGW)
- radosgw-admin CLI
- Harbor container registry (Helm deployment)
- Docker Registry v2 (Distribution)
- AWS CLI (S3-compatible operations)
- Kubernetes (kubectl)

## Sources Consulted
- Rook Ceph Object Store CRD documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Object-Storage-RGW/object-storage/
- Ceph radosgw-admin documentation: https://docs.ceph.com/en/latest/radosgw/admin/
- Harbor Helm chart values reference: https://github.com/goharbor/harbor-helm
- Docker Distribution Registry configuration: https://distribution.github.io/distribution/about/configuration/
- AWS CLI S3 API reference: https://docs.aws.amazon.com/cli/latest/reference/s3api/

## Issues Found
No technical issues found.

## Review Notes
- The `aws s3api create-bucket` and `aws s3 ls` commands assume that AWS CLI credentials (`AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`) are already configured to point to the RGW endpoint with the `REGACCESSKEY`/`REGSECRETKEY` credentials. This is a reasonable implicit prerequisite, but readers unfamiliar with the AWS CLI may need to run `aws configure` or export environment variables first.
- The CephObjectStore YAML, Harbor Helm values, and Docker Registry v2 config all use correct field names and structure for their respective tools.
- The Rook service naming convention `rook-ceph-rgw-<store-name>.<namespace>` is correctly applied throughout the post.
- The `secure: false` setting in both Harbor and Registry configs is consistent with the HTTP (non-TLS) RGW endpoint on port 80. Production deployments should consider enabling TLS.
