# Validation Summary: How to Enable Virtual Host-Style Bucket Access in Rook

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Rook (Kubernetes operator for Ceph)
- Ceph RGW (RADOS Gateway)
- S3-compatible object storage
- Kubernetes (kubectl, Secrets, Deployments)
- DNS wildcard configuration
- TLS/SSL wildcard certificates
- AWS CLI (S3 commands)

## Sources Consulted
- Rook GitHub repository CephObjectStore CRD type definitions (`rook/rook` — `pkg/apis/ceph.rook.io/v1/types.go`)
- Rook design documentation for virtual host-style bucket access (`design/ceph/object/virtual-host-style-bucket-access.md`)
- Rook object store constants and labels (`pkg/operator/ceph/object/objectstore.go`)
- Ceph RGW configuration reference for `rgw_dns_name` and `rgw_resolve_cname`
- AWS documentation on path-style vs virtual host-style S3 access

## Issues Found

### 1. `hosting` field incorrectly nested under `gateway` (FIXED)
- **What was wrong:** Both YAML examples placed the `hosting` section (containing `advertiseEndpoint` and `dnsNames`) nested under `spec.gateway`. In the Rook CephObjectStore CRD, `hosting` is a **top-level field** under `spec`, not under `spec.gateway`. The `GatewaySpec` struct does not contain a `hosting` field.
- **What was changed:** Moved `hosting` out from under `gateway` to be a sibling at the `spec` level in both the main CephObjectStore YAML example and the TLS configuration YAML snippet. Also updated the introductory text from "in the gateway hosting section" to "in the `hosting` section of the CephObjectStore spec."
- **Why:** Using the incorrect YAML structure would cause the `hosting` fields to be silently ignored by the Rook operator, meaning virtual host-style access would not be configured.

## Review Notes
- The `rgw_resolve_cname` option is a valid Ceph RGW configuration parameter but is not used or referenced by Rook itself. It is not strictly required for virtual host-style access when using the `hosting.dnsNames` CRD field, but setting it is not harmful.
- When `hosting.dnsNames` is configured in the CRD, Rook automatically sets the `--rgw-dns-name` flag on the RGW daemon. The manual `ceph config set client.rgw rgw_dns_name` step in the "Enabling in RGW Configuration" section may be redundant if the CRD hosting field is already configured. However, showing the manual approach is not incorrect and can be useful for debugging or environments where the CRD field alone is insufficient.
- The AWS path-style deprecation claim (2020) is accurate — AWS announced in September 2020 that path-style requests would no longer be supported for new buckets created after September 30, 2020.
- The `app=rook-ceph-rgw` label selector for restarting RGW pods is correct per the Rook source code constants.
