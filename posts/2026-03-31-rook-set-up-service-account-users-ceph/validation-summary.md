# Validation Summary: How to Set Up Service Account Users in Ceph

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph (authentication system, `cephx`)
- Rook (Ceph operator for Kubernetes, toolbox deployment)
- Kubernetes (Secrets, RBAC Roles/RoleBindings, ServiceAccounts, kubectl)
- jq (JSON processing for audit queries)

## Sources Consulted
- Ceph official documentation: User Management (`ceph auth` commands, capability syntax) — https://docs.ceph.com/en/latest/rados/operations/user-management/
- Kubernetes RBAC documentation — https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes Secrets documentation — https://kubernetes.io/docs/concepts/configuration/secret/
- Rook toolbox documentation — https://rook.io/docs/rook/latest/Troubleshooting/ceph-toolbox/

## Issues Found
No technical issues found.

## Review Notes
- The `ceph auth get-or-create` commands use correct capability syntax for mon, osd, and mgr daemons.
- The `ceph auth print-key` command is the correct way to extract just the secret key for a given entity.
- The `ceph auth ls --format json` output structure with `.auth_dump[].entity` is the correct jq path for Ceph's JSON auth dump.
- The `ceph auth del` command is the correct way to remove a Ceph auth entity.
- The RBAC YAML is well-formed: correct apiVersion (`rbac.authorization.k8s.io/v1`), proper use of `resourceNames` to scope secret access, and correct RoleBinding structure.
- The `userID` key in the Kubernetes Secret stores the full entity name (`client.webapp-prod`). Note that Ceph CSI drivers typically expect userID without the `client.` prefix (e.g., `webapp-prod`). Since this secret is used for custom application access rather than CSI integration, this is not incorrect, but users integrating with Ceph CSI should be aware of the distinction.
