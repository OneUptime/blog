# How to Integrate HashiCorp Vault with Rook-Ceph (Token Auth)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Vault, Encryption, Security

Description: Integrate HashiCorp Vault with Rook-Ceph using token-based authentication to manage OSD and CSI volume encryption keys.

---

## Overview

HashiCorp Vault is the most widely used KMS backend for Rook-Ceph encryption. Token authentication is the simplest Vault auth method - a long-lived Vault token is stored as a Kubernetes Secret, and Rook uses it to read and write encryption keys. This approach is suitable for environments where Vault is not running in Kubernetes.

## Prerequisites

- HashiCorp Vault accessible from the Kubernetes cluster
- A Vault token with read/write access to the secrets path
- Rook-Ceph with CSI encryption support enabled

## Step 1 - Configure Vault

Enable the KV secrets engine and create a policy for Rook:

```bash
# Enable KV secrets engine at path secret/
vault secrets enable -path=secret kv-v2

# Create a Vault policy for Rook encryption keys
vault policy write rook-ceph-encryption - <<EOF
path "secret/data/rook-ceph/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}
path "secret/metadata/rook-ceph/*" {
  capabilities = ["list", "delete"]
}
EOF

# Create a token with the policy
vault token create -policy=rook-ceph-encryption -ttl=0 -orphan
```

## Step 2 - Store the Vault Token as a Kubernetes Secret

```bash
kubectl create secret generic rook-vault-token \
  --from-literal=token="<vault-token>" \
  -n rook-ceph
```

## Step 3 - Configure the KMS ConfigMap

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: rook-ceph-csi-kms-config
  namespace: rook-ceph
data:
  config.json: |-
    {
      "vault-token-kms": {
        "encryptionKMSType": "vault",
        "vaultAddress": "https://vault.example.com:8200",
        "vaultBackend": "v2",
        "vaultBackendPath": "secret/",
        "vaultDestroyKeys": "true",
        "vaultCAFromSecret": "vault-ca-cert",
        "vaultTokenSecretName": "rook-vault-token"
      }
    }
```

```bash
kubectl apply -f kms-config.yaml
```

## Step 4 - Reference the KMS in the CephCluster

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
        KMS_PROVIDER: vault
        VAULT_ADDR: https://vault.example.com:8200
        VAULT_BACKEND_PATH: secret
        VAULT_AUTH_METHOD: token
      tokenSecretName: rook-vault-token
```

## Step 5 - Verify Vault Integration

Create an encrypted StorageClass that references the KMS:

```yaml
parameters:
  encrypted: "true"
  encryptionKMSID: vault-token-kms
```

Create a test PVC and check Vault for the created key:

```bash
vault kv list secret/rook-ceph/
```

You should see key entries for each encrypted volume.

## Token Renewal Considerations

Vault tokens expire unless configured as non-expiring (`-ttl=0`). For tokens with TTLs, implement a renewal CronJob:

```bash
vault token renew <token>
```

Or switch to Kubernetes auth (covered in a separate guide) which handles renewal automatically.

## Summary

Vault token authentication is the fastest way to integrate HashiCorp Vault with Rook-Ceph encryption. A Vault token stored as a Kubernetes Secret provides Rook access to the KV secrets engine for storing and retrieving per-volume encryption keys. For production environments, consider migrating to Kubernetes auth method for automatic token renewal.
