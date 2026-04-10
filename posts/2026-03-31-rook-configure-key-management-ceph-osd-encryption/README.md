# How to Configure Key Management for Ceph OSD Encryption

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, KMS, Encryption, Key Management, Security

Description: Learn how to configure key management for Ceph OSD encryption in Rook, integrate with HashiCorp Vault or Kubernetes secrets, and manage encryption key lifecycle.

---

## Key Management Options in Rook

Rook supports two key management strategies for OSD encryption:

1. **Kubernetes Secrets** (default) - Keys stored as opaque Secrets in the `rook-ceph` namespace
2. **KMS Integration** - Keys stored in an external KMS like HashiCorp Vault or IBM Key Protect

## Default: Kubernetes Secret-Based Key Management

By default, Rook generates a random key per OSD and stores it as a Kubernetes Secret:

```bash
kubectl -n rook-ceph get secrets | grep encryption
```

This approach is simple but ties key security to Kubernetes RBAC. If an attacker gains access to the `rook-ceph` namespace, they can retrieve all keys.

## KMS Integration with HashiCorp Vault

### Step 1: Configure Vault

Enable the KV secrets engine in Vault:

```bash
vault secrets enable -path=rook/osd kv-v2
vault policy write rook-osd-policy - <<EOF
path "rook/osd/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}
EOF
```

### Step 2: Create the Vault Token Secret

```bash
kubectl -n rook-ceph create secret generic rook-vault-token \
  --from-literal=token=<vault-token>
```

### Step 3: Configure Rook to Use Vault

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  security:
    kms:
      connectionDetails:
        KMS_PROVIDER: "vault"
        VAULT_ADDR: "https://vault.example.com:8200"
        VAULT_SECRET_ENGINE: "kv"
        VAULT_BACKEND_PATH: "rook/osd"
        VAULT_AUTH_METHOD: "token"
        VAULT_CACERT: "vault-ca-cert"
      tokenSecretName: rook-vault-token
  storage:
    config:
      encryptedDevice: "true"
```

### Step 4: Verify Keys in Vault

After OSDs are created, confirm keys are stored:

```bash
vault kv list rook/osd/
vault kv get rook/osd/osd-0
```

## Using Vault Kubernetes Auth (Recommended for Production)

Instead of static tokens, use Kubernetes service account authentication:

```bash
vault auth enable kubernetes
vault write auth/kubernetes/config \
  kubernetes_host="https://$KUBERNETES_HOST"
```

Then configure the role:

```bash
vault write auth/kubernetes/role/rook-ceph \
  bound_service_account_names=rook-ceph-osd \
  bound_service_account_namespaces=rook-ceph \
  policies=rook-osd-policy \
  ttl=1h
```

## Key Rotation

Rook does not natively support automatic key rotation for existing OSDs. For rotation:
1. Cordon and drain the OSD node
2. Delete the OSD pod and PVC
3. Wipe the device
4. Re-provision the OSD (a new key is generated)

## Summary

Ceph OSD encryption key management in Rook defaults to Kubernetes Secrets but can be upgraded to HashiCorp Vault for centralized, auditable key lifecycle management. For production clusters, use Vault with Kubernetes auth (not static tokens) to eliminate long-lived credentials. Store CA certificates as Kubernetes Secrets and reference them in the CephCluster spec to enable TLS-secured communication with Vault.
