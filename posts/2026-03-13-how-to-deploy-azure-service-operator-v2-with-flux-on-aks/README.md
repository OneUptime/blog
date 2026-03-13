# How to Deploy Azure Service Operator v2 with Flux on AKS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Azure, AKS, Azure Service Operator, ASO, Infrastructure as Code

Description: Learn how to deploy Azure Service Operator v2 on AKS using Flux CD to manage Azure resources directly from Kubernetes through GitOps.

---

## Introduction

Azure Service Operator (ASO) v2 lets you create and manage Azure resources directly from Kubernetes using custom resources. Instead of using separate tools like Terraform or Bicep for Azure infrastructure, ASO brings Azure resource management into the Kubernetes API, making it a natural fit for GitOps workflows with Flux.

With ASO deployed through Flux, you can define Azure resources such as databases, storage accounts, and networking components as Kubernetes manifests in Git, and Flux will reconcile them into both your cluster and Azure.

## Prerequisites

- An Azure subscription
- An AKS cluster with workload identity enabled
- Flux CLI version 2.0 or later bootstrapped on the cluster
- Azure CLI version 2.47 or later
- cert-manager installed in the cluster (ASO depends on it)

## Step 1: Install cert-manager

ASO v2 requires cert-manager for webhook certificate management. Deploy it through Flux:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: jetstack
  namespace: flux-system
spec:
  interval: 1h
  url: https://charts.jetstack.io
---
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: cert-manager
  namespace: flux-system
spec:
  interval: 30m
  chart:
    spec:
      chart: cert-manager
      version: "1.14.*"
      sourceRef:
        kind: HelmRepository
        name: jetstack
  targetNamespace: cert-manager
  install:
    createNamespace: true
  values:
    installCRDs: true
```

## Step 2: Create a Managed Identity for ASO

ASO needs permissions to manage Azure resources. Create a managed identity with appropriate roles:

```bash
az identity create \
  --resource-group my-resource-group \
  --name aso-identity \
  --location eastus

ASO_CLIENT_ID=$(az identity show \
  --resource-group my-resource-group \
  --name aso-identity \
  --query clientId -o tsv)

ASO_OBJECT_ID=$(az identity show \
  --resource-group my-resource-group \
  --name aso-identity \
  --query principalId -o tsv)

SUBSCRIPTION_ID=$(az account show --query id -o tsv)

az role assignment create \
  --assignee-object-id "$ASO_OBJECT_ID" \
  --role "Contributor" \
  --scope "/subscriptions/$SUBSCRIPTION_ID"
```

## Step 3: Create a Federated Identity Credential

```bash
AKS_OIDC_ISSUER=$(az aks show \
  --resource-group my-resource-group \
  --name my-flux-cluster \
  --query "oidcIssuerProfile.issuerUrl" -o tsv)

az identity federated-credential create \
  --name aso-federated \
  --identity-name aso-identity \
  --resource-group my-resource-group \
  --issuer "$AKS_OIDC_ISSUER" \
  --subject system:serviceaccount:azureserviceoperator-system:azureserviceoperator-default \
  --audience api://AzureADTokenExchange
```

## Step 4: Deploy ASO v2 with Flux

Add the ASO Helm repository and create a HelmRelease:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: aso
  namespace: flux-system
spec:
  interval: 1h
  url: https://raw.githubusercontent.com/Azure/azure-service-operator/main/v2/charts
---
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: azure-service-operator
  namespace: flux-system
spec:
  interval: 30m
  dependsOn:
    - name: cert-manager
  chart:
    spec:
      chart: azure-service-operator
      version: "2.6.*"
      sourceRef:
        kind: HelmRepository
        name: aso
  targetNamespace: azureserviceoperator-system
  install:
    createNamespace: true
  values:
    azureSubscriptionID: "${SUBSCRIPTION_ID}"
    azureTenantID: "${AZURE_TENANT_ID}"
    azureClientID: "${ASO_CLIENT_ID}"
    useWorkloadIdentityAuth: true
    crdPattern: "resources.azure.com/*;dbforpostgresql.azure.com/*;storage.azure.com/*;cache.azure.com/*;network.azure.com/*"
```

