# How to Configure Flux OCI Secret with Azure ACR Token

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Source Controller, Authentication, Secrets, OCI, Azure, ACR, Container Registry, OCIRepository

Description: How to configure Flux CD to authenticate with Azure Container Registry (ACR) for pulling OCI artifacts and Helm charts.

---

## Introduction

Azure Container Registry (ACR) is a managed container registry service in Azure. When using Flux CD to pull OCI artifacts or Helm charts stored in ACR, you need to configure authentication. Azure offers several authentication methods, and Flux has built-in support for Azure through its provider mechanism.

This guide covers the recommended approach using Flux's built-in Azure provider with workload identity, as well as alternatives using ACR tokens, service principals, and admin credentials.

## Prerequisites

- A Kubernetes cluster (v1.20 or later), preferably AKS
- Flux CD installed on your cluster (v2.x)
- `kubectl` configured to communicate with your cluster
- An Azure Container Registry with OCI artifacts or Helm charts
- Azure CLI (`az`) installed and configured

## Approach 1: Flux Built-in Azure Provider (Recommended)

Flux's Source Controller has built-in support for Azure ACR authentication. This handles token refresh automatically.

### Step 1: Set Up Workload Identity on AKS

Enable workload identity on your AKS cluster:

```bash
az aks update \
  --name your-cluster \
  --resource-group your-resource-group \
  --enable-oidc-issuer \
  --enable-workload-identity
```

Get the OIDC issuer URL:

```bash
AKS_OIDC_ISSUER=$(az aks show \
  --name your-cluster \
  --resource-group your-resource-group \
  --query "oidcIssuerProfile.issuerUrl" -o tsv)
```

### Step 2: Create a Managed Identity

```bash
az identity create \
  --name flux-source-controller \
  --resource-group your-resource-group \
  --location eastus

IDENTITY_CLIENT_ID=$(az identity show \
  --name flux-source-controller \
  --resource-group your-resource-group \
  --query "clientId" -o tsv)
```

### Step 3: Grant ACR Pull Access

```bash
ACR_ID=$(az acr show \
  --name youracr \
  --resource-group your-resource-group \
  --query "id" -o tsv)

az role assignment create \
  --assignee $IDENTITY_CLIENT_ID \
  --role "AcrPull" \
  --scope $ACR_ID
```

### Step 4: Create Federated Credential

```bash
az identity federated-credential create \
  --name flux-source-controller-federated \
  --identity-name flux-source-controller \
  --resource-group your-resource-group \
  --issuer $AKS_OIDC_ISSUER \
  --subject system:serviceaccount:flux-system:source-controller \
  --audience api://AzureADTokenExchange
```

### Step 5: Annotate the Source Controller Service Account

```bash
kubectl annotate serviceaccount source-controller \
  --namespace flux-system \
  azure.workload.identity/client-id=$IDENTITY_CLIENT_ID
```

Label the Source Controller pod for workload identity:

```bash
kubectl patch deployment source-controller -n flux-system --type=json \
  -p='[{"op": "add", "path": "/spec/template/metadata/labels/azure.workload.identity~1use", "value": "true"}]'
```

### Step 6: Configure OCIRepository with Azure Provider

```yaml
apiVersion: source.toolkit.fluxcd.io/v1beta2
kind: OCIRepository
metadata:
  name: my-acr-app
  namespace: flux-system
spec:
  interval: 5m
  url: oci://youracr.azurecr.io/my-app
  ref:
    tag: latest
  provider: azure
```

Apply the resource:

```bash
kubectl apply -f ocirepository.yaml
```

For Helm charts:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: acr-charts
  namespace: flux-system
spec:
  interval: 10m
  url: oci://youracr.azurecr.io/charts
  type: oci
  provider: azure
```

## Approach 2: ACR Repository-Scoped Token

ACR supports creating tokens scoped to specific repositories, which is useful when you want fine-grained access control.

### Step 1: Create a Scope Map and Token

```bash
az acr scope-map create \
  --name flux-read-scope \
  --registry youracr \
  --repository my-app content/read metadata/read \
  --description "Flux read access to my-app"

az acr token create \
  --name flux-token \
  --registry youracr \
  --scope-map flux-read-scope
