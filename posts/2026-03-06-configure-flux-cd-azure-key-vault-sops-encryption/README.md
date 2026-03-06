# How to Configure Flux CD with Azure Key Vault for SOPS Encryption

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux-cd, azure, key-vault, sops, encryption, gitops, kubernetes, secrets

Description: A practical guide to encrypting Kubernetes secrets with SOPS and Azure Key Vault, integrated with Flux CD for secure GitOps secret management.

---

## Introduction

Storing Kubernetes secrets in Git repositories is a core requirement for GitOps, but plaintext secrets in version control pose a serious security risk. Mozilla SOPS (Secrets OPerationS) solves this by encrypting secret values while leaving keys and metadata in plaintext, making diffs readable and merge conflicts manageable.

When combined with Azure Key Vault, SOPS uses Azure-managed encryption keys so that only authorized identities can decrypt secrets. Flux CD has built-in support for SOPS decryption, enabling fully automated secret management through GitOps.

## Prerequisites

- An AKS cluster with Flux CD installed
- Azure CLI (v2.50 or later)
- SOPS CLI (v3.8 or later)
- Flux CLI (v2.2 or later)
- Workload identity enabled on the AKS cluster

## Architecture Overview

```mermaid
graph LR
    A[Developer] -->|sops encrypt| B[Encrypted Secret in Git]
    B -->|git push| C[Git Repository]
    C -->|pull| D[Flux Source Controller]
    D --> E[Flux Kustomize Controller]
    E -->|decrypt using| F[Azure Key Vault]
    F -->|decrypted secret| G[Kubernetes Secret]
```

## Step 1: Create an Azure Key Vault

```bash
# Set variables
export RESOURCE_GROUP="rg-fluxcd-demo"
export LOCATION="eastus"
export KEY_VAULT_NAME="kv-fluxcd-sops"
export KEY_NAME="sops-key"

# Create a Key Vault with RBAC authorization
az keyvault create \
  --resource-group $RESOURCE_GROUP \
  --name $KEY_VAULT_NAME \
  --location $LOCATION \
  --enable-rbac-authorization true
```

## Step 2: Create an Encryption Key in Key Vault

SOPS uses an RSA key stored in Azure Key Vault for encryption and decryption operations.

```bash
# Create an RSA key for SOPS encryption
az keyvault key create \
  --vault-name $KEY_VAULT_NAME \
  --name $KEY_NAME \
  --kty RSA \
  --size 4096 \
  --ops encrypt decrypt wrapKey unwrapKey

# Get the key identifier URL (needed for SOPS configuration)
export KEY_ID=$(az keyvault key show \
  --vault-name $KEY_VAULT_NAME \
  --name $KEY_NAME \
  --query "key.kid" \
  --output tsv)

echo "Key ID: $KEY_ID"
# Output example: https://kv-fluxcd-sops.vault.azure.net/keys/sops-key/abc123...
```

## Step 3: Set Up Workload Identity for Key Vault Access

The Flux kustomize-controller needs access to the Key Vault key for decryption.

```bash
# Set variables
export CLUSTER_NAME="aks-fluxcd-demo"
export IDENTITY_NAME="id-flux-sops"

# Create a user-assigned managed identity
az identity create \
  --resource-group $RESOURCE_GROUP \
  --name $IDENTITY_NAME \
  --location $LOCATION

# Get the identity client ID and principal ID
export IDENTITY_CLIENT_ID=$(az identity show \
  --resource-group $RESOURCE_GROUP \
  --name $IDENTITY_NAME \
  --query "clientId" \
  --output tsv)

export IDENTITY_PRINCIPAL_ID=$(az identity show \
  --resource-group $RESOURCE_GROUP \
  --name $IDENTITY_NAME \
  --query "principalId" \
  --output tsv)

# Get the Key Vault resource ID
export KV_RESOURCE_ID=$(az keyvault show \
  --name $KEY_VAULT_NAME \
  --query "id" \
  --output tsv)

# Grant the Key Vault Crypto User role to the managed identity
# This allows encrypt/decrypt operations on keys
az role assignment create \
  --assignee $IDENTITY_PRINCIPAL_ID \
  --role "Key Vault Crypto User" \
  --scope $KV_RESOURCE_ID
```

## Step 4: Create Federated Credential

Link the managed identity to the Flux kustomize-controller service account.

```bash
# Get the OIDC issuer URL
export OIDC_ISSUER=$(az aks show \
  --resource-group $RESOURCE_GROUP \
  --name $CLUSTER_NAME \
  --query "oidcIssuerProfile.issuerUrl" \
  --output tsv)

# Create the federated credential
az identity federated-credential create \
  --name "flux-kustomize-controller" \
  --identity-name $IDENTITY_NAME \
  --resource-group $RESOURCE_GROUP \
  --issuer $OIDC_ISSUER \
  --subject "system:serviceaccount:flux-system:kustomize-controller" \
  --audiences "api://AzureADTokenExchange"
```

## Step 5: Patch the Kustomize Controller Service Account

```yaml
# File: clusters/my-cluster/flux-system/patches/sops-workload-identity.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: kustomize-controller
  namespace: flux-system
  annotations:
    # Associate with the managed identity that has Key Vault access
    azure.workload.identity/client-id: "<IDENTITY_CLIENT_ID>"
  labels:
    azure.workload.identity/use: "true"
```

Update the Flux kustomization to apply the patch:

