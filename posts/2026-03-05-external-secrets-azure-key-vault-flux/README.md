# How to Configure External Secrets with Azure Key Vault in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, External Secrets, Azure Key Vault, AKS, Secrets Management

Description: Learn how to configure the External Secrets Operator with Azure Key Vault in a Flux CD GitOps workflow to sync secrets from Azure into Kubernetes.

---

Azure Key Vault is Microsoft's cloud service for securely storing secrets, keys, and certificates. By combining it with the External Secrets Operator (ESO) and Flux CD, you can manage secret references declaratively in Git while keeping actual secret values in Azure. This guide covers the setup for both AKS clusters with Workload Identity and clusters using service principal authentication.

## Prerequisites

- A Kubernetes cluster (AKS recommended for native Azure integration)
- Flux CD bootstrapped on the cluster
- An Azure Key Vault instance with secrets stored
- Azure CLI installed and configured

## Step 1: Install External Secrets Operator with Flux

Add the ESO Helm chart via Flux:

```yaml
# infrastructure/external-secrets/helmrepository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: external-secrets
  namespace: flux-system
spec:
  interval: 1h
  url: https://charts.external-secrets.io
```

```yaml
# infrastructure/external-secrets/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: external-secrets
  namespace: external-secrets
spec:
  interval: 30m
  chart:
    spec:
      chart: external-secrets
      version: "0.10.x"
      sourceRef:
        kind: HelmRepository
        name: external-secrets
        namespace: flux-system
  install:
    createNamespace: true
```

## Step 2: Configure Azure Authentication

### Option A: Workload Identity (Recommended for AKS)

Enable Workload Identity on your AKS cluster and create a managed identity:

```bash
# Create a managed identity
az identity create \
  --name external-secrets-identity \
  --resource-group my-resource-group \
  --location eastus

# Get the identity client ID
CLIENT_ID=$(az identity show \
  --name external-secrets-identity \
  --resource-group my-resource-group \
  --query clientId -o tsv)

# Grant the identity access to Key Vault secrets
az keyvault set-policy \
  --name my-keyvault \
  --secret-permissions get list \
  --spn "$CLIENT_ID"

# Create the federated credential
AKS_OIDC_ISSUER=$(az aks show \
  --name my-cluster \
  --resource-group my-resource-group \
  --query "oidcIssuerProfile.issuerUrl" -o tsv)

az identity federated-credential create \
  --name external-secrets-fc \
  --identity-name external-secrets-identity \
  --resource-group my-resource-group \
  --issuer "$AKS_OIDC_ISSUER" \
  --subject system:serviceaccount:external-secrets:external-secrets \
  --audience api://AzureADTokenExchange
```

Annotate the ESO service account in the HelmRelease values:

```yaml
values:
  serviceAccount:
    annotations:
      azure.workload.identity/client-id: "<CLIENT_ID>"
    labels:
      azure.workload.identity/use: "true"
```

### Option B: Service Principal

Create a service principal and store its credentials as a Kubernetes Secret:

```bash
az ad sp create-for-rbac --name external-secrets-sp --skip-assignment

# Store credentials
kubectl create secret generic azure-sp-credentials \
  --namespace external-secrets \
  --from-literal=clientId=YOUR_CLIENT_ID \
  --from-literal=clientSecret=YOUR_CLIENT_SECRET
```

Grant Key Vault access:

```bash
az keyvault set-policy \
  --name my-keyvault \
  --secret-permissions get list \
  --spn YOUR_CLIENT_ID
```

## Step 3: Create a ClusterSecretStore

For Workload Identity:

```yaml
# infrastructure/external-secrets/clustersecretstore.yaml
apiVersion: external-secrets.io/v1beta1
kind: ClusterSecretStore
metadata:
  name: azure-key-vault
spec:
  provider:
    azurekv:
      authType: WorkloadIdentity
      vaultUrl: "https://my-keyvault.vault.azure.net"
      serviceAccountRef:
        name: external-secrets
        namespace: external-secrets
```

For Service Principal:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ClusterSecretStore
metadata:
  name: azure-key-vault
spec:
  provider:
    azurekv:
      tenantId: "YOUR_TENANT_ID"
      vaultUrl: "https://my-keyvault.vault.azure.net"
      authSecretRef:
        clientId:
          name: azure-sp-credentials
          namespace: external-secrets
          key: clientId
        clientSecret:
          name: azure-sp-credentials
          namespace: external-secrets
          key: clientSecret
```

## Step 4: Store Secrets in Azure Key Vault

```bash
# Store individual secrets
az keyvault secret set --vault-name my-keyvault --name db-host --value "db.example.com"
az keyvault secret set --vault-name my-keyvault --name db-password --value "s3cret-password"
az keyvault secret set --vault-name my-keyvault --name api-key --value "ak_live_xxxxx"

# Store a JSON secret
az keyvault secret set --vault-name my-keyvault --name db-config \
  --value '{"host":"db.example.com","port":"5432","username":"admin","password":"s3cret"}'
```

## Step 5: Create ExternalSecret Resources

For individual secrets:

```yaml
# apps/my-app/external-secret.yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: app-secrets
  namespace: my-app
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: azure-key-vault
    kind: ClusterSecretStore
  target:
    name: app-secrets
    creationPolicy: Owner
  data:
    - secretKey: DB_HOST
      remoteRef:
        key: db-host
    - secretKey: DB_PASSWORD
      remoteRef:
        key: db-password
    - secretKey: API_KEY
      remoteRef:
        key: api-key
```

For extracting properties from a JSON secret:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: database-credentials
  namespace: my-app
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: azure-key-vault
    kind: ClusterSecretStore
  target:
    name: database-credentials
    creationPolicy: Owner
  data:
    - secretKey: DB_HOST
      remoteRef:
        key: db-config
        property: host
    - secretKey: DB_PORT
      remoteRef:
        key: db-config
        property: port
    - secretKey: DB_USER
      remoteRef:
        key: db-config
        property: username
    - secretKey: DB_PASSWORD
      remoteRef:
        key: db-config
        property: password
```

## Step 6: Verify and Troubleshoot

Check the sync status:

```bash
kubectl get externalsecrets -n my-app
kubectl describe externalsecret app-secrets -n my-app
```

Verify the Kubernetes Secret was created:

```bash
kubectl get secret app-secrets -n my-app -o jsonpath='{.data}' | jq
```

If secrets are not syncing, check ESO logs:

```bash
kubectl logs -n external-secrets deploy/external-secrets -f
```

Common issues include incorrect vault URLs, missing Key Vault access policies, and Workload Identity misconfiguration. Verify the ClusterSecretStore status:

```bash
kubectl get clustersecretstore azure-key-vault -o jsonpath='{.status}'
```

## Summary

Integrating External Secrets with Azure Key Vault in Flux CD lets you manage secrets centrally in Azure while keeping your GitOps repository free of sensitive values. Workload Identity provides the most secure authentication for AKS clusters, while service principals work for any Kubernetes environment. The ExternalSecret resources that Flux manages define the mapping between Key Vault secrets and Kubernetes Secrets, with automatic refresh ensuring your cluster stays in sync with Azure.
