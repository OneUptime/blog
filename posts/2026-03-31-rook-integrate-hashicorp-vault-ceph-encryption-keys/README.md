# How to Integrate HashiCorp Vault for Ceph Encryption Keys

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, HashiCorp Vault, Encryption, KMS, Security

Description: Learn how to integrate HashiCorp Vault with Rook/Ceph for centralized encryption key management, covering both OSD encryption and RGW object encryption scenarios.

---

## Why Use Vault with Ceph?

HashiCorp Vault provides centralized, auditable key management with features that Kubernetes Secrets lack: key versioning, audit logging, dynamic secrets, and fine-grained access policies. Integrating Vault with Ceph covers two main use cases:

1. **OSD Encryption** - LUKS keys for BlueStore at-rest encryption
2. **RGW Object Encryption** - SSE-KMS keys for S3 object encryption

## Vault Setup

### Enable the KV Secrets Engine (for OSD Keys)

```bash
vault secrets enable -path=rook/osd kv-v2
```

### Enable the Transit Engine (for RGW SSE-KMS)

```bash
vault secrets enable transit
vault write -f transit/keys/ceph-rgw-key type=aes256-gcm96
```

### Create Policies

Policy for OSD key management:

```bash
vault policy write rook-osd-policy - <<EOF
path "rook/osd/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}
EOF
```

Policy for RGW encryption:

```bash
vault policy write rook-rgw-policy - <<EOF
path "transit/keys/ceph-rgw-key" {
  capabilities = ["read"]
}
path "transit/encrypt/ceph-rgw-key" {
  capabilities = ["update"]
}
path "transit/decrypt/ceph-rgw-key" {
  capabilities = ["update"]
}
EOF
```

## Kubernetes Auth Method (Recommended)

```bash
vault auth enable kubernetes
vault write auth/kubernetes/config \
  kubernetes_host="https://kubernetes.default.svc"

vault write auth/kubernetes/role/rook-ceph-osd \
  bound_service_account_names=rook-ceph-osd \
  bound_service_account_namespaces=rook-ceph \
  policies=rook-osd-policy \
  ttl=1h
```

## Configuring Rook for Vault OSD Encryption

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
        VAULT_BACKEND: "v2"
        VAULT_BACKEND_PATH: "rook/osd"
        VAULT_AUTH_METHOD: "kubernetes"
        VAULT_AUTH_MOUNT_PATH: "kubernetes"
        VAULT_AUTH_KUBERNETES_ROLE: "rook-ceph-osd"
      tokenSecretName: ""
  storage:
    config:
      encryptedDevice: "true"
```

## Verifying Vault Integration

After deploying OSDs, confirm keys appear in Vault:

```bash
vault kv list rook/osd/
```

Expected output:
```text
Keys
----
osd-0
osd-1
osd-2
```

## Auditing Key Access

Enable Vault audit logging:

```bash
vault audit enable file file_path=/var/log/vault/audit.log
```

View audit logs to see when Ceph accessed keys:

```bash
tail -f /var/log/vault/audit.log | jq 'select(.type == "request") | {time, path: .request.path, operation: .request.operation}'
```

## Summary

Integrating HashiCorp Vault with Rook/Ceph provides centralized, auditable key management for both OSD LUKS encryption and RGW SSE-KMS. Use Kubernetes auth instead of static tokens to avoid long-lived credentials. Enable Vault audit logging to track all key access, and use the Transit secrets engine for RGW encryption to support key rotation without re-encrypting stored objects.
