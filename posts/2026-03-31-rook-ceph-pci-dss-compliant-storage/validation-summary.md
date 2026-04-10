# Validation Summary: How to Set Up Ceph for PCI-DSS Compliant Storage

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rook (Kubernetes operator for Ceph)
- Ceph (distributed storage)
- Ceph RGW (RADOS Gateway / S3-compatible object storage)
- Ceph Messenger v2 (in-transit encryption)
- dm-crypt / LUKS (OSD encryption at rest)
- Kubernetes NetworkPolicy
- PCI-DSS (Payment Card Industry Data Security Standard)
- OpenSSL, nmap, sslscan (TLS testing tools)

## Sources Consulted
- Rook CephCluster CRD documentation — https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Rook Key Management System docs — https://rook.io/docs/rook/v1.9/Storage-Configuration/Advanced/key-management-system/
- Ceph Messenger v2 documentation — https://docs.ceph.com/en/quincy/rados/configuration/msgr2/
- Ceph RGW HTTP Frontends documentation — https://docs.ceph.com/en/quincy/radosgw/frontends/
- Ceph RGW Config Reference — https://docs.ceph.com/en/latest/radosgw/config-ref/
- Ceph RGW Bucket Policies documentation — https://docs.ceph.com/en/quincy/radosgw/bucketpolicy/
- Ceph Beast frontend source code — https://github.com/ceph/ceph/blob/main/src/rgw/rgw_asio_frontend.cc
- Ceph PR #7639 (rgw_log_http_headers feature) — https://github.com/ceph/ceph/pull/7639

## Issues Found
No technical issues found.

## Review Notes
- The bucket policy Principal ARN `arn:aws:iam:::user/pci-app` uses an empty tenant (three consecutive colons). This is syntactically correct for users created without a `--tenant` flag, but some older Ceph versions had edge-case issues with empty-tenant ARNs in bucket policies. Production deployments may benefit from explicitly assigning a named tenant.
- The RGW-specific config options (`rgw_enable_ops_log`, `rgw_enable_usage_log`, `rgw_log_http_headers`) are set on the `global` section, which works but is less precise than setting them on `client.rgw`. This is a style preference, not an error.
- The NetworkPolicy only restricts ingress; for full PCI-DSS network segmentation, egress restrictions would also be advisable. This is a scope consideration rather than a technical error.
