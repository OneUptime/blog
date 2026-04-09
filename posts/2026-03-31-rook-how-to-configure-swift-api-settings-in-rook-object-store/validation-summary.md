# Validation Summary: How to Configure Swift API Settings in Rook Object Store

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Rook (Kubernetes operator for Ceph)
- Ceph RADOS Gateway (RGW)
- OpenStack Swift API
- CephObjectStore CRD
- radosgw-admin CLI
- python-swiftclient
- Kubernetes

## Sources Consulted
- Rook CephObjectStore CRD source code (`pkg/apis/ceph.rook.io/v1/types.go` — `SwiftSpec` struct, `ObjectStoreSpec` struct)
- Rook CephObjectStore CRD documentation (`Documentation/CRDs/Object-Storage/ceph-object-store-crd.md`)
- Ceph RGW Swift Authentication documentation — https://docs.ceph.com/en/latest/radosgw/swift/auth/
- Ceph RGW Swift Java examples (shows `/auth/1.0` path) — https://docs.ceph.com/en/latest/radosgw/swift/java/
- Ceph RGW Config Reference (`rgw_swift_url_prefix`, `rgw_swift_auth_entry`) — https://docs.ceph.com/en/reef/radosgw/config-ref/
- radosgw-admin man page — https://docs.ceph.com/en/latest/man/8/radosgw-admin/
- python-swiftclient CLI documentation — https://docs.openstack.org/python-swiftclient/latest/cli/index.html

## Issues Found

### 1. Incorrect description of where Swift config lives (Lines 13, 17)
- **What was wrong:** The text said Swift configuration is "through the CephObjectStore CRD's gateway spec" and "in the `gateway` section." In reality, `protocols` is a sibling of `gateway` under `spec`, not nested inside it.
- **What was changed:** Updated to reference the `protocols` spec/section instead of `gateway`.

### 2. `urlPrefix` value had incorrect leading slash (Lines 40, 74, 151)
- **What was wrong:** The blog used `urlPrefix: /swift` (with leading slash). The official Rook CRD documentation and Ceph's `rgw_swift_url_prefix` config option both default to `swift` without a leading slash.
- **What was changed:** Changed all occurrences of `urlPrefix: /swift` to `urlPrefix: swift`. Also updated the prose description of the default value.

### 3. Incorrect Swift auth URL path (Lines 120, 129, 134)
- **What was wrong:** The blog used `/swift/auth/v1` as the Swift authentication endpoint. This conflates the Swift data URL prefix (`/swift`) with the auth entry point (`/auth`). The correct Swift v1 auth path is `/auth/1.0`, controlled by the `rgw_swift_auth_entry` config option (default: `auth`).
- **What was changed:** Changed all occurrences of `http://<rgw-endpoint>/swift/auth/v1` to `http://<rgw-endpoint>/auth/1.0`.

## Review Notes
- The CRD field names (`accountInUrl`, `urlPrefix`, `versioningEnabled`) and YAML structure are all verified correct against the Rook source code.
- The `radosgw-admin` commands for user creation, subuser creation, and Swift key generation are all correct with valid flags.
- The python-swiftclient CLI flags (`-A`, `-U`, `-K`) are correct for v1 authentication.
- Swift API is enabled by default in RGW (via `rgw_enable_apis`), so the `protocols.swift` section configures behavior rather than enabling/disabling the API.
- The Keystone integration section is brief but accurate — Keystone configuration is done through the `CephCluster` spec, not the `CephObjectStore`.
