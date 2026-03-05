# How to Encrypt Secrets with SOPS and Azure Key Vault for Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Secret, SOPS, Azure Key Vault, Encryption

Description: Learn how to encrypt Kubernetes secrets using SOPS with Azure Key Vault for secure GitOps workflows with Flux CD on AKS.

---

Azure Key Vault provides a cloud-managed key management service that integrates with SOPS for encrypting Kubernetes secrets in Flux CD GitOps workflows. This approach leverages Azure's managed infrastructure for key storage and access control through Azure Active Directory, making it the natural choice for teams running on Azure Kubernetes Service (AKS).

## Prerequisites

- A Kubernetes cluster with Flux CD bootstrapped (AKS recommended)
- `sops` CLI installed (v3.7+)
- `az` CLI configured and authenticated
- An Azure subscription with Key Vault access
- `kubectl` access to your cluster

## Step 1: Create an Azure Key Vault and Key

Create an Azure Key Vault and generate an encryption key for SOPS.

```bash
# Create a resource group (if not already existing)
az group create --name rg-flux-sops --location eastus

# Create an Azure Key Vault
az keyvault create \
  --name flux-sops-vault \
  --resource-group rg-flux-sops \
  --location eastus

# Create an RSA key for SOPS encryption
az keyvault key create \
  --vault-name flux-sops-vault \
  --name sops-key \
  --kty RSA \
  --size 4096
```

## Step 2: Get the Key Vault Key URL

Retrieve the full versioned URL of the key, which SOPS needs for encryption.

```bash
# Get the key URL (including version)
az keyvault key show \
  --vault-name flux-sops-vault \
  --name sops-key \
  --query key.kid \
  --output tsv

# Output example:
# https://flux-sops-vault.vault.azure.net/keys/sops-key/abcdef1234567890abcdef1234567890
```

Save this URL as you will need it for both the SOPS encryption command and the repository-level configuration file.

## Step 3: Configure Identity for the Kustomize Controller

On AKS, use Azure Workload Identity to grant the kustomize-controller access to the Key Vault key.

```bash
# Enable workload identity on the AKS cluster
az aks update \
  --resource-group rg-flux-sops \
  --name my-aks-cluster \
  --enable-oidc-issuer \
  --enable-workload-identity

# Create a managed identity
az identity create \
  --name flux-kustomize-identity \
  --resource-group rg-flux-sops \
  --location eastus

# Get the managed identity client ID
export IDENTITY_CLIENT_ID=$(az identity show \
  --name flux-kustomize-identity \
  --resource-group rg-flux-sops \
  --query clientId -o tsv)

# Grant the identity access to unwrap (decrypt) keys
az keyvault set-policy \
  --name flux-sops-vault \
  --object-id $(az identity show --name flux-kustomize-identity --resource-group rg-flux-sops --query principalId -o tsv) \
  --key-permissions decrypt unwrapKey
```

Alternatively, store Azure credentials as a Kubernetes secret for non-AKS clusters.

```bash
# Alternative: Create a service principal and store credentials
az ad sp create-for-rbac --name flux-sops-sp --role "Key Vault Crypto User" \
  --scopes /subscriptions/<sub-id>/resourceGroups/rg-flux-sops/providers/Microsoft.KeyVault/vaults/flux-sops-vault

# Create Kubernetes secret with service principal credentials
kubectl create secret generic sops-azure \
  --namespace=flux-system \
  --from-literal=tenantId=<tenant-id> \
  --from-literal=clientId=<client-id> \
  --from-literal=clientSecret=<client-secret>
```

## Step 4: Create and Encrypt a Secret

Create a Kubernetes secret and encrypt it using SOPS with the Azure Key Vault key.

```yaml
# secret.yaml - Plaintext secret
apiVersion: v1
kind: Secret
metadata:
  name: azure-app-secret
  namespace: default
type: Opaque
stringData:
  connection-string: "Server=myserver.database.windows.net;Database=mydb;User=admin;Password=P@ssw0rd"
  storage-key: "abc123storagekey456"
```

```bash
# Encrypt the secret using the Azure Key Vault key URL
sops --encrypt \
  --azure-kv https://flux-sops-vault.vault.azure.net/keys/sops-key/abcdef1234567890abcdef1234567890 \
  --encrypted-regex '^(data|stringData)$' \
  secret.yaml > secret.enc.yaml
```

The encrypted file will contain the SOPS metadata block at the bottom, which includes the Azure Key Vault key URL and the encrypted data encryption key. Only the fields matching the `encrypted-regex` pattern are encrypted, while metadata like `apiVersion`, `kind`, and `metadata.name` remain in plaintext for readability.

## Step 5: Configure the Flux Kustomization

Configure the Flux Kustomization to decrypt secrets using SOPS with Azure Key Vault.

```yaml
# clusters/my-cluster/apps-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps/my-app
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  decryption:
    provider: sops
    secretRef:
      name: sops-azure
```

When using Workload Identity on AKS, you can omit the `secretRef` since the kustomize-controller service account already has the necessary permissions through the managed identity binding.

```yaml
# Using Workload Identity (no secretRef needed)
  decryption:
    provider: sops
```

## Step 6: Set Up Repository SOPS Configuration

Define a `.sops.yaml` to make encryption consistent for the team. This file should be committed to the root of your Git repository.

```yaml
# .sops.yaml - Azure Key Vault SOPS configuration
creation_rules:
  - path_regex: .*\.enc\.yaml$
    encrypted_regex: ^(data|stringData)$
    azure_keyvault: https://flux-sops-vault.vault.azure.net/keys/sops-key/abcdef1234567890abcdef1234567890
```

With this configuration in place, team members can encrypt secrets without remembering the key URL.

```bash
# Encrypt using the .sops.yaml rules
sops --encrypt secret.yaml > secret.enc.yaml

# Decrypt to view or edit
sops --decrypt secret.enc.yaml
```

## Step 7: Commit and Verify

Push the encrypted secret and confirm Flux decrypts it successfully.

```bash
# Remove plaintext and commit
rm secret.yaml
git add secret.enc.yaml
git commit -m "Add Azure Key Vault encrypted secret"
git push

# Verify decryption
flux reconcile kustomization my-app --with-source
kubectl get secret azure-app-secret -n default -o jsonpath='{.data.storage-key}' | base64 -d
```

If the command returns the original plaintext value, decryption is working correctly.

## Troubleshooting

When decryption fails, check the following common issues.

```bash
# Verify the service principal or managed identity has the correct permissions
az keyvault key show --vault-name flux-sops-vault --name sops-key

# Check kustomize-controller logs
kubectl logs -n flux-system deployment/kustomize-controller | grep -i "azure\|decrypt\|sops"

# Verify the secret with credentials exists
kubectl get secret sops-azure -n flux-system -o yaml
```

Common failures include expired service principal credentials, missing Key Vault access policies, or network restrictions preventing the cluster from reaching the Key Vault endpoint. Ensure that if your Key Vault has a firewall enabled, the cluster's outbound IPs are allowed.

If you see permission denied errors, verify the access policy grants both `decrypt` and `unwrapKey` permissions. The `unwrapKey` permission is required because SOPS uses envelope encryption, where the data encryption key itself is wrapped (encrypted) using the Key Vault key.

Azure Key Vault integration with SOPS provides a managed, auditable approach to secret encryption that aligns with Azure security best practices and works seamlessly with Flux CD on AKS clusters.
