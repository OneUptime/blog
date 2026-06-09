# Validation Summary: How to Handle Kubernetes Secrets

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Secrets (Opaque, kubernetes.io/tls, kubernetes.io/dockerconfigjson, etc.)
- kubectl CLI (create secret, get, describe, patch, edit, delete, rollout, auth can-i)
- Kubernetes YAML manifests (Secret, Deployment, Role, RoleBinding)
- Kubernetes EncryptionConfiguration (apiserver.config.k8s.io/v1)
- Kubernetes audit Policy (audit.k8s.io/v1)
- Kubernetes RBAC (rbac.authorization.k8s.io/v1)
- External Secrets Operator (external-secrets.io)
- HashiCorp Vault (as ESO backend)
- Bitnami Sealed Secrets / kubeseal
- Base64 encoding utilities
- Helm checksum-annotation pattern

## Sources Consulted
- Kubernetes official docs: Secrets concept page — https://kubernetes.io/docs/concepts/configuration/secret/
- Kubernetes official docs: Encrypting Confidential Data at Rest — https://kubernetes.io/docs/tasks/administer-cluster/encrypt-data/
- Kubernetes official docs: Auditing — https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- Kubernetes RBAC docs — https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- External Secrets Operator docs — https://external-secrets.io/ (v1 GA released November 2025)
- External Secrets Operator stability/support — https://external-secrets.io/latest/introduction/stability-support/
- Bitnami Sealed Secrets releases — https://github.com/bitnami-labs/sealed-secrets/releases
- Kubernetes KMS v2 GA announcement — https://kubernetes.io/blog/2023/05/16/kms-v2-moves-to-beta/
- Direct base64 encode/decode verification for the example values in the post

## Issues Found
1. **Outdated External Secrets Operator API version.** The post used `external-secrets.io/v1beta1` for `SecretStore` and `ExternalSecret`. ESO reached GA with v1.0.0 in November 2025, so the stable API for both resources is `external-secrets.io/v1`. Updated both manifests to `external-secrets.io/v1`. v1beta1 still works via conversion webhooks but is on a deprecation path, so a February 2026 post should reference the GA API.
2. **Outdated Sealed Secrets controller version.** The post pointed at `v0.24.0` (released early 2024), which is significantly behind by February 2026. Updated the install URL to `v0.27.0`, a more current release line. The URL pattern itself was correct.
3. **Discouraged encryption-at-rest provider.** The post recommended `aescbc` for the EncryptionConfiguration example. Kubernetes documentation discourages `aescbc` because it uses CBC + PKCS#7 padding without an integrity check, making it vulnerable to padding oracle attacks (kubernetes/kubernetes#73514). Switched the example to `aesgcm`, which provides authenticated encryption with a comparable configuration shape (same key format and rotation story).

## Review Notes
- Base64 examples in the post were verified by direct encoding: `admin` → `YWRtaW4=`, `S3cur3P@ssw0rd!` → `UzNjdXIzUEBzc3cwcmQh`, `password` (no newline) → `cGFzc3dvcmQ=`, and `password\n` → `cGFzc3dvcmQK`. All match.
- All `kubectl` commands (create generic/tls/docker-registry, get/describe/edit/patch/delete, rollout restart/status, auth can-i, dry-run pipelines) are syntactically correct and use current flag names.
- Secret type list, 1 MB size limit, tmpfs-on-node behavior for mounted secrets, `defaultMode` 0644 default, and the ~1 minute kubelet sync period for mounted Secret updates are all accurate.
- EncryptionConfiguration `apiVersion: apiserver.config.k8s.io/v1` is correct (GA since Kubernetes 1.13).
- Helm checksum-annotation pattern in the comment matches the canonical snippet from the Helm chart developer guide.
- For maximum production security, KMS v2 (GA since Kubernetes 1.29) is preferred over any local-key provider including `aesgcm`. The post intentionally shows the simpler self-managed-key path; a future revision could add a brief KMS v2 pointer alongside the local-key example.
- The post correctly notes that Secrets are base64-encoded (not encrypted) by default in etcd, that environment-variable Secret injection requires a Pod restart to pick up updates, and that volume-mounted Secrets refresh automatically within the kubelet sync interval.
