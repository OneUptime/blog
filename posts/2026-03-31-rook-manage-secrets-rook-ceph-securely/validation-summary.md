# Validation Summary: How to Manage Secrets for Rook-Ceph Securely

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rook-Ceph (Kubernetes storage orchestrator)
- Kubernetes RBAC (ClusterRole, RoleBinding)
- Kubernetes Encryption at Rest (EncryptionConfiguration)
- HashiCorp Vault (external KMS integration)
- Bitnami Sealed Secrets (kubeseal)
- Ceph authentication system (ceph auth)
- Kubernetes audit logging

## Sources Consulted
- Rook Ceph Key Management System documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Advanced/key-management-system/
- Kubernetes Encrypting Confidential Data at Rest documentation: https://kubernetes.io/docs/tasks/administer-cluster/encrypt-data/
- Ceph auth command reference: https://docs.ceph.com/en/latest/rados/operations/user-management/
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes audit logging documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- HashiCorp Vault Kubernetes auth method: https://developer.hashicorp.com/vault/docs/auth/kubernetes
- Bitnami Sealed Secrets documentation: https://github.com/bitnami-labs/sealed-secrets

## Issues Found

### 1. Vault KMS config mixed mutually exclusive auth methods
**What was wrong:** The CephCluster Vault KMS configuration specified both `VAULT_AUTH_METHOD: kubernetes` with `VAULT_AUTH_KUBERNETES_ROLE` and `tokenSecretName` simultaneously. These are mutually exclusive authentication approaches — token-based auth uses `tokenSecretName`, while Kubernetes auth uses the service account.
**What was changed:** Removed `VAULT_AUTH_METHOD` and `VAULT_AUTH_KUBERNETES_ROLE` fields to keep the example consistent with token-based auth, which matches the token creation command shown below it.
**Why:** Mixing both auth approaches is incorrect per Rook documentation and would confuse readers about which auth method is actually being used.

### 2. Invalid Ceph monitor capability `allow command endpoint`
**What was wrong:** The `ceph auth get-or-create` command used `mon "allow r, allow command endpoint"`. The capability `allow command endpoint` is not a valid Ceph monitor capability — there is no Ceph command called `endpoint`.
**What was changed:** Replaced with `mon 'profile rbd'`, which is the standard monitor capability profile for RBD CSI provisioners.
**Why:** `profile rbd` is the documented and correct mon capability for RBD clients, granting the appropriate set of monitor permissions.

### 3. `ceph auth get-or-create` does not rotate keys
**What was wrong:** The secret rotation section used `ceph auth get-or-create` which returns the existing key if the entity already exists — it does not generate a new key, making it ineffective for rotation.
**What was changed:** Added a `ceph auth del` step before key creation to force generation of a new key, and switched to `ceph auth get-or-create-key` which outputs only the raw key string (suitable for scripting).
**Why:** Without deleting the existing entity first, `get-or-create` simply returns the old key, defeating the purpose of rotation.

### 4. File path mismatch between pod and local filesystem
**What was wrong:** The `-o /tmp/new-csi-key` flag wrote the key to a file inside the rook-ceph-tools pod, but the subsequent `kubectl create secret --from-file=/tmp/new-csi-key` command tried to read from the local filesystem. Additionally, `/tmp/userid` was never created anywhere.
**What was changed:** Replaced with shell variable capture (`NEW_KEY=$(...)`) and `--from-literal` flags to avoid filesystem path confusion between the pod and the local machine.
**Why:** The original commands would fail because the files don't exist on the local filesystem where kubectl runs.

### 5. Removed `-it` flag from non-interactive exec
**What was wrong:** `kubectl exec -it` allocates a TTY and stdin, which interferes with capturing command output into a variable.
**What was changed:** Removed `-it` flags from the exec commands.
**Why:** When capturing output programmatically, interactive mode can corrupt the output with terminal control characters.

## Review Notes
- The EncryptionConfiguration uses `apiserver.config.k8s.io/v1` which is the stable API version (GA since Kubernetes 1.29). Older clusters may need `v1alpha1` or `v1beta1`.
- The audit logging snippet is a fragment of a full audit policy; a complete policy requires the `apiVersion: audit.k8s.io/v1` and `kind: Policy` wrapper. This is acceptable for a blog post showing the relevant rule.
- The RBAC section uses a ClusterRole, which grants permissions cluster-wide. A namespace-scoped Role with a RoleBinding would be more restrictive and appropriate for the rook-ceph namespace specifically. This is a design choice rather than a technical error.
- The secret rotation approach (delete + recreate) has a brief window where the credentials don't exist. In production, consider creating a new user with a different name, updating the secret, then deleting the old user for zero-downtime rotation.
