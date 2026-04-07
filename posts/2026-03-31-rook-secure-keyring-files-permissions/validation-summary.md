# Validation Summary: How to Secure Keyring Files with Proper Permissions

## Status
validated

## Post Type
Tutorial / Security Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (keyring authentication)
- Kubernetes RBAC (Roles, RoleBindings)
- Kubernetes Secrets and volume mounts
- External Secrets Operator with HashiCorp Vault
- Kubernetes API server audit logging
- Linux file permissions (chmod, chown)

## Sources Consulted
- Ceph documentation on authentication and keyrings: https://docs.ceph.com/en/latest/rados/operations/user-management/
- Rook documentation on security: https://rook.io/docs/rook/latest/
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes Secrets volume projection documentation: https://kubernetes.io/docs/concepts/configuration/secret/#using-secrets-as-files-from-a-pod
- External Secrets Operator API reference: https://external-secrets.io/latest/api/externalsecret/
- Kubernetes audit logging documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/

## Issues Found

1. **ExternalSecret API version outdated**: The post used `external-secrets.io/v1beta1` which is deprecated. The External Secrets Operator graduated to `v1` in version 0.9.0 (released 2023). Changed to `external-secrets.io/v1`.

2. **Misleading audit command**: The original audit section used `kubectl get events -n rook-ceph | grep -i "secret\|keyring"` to check Secret access. Kubernetes events do not track Secret read operations — this requires API server audit logging with an appropriate audit policy. Replaced the command with an example audit policy snippet (`audit.k8s.io/v1` Policy) and a command to search actual audit logs.

## Review Notes
- The RBAC example correctly uses `resourceNames` to scope access to a specific Secret, which is a best practice.
- The `defaultMode: 0400` in the volume mount is correct — YAML 1.1 (used by kubectl) interprets leading-zero integers as octal, so this correctly sets read-only for owner (decimal 256).
- The post correctly recommends `0600` for keyring files on Linux nodes, matching Ceph's own documentation.
- The advice to use an external secrets manager for production is sound but could note that Kubernetes Secrets are base64-encoded, not encrypted, unless encryption at rest is configured.
