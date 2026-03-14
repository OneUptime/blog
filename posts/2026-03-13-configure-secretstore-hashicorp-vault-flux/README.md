# How to Configure SecretStore for HashiCorp Vault with Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, External Secrets Operator, HashiCorp Vault, Secrets Management

Description: Configure an ESO SecretStore for HashiCorp Vault using Flux CD, enabling Kubernetes workloads to consume Vault-hosted secrets through GitOps-managed authentication and access policies.

---

## Introduction

HashiCorp Vault is the industry-standard secret management platform for multi-cloud and on-premises environments. Its Kubernetes auth method allows pods to authenticate using their ServiceAccount tokens, making integration with the External Secrets Operator both secure and operationally simple. When you manage the `SecretStore` configuration through Flux CD, Vault connectivity becomes a first-class GitOps resource.

Unlike cloud-native secret stores, Vault requires more upfront configuration: enabling the Kubernetes auth method, creating policies, and creating roles that bind Kubernetes service accounts to Vault policies. This guide walks through the full setup, from Vault configuration to Flux-managed `SecretStore` resources.

This guide covers configuring a `SecretStore` for HashiCorp Vault using Kubernetes service account authentication, managed by Flux CD.

## Prerequisites

- External Secrets Operator deployed via Flux HelmRelease
- HashiCorp Vault cluster accessible from the Kubernetes cluster (self-hosted or HCP Vault)
- Vault CLI configured with admin credentials
- `flux` and `kubectl` CLI tools

## Step 1: Configure Vault Kubernetes Auth Method

```bash
# Enable the Kubernetes auth method in Vault
vault auth enable kubernetes

# Configure the Kubernetes auth method with cluster details
vault write auth/kubernetes/config \
  kubernetes_host="https://$(kubectl get svc kubernetes -n default \
    -o jsonpath='{.spec.clusterIP}'):443" \
  kubernetes_ca_cert=@/var/run/secrets/kubernetes.io/serviceaccount/ca.crt

# Create a Vault policy for ESO to read secrets
vault policy write eso-policy - <<EOF
path "secret/data/myapp/*" {
  capabilities = ["read"]
}
path "secret/metadata/myapp/*" {
  capabilities = ["read", "list"]
}
EOF

# Create a Vault role binding the ESO Kubernetes SA to the policy
vault write auth/kubernetes/role/eso-role \
  bound_service_account_names=external-secrets \
  bound_service_account_namespaces=external-secrets \
  policies=eso-policy \
  ttl=1h
```

## Step 2: Configure the SecretStore for Vault (Kubernetes Auth)

```yaml
# clusters/my-cluster/external-secrets/secretstore-vault.yaml
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: hashicorp-vault
  namespace: default
spec:
  provider:
    vault:
      # Vault server URL (use HTTPS in production)
      server: "https://vault.vault-system.svc.cluster.local:8200"
      # KV secrets engine path
      path: "secret"
      # Vault KV version (v2 is recommended)
      version: "v2"
      # CA certificate for TLS verification (if self-signed)
      caBundle: |-
        LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0t...
      auth:
        kubernetes:
          # Vault role created above
          role: eso-role
          # Mount path of the Kubernetes auth method
          mountPath: kubernetes
          serviceAccountRef:
            name: external-secrets
            namespace: external-secrets
```

## Step 3: Configure SecretStore with Vault Token (Static Auth)

For simpler setups or testing, use a static Vault token stored as a Kubernetes Secret:

```yaml
# clusters/my-cluster/external-secrets/vault-token-secret.yaml
# Encrypt with SOPS before committing to Git
apiVersion: v1
kind: Secret
metadata:
  name: vault-token
  namespace: external-secrets
type: Opaque
stringData:
  # A Vault token with the eso-policy attached
  token: "s.REPLACE_WITH_SOPS_ENCRYPTED_TOKEN"
```

```yaml
# clusters/my-cluster/external-secrets/secretstore-vault-token.yaml
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: hashicorp-vault-token
  namespace: default
spec:
  provider:
    vault:
      server: "https://vault.vault-system.svc.cluster.local:8200"
      path: "secret"
      version: "v2"
      auth:
        tokenSecretRef:
          name: vault-token
          namespace: external-secrets
          key: token
```

## Step 4: Configure SecretStore with AppRole Auth

AppRole is recommended for automated systems accessing Vault from outside Kubernetes:

```yaml
# clusters/my-cluster/external-secrets/secretstore-vault-approle.yaml
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: hashicorp-vault-approle
  namespace: default
spec:
  provider:
    vault:
      server: "https://vault.vault-system.svc.cluster.local:8200"
      path: "secret"
      version: "v2"
      auth:
        appRole:
          path: approle
          roleId: "YOUR_ROLE_ID"
          secretRef:
            name: vault-approle-secret
            namespace: external-secrets
            key: secretId
```

## Step 5: Manage via Flux Kustomization

```yaml
# clusters/my-cluster/external-secrets/kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: vault-secret-stores
  namespace: flux-system
spec:
  interval: 10m
  path: ./clusters/my-cluster/external-secrets
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  dependsOn:
    - name: external-secrets
```

## Step 6: Verify and Test

```bash
# Check SecretStore status
kubectl get secretstore hashicorp-vault -n default

# Test reading a secret from Vault
kubectl apply -f - <<EOF
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: test-vault-secret
  namespace: default
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: hashicorp-vault
    kind: SecretStore
  target:
    name: test-vault-k8s-secret
  data:
    - secretKey: db-password
      remoteRef:
        # Path within the KV engine (without the 'secret/data' prefix)
        key: myapp/database
        property: password
EOF

kubectl get secret test-vault-k8s-secret -n default -o jsonpath='{.data.db-password}' | base64 -d
```

## Best Practices

- Use the Kubernetes auth method over token auth in production; tokens expire and require rotation, while Kubernetes auth is automatically renewed.
- Scope Vault policies to the minimum required secret paths using exact paths or glob patterns.
- Enable Vault audit logging to track all reads by the ESO service account for compliance purposes.
- Use Vault namespaces (Enterprise) to isolate secret stores between teams or environments.
- Regularly rotate AppRole secret IDs and Vault tokens if you must use static auth.

## Conclusion

Configuring a HashiCorp Vault `SecretStore` through Flux CD brings GitOps discipline to your most sensitive infrastructure integration. The Kubernetes auth method provides a strong, automatically renewed authentication mechanism, while Flux ensures the `SecretStore` configuration is version-controlled, consistently applied, and always in sync with your Vault access policies.