```yaml
# File: clusters/my-cluster/flux-system/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - gotk-components.yaml
  - gotk-sync.yaml
patches:
  - path: patches/sops-workload-identity.yaml
    target:
      kind: ServiceAccount
      name: kustomize-controller
```

## Step 6: Configure SOPS

Create a `.sops.yaml` configuration file at the root of your GitOps repository. This tells SOPS which key to use and which files to encrypt.

```yaml
# File: .sops.yaml
creation_rules:
  # Encrypt all files matching *-secret.yaml in any directory
  - path_regex: .*-secret\.yaml$
    azure_keyvault: "https://kv-fluxcd-sops.vault.azure.net/keys/sops-key"
    # Only encrypt the 'data' and 'stringData' fields in Kubernetes secrets
    encrypted_regex: "^(data|stringData)$"

  # Encrypt all files in the secrets/ directory
  - path_regex: secrets/.*\.yaml$
    azure_keyvault: "https://kv-fluxcd-sops.vault.azure.net/keys/sops-key"
    encrypted_regex: "^(data|stringData)$"
```

## Step 7: Encrypt a Kubernetes Secret

Create a secret manifest and encrypt it with SOPS before committing to Git.

```bash
# Create a plaintext secret manifest
cat > database-secret.yaml <<EOF
apiVersion: v1
kind: Secret
metadata:
  name: database-credentials
  namespace: default
type: Opaque
stringData:
  username: admin
  password: super-secret-password-123
  connection-string: "Server=myserver.database.windows.net;Database=mydb"
EOF

# Encrypt the secret using SOPS
# You must be logged into Azure CLI with permissions to the Key Vault key
sops --encrypt --in-place database-secret.yaml

# Verify the file is encrypted
cat database-secret.yaml
```

After encryption, the file will look like this:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: database-credentials
  namespace: default
type: Opaque
stringData:
  username: ENC[AES256_GCM,data:abcdef==,iv:...,tag:...,type:str]
  password: ENC[AES256_GCM,data:ghijkl==,iv:...,tag:...,type:str]
  connection-string: ENC[AES256_GCM,data:mnopqr==,iv:...,tag:...,type:str]
sops:
  kms: []
  azure_kv:
    - vault_url: https://kv-fluxcd-sops.vault.azure.net
      name: sops-key
      version: abc123...
  # Additional SOPS metadata follows
```

## Step 8: Configure Flux Kustomization for SOPS Decryption

Tell Flux to decrypt SOPS-encrypted files during reconciliation.

```yaml
# File: clusters/my-cluster/apps/kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: apps
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./apps
  prune: true
  # Enable SOPS decryption for this Kustomization
  decryption:
    provider: sops
```

## Step 9: Commit and Push Encrypted Secrets

```bash
# Add the encrypted secret to Git
git add database-secret.yaml .sops.yaml
git commit -m "Add encrypted database credentials"
git push origin main
```

## Step 10: Verify Decryption Works

```bash
# Force reconciliation
flux reconcile kustomization apps

# Check if the secret was created with decrypted values
kubectl get secret database-credentials -n default -o yaml

# Verify the value is decrypted (base64 encoded in the cluster)
kubectl get secret database-credentials -n default \
  -o jsonpath='{.data.username}' | base64 -d
# Output: admin
```

## Editing Encrypted Secrets

To modify an encrypted secret, use `sops` to open it in your editor:

```bash
# Open the encrypted file for editing
# SOPS will decrypt it, open your editor, and re-encrypt on save
sops database-secret.yaml

# Or decrypt to stdout for viewing
sops --decrypt database-secret.yaml
```

## Multi-Environment Key Configuration

For different encryption keys per environment, extend the `.sops.yaml` file:

```yaml
# File: .sops.yaml
creation_rules:
  # Production secrets use the production Key Vault
  - path_regex: environments/production/.*-secret\.yaml$
    azure_keyvault: "https://kv-prod-sops.vault.azure.net/keys/sops-key"
    encrypted_regex: "^(data|stringData)$"

  # Staging secrets use the staging Key Vault
  - path_regex: environments/staging/.*-secret\.yaml$
    azure_keyvault: "https://kv-staging-sops.vault.azure.net/keys/sops-key"
    encrypted_regex: "^(data|stringData)$"

  # Default fallback for development
  - path_regex: .*-secret\.yaml$
    azure_keyvault: "https://kv-dev-sops.vault.azure.net/keys/sops-key"
    encrypted_regex: "^(data|stringData)$"
```

## Troubleshooting

### Decryption Failures

Check the kustomize-controller logs:

```bash
kubectl logs -n flux-system deployment/kustomize-controller \
  --tail=100 | grep -i "sops\|decrypt\|error"
```

### Workload Identity Issues

Verify the service account annotations:

```bash
kubectl get serviceaccount kustomize-controller -n flux-system -o yaml
```

### Key Vault Access Denied

Verify the role assignment:

```bash
az role assignment list \
  --assignee $IDENTITY_PRINCIPAL_ID \
  --scope $KV_RESOURCE_ID \
  --output table
```

### SOPS Version Mismatch

Ensure the SOPS version used locally matches what Flux supports:

```bash
# Check local SOPS version
sops --version

# Check Flux's built-in SOPS version
flux version
```

## Conclusion

Using SOPS with Azure Key Vault and Flux CD provides a secure, auditable, and GitOps-native approach to managing Kubernetes secrets. Encrypted secrets can be safely stored in Git repositories, and Flux automatically decrypts them during reconciliation using workload identity federation. This eliminates the need for external secret management operators while keeping your secrets secure at rest in version control.
