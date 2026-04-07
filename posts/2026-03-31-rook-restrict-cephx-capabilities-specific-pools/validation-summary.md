# Validation Summary: How to Restrict CephX Capabilities to Specific Pools

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph (CephX authentication and authorization)
- Rook (Ceph operator for Kubernetes)
- kubectl (Kubernetes CLI)
- RADOS (Ceph object storage layer)

## Sources Consulted
- Ceph official documentation on user management and CephX capabilities: https://docs.ceph.com/en/latest/rados/operations/user-management/
- Ceph auth subsystem and capability syntax: https://docs.ceph.com/en/latest/rados/configuration/auth-config-ref/
- Ceph `rados` CLI tool documentation: https://docs.ceph.com/en/latest/man/8/rados/
- Rook toolbox documentation: https://rook.io/docs/rook/latest/Troubleshooting/ceph-toolbox/

## Issues Found
1. **Verification command used `osd pool stats` instead of `rados`**: The original verification example used `ceph osd pool stats app-b-data` to test that a restricted client is denied access. However, `osd pool stats` is a monitor-level read command, and since the client has `mon 'allow r'`, this command would likely succeed — it does not exercise OSD-level pool restrictions. Changed to use `rados put` to attempt actual object I/O on the unauthorized pool, which correctly tests OSD capability enforcement.

2. **Misleading comment on multi-pool example**: The comment said "Read access to production, read-write to staging" but the pool names were `app-a-data` and `app-b-data`, which don't correspond to production/staging environments. Updated the comment to accurately describe what the capabilities do.

## Review Notes
- The `ceph auth get-key` output is redirected to `/tmp/app-a.key` on the host, and `$(cat /tmp/app-a.key)` is evaluated on the host before being passed into the container via kubectl exec. This works but could confuse readers who expect file operations to happen inside the container. This is a minor clarity issue, not a technical error.
- The expected error message for the `rados put` denial may vary slightly depending on Ceph version (e.g., "Operation not permitted" vs "Permission denied"), but the operation will fail as described.
