# How to Add an AKS Cluster to ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Azure AKS, Multi-Cluster

Description: Learn how to register an Azure Kubernetes Service cluster with ArgoCD for multi-cluster GitOps deployments, covering Azure AD authentication, managed identity integration, and kubeconfig-based registration.

---

Azure Kubernetes Service (AKS) has its own authentication model based on Azure Active Directory (now Microsoft Entra ID). When adding an AKS cluster to ArgoCD, you need to handle Azure's auth layer properly. This guide covers the practical steps from basic kubeconfig-based registration to production-grade Azure AD and managed identity approaches.

## AKS Authentication Methods for ArgoCD

AKS supports several authentication methods:

1. **Local accounts** - Basic kubeconfig with client certificates (simplest)
2. **Azure AD integration** - Uses Azure AD tokens (more secure)
3. **Managed Identity** - Uses Azure's managed identity for passwordless auth (recommended)
4. **Service Principal** - Uses an Azure AD app registration

## Method 1: Local Account with Static Token

The quickest approach uses AKS local accounts. Note that many organizations disable local accounts for security.

```bash
# Get AKS credentials with local account
az aks get-credentials \
  --resource-group my-rg \
  --name my-aks-cluster \
  --admin  # Gets the admin kubeconfig

# Verify the context
kubectl config get-contexts

# Add the cluster to ArgoCD
argocd cluster add my-aks-cluster-admin
```

## Method 2: Service Account Token (Recommended for Simplicity)

Create a dedicated service account in the AKS cluster with a long-lived token:

### Step 1: Create RBAC in AKS

```yaml
# Apply to the AKS cluster
apiVersion: v1
kind: ServiceAccount
metadata:
  name: argocd-manager
  namespace: kube-system

---
apiVersion: v1
kind: Secret
metadata:
  name: argocd-manager-token
  namespace: kube-system
  annotations:
    kubernetes.io/service-account.name: argocd-manager
type: kubernetes.io/service-account-token

---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: argocd-manager-role
rules:
  - apiGroups: ["*"]
    resources: ["*"]
    verbs: ["*"]
  - nonResourceURLs: ["*"]
    verbs: ["*"]

---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: argocd-manager-role-binding
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: argocd-manager-role
subjects:
  - kind: ServiceAccount
    name: argocd-manager
    namespace: kube-system
```

### Step 2: Get the Cluster Details

```bash
# Get the AKS cluster API server endpoint
AKS_SERVER=$(az aks show \
  --resource-group my-rg \
  --name my-aks-cluster \
  --query fqdn \
  --output tsv)

# Get the CA certificate
az aks get-credentials --resource-group my-rg --name my-aks-cluster --admin
CA_DATA=$(kubectl config view --raw -o jsonpath='{.clusters[?(@.name=="my-aks-cluster")].cluster.certificate-authority-data}')

# Get the service account token from AKS
TOKEN=$(kubectl get secret argocd-manager-token \
  -n kube-system \
  --context my-aks-cluster-admin \
  -o jsonpath='{.data.token}' | base64 -d)
```

### Step 3: Register Declaratively

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: aks-production-cluster
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: cluster
    environment: production
    provider: azure
    region: eastus
type: Opaque
stringData:
  name: aks-production
  server: "https://my-aks-cluster-dns-abc123.hcp.eastus.azmk8s.io:443"
  config: |
    {
      "bearerToken": "<service-account-token>",
      "tlsClientConfig": {
        "insecure": false,
        "caData": "<base64-encoded-ca-cert>"
      }
    }
```

Encrypt this with Sealed Secrets since it contains the bearer token:

```bash
kubectl create secret generic aks-production-cluster \
  --from-literal=name=aks-production \
  --from-literal=server=https://my-aks-cluster-dns-abc123.hcp.eastus.azmk8s.io:443 \
  --from-literal=config="{\"bearerToken\":\"$TOKEN\",\"tlsClientConfig\":{\"insecure\":false,\"caData\":\"$CA_DATA\"}}" \
  --dry-run=client -o yaml | \
  kubectl label --local -f - argocd.argoproj.io/secret-type=cluster --dry-run=client -o yaml | \
  kubeseal --cert .sealed-secrets/pub-cert.pem --format yaml > sealed-aks-cluster.yaml
```

## Method 3: Azure AD with Service Principal

For organizations using Azure AD-integrated AKS clusters:

### Step 1: Create an Azure AD App Registration

```bash
# Create the app registration
az ad app create --display-name "ArgoCD-AKS-Access"

# Get the app ID
APP_ID=$(az ad app list --display-name "ArgoCD-AKS-Access" --query "[0].appId" -o tsv)

# Create a service principal
az ad sp create --id $APP_ID

# Create a client secret
CLIENT_SECRET=$(az ad app credential reset --id $APP_ID --query password -o tsv)

# Note the tenant ID
TENANT_ID=$(az account show --query tenantId -o tsv)
```

### Step 2: Grant AKS Access

```bash
# Get the AKS resource ID
AKS_ID=$(az aks show --resource-group my-rg --name my-aks-cluster --query id -o tsv)