```

### Step 2: Generate a Password for the Token

```bash
az acr token credential generate \
  --name flux-token \
  --registry youracr \
  --password1
```

Note the generated password.

### Step 3: Create the Kubernetes Secret

```bash
kubectl create secret docker-registry acr-token-credentials \
  --namespace=flux-system \
  --docker-server=youracr.azurecr.io \
  --docker-username=flux-token \
  --docker-password=<generated-password>
```

### Step 4: Reference in OCIRepository

```yaml
apiVersion: source.toolkit.fluxcd.io/v1beta2
kind: OCIRepository
metadata:
  name: my-acr-app
  namespace: flux-system
spec:
  interval: 5m
  url: oci://youracr.azurecr.io/my-app
  ref:
    tag: latest
  secretRef:
    name: acr-token-credentials
```

## Approach 3: Service Principal

### Step 1: Create a Service Principal

```bash
az ad sp create-for-rbac \
  --name flux-acr-reader \
  --role AcrPull \
  --scopes $ACR_ID
```

Note the `appId` and `password` from the output.

### Step 2: Create the Kubernetes Secret

```bash
kubectl create secret docker-registry acr-sp-credentials \
  --namespace=flux-system \
  --docker-server=youracr.azurecr.io \
  --docker-username=<appId> \
  --docker-password=<password>
```

### Step 3: Reference in OCIRepository

```yaml
apiVersion: source.toolkit.fluxcd.io/v1beta2
kind: OCIRepository
metadata:
  name: my-acr-app
  namespace: flux-system
spec:
  interval: 5m
  url: oci://youracr.azurecr.io/my-app
  ref:
    tag: latest
  secretRef:
    name: acr-sp-credentials
```

## Verification

Check the `OCIRepository` status:

```bash
flux get sources oci my-acr-app
```

Detailed status:

```bash
kubectl describe ocirepository my-acr-app -n flux-system
```

For Helm charts:

```bash
flux get sources helm acr-charts
```

Verify ACR connectivity:

```bash
az acr repository list --name youracr --output table
```

## Troubleshooting

### Unauthorized (401)

1. Verify credentials work with Docker:

```bash
docker login youracr.azurecr.io
```

2. For workload identity, verify the service account annotation:

```bash
kubectl get sa source-controller -n flux-system -o yaml
```

3. Check the managed identity has AcrPull role:

```bash
az role assignment list --assignee $IDENTITY_CLIENT_ID --scope $ACR_ID
```

### Workload Identity Pod Not Picking Up Credentials

1. Verify the pod label exists:

```bash
kubectl get pod -n flux-system -l app=source-controller \
  -o jsonpath='{.items[0].metadata.labels}'
```

2. Check for workload identity webhook injection:

```bash
kubectl get pod -n flux-system -l app=source-controller \
  -o jsonpath='{.items[0].spec.containers[0].env[*].name}' | tr ' ' '\n' | grep AZURE
```

3. Restart the Source Controller:

```bash
kubectl rollout restart deployment/source-controller -n flux-system
```

### Token Expired (Approach 2)

ACR repository-scoped tokens do not expire by default, but the passwords can be regenerated. If authentication fails:

1. Generate a new password:

```bash
az acr token credential generate \
  --name flux-token \
  --registry youracr \
  --password1
```

2. Update the Secret:

```bash
kubectl create secret docker-registry acr-token-credentials \
  --namespace=flux-system \
  --docker-server=youracr.azurecr.io \
  --docker-username=flux-token \
  --docker-password=<new-password> \
  --dry-run=client -o yaml | kubectl apply -f -
```

### Service Principal Secret Expired (Approach 3)

Service principal secrets expire (default 1 year). To reset:

```bash
az ad sp credential reset --name flux-acr-reader
```

Update the Kubernetes Secret with the new password.

## Summary

For Azure Container Registry, the recommended approach is using Flux's built-in `provider: azure` with AKS workload identity. This eliminates the need for credential rotation and provides seamless integration with Azure IAM. For non-AKS clusters or when finer access control is needed, ACR repository-scoped tokens or service principals can be used with Docker config JSON secrets. Each approach has trade-offs in terms of security, complexity, and maintenance overhead.
