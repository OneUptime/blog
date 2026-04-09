# Validation Summary: How to Fix AUTH_INSECURE_GLOBAL_ID_RECLAIM Health Check in Ceph

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Ceph (Pacific 16.2.1, Octopus 15.2.11)
- Rook Ceph Operator
- Kubernetes (kubectl)
- Helm
- Ceph Python bindings (rados, rbd, cephfs)

## Sources Consulted
- CVE-2021-20288 — Ceph authentication vulnerability allowing global_id reuse without re-authentication (https://nvd.nist.gov/vuln/detail/CVE-2021-20288)
- Ceph documentation on AUTH_INSECURE_GLOBAL_ID_RECLAIM health check (https://docs.ceph.com/en/latest/rados/operations/health-checks/#auth-insecure-global-id-reclaim)
- Ceph configuration reference for `auth_allow_insecure_global_id_reclaim` (https://docs.ceph.com/en/latest/rados/configuration/auth-config-ref/)
- Ceph Python bindings (`rados` module) documentation (https://docs.ceph.com/en/latest/rados/api/python/)
- Rook Ceph Helm chart documentation (https://rook.io/docs/rook/latest/Helm-Charts/operator-chart/)

## Issues Found
1. **Incorrect Python module for checking Ceph client version (line 62)**: The command used `import ceph; print(ceph.__version__)`, but there is no top-level `ceph` Python module. The Ceph Python bindings are provided via the `rados`, `rbd`, and `cephfs` modules. Fixed to `import rados; print(rados.version())`, which returns the librados version tuple and is the standard way to check the Ceph client library version from Python.

## Review Notes
- The post correctly identifies CVE-2021-20288 and the two-phase mitigation approach introduced by the Ceph team.
- The `ceph auth ls | grep client` command (line 56) lists all auth entities but does not specifically identify clients using insecure reclaim — `ceph health detail` is the authoritative source for that. However, listing auth entities can still be useful context for identifying which clients exist, so this was left as-is.
- The post omits mention of Nautilus (14.2.20), which also received the fix, but since Nautilus is long EOL this is not an error.
- The `ceph health mute` command was introduced in Pacific (16.2.x); readers on older releases should be aware it may not be available to them.
