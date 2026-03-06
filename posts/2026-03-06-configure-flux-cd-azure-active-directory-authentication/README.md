# How to Configure Flux CD with Azure Active Directory Authentication

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux cd, azure, active directory, entra id, rbac, kubernetes, gitops, authentication

Description: A practical guide to integrating Flux CD with Azure Active Directory (Entra ID) for secure, group-based RBAC authentication on AKS clusters.

---

## Introduction

Azure Active Directory, now known as Microsoft Entra ID, is the backbone of identity management in Azure. When running Flux CD on Azure Kubernetes Service (AKS), integrating with Azure AD provides centralized authentication, role-based access control (RBAC), and group-based permissions for your GitOps workflows.

This guide walks you through configuring Flux CD to work with Azure AD authentication on AKS, including setting up RBAC policies, group-based access controls, and securing your GitOps pipeline.

## Prerequisites

Before getting started, ensure you have the following:

- An Azure subscription with Owner or Contributor access
- An AKS cluster with Azure AD integration enabled
- Azure CLI installed and configured
- kubectl installed and configured
- Flux CLI installed (v2.0 or later)

## Step 1: Enable Azure AD Integration on AKS

First, create an AKS cluster with Azure AD integration enabled, or update an existing cluster.

```bash
# Create a resource group
az group create \
  --name rg-flux-demo \
  --location eastus

# Create an AKS cluster with Azure AD integration
az aks create \
  --resource-group rg-flux-demo \
  --name aks-flux-cluster \
  --enable-aad \
  --enable-azure-rbac \
  --node-count 3 \
  --generate-ssh-keys
```

If you already have a cluster, enable Azure AD on it:

```bash
# Enable Azure AD on an existing cluster
az aks update \
  --resource-group rg-flux-demo \
  --name aks-flux-cluster \
  --enable-aad \
  --enable-azure-rbac
```

## Step 2: Create Azure AD Groups for Flux Access

Create dedicated Azure AD groups for different levels of Flux access.

```bash
# Create an admin group for full Flux access
ADMIN_GROUP_ID=$(az ad group create \
  --display-name "flux-admins" \
  --mail-nickname "flux-admins" \
  --query id -o tsv)

# Create a read-only group for viewing Flux resources
READONLY_GROUP_ID=$(az ad group create \
  --display-name "flux-readers" \
  --mail-nickname "flux-readers" \
  --query id -o tsv)

# Create a developer group for namespace-scoped access
DEV_GROUP_ID=$(az ad group create \
  --display-name "flux-developers" \
  --mail-nickname "flux-developers" \
  --query id -o tsv)

# Add users to groups
az ad group member add \
  --group "flux-admins" \
  --member-id <user-object-id>
```

## Step 3: Configure Azure RBAC Role Assignments

Assign Azure RBAC roles to the AD groups for AKS access.

```bash
# Get the AKS cluster resource ID
AKS_ID=$(az aks show \
  --resource-group rg-flux-demo \
  --name aks-flux-cluster \
  --query id -o tsv)

# Grant cluster admin access to flux-admins group
az role assignment create \
  --assignee "$ADMIN_GROUP_ID" \
  --role "Azure Kubernetes Service RBAC Cluster Admin" \
  --scope "$AKS_ID"

# Grant read-only access to flux-readers group
az role assignment create \
  --assignee "$READONLY_GROUP_ID" \
  --role "Azure Kubernetes Service RBAC Reader" \
  --scope "$AKS_ID"

# Grant write access to flux-developers group (namespace-scoped)
az role assignment create \
  --assignee "$DEV_GROUP_ID" \
  --role "Azure Kubernetes Service RBAC Writer" \
  --scope "$AKS_ID/namespaces/dev"
```

## Step 4: Configure Kubernetes RBAC for Flux

Create Kubernetes RBAC resources that map to the Azure AD groups.

```yaml
# cluster-role-flux-admin.yaml
# Grants full access to all Flux custom resources
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: flux-admin
rules:
  # Allow full access to all Flux resources
  - apiGroups:
      - source.toolkit.fluxcd.io
      - kustomize.toolkit.fluxcd.io
      - helm.toolkit.fluxcd.io
      - notification.toolkit.fluxcd.io
      - image.toolkit.fluxcd.io
    resources: ["*"]
    verbs: ["*"]
  # Allow viewing namespaces and events
  - apiGroups: [""]
    resources: ["namespaces", "events"]
    verbs: ["get", "list", "watch"]
```

```yaml
# cluster-role-flux-reader.yaml
# Grants read-only access to Flux resources
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: flux-reader
rules:
  - apiGroups:
      - source.toolkit.fluxcd.io
      - kustomize.toolkit.fluxcd.io
      - helm.toolkit.fluxcd.io
      - notification.toolkit.fluxcd.io
      - image.toolkit.fluxcd.io
    resources: ["*"]
    verbs: ["get", "list", "watch"]
```

Bind the ClusterRoles to the Azure AD groups:

```yaml
# cluster-role-binding-flux-admin.yaml
# Binds the flux-admin role to the Azure AD admin group
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: flux-admin-binding
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: flux-admin
subjects:
  - apiGroup: rbac.authorization.k8s.io
    kind: Group
    # Replace with your Azure AD group object ID
    name: "<ADMIN_GROUP_ID>"
---
# cluster-role-binding-flux-reader.yaml
# Binds the flux-reader role to the Azure AD readers group
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: flux-reader-binding
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: flux-reader
subjects:
  - apiGroup: rbac.authorization.k8s.io
    kind: Group
    name: "<READONLY_GROUP_ID>"
```

