# Validation Summary: How to Debug CephObjectStore Connectivity Issues in Rook

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph Object Gateway (RGW)
- CephObjectStore CRD
- Kubernetes (kubectl, Services, Endpoints, Secrets, DNS)
- AWS CLI (S3-compatible endpoint testing)
- radosgw-admin CLI
- Mermaid (flowchart diagram)

## Sources Consulted
- Rook documentation on CephObjectStore: https://rook.io/docs/rook/latest/Storage-Configuration/Object-Storage-RGW/object-storage/
- Rook documentation on Object Store User CRD: https://rook.io/docs/rook/latest/Storage-Configuration/Object-Storage-RGW/object-storage-user/
- Ceph documentation on radosgw-admin: https://docs.ceph.com/en/latest/man/8/radosgw-admin/
- Ceph documentation on RGW debug logging: https://docs.ceph.com/en/latest/radosgw/troubleshooting/
- AWS CLI S3 command reference: https://docs.aws.amazon.com/cli/latest/reference/s3/
- Kubernetes documentation on kubectl: https://kubernetes.io/docs/reference/kubectl/

## Issues Found

1. **Mermaid flowchart typo (line 25):** The decision node `J{403 / 403?}` had "403" duplicated. Changed to `J{401 / 403?}` since the two auth-related HTTP status codes returned by RGW are 401 (Unauthorized) and 403 (Forbidden).

2. **AWS CLI credentials not passed (Step 5):** The variables were named `ACCESS_KEY` and `SECRET_KEY`, but the AWS CLI does not recognize those variable names. The `aws s3 ls` command would fail to authenticate because the credentials were never passed to it. Changed the variable names to `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` (the standard environment variables the AWS CLI auto-detects) and added `export` so they are available to the `aws` subprocess.

## Review Notes
- All kubectl commands use correct syntax and flags.
- The Rook resource naming conventions (e.g., `rook-ceph-rgw-my-store`, `rook-ceph-object-user-my-store-my-user`) are accurate.
- The `radosgw-admin` commands are syntactically correct and use valid subcommands and flags.
- The `ceph config set client.rgw debug_rgw 20` command is correct for enabling RGW debug logging; level 20 is the maximum verbosity.
- The `kubectl patch` command for scaling RGW instances uses valid merge patch syntax against the CephObjectStore CRD spec.
- The debug flow diagram is logically sound and covers the main failure modes.
