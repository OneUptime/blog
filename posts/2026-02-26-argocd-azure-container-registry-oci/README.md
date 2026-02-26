# How to Use Azure Container Registry with ArgoCD OCI

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Azure, OCI

Description: Learn how to configure ArgoCD to pull Helm charts and OCI artifacts from Azure Container Registry using service principal authentication, managed identities, and workload identity federation.

---

Azure Container Registry (ACR) is the go-to container registry for teams running workloads on Azure Kubernetes Service or any Kubernetes cluster in the Azure ecosystem. With ArgoCD's support for OCI-based sources, you can now pull Helm charts and other OCI artifacts directly from ACR, keeping your GitOps pipeline tightly integrated with Azure's identity and access management.

This guide walks through every method of connecting ArgoCD to ACR for OCI artifact consumption - from service principal credentials to workload identity federation.

## Why Use ACR with ArgoCD OCI

If you are already using Azure for your Kubernetes workloads, ACR gives you several advantages as an OCI registry for ArgoCD:

- **Private networking** - ACR supports private endpoints and VNet integration, so your charts never leave the Azure backbone.
- **Geo-replication** - Replicate your OCI artifacts to multiple Azure regions for faster pulls from regional clusters.
- **Azure AD integration** - Use managed identities and workload identity to avoid storing long-lived credentials.
- **Content trust** - Sign your charts and enforce signature verification in your deployment pipeline.

## Prerequisites

Before you start, make sure you have:

- An ArgoCD instance running (v2.8 or later for full OCI support)
- An Azure Container Registry instance
- Azure CLI (`az`) installed and configured
- `helm` CLI for pushing charts to ACR

## Pushing Helm Charts to ACR

First, let's push a Helm chart to your ACR instance so ArgoCD has something to pull.

```bash
# Login to ACR
az acr login --name myregistry

# Package your Helm chart
helm package ./my-chart

# Push to ACR using OCI
helm push my-chart-1.0.0.tgz oci://myregistry.azurecr.io/helm
```

Verify the chart is accessible:

```bash
# List repositories in ACR
az acr repository list --name myregistry --output table

# Show tags for the chart
az acr repository show-tags --name myregistry --repository helm/my-chart --output table
```

## Method 1: Service Principal Authentication

The most common approach for non-Azure Kubernetes clusters is using an Azure AD service principal.

### Create a Service Principal

```bash
# Get the ACR resource ID
ACR_ID=$(az acr show --name myregistry --query id --output tsv)

# Create a service principal with AcrPull permission
SP_CREDENTIALS=$(az ad sp create-for-rbac \
  --name argocd-acr-pull \
  --scopes $ACR_ID \
  --role acrpull \
  --query "{appId: appId, password: password}" \
  --output json)

# Extract the values
SP_APP_ID=$(echo $SP_CREDENTIALS | jq -r '.appId')
SP_PASSWORD=$(echo $SP_CREDENTIALS | jq -r '.password')

echo "App ID: $SP_APP_ID"
echo "Password: $SP_PASSWORD"
```

### Configure ArgoCD Repository Credentials

Add the ACR repository to ArgoCD using the service principal credentials:

```bash
# Add ACR as an OCI Helm repository in ArgoCD
argocd repo add myregistry.azurecr.io \
  --type helm \
  --name azure-acr \
  --enable-oci \
  --username $SP_APP_ID \
  --password $SP_PASSWORD
```

Alternatively, create the repository credential as a Kubernetes Secret:

```yaml
# acr-repo-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: acr-helm-repo
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
type: Opaque
stringData:
  type: helm
  name: azure-acr
  url: myregistry.azurecr.io
  enableOCI: "true"
  username: "<service-principal-app-id>"
  password: "<service-principal-password>"
```

```bash
kubectl apply -f acr-repo-secret.yaml
```

### Create an ArgoCD Application

Now define an application that pulls from ACR:

```yaml
# acr-app.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
  namespace: argocd
spec:
  project: default
  source:
    chart: helm/my-chart
    repoURL: myregistry.azurecr.io
    targetRevision: 1.0.0
    helm:
      releaseName: my-app
      values: |
        replicaCount: 3
        image:
          repository: myregistry.azurecr.io/my-app
          tag: latest
  destination:
    server: https://kubernetes.default.svc
    namespace: my-app
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
```

## Method 2: ACR Admin Account

For development and testing environments, you can use the ACR admin account. This is not recommended for production.

```bash
# Enable admin account on ACR
az acr update --name myregistry --admin-enabled true

# Get admin credentials
az acr credential show --name myregistry

# Add to ArgoCD
argocd repo add myregistry.azurecr.io \
  --type helm \
  --name azure-acr-admin \
  --enable-oci \
  --username myregistry \
  --password "<admin-password>"
```

## Method 3: Managed Identity (AKS Clusters)

If ArgoCD runs on AKS, you can use the kubelet managed identity that already has ACR pull permissions. This is the cleanest approach because there are no passwords to manage.

