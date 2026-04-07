# Validation Summary: How to Set Admin Entry Point Configuration in Ceph RGW

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph RGW (RADOS Gateway)
- Ceph configuration system (`ceph config`)
- `radosgw-admin` CLI
- Rook Ceph Operator
- Kubernetes NetworkPolicy
- Kubernetes ConfigMap (rook-config-override)

## Sources Consulted
- Ceph official documentation on RGW Admin Ops API: https://docs.ceph.com/en/latest/radosgw/adminops/
- Ceph RGW configuration reference (`rgw_admin_entry`, `rgw_enable_apis`): https://docs.ceph.com/en/latest/radosgw/config-ref/
- Rook documentation on CephObjectStore and RGW configuration: https://rook.io/docs/rook/latest/Storage-Configuration/Object-Storage-RGW/object-storage/
- Kubernetes NetworkPolicy specification: https://kubernetes.io/docs/concepts/services-networking/network-policies/

## Issues Found
1. **NetworkPolicy port incorrect for Rook context**: The NetworkPolicy example used port `7480`, which is the default standalone Ceph RGW (Beast frontend) port. Since the post is in a Rook/Kubernetes context (evidenced by the service URL `rook-ceph-rgw-my-store.rook-ceph.svc`), the correct RGW pod port is `8080` (Rook's default). NetworkPolicy operates at the pod level, so this was changed from `7480` to `8080`.

2. **Misleading summary claim about `rgw_enable_apis`**: The summary stated that admin "must be explicitly included in `rgw_enable_apis`", which implies it is not present by default. In reality, the default value of `rgw_enable_apis` already includes `admin` (along with `s3`, `s3website`, `swift`, `swift_auth`, `sts`, `iam`, `notifications`). Updated the summary to clarify that `admin` is included by default and only needs to be explicitly listed if overriding the default value.

## Review Notes
- The `Authorization: AWS4-HMAC-SHA256 ...` header in the curl examples is shown as a placeholder, which is acceptable for illustration. In practice, users would need to generate proper AWS Signature Version 4 signed requests.
- The `rook-config-override` ConfigMap approach is correct for Rook but applies globally. For per-store configuration, users should use the CephObjectStore CR's `gateway` settings where possible.
- The `radosgw-admin` commands shown are all correct and current.
