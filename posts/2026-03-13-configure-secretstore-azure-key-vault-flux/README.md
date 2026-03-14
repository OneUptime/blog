# How to Configure SecretStore for Azure Key Vault with Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, External Secrets Operator, Azure, Key Vault

Description: Configure an ESO SecretStore for Azure Key Vault using Flux CD, enabling AKS and other Kubernetes clusters to consume Azure-hosted secrets through GitOps-managed resources.

---

## Introduction

Azure Key Vault is Microsoft's cloud-hosted secret, key, and certificate management service. For workloads running on Azure Kubernetes Service (AKS) or any Kubernetes cluster with Azure access, Key Vault is the natural home for sensitive configuration data. The External Secrets Operator's Azure provider allows `ExternalSecret` resources to pull values from Key Vault into Kubernetes Secrets automatically.

By managing the Azure `SecretStore` through Flux CD, your Key Vault connectivity configuration is version-controlled and consistently applied. Authentication via Azure Workload Identity (the modern replacement for pod identity) is configured declaratively, making it easy to audit which service accounts have access to which Key Vault resources.

This guide covers configuring a `SecretStore` for Azure Key Vault using Workload Identity and service principal authentication, managed by Flux CD.

## Prerequisites

- External Secrets Operator deployed via Flux HelmRelease
- An Azure Key Vault with secrets populated
- For Workload Identity: AKS cluster with OIDC issuer and Workload Identity enabled
- For service principal: an Azure App Registration with Key Vault access policy

## Step 1: Configure Azure Workload Identity (Recommended for AKS)

Enable Workload Identity on your AKS cluster and create a managed identity:

```bash
# Enable OIDC issuer and Workload Identity on AKS
az aks update --resource-group myRG --name myAKS \
  --enable-oidc-issuer --enable-workload-identity

# Create a managed identity for ESO
az identity create --name eso-identity \
  --resource-group myRG --location eastus

# Grant Key Vault access to the managed identity
az keyvault set-policy --name my-keyvault \
  --object-id $(az identity show --name eso-identity \
    --resource-group myRG --query principalId -o tsv) \
  --secret-permissions get list
```

## Step 2: Annotate the ESO Service Account

```yaml
# clusters/my-cluster/external-secrets/service-account.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: external-secrets
  namespace: external-secrets
  annotations:
    # Link to the Azure managed identity via Workload Identity
    azure.workload.identity/client-id: "YOUR_MANAGED_IDENTITY_CLIENT_ID"
  labels:
    # Required label for Workload Identity mutation webhook
    azure.workload.identity/use: "true"
```

## Step 3: Configure a SecretStore for Azure Key Vault (Workload Identity)

```yaml
# clusters/my-cluster/external-secrets/secretstore-azure.yaml
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: azure-key-vault
  namespace: default
spec:
  provider:
    azurekv:
      # Azure Active Directory tenant ID
      tenantId: "YOUR_TENANT_ID"
      # Full URL of the Azure Key Vault
      vaultUrl: "https://my-keyvault.vault.azure.net"
      authType: WorkloadIdentity
      serviceAccountRef:
        name: external-secrets
        namespace: external-secrets
```

## Step 4: Configure with Service Principal (Non-AKS Clusters)

For clusters outside AKS, use a client secret stored as a Kubernetes Secret:

```yaml
# clusters/my-cluster/external-secrets/azure-sp-secret.yaml
# Encrypt this file with SOPS before committing to Git
apiVersion: v1
kind: Secret
metadata:
  name: azure-sp-credentials
  namespace: external-secrets
type: Opaque
stringData:
  client-id: "YOUR_APP_REGISTRATION_CLIENT_ID"
  client-secret: "YOUR_APP_REGISTRATION_CLIENT_SECRET"
```

```yaml
# clusters/my-cluster/external-secrets/secretstore-azure-sp.yaml
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: azure-key-vault-sp
  namespace: default
spec:
  provider:
    azurekv:
      tenantId: "YOUR_TENANT_ID"
      vaultUrl: "https://my-keyvault.vault.azure.net"
      authType: ServicePrincipal
      authSecretRef:
        clientId:
          name: azure-sp-credentials
          key: client-id
        clientSecret:
          name: azure-sp-credentials
          key: client-secret
```

## Step 5: Manage via Flux Kustomization

```yaml
# clusters/my-cluster/external-secrets/kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: secret-stores
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
kubectl get secretstore azure-key-vault -n default -o wide

# Test with an ExternalSecret referencing a Key Vault secret
kubectl apply -f - <<EOF
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: test-azure-secret
  namespace: default
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: azure-key-vault
    kind: SecretStore
  target:
    name: test-kv-secret
  data:
    - secretKey: connection-string
      remoteRef:
        # Name of the secret in Key Vault (no path needed for KV secrets)
        key: myapp-connection-string
EOF

# Verify the Kubernetes Secret was created
kubectl get secret test-kv-secret -n default
```

## Best Practices

- Use Workload Identity on AKS instead of service principals to avoid managing client secrets that expire.
- Grant the managed identity or service principal only `get` and `list` permissions on the Key Vault, not `set` or `delete`.
- Use separate Key Vaults (or secret name prefixes) for different environments (dev, staging, prod) and configure corresponding SecretStores per environment cluster.
- Store service principal credentials using SOPS or Sealed Secrets if you must use service principal auth outside AKS.
- Enable Key Vault diagnostic logging to Azure Monitor to audit all secret access by the ESO service account.

## Conclusion

Configuring an Azure Key Vault `SecretStore` through Flux CD provides a fully declarative, auditable path from Azure-hosted secrets to Kubernetes workloads. Workload Identity eliminates credential management entirely on AKS, while Flux ensures the SecretStore configuration is consistently applied and version-controlled across all your Azure Kubernetes clusters.
