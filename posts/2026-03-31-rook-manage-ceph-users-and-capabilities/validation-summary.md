# Validation Summary: How to Manage Ceph Users and Capabilities

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Ceph (CephX authentication system)
- Rook (Ceph operator for Kubernetes)
- Kubernetes (kubectl, Secrets)
- RADOS Gateway (radosgw-admin)

## Sources Consulted
- Ceph official documentation: User Management (https://docs.ceph.com/en/latest/rados/operations/user-management/)
- Ceph official documentation: CephX authorization and capabilities
- Ceph official documentation: radosgw-admin usage (https://docs.ceph.com/en/latest/radosgw/admin/)
- Kubernetes documentation: kubectl exec reference

## Issues Found
1. **"allow/deny syntax" was incorrect** (line 53): CephX capabilities are purely allow-based. There is no `deny` keyword in the CephX capability syntax. Security is enforced by only granting the minimum necessary permissions; everything not explicitly allowed is implicitly denied. Changed "allow/deny syntax" to "allow-based syntax".

2. **`-it` flags in variable capture command** (line 88): The `kubectl exec -it` flags were used inside a `$()` command substitution to capture keyring output into a variable. The `-t` flag allocates a pseudo-TTY, which injects carriage return characters (`\r`) into the captured output, corrupting the Kubernetes Secret data. Removed `-it` flags from the capture command (changed to just `kubectl exec`). Also removed the redundant `-o /dev/stdout` since `ceph auth get` outputs to stdout by default.

## Review Notes
- The `ceph auth caps` command overwrites all capabilities for the user (it is not additive). The post's usage is correct, but users should be aware that any caps not specified in the command will be removed. This is a potential improvement for a future update.
- The introductory paragraph mentions capabilities controlling access on "monitors, OSDs, and MDS daemons" but omits the `mgr` (manager) daemon, which is covered later in the capability syntax section. This is a minor inconsistency but not a factual error.
- All other commands (`ceph auth list`, `ceph auth get`, `ceph auth get-or-create`, `ceph auth caps`, `ceph auth del`, `ceph auth get-key`, `radosgw-admin user create`) were verified as correct with proper syntax and flags.
