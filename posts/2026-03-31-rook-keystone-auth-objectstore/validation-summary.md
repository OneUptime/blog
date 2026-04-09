# Validation Summary: How to Set Up Keystone Authentication for Rook Object Store

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Rook (Kubernetes Ceph operator)
- Ceph RGW (RADOS Gateway)
- OpenStack Keystone v3 (identity/authentication)
- Kubernetes Secrets
- CephObjectStore CRD (ceph.rook.io/v1)

## Sources Consulted
- Ceph source code (`src/common/options/rgw.yaml.in`) on `main` branch and v20.2.1 (Squid) release tag for RGW Keystone config parameter names
- Rook source code (`pkg/apis/ceph.rook.io/v1/types.go`, `GatewaySpec` struct) for CephObjectStore CRD schema
- Rook CephObjectStore CRD documentation: https://rook.io/docs/rook/latest/CRDs/Object-Storage/ceph-object-store-crd/
- OpenStack Keystone v3 Identity API specification for token endpoint and request/response format

## Issues Found

1. **`rgw_keystone_api_version` does not exist as a Ceph config parameter.** Modern Ceph only supports Keystone v3, and the API version is not configurable — it is determined by the URL path internally. Removed `ceph config set client.rgw rgw_keystone_api_version 3` from the toolbox commands section and removed `rgw_keystone_api_version: "3"` from the CephObjectStore YAML example.

2. **`rgw_keystone_revocation_interval` does not exist as a Ceph config parameter.** Removed `keystone_revocation_interval: "1200"` from the Kubernetes Secret example.

3. **`rgw_keystone_admin_token` is deprecated (removed in Ceph development branch).** The post also shows credential-based authentication (user/password), which is the recommended approach. Removed `keystone_admin_token: "your-admin-token"` from the Kubernetes Secret example to avoid encouraging use of a deprecated authentication method.

4. **Prerequisites incorrectly suggested Keystone v2 is supported.** Changed "token format (v2 or v3)" to note that modern Ceph RGW only supports Keystone v3.

## Review Notes
- The Kubernetes Secret shown in the post uses custom key names (e.g., `keystone_url` instead of `rgw_keystone_url`). These keys are not directly consumed by Rook's CephObjectStore CRD. If the intent is to use Rook's `rgwConfigFromSecret` feature, the keys should match actual Ceph config parameter names. However, the Secret could serve as a general credential store referenced by other tooling, so this is not necessarily wrong — just potentially confusing.
- The `rgw_keystone_admin_tenant` parameter is for Keystone v2 API. For Keystone v3, `rgw_keystone_admin_project` is the preferred parameter (it falls back to `_tenant` if not set). Both work, but `_project` is more correct for v3.
- The `ceph config set` commands use `client.rgw` which applies to all RGW daemons globally. For multi-store setups, more specific sections like `client.rgw.my-store` would be appropriate.
- The Keystone v3 token request JSON and header usage (`X-Subject-Token` in response, `X-Auth-Token` for subsequent requests) are correct.
- The CephObjectStore CRD structure including `spec.gateway.rgwConfig` and `apiVersion: ceph.rook.io/v1` are correct per Rook source code.