### Attach ACR to AKS

```bash
# Attach ACR to AKS cluster (grants AcrPull to kubelet identity)
az aks update \
  --name my-aks-cluster \
  --resource-group my-rg \
  --attach-acr myregistry
```

### Configure ArgoCD for Anonymous Access

When the AKS node identity has AcrPull permissions, ArgoCD's repo-server pod inherits those permissions automatically. You can add the repository without explicit credentials:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: acr-helm-repo-mi
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
type: Opaque
stringData:
  type: helm
  name: azure-acr
  url: myregistry.azurecr.io
  enableOCI: "true"
```

However, this approach depends on the node identity having pull access. For more granular control, use workload identity.

## Method 4: Workload Identity Federation (Recommended for Production)

Azure Workload Identity is the modern, recommended approach for pod-level identity on AKS. It provides fine-grained, per-pod credentials without storing passwords.

### Set Up Workload Identity

```bash
# Enable workload identity on AKS
az aks update \
  --name my-aks-cluster \
  --resource-group my-rg \
  --enable-oidc-issuer \
  --enable-workload-identity

# Get the OIDC issuer URL
OIDC_ISSUER=$(az aks show \
  --name my-aks-cluster \
  --resource-group my-rg \
  --query "oidcIssuerProfile.issuerUrl" \
  --output tsv)

# Create a managed identity for ArgoCD
az identity create \
  --name argocd-acr-identity \
  --resource-group my-rg

# Get the identity client ID
IDENTITY_CLIENT_ID=$(az identity show \
  --name argocd-acr-identity \
  --resource-group my-rg \
  --query clientId \
  --output tsv)

# Grant AcrPull to the managed identity
ACR_ID=$(az acr show --name myregistry --query id --output tsv)
az role assignment create \
  --assignee $IDENTITY_CLIENT_ID \
  --role acrpull \
  --scope $ACR_ID

# Create federated credential for the ArgoCD repo-server service account
az identity federated-credential create \
  --name argocd-repo-server-fedcred \
  --identity-name argocd-acr-identity \
  --resource-group my-rg \
  --issuer $OIDC_ISSUER \
  --subject system:serviceaccount:argocd:argocd-repo-server \
  --audiences api://AzureADTokenExchange
```

### Annotate the ArgoCD Repo-Server Service Account

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: argocd-repo-server
  namespace: argocd
  annotations:
    azure.workload.identity/client-id: "<identity-client-id>"
  labels:
    azure.workload.identity/use: "true"
```

### Patch the Repo-Server Deployment

If you are using Helm to deploy ArgoCD, you can set these values:

```yaml
# argocd-values.yaml
repoServer:
  serviceAccount:
    annotations:
      azure.workload.identity/client-id: "<identity-client-id>"
    labels:
      azure.workload.identity/use: "true"
```

## Handling ACR Token Refresh

ACR access tokens expire after a configurable period (default is 3 hours). When using service principal credentials, ArgoCD handles token refresh automatically since it stores the service principal credentials and requests new tokens as needed.

For managed identity and workload identity, the Azure identity SDK handles token refresh transparently within the pod.

If you notice intermittent pull failures, check:

```bash
# Verify ArgoCD can reach the repository
argocd repo list

# Check repo-server logs for authentication errors
kubectl logs -n argocd deployment/argocd-repo-server | grep -i "auth\|token\|acr"
```

## Using ACR with Geo-Replication

If you have geo-replicated ACR, you can point ArgoCD at the regional endpoint for faster pulls:

```yaml
# Use the regional login server
apiVersion: v1
kind: Secret
metadata:
  name: acr-regional-repo
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
type: Opaque
stringData:
  type: helm
  name: azure-acr-westus
  url: myregistry.westus.azurecr.io
  enableOCI: "true"
  username: "<service-principal-app-id>"
  password: "<service-principal-password>"
```

## Troubleshooting Common ACR Issues

**401 Unauthorized errors**: Verify your service principal has the `acrpull` role and the credentials are correct. Check if the service principal secret has expired.

**Firewall blocking access**: If ACR has firewall rules, make sure the AKS cluster's outbound IP addresses are whitelisted, or use a private endpoint.

**Chart not found**: Ensure the chart path in ArgoCD matches the repository path in ACR. The `chart` field should include the repository prefix (e.g., `helm/my-chart`, not just `my-chart`).

```bash
# Verify the chart exists in ACR
az acr repository show --name myregistry --repository helm/my-chart

# Check available tags
az acr repository show-tags --name myregistry --repository helm/my-chart
```

## Summary

Azure Container Registry integrates smoothly with ArgoCD's OCI support. For production deployments on AKS, workload identity federation is the best approach since it eliminates stored credentials entirely. For clusters outside Azure, service principal credentials with the `acrpull` role provide secure, scoped access. Whichever method you choose, make sure to test your connectivity with `argocd repo list` before creating applications that depend on the registry.