The `crdPattern` field controls which Azure resource CRDs are installed. Only install the CRDs you need to keep the cluster lightweight.

## Step 5: Create Azure Resources Through GitOps

Now you can define Azure resources as Kubernetes manifests. Here is an example that creates a resource group, a storage account, and a PostgreSQL server:

```yaml
apiVersion: resources.azure.com/v1api20200601
kind: ResourceGroup
metadata:
  name: my-app-resources
  namespace: default
spec:
  location: eastus
---
apiVersion: storage.azure.com/v1api20230101
kind: StorageAccount
metadata:
  name: myappstorageaccount
  namespace: default
spec:
  location: eastus
  owner:
    name: my-app-resources
  sku:
    name: Standard_LRS
  kind: StorageV2
  accessTier: Hot
---
apiVersion: dbforpostgresql.azure.com/v1api20221201
kind: FlexibleServer
metadata:
  name: my-app-postgres
  namespace: default
spec:
  location: eastus
  owner:
    name: my-app-resources
  version: "15"
  sku:
    name: Standard_B1ms
    tier: Burstable
  storage:
    storageSizeGB: 32
  administratorLogin: pgadmin
  administratorLoginPassword:
    name: postgres-admin-password
    key: password
```

## Step 6: Manage Secrets for Azure Resources

ASO can export connection strings and credentials to Kubernetes secrets. Configure the operatorSpec on your resources:

```yaml
apiVersion: storage.azure.com/v1api20230101
kind: StorageAccount
metadata:
  name: myappstorageaccount
  namespace: default
spec:
  location: eastus
  owner:
    name: my-app-resources
  sku:
    name: Standard_LRS
  kind: StorageV2
  operatorSpec:
    secrets:
      key1:
        name: storage-account-keys
        key: primaryKey
      key2:
        name: storage-account-keys
        key: secondaryKey
      connectionString1:
        name: storage-account-keys
        key: connectionString
```

## Step 7: Organize with Flux Kustomizations

Structure your repository with infrastructure dependencies:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: aso-infra
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./infrastructure/aso
  prune: true
  dependsOn:
    - name: cert-manager
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: azure-resources
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./infrastructure/azure-resources
  prune: true
  dependsOn:
    - name: aso-infra
```

## Verifying the Deployment

Check the ASO operator and resource status:

```bash
flux get helmreleases -A
kubectl get pods -n azureserviceoperator-system
kubectl get resourcegroups.resources.azure.com -A
kubectl get storageaccounts.storage.azure.com -A
kubectl get flexibleservers.dbforpostgresql.azure.com -A
```

Check the condition of a specific resource:

```bash
kubectl describe storageaccount myappstorageaccount
```

## Troubleshooting

**CRD not found**: Verify that the `crdPattern` in the Helm values includes the API group for the resource type you are trying to create.

**Resource stuck in provisioning**: Check the ASO controller logs for Azure API errors. Common causes include quota limits, naming conflicts, or insufficient permissions.

**Workload identity errors**: Confirm that the federated credential subject matches the ASO service account name and namespace exactly.

**Prune deleting Azure resources**: Be cautious with `prune: true` on Kustomizations that manage ASO resources. Removing a manifest from Git will trigger Flux to delete the Kubernetes resource, which in turn deletes the Azure resource. Use `prune: false` for production Azure resources if this behavior is not desired.

## Conclusion

Azure Service Operator v2 deployed through Flux creates a unified GitOps workflow where both Kubernetes workloads and Azure infrastructure are managed from the same Git repository. This eliminates the need for separate infrastructure-as-code tools and brings Azure resource management into the Kubernetes control plane. Combined with workload identity, the setup is secure and credential-free, making it suitable for production environments.
