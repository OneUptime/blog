# How to Configure KMS Integration for Ceph Encryption

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, KMS, Encryption, Vault, Security, Kubernetes

Description: Learn how to integrate Ceph with an external Key Management Service (KMS) like HashiCorp Vault for managing OSD and RGW encryption keys centrally and securely.

---

Integrating Ceph with an external Key Management Service (KMS) moves encryption key management out of the Ceph Monitor and into a dedicated secrets manager. This provides centralized key auditing, rotation policies, and revocation capabilities.

## Why Use a KMS?

The default BlueStore and RGW encryption stores keys in the Monitor's key-value store. While functional, this has limitations:
- Keys are co-located with the cluster they protect
- No centralized audit trail for key access
- Key rotation requires manual Ceph operations

An external KMS like HashiCorp Vault addresses all these concerns.

## Prerequisites

You need:
- A running HashiCorp Vault instance (or another KMS)
- Vault Kubernetes auth method enabled
- A Vault policy and role for Rook

Set up Vault for Rook:

```bash
# Enable Kubernetes auth in Vault
vault auth enable kubernetes

# Configure the auth method
vault write auth/kubernetes/config \
  kubernetes_host="https://kubernetes.default.svc" \
  kubernetes_ca_cert=@/var/run/secrets/kubernetes.io/serviceaccount/ca.crt

# Enable a KV v2 secrets engine at the "rook" mount path
vault secrets enable -path=rook kv-v2

# Create a policy for Rook
vault policy write rook-ceph - <<EOF
path "rook/data/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}
path "rook/metadata/*" {
  capabilities = ["read", "list"]
}
EOF

# Create a role binding the policy to the Rook service account
vault write auth/kubernetes/role/rook-ceph \
  bound_service_account_names=rook-ceph-operator \
  bound_service_account_namespaces=rook-ceph \
  token_policies=rook-ceph \
  token_ttl=1h
```

## Creating the Vault Token Secret

If using token-based auth (simpler for testing):

```bash
# Create a Vault token
VAULT_TOKEN=$(vault token create -policy=rook-ceph -format=json | jq -r .auth.client_token)

# Store as Kubernetes Secret
kubectl -n rook-ceph create secret generic rook-vault-token \
  --from-literal=token="$VAULT_TOKEN"
```

## Configuring KMS for OSD Encryption

Enable KMS in the CephCluster spec:

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
        VAULT_BACKEND: kv-v2
        VAULT_BACKEND_PATH: rook
        VAULT_SECRET_ENGINE: kv
        VAULT_AUTH_METHOD: kubernetes
        VAULT_AUTH_KUBERNETES_ROLE: rook-ceph
  storage:
    storageClassDeviceSets:
      - name: encrypted-set
        count: 3
        encrypted: true
```

## Configuring KMS for RGW SSE

Apply the same KMS config to the CephObjectStore:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephObjectStore
metadata:
  name: my-store
  namespace: rook-ceph
spec:
  security:
    kms:
      connectionDetails:
        KMS_PROVIDER: vault
        VAULT_ADDR: https://vault.example.com:8200
        VAULT_BACKEND: kv-v2
        VAULT_BACKEND_PATH: rook
        VAULT_SECRET_ENGINE: kv
        VAULT_AUTH_METHOD: kubernetes
        VAULT_AUTH_KUBERNETES_ROLE: rook-ceph
```

## Verifying KMS Connectivity

Check that Rook can reach the KMS:

```bash
# Look for KMS-related log messages in the operator
kubectl -n rook-ceph logs deploy/rook-ceph-operator | grep -i "kms\|vault"

# Verify secrets stored by Rook in Vault
vault kv list -mount=rook /
```

## Rotating Keys

Rook supports automatic key rotation via the `keyRotation` field in the CephCluster spec:

```yaml
spec:
  security:
    keyRotation:
      enabled: true
      schedule: "@weekly"
```

This schedules a CronJob that rotates OSD encryption keys on the defined schedule.

For RGW SSE-KMS keys stored in Vault, rotate them by writing a new version:

```bash
vault kv put -mount=rook rgw-keys/mykey value=$(openssl rand -hex 32)
```

## Summary

Integrating Ceph with a KMS decouples encryption key management from the Ceph cluster itself, providing audit trails, centralized rotation, and revocation capabilities. In Rook, KMS integration is configured via the `security.kms` field in both CephCluster and CephObjectStore resources. Vault's Kubernetes auth method provides a secure, credential-free way for Rook to fetch and store encryption keys.
