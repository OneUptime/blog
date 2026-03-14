# How to Deploy the Crossplane Azure Provider with Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Crossplane, Azure, GitOps, Kubernetes, Provider, Infrastructure as Code

Description: Deploy the Crossplane Azure provider using Flux CD GitOps to manage Azure resources directly from Kubernetes manifests.

---

## Introduction

The Crossplane Azure provider enables your Kubernetes cluster to provision and manage Azure resources using the same declarative API patterns you use for pods and deployments. Resources like Azure SQL databases, storage accounts, virtual networks, and AKS clusters become Kubernetes objects that Flux reconciles continuously.

Managing the Azure provider through Flux ensures it is installed consistently across environments and that credential configuration is treated as code. When a cluster is rebuilt or a new environment is provisioned, the full provider setup is applied automatically from the Git repository, eliminating manual setup steps.

This guide uses the Upbound provider-family-azure package, which organizes Azure services into focused sub-providers, and walks through connecting it to your Azure subscription using a service principal.

## Prerequisites

- Crossplane installed and running on the cluster
- Flux CD bootstrapped
- An Azure subscription with a service principal that has Contributor role
- `az` CLI, `kubectl`, and `flux` CLIs installed

## Step 1: Create an Azure Service Principal

```bash
# Create a service principal with Contributor role scoped to your subscription
az ad sp create-for-rbac \
  --name "crossplane-provider" \
  --role Contributor \
  --scopes /subscriptions/YOUR_SUBSCRIPTION_ID \
  --sdk-auth > /tmp/azure-credentials.json

# Note the output - you'll need clientId, clientSecret, subscriptionId, tenantId
cat /tmp/azure-credentials.json
```

## Step 2: Store Credentials as a Kubernetes Secret

```bash
# Create the secret from the service principal JSON
kubectl create secret generic azure-provider-credentials \
  --from-file=credentials=/tmp/azure-credentials.json \
  --namespace crossplane-system

# Clean up the local file
rm /tmp/azure-credentials.json
```

## Step 3: Install the Azure Provider Family

```yaml
# infrastructure/crossplane/providers/azure/provider.yaml
apiVersion: pkg.crossplane.io/v1
kind: Provider
metadata:
  name: provider-family-azure
spec:
  # Upbound's Azure provider family package
  package: xpkg.upbound.io/upbound/provider-family-azure:v1.3.0
  packagePullPolicy: IfNotPresent
  revisionActivationPolicy: Automatic
  revisionHistoryLimit: 3
```

## Step 4: Install Azure Sub-Providers

Install sub-providers for the specific Azure services you need.

```yaml
# infrastructure/crossplane/providers/azure/provider-sql.yaml
apiVersion: pkg.crossplane.io/v1
kind: Provider
metadata:
  name: provider-azure-sql
spec:
  package: xpkg.upbound.io/upbound/provider-azure-sql:v1.3.0
  packagePullPolicy: IfNotPresent
  revisionActivationPolicy: Automatic

---
# infrastructure/crossplane/providers/azure/provider-storage.yaml
apiVersion: pkg.crossplane.io/v1
kind: Provider
metadata:
  name: provider-azure-storage
spec:
  package: xpkg.upbound.io/upbound/provider-azure-storage:v1.3.0
  packagePullPolicy: IfNotPresent
  revisionActivationPolicy: Automatic

---
# infrastructure/crossplane/providers/azure/provider-network.yaml
apiVersion: pkg.crossplane.io/v1
kind: Provider
metadata:
  name: provider-azure-network
spec:
  package: xpkg.upbound.io/upbound/provider-azure-network:v1.3.0
  packagePullPolicy: IfNotPresent
  revisionActivationPolicy: Automatic
```

## Step 5: Configure the Azure ProviderConfig

```yaml
# infrastructure/crossplane/providers/azure/providerconfig.yaml
apiVersion: azure.upbound.io/v1beta1
kind: ProviderConfig
metadata:
  name: default
spec:
  credentials:
    source: Secret
    secretRef:
      namespace: crossplane-system
      name: azure-provider-credentials
      # The key name must match what was used in kubectl create secret
      key: credentials
```

## Step 6: Add a Flux Kustomization

```yaml
# clusters/my-cluster/infrastructure/crossplane-providers-azure.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: crossplane-providers-azure
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/crossplane/providers/azure
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  dependsOn:
    - name: crossplane
  healthChecks:
    - apiVersion: pkg.crossplane.io/v1
      kind: Provider
      name: provider-family-azure
```

## Step 7: Verify Provider Health

```bash
# List all installed providers and their status
kubectl get providers

# Describe the family provider for detailed status
kubectl describe provider provider-family-azure

# Check the ProviderConfig is ready
kubectl get providerconfig.azure.upbound.io/default

# List Azure CRDs to confirm registration
kubectl get crds | grep azure.upbound.io | wc -l
```

## Best Practices

- Use a dedicated service principal for Crossplane with the minimum required permissions. Start with Contributor and narrow the scope once you know which resource types you need.
- Scope the service principal to a specific resource group rather than the entire subscription when possible.
- Rotate the service principal credentials regularly. Update the Kubernetes secret and the ProviderConfig without downtime by applying the new secret first.
- Use Azure Managed Identity instead of a service principal when running Crossplane on AKS with Workload Identity enabled, to eliminate credential management entirely.
- Set `revisionActivationPolicy: Automatic` during initial setup but consider switching to `Manual` in production to control when provider upgrades are applied.

## Conclusion

The Crossplane Azure provider is now deployed and managed through Flux CD. Your Kubernetes cluster can provision and manage Azure resources declaratively. The provider is continuously reconciled, so if it is accidentally deleted or its configuration drifts, Flux restores it to the desired state automatically. You are now ready to define Azure resources like SQL databases, storage accounts, and virtual networks as Kubernetes manifests.
