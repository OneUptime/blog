# How to Configure TLS for Vault Integration in Rook

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Vault, TLS, Security

Description: Configure mutual TLS for secure communication between Rook-Ceph CSI drivers and HashiCorp Vault using CA certificates and client certificates.

---

## Overview

Production Vault deployments require TLS to protect key material in transit. Rook-Ceph CSI drivers support full TLS verification including CA certificate validation and optional mutual TLS (client certificates). This guide covers storing certificates as Kubernetes Secrets and referencing them in the KMS configuration.

## Store the Vault CA Certificate

Create a Kubernetes Secret containing the Vault CA certificate:

```bash
kubectl create secret generic vault-ca-cert \
  --from-file=cert=/path/to/vault-ca.crt \
  -n rook-ceph
```

For client certificate authentication (mutual TLS):

```bash
kubectl create secret generic vault-client-cert \
  --from-file=cert=/path/to/client.crt \
  -n rook-ceph

kubectl create secret generic vault-client-key \
  --from-file=key=/path/to/client.key \
  -n rook-ceph
```

## Configure TLS in the KMS ConfigMap

Reference the certificate secrets in the KMS configuration:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: rook-ceph-csi-kms-config
  namespace: rook-ceph
data:
  config.json: |-
    {
      "vault-tls-kms": {
        "encryptionKMSType": "vault",
        "vaultAddress": "https://vault.example.com:8200",
        "vaultBackendPath": "secret/",
        "vaultAuthPath": "/v1/auth/kubernetes/login",
        "vaultRole": "rook-ceph-kms",
        "vaultCAFromSecret": "vault-ca-cert",
        "vaultClientCertFromSecret": "vault-client-cert",
        "vaultClientCertKeyFromSecret": "vault-client-key",
        "vaultTLSServerName": "vault.example.com"
      }
    }
```

## CephCluster TLS Connection Details

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
        VAULT_TLS_SERVER_NAME: vault.example.com
        VAULT_CACERT: vault-ca-cert
        VAULT_CLIENT_CERT: vault-client-cert
        VAULT_CLIENT_KEY: vault-client-key
```

## Verify TLS Connectivity

Test TLS connectivity from inside the cluster to Vault:

```bash
kubectl run tls-test --rm -it --image=alpine --restart=Never -- sh

# Inside the pod
apk add curl
curl --cacert /path/to/ca.crt https://vault.example.com:8200/v1/sys/health
```

Check the CSI provisioner pod can reach Vault:

```bash
kubectl exec -n rook-ceph deployment/csi-rbdplugin-provisioner -c csi-rbdplugin -- \
  curl --cacert /tmp/vault-ca/cert https://vault.example.com:8200/v1/sys/health
```

## Certificate Rotation

When Vault certificates expire, update the Kubernetes Secrets:

```bash
kubectl create secret generic vault-ca-cert \
  --from-file=cert=/path/to/new-vault-ca.crt \
  -n rook-ceph --dry-run=client -o yaml | kubectl apply -f -
```

Restart the CSI pods to pick up the new certificates:

```bash
kubectl rollout restart deployment/csi-rbdplugin-provisioner -n rook-ceph
kubectl rollout restart daemonset/csi-rbdplugin -n rook-ceph
```

## Disable TLS Verification (Development Only)

For development or testing with self-signed certificates:

```json
{
  "vault-dev-kms": {
    "encryptionKMSType": "vault",
    "vaultAddress": "https://vault.dev.local:8200",
    "vaultCAVerify": "false"
  }
}
```

Never use `vaultCAVerify: "false"` in production environments.

## Summary

Configuring TLS for Vault integration in Rook-Ceph protects encryption key material in transit. Storing CA and client certificates as Kubernetes Secrets and referencing them via the KMS ConfigMap fields provides full mutual TLS without hardcoding certificates into manifests. Certificate rotation requires only a Secret update and CSI pod restart.