# Assign the Azure Kubernetes Service Cluster User Role
az role assignment create \
  --assignee $APP_ID \
  --role "Azure Kubernetes Service Cluster User Role" \
  --scope $AKS_ID

# For full admin access
az role assignment create \
  --assignee $APP_ID \
  --role "Azure Kubernetes Service RBAC Cluster Admin" \
  --scope $AKS_ID
```

### Step 3: Configure Kubelogin in ArgoCD

AKS Azure AD integration requires `kubelogin` for token acquisition. You need to add it to the ArgoCD repo server and controller:

```yaml
# Custom ArgoCD image with kubelogin
FROM quay.io/argoproj/argocd:v2.10.0

USER root
RUN curl -LO https://github.com/Azure/kubelogin/releases/download/v0.1.0/kubelogin-linux-amd64.zip && \
    unzip kubelogin-linux-amd64.zip -d /usr/local/bin/ && \
    rm kubelogin-linux-amd64.zip
USER argocd
```

### Step 4: Register with exec Provider

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: aks-aad-cluster
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: cluster
type: Opaque
stringData:
  name: aks-production-aad
  server: "https://my-aks-cluster-dns.hcp.eastus.azmk8s.io:443"
  config: |
    {
      "execProviderConfig": {
        "command": "kubelogin",
        "args": [
          "get-token",
          "--login", "spn",
          "--server-id", "6dae42f8-4368-4678-94ff-3960e28e3630",
          "--client-id", "<app-id>",
          "--client-secret", "<client-secret>",
          "--tenant-id", "<tenant-id>"
        ],
        "apiVersion": "client.authentication.k8s.io/v1beta1",
        "installHint": "kubelogin is required"
      },
      "tlsClientConfig": {
        "insecure": false,
        "caData": "<ca-data>"
      }
    }
```

## Method 4: Azure Managed Identity

When ArgoCD runs on AKS with managed identity enabled:

```bash
# Enable managed identity on the ArgoCD AKS cluster
az aks update \
  --resource-group argocd-rg \
  --name argocd-cluster \
  --enable-managed-identity

# Get the managed identity's object ID
IDENTITY_ID=$(az aks show \
  --resource-group argocd-rg \
  --name argocd-cluster \
  --query identityProfile.kubeletidentity.objectId \
  -o tsv)

# Grant access to the target AKS cluster
az role assignment create \
  --assignee-object-id $IDENTITY_ID \
  --role "Azure Kubernetes Service Cluster User Role" \
  --scope $AKS_ID
```

Register using managed identity auth:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: aks-mi-cluster
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: cluster
type: Opaque
stringData:
  name: aks-production-mi
  server: "https://my-aks-cluster-dns.hcp.eastus.azmk8s.io:443"
  config: |
    {
      "execProviderConfig": {
        "command": "kubelogin",
        "args": [
          "get-token",
          "--login", "msi",
          "--server-id", "6dae42f8-4368-4678-94ff-3960e28e3630"
        ],
        "apiVersion": "client.authentication.k8s.io/v1beta1"
      },
      "tlsClientConfig": {
        "insecure": false,
        "caData": "<ca-data>"
      }
    }
```

## Verifying the Connection

```bash
# List all clusters
argocd cluster list

# Check specific cluster status
argocd cluster get https://my-aks-cluster-dns.hcp.eastus.azmk8s.io:443

# Deploy a test application
argocd app create aks-test \
  --repo https://github.com/argoproj/argocd-example-apps.git \
  --path guestbook \
  --dest-server https://my-aks-cluster-dns.hcp.eastus.azmk8s.io:443 \
  --dest-namespace default

argocd app sync aks-test
argocd app get aks-test
argocd app delete aks-test --yes
```

## Handling Private AKS Clusters

For private AKS clusters where the API server is not publicly accessible:

```bash
# Option 1: Use Azure Private Link from the ArgoCD cluster
# Both clusters must be in the same VNet or peered VNets

# Option 2: Use the AKS Run Command feature for initial setup
az aks command invoke \
  --resource-group my-rg \
  --name my-private-aks \
  --command "kubectl apply -f -" \
  --file service-account.yaml
```

## Troubleshooting

```bash
# Token issues
kubectl exec -n argocd deploy/argocd-application-controller -- \
  kubelogin get-token --login msi --server-id 6dae42f8-4368-4678-94ff-3960e28e3630

# Network issues (private clusters)
kubectl exec -n argocd deploy/argocd-application-controller -- \
  curl -k https://my-aks-cluster-dns.hcp.eastus.azmk8s.io:443/healthz

# RBAC issues
argocd cluster get https://my-aks-cluster-dns.hcp.eastus.azmk8s.io:443 -o json | \
  jq '.connectionState'
```

## Summary

Adding an AKS cluster to ArgoCD depends on your organization's authentication requirements. For quick setups, use a Kubernetes service account token. For production with Azure AD-integrated clusters, use kubelogin with either a service principal or managed identity. The managed identity approach is the most secure since it eliminates all static credentials. Regardless of the method, always encrypt your cluster registration secrets using Sealed Secrets or External Secrets Operator before storing them in Git.
