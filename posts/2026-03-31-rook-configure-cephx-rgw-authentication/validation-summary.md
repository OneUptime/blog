# Validation Summary: How to Configure CephX for RGW Authentication

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Kubernetes Ceph operator)
- Ceph RADOS Gateway (RGW)
- CephX authentication
- S3 API / radosgw-admin
- Kubernetes (kubectl)
- AWS CLI (for S3 endpoint testing)

## Sources Consulted
- Ceph source code — `src/pybind/mgr/cephadm/services/cephadmservice.py` (`RgwService.get_keyring()` method) on GitHub `main` and `reef` branches: https://github.com/ceph/ceph/blob/main/src/pybind/mgr/cephadm/services/cephadmservice.py
- Rook CephObjectStore CRD source — `pkg/apis/ceph.rook.io/v1/types.go` (`GatewaySpec` struct): https://github.com/rook/rook
- Rook official documentation — CephObjectStore CRD: https://rook.io/docs/rook/latest/CRDs/Object-Storage/ceph-object-store-crd/
- Ceph User Management documentation: https://docs.ceph.com/en/latest/rados/operations/user-management/
- CephX Config Reference: https://docs.ceph.com/en/latest/rados/configuration/auth-config-ref/

## Issues Found

1. **Code block language tag incorrect**: The `ceph auth get` output was labeled as ` ```json ` but the output is Ceph's native auth format, not JSON. Changed to a plain code block.

2. **RGW mon caps incorrect**: The post listed `caps mon = "allow rw"` but modern Ceph (cephadm, Reef+) grants RGW daemons `mon 'allow *'`. Fixed in both the example output and the `auth get-or-create` command.

3. **RGW osd caps incomplete**: The post listed `caps osd = "allow rwx"` but modern Ceph uses tag-scoped OSD access: `osd 'allow rwx tag rgw *=*'`. This is a meaningful security distinction — tag-based scoping limits RGW to only its own pools. Fixed in both the example output and the `auth get-or-create` command.

4. **Missing mgr caps in example output**: The `ceph auth get` output block omitted `caps mgr = "allow rw"`, which is part of the standard RGW daemon keyring. Added it to the output.

5. **Invalid CephObjectStore CRD field `spec.gateway.type`**: The YAML example included `type: s3` under `spec.gateway`, but this field does not exist in the Rook CephObjectStore CRD. RGW inherently supports S3 and Swift — there is no type selector. Removed.

6. **Invalid CephObjectStore CRD field `spec.gateway.keyName`**: The YAML example included `keyName: my-custom-rgw-key` under `spec.gateway`, but this field does not exist in the Rook CRD. Rook automatically creates and manages CephX keys for each CephObjectStore; there is no mechanism to specify a custom key name. Removed the fabricated field, updated the section heading and text to accurately explain that Rook handles key creation automatically, and added `metadataPool` and `dataPool` specs to make the YAML a complete, valid CephObjectStore definition.

## Review Notes
- The `radosgw-admin user create` and `radosgw-admin user modify` commands are correct and current.
- The S3 endpoint URL format `rook-ceph-rgw-<store-name>.<namespace>:<port>` follows the correct Rook service naming convention.
- The log inspection command using label `app=rook-ceph-rgw` is correct for selecting RGW pods.
- The post's core conceptual distinction between CephX (internal daemon auth) and S3/Swift credentials (external user auth) is accurate and well-explained.
- Older Ceph deployments (pre-cephadm) did use `mon 'allow rw'` and unscoped `osd 'allow rwx'`, so the original post may have been based on legacy documentation. The fixes align with current Ceph (Reef and later).
