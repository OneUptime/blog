# Validation Summary: How to Understand CephX Security Considerations

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ceph (CephX authentication protocol)
- Rook (Ceph operator for Kubernetes)
- Kubernetes RBAC
- Ceph messenger v2 (msgr2) encryption

## Sources Consulted
- Ceph official documentation: CephX authentication architecture (https://docs.ceph.com/en/latest/rados/operations/user-management/)
- Ceph official documentation: `ceph auth` CLI subcommands (https://docs.ceph.com/en/latest/man/8/ceph/)
- Ceph official documentation: msgr2 encryption configuration (https://docs.ceph.com/en/latest/rados/configuration/msgr2/)
- Rook official documentation: CephCluster CRD network settings (https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/)
- Kubernetes RBAC documentation (https://kubernetes.io/docs/reference/access-authn-authz/rbac/)

## Issues Found

### 1. `ceph auth rotate` command does not exist (Key Rotation Policy section)
- **What was wrong:** The post used `ceph auth rotate client.myapp` to rotate a CephX key. This command does not exist in Ceph. There is no `rotate` subcommand under `ceph auth`.
- **What was changed:** Replaced with the correct approach: `ceph auth del client.myapp` followed by `ceph auth get-or-create client.myapp mon 'allow r' osd 'allow rw pool=myapp-data'` to delete and recreate the auth entry with a new key.
- **Why:** The valid `ceph auth` subcommands are: `add`, `caps`, `del`/`rm`, `export`, `get`, `get-key`, `get-or-create`, `get-or-create-key`, `import`, `ls`/`list`, and `print-key`. There is no built-in key rotation command; rotation must be done manually via delete + recreate.

### 2. `ceph auth print-key` replaced with `ceph auth get-key` (Key Rotation Policy section)
- **What was wrong:** The post used `ceph auth print-key client.myapp`. While `print-key` works as a legacy alias, `get-key` is the canonical/preferred form in current Ceph documentation.
- **What was changed:** Replaced `ceph auth print-key` with `ceph auth get-key`.
- **Why:** Modern Ceph documentation uses `get-key` as the standard command.

### 3. Rook CephCluster encryption field path incorrect (Enabling Messenger v2 Encryption section)
- **What was wrong:** The post used `spec.network.encryption.enabled: true`. Since Rook v1.10+, this field is nested under `spec.network.connections.encryption.enabled`.
- **What was changed:** Added the `connections` level to the YAML path: `spec.network.connections.encryption.enabled: true`.
- **Why:** The `connections` key was introduced in Rook v1.10 to group encryption and compression settings. The old path without `connections` is no longer valid in current Rook versions.

## Review Notes
- The key rotation approach (delete + recreate) causes a brief window where the client has no valid auth entry. Production environments should plan for this by having the application handle reconnection, or by creating a new user before removing the old one. This is a limitation of Ceph's auth system, not an error in the post.
- The `jq` query for auditing overprivileged users correctly references the `.auth_dump` JSON structure from `ceph auth ls --format json`.
- All Kubernetes RBAC YAML is syntactically correct and uses the proper `rbac.authorization.k8s.io/v1` API version.
- The `chmod 600` / `chown root:root` keyring permissions advice and the `find` command for detecting world-readable keyrings are both correct.
