# Validation Summary: How to Configure Mutual Authentication in Ceph

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph (CephX authentication protocol)
- Rook (Ceph operator for Kubernetes)
- Kubernetes (ConfigMaps, Secrets, Deployments)

## Sources Consulted
- Ceph official documentation on CephX authentication architecture: https://docs.ceph.com/en/latest/rados/configuration/auth-config-ref/
- Ceph official documentation on user management and capabilities: https://docs.ceph.com/en/latest/rados/operations/user-management/
- Rook documentation on Ceph configuration overrides: https://rook.io/docs/rook/latest/Storage-Configuration/Advanced/ceph-configuration/
- Kubernetes documentation on Secrets and volume mounts: https://kubernetes.io/docs/concepts/configuration/secret/

## Issues Found

1. **Deprecated `auth_supported` option in ConfigMap (was line 57)**: The `auth_supported` configuration option is deprecated in modern Ceph. The three specific options (`auth_cluster_required`, `auth_service_required`, `auth_client_required`) are the correct and recommended approach. Removed `auth_supported = cephx` from the ConfigMap example.

2. **Incorrect command in "Rotating Authentication Keys" section (was lines 122-125)**: The original text used `ceph auth caps` and labeled it as key rotation. However, `ceph auth caps` only modifies an entity's capabilities (permissions) — it does not regenerate the secret key. Replaced with the correct two-step approach: `ceph auth del` followed by `ceph auth get-or-create` with the same capabilities, which actually generates a new secret key.

## Review Notes
- The Deployment YAML in the "Using Kubernetes Secrets" section is intentionally abbreviated (missing `spec.selector` and `template.metadata.labels`). This is acceptable since the focus is on demonstrating the volume mount pattern for Ceph keyrings, not a complete Deployment spec.
- The restart command after applying the ConfigMap only shows restarting one monitor (`rook-ceph-mon-a`). In practice, all daemon deployments (all mons, OSDs, etc.) would need to be restarted for the config to take full effect. The surrounding text does say "restart relevant daemons" (plural), so the single command serves as an example rather than a complete procedure.
- The high-level explanation of CephX mutual authentication is a reasonable simplification of the Kerberos-style ticket exchange that CephX implements. It correctly captures the key concepts: ticket-based auth, shared secrets, and bidirectional verification.
