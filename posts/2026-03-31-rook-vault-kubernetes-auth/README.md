# How to Integrate HashiCorp Vault with Rook-Ceph (Kubernetes Auth)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Vault, Encryption, Kubernetes

Description: Configure Rook-Ceph to authenticate with HashiCorp Vault using Kubernetes service account tokens for automatic, token-renewal-free KMS integration.

---

## Overview

Vault's Kubernetes auth method uses Kubernetes service account JWT tokens to authenticate instead of static Vault tokens. This eliminates token management and renewal concerns, making it the recommended approach for production Rook-Ceph deployments. Vault validates the service account token against the Kubernetes API server.

## Step 1 - Enable Vault Kubernetes Auth

On the Vault server, enable and configure the Kubernetes auth method:

```bash
vault auth enable kubernetes

vault write auth/kubernetes/config \
  kubernetes_host="https://<kubernetes-api-server>:6443" \
  kubernetes_ca_cert=@/path/to/ca.crt \
  issuer="https://kubernetes.default.svc.cluster.local"
```

Get the Kubernetes CA certificate:

```bash
kubectl config view --raw --minify --flatten \
  -o jsonpath='{.clusters[0].cluster.certificate-authority-data}' | base64 --decode > ca.crt
```

## Step 2 - Create a Vault Role for Rook

```bash
vault policy write rook-ceph-kms - <<EOF
path "secret/data/rook-ceph/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}
path "secret/metadata/rook-ceph/*" {
  capabilities = ["list", "delete"]
}
EOF

vault write auth/kubernetes/role/rook-ceph-kms \
  bound_service_account_names=rook-ceph-operator,rook-ceph-default \
  bound_service_account_namespaces=rook-ceph \
  policies=rook-ceph-kms \
  ttl=1h
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
      "vault-k8s-auth": {
        "encryptionKMSType": "vault",
        "vaultAddress": "https://vault.example.com:8200",
        "vaultBackendPath": "secret/",
        "vaultAuthPath": "/v1/auth/kubernetes/login",
        "vaultRole": "rook-ceph-kms",
        "vaultAuthNamespace": "",
        "vaultCAFromSecret": "vault-ca-cert"
      }
    }
```

## Step 4 - Configure CephCluster with Kubernetes Auth

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
        VAULT_AUTH_METHOD: kubernetes
        VAULT_AUTH_KUBERNETES_ROLE: rook-ceph-kms
```

Note: With Kubernetes auth, `tokenSecretName` is not needed.

## Step 5 - Verify Authentication

Create an encrypted PVC and verify the key was stored in Vault:

```bash
# Check Vault for keys created by Rook
vault kv list secret/rook-ceph/

# Check CSI provisioner logs for successful Vault auth
kubectl logs -n rook-ceph deployment/csi-rbdplugin-provisioner -c csi-rbdplugin | grep -i vault
```

## Troubleshoot Authentication Failures

If provisioning fails with Vault auth errors:

```bash
# Check Vault audit logs
vault audit enable file file_path=/vault/logs/audit.log

# Verify service account exists
kubectl get serviceaccount rook-ceph-operator -n rook-ceph

# Test token auth manually
SA_TOKEN=$(kubectl create token rook-ceph-operator -n rook-ceph)
curl --request POST \
  --data "{\"jwt\": \"$SA_TOKEN\", \"role\": \"rook-ceph-kms\"}" \
  https://vault.example.com:8200/v1/auth/kubernetes/login
```

## Summary

Vault Kubernetes auth for Rook-Ceph uses Kubernetes service account tokens for automatic, credential-free KMS integration. Unlike static token auth, there is no TTL management or rotation needed - Vault validates each request against the live Kubernetes API. This approach is zero-maintenance and the recommended production configuration.