## Step 5: Configure Namespace-Scoped Access for Developers

Create namespace-scoped roles for the developer group.

```yaml
# role-flux-developer.yaml
# Grants developers access to Flux resources within the dev namespace
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: flux-developer
  namespace: dev
rules:
  - apiGroups:
      - source.toolkit.fluxcd.io
      - kustomize.toolkit.fluxcd.io
      - helm.toolkit.fluxcd.io
    resources: ["*"]
    verbs: ["get", "list", "watch", "create", "update", "patch"]
  # Prevent developers from deleting Flux resources
  - apiGroups:
      - source.toolkit.fluxcd.io
      - kustomize.toolkit.fluxcd.io
      - helm.toolkit.fluxcd.io
    resources: ["*"]
    verbs: ["delete"]
---
# role-binding-flux-developer.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: flux-developer-binding
  namespace: dev
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: flux-developer
subjects:
  - apiGroup: rbac.authorization.k8s.io
    kind: Group
    name: "<DEV_GROUP_ID>"
```

## Step 6: Bootstrap Flux with Azure AD Credentials

Get credentials for the cluster using Azure AD authentication and bootstrap Flux.

```bash
# Get cluster credentials with Azure AD auth
az aks get-credentials \
  --resource-group rg-flux-demo \
  --name aks-flux-cluster

# Bootstrap Flux using a GitHub repository
flux bootstrap github \
  --owner=<your-github-org> \
  --repository=fleet-infra \
  --branch=main \
  --path=clusters/aks-flux-cluster \
  --personal
```

## Step 7: Configure Flux Service Account with Azure Managed Identity

Create a managed identity for Flux to access Azure resources.

```bash
# Create a managed identity for Flux
FLUX_IDENTITY=$(az identity create \
  --name flux-controller-identity \
  --resource-group rg-flux-demo \
  --query clientId -o tsv)

# Get the OIDC issuer URL for the AKS cluster
OIDC_ISSUER=$(az aks show \
  --resource-group rg-flux-demo \
  --name aks-flux-cluster \
  --query oidcIssuerProfile.issuerUrl -o tsv)

# Create a federated credential for the Flux source-controller
az identity federated-credential create \
  --name flux-source-controller \
  --identity-name flux-controller-identity \
  --resource-group rg-flux-demo \
  --issuer "$OIDC_ISSUER" \
  --subject system:serviceaccount:flux-system:source-controller \
  --audiences api://AzureADTokenExchange
```

## Step 8: Set Up Conditional Access Policies

Configure Azure AD Conditional Access to add extra security for Flux operations.

```bash
# Create a named location for your CI/CD network
az rest --method POST \
  --uri "https://graph.microsoft.com/v1.0/identity/conditionalAccess/namedLocations" \
  --body '{
    "@odata.type": "#microsoft.graph.ipNamedLocation",
    "displayName": "Flux CD Network",
    "isTrusted": true,
    "ipRanges": [
      {
        "@odata.type": "#microsoft.graph.iPv4CidrRange",
        "cidrAddress": "10.0.0.0/16"
      }
    ]
  }'
```

## Step 9: Configure Flux Notification with Azure AD

Set up Flux notifications that integrate with Azure AD-secured endpoints.

```yaml
# notification-provider.yaml
# Configures Flux to send notifications to an Azure AD-protected webhook
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Provider
metadata:
  name: azure-webhook
  namespace: flux-system
spec:
  type: generic
  address: https://your-azure-function.azurewebsites.net/api/flux-webhook
  secretRef:
    name: azure-webhook-token
---
# notification-alert.yaml
# Sends alerts for Flux reconciliation events
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: flux-reconciliation-alert
  namespace: flux-system
spec:
  providerRef:
    name: azure-webhook
  eventSeverity: info
  eventSources:
    - kind: GitRepository
      name: "*"
    - kind: Kustomization
      name: "*"
    - kind: HelmRelease
      name: "*"
```

## Step 10: Verify the Configuration

Test the setup by logging in with different Azure AD accounts.

```bash
# Login as an admin user
az login
az aks get-credentials \
  --resource-group rg-flux-demo \
  --name aks-flux-cluster

# Verify admin can list all Flux resources
flux get all -A

# Verify admin can reconcile
flux reconcile kustomization flux-system

# Test developer access (login as developer)
# Should only see resources in the dev namespace
kubectl get kustomizations -n dev

# Test reader access (login as reader)
# Should be able to list but not modify
flux get sources git -A
```

## Troubleshooting

### Common Issues

**Issue: "Forbidden" errors when accessing Flux resources**

```bash
# Check current user context
kubectl auth whoami

# Verify role bindings exist
kubectl get clusterrolebindings | grep flux

# Check Azure AD group membership
az ad group member list --group "flux-admins" --query "[].displayName"
```

**Issue: Token expiration during long reconciliation cycles**

```bash
# Refresh the kubelogin token cache
kubelogin remove-tokens
az aks get-credentials \
  --resource-group rg-flux-demo \
  --name aks-flux-cluster
```

**Issue: Managed identity not recognized**

```bash
# Verify the federated credential
az identity federated-credential list \
  --identity-name flux-controller-identity \
  --resource-group rg-flux-demo

# Check the service account annotation
kubectl get sa source-controller -n flux-system -o yaml
```

## Summary

In this guide, you configured Flux CD with Azure Active Directory (Entra ID) authentication on AKS. You set up Azure AD groups for different access levels, created Kubernetes RBAC bindings mapped to those groups, configured managed identity for Flux controllers, and established notification integration. This setup provides a secure, centralized authentication model for your GitOps workflows with granular access control based on Azure AD group membership.
