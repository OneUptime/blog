# How to Set Up Flux Multi-Subscription Deployment on Azure

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Azure, AKS, Multi-Subscription, Multi-Tenant, Multi-Cluster, Enterprise

Description: Learn how to set up Flux CD for managing deployments across multiple Azure subscriptions and AKS clusters from a single Git repository.

---

## Introduction

Enterprise Azure environments typically span multiple subscriptions for isolation between teams, environments, or business units. Managing Kubernetes deployments across these subscriptions manually is error-prone and difficult to scale. Flux CD enables a single Git repository to drive deployments across multiple AKS clusters in different subscriptions, providing a unified GitOps workflow for your entire Azure estate.

This guide covers the architecture, repository structure, identity configuration, and Flux setup needed to manage multi-subscription AKS deployments effectively.

## Prerequisites

- Multiple Azure subscriptions with AKS clusters
- Azure CLI version 2.47 or later
- Flux CLI version 2.0 or later
- A Git repository accessible from all clusters
- Permissions to create managed identities and role assignments across subscriptions

## Step 1: Plan the Repository Structure

A well-organized repository is critical for multi-subscription deployments. Use a structure that separates base configurations from cluster-specific overlays:

```text
fleet-infra/
  base/
    infrastructure/
      cert-manager/
      ingress-nginx/
      monitoring/
    apps/
      app-a/
      app-b/
  clusters/
    subscription-a/
      dev-cluster/
        flux-system/
        kustomization.yaml
        infrastructure.yaml
        apps.yaml
        cluster-config.yaml
      prod-cluster/
        flux-system/
        kustomization.yaml
        infrastructure.yaml
        apps.yaml
        cluster-config.yaml
    subscription-b/
      staging-cluster/
        flux-system/
        kustomization.yaml
        infrastructure.yaml
        apps.yaml
        cluster-config.yaml
      prod-cluster/
        flux-system/
        kustomization.yaml
        infrastructure.yaml
        apps.yaml
        cluster-config.yaml
  environments/
    dev/
      kustomization.yaml
    staging/
      kustomization.yaml
    production/
      kustomization.yaml
```

## Step 2: Create AKS Clusters Across Subscriptions

Create or select resource groups, then create clusters in each subscription:

```bash
# Subscription A - Development

az account set --subscription "Subscription-A-ID"
az group create --name rg-dev --location eastus

az aks create \
  --resource-group rg-dev \
  --name dev-cluster \
  --location eastus \
  --node-count 2 \
  --enable-managed-identity \
  --enable-oidc-issuer \
  --enable-workload-identity \
  --generate-ssh-keys

# Subscription A - Production
az group create --name rg-prod --location eastus

az aks create \
  --resource-group rg-prod \
  --name prod-cluster-a \
  --location eastus \
  --node-count 3 \
  --enable-managed-identity \
  --enable-oidc-issuer \
  --enable-workload-identity \
  --generate-ssh-keys

# Subscription B - Staging
az account set --subscription "Subscription-B-ID"
az group create --name rg-staging --location westus2

az aks create \
  --resource-group rg-staging \
  --name staging-cluster \
  --location westus2 \
  --node-count 2 \
  --enable-managed-identity \
  --enable-oidc-issuer \
  --enable-workload-identity \
  --generate-ssh-keys

# Subscription B - Production
az group create --name rg-prod-b --location westus2

az aks create \
  --resource-group rg-prod-b \
  --name prod-cluster-b \
  --location westus2 \
  --node-count 3 \
  --enable-managed-identity \
  --enable-oidc-issuer \
  --enable-workload-identity \
  --generate-ssh-keys
```

## Step 3: Bootstrap Flux on Each Cluster

Bootstrap Flux on each cluster, pointing to the appropriate path in the shared repository:

```bash
# Dev cluster in Subscription A
az account set --subscription "Subscription-A-ID"
az aks get-credentials --resource-group rg-dev --name dev-cluster

flux bootstrap github \
  --owner=my-org \
  --repository=fleet-infra \
  --branch=main \
  --path=clusters/subscription-a/dev-cluster

# Staging cluster in Subscription B
az account set --subscription "Subscription-B-ID"
az aks get-credentials --resource-group rg-staging --name staging-cluster

flux bootstrap github \
  --owner=my-org \
  --repository=fleet-infra \
  --branch=main \
  --path=clusters/subscription-b/staging-cluster
```

Repeat for each cluster, changing the `--path` to match the cluster's directory.

## Step 4: Define Base Infrastructure

Create shared infrastructure configurations that all clusters use:

```yaml
# base/infrastructure/ingress-nginx/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
namespace: ingress-nginx
resources:
  - namespace.yaml
  - helmrepository.yaml
  - helmrelease.yaml
```

```yaml
# base/infrastructure/ingress-nginx/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: ingress-nginx
  namespace: ingress-nginx
spec:
  interval: 30m
  chart:
    spec:
      chart: ingress-nginx
      version: "4.9.*"
      sourceRef:
        kind: HelmRepository
        name: ingress-nginx
  values:
    controller:
      replicaCount: 2
      resources:
        requests:
          cpu: 100m
          memory: 128Mi
```

## Step 5: Create Environment Overlays

Define environment-specific configurations:

```yaml
# environments/dev/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base/infrastructure/ingress-nginx
patches:
  - target:
      kind: HelmRelease
      name: ingress-nginx
    patch: |
      - op: replace
        path: /spec/values/controller/replicaCount
        value: 1
```

```yaml
# environments/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base/infrastructure/ingress-nginx
patches:
  - target:
      kind: HelmRelease
      name: ingress-nginx
    patch: |
      - op: replace
        path: /spec/values/controller/replicaCount
        value: 3
      - op: add
        path: /spec/values/controller/autoscaling
        value:
          enabled: true
          minReplicas: 3
          maxReplicas: 10
```

## Step 6: Configure Cluster-Level Kustomizations

Each cluster directory includes the Flux-generated sync manifests and references the appropriate environment overlay:

```yaml
# clusters/subscription-a/dev-cluster/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - flux-system/gotk-components.yaml
  - flux-system/gotk-sync.yaml
  - infrastructure.yaml
  - apps.yaml
  - cluster-config.yaml
```

```yaml
# clusters/subscription-a/dev-cluster/infrastructure.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: infrastructure
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./environments/dev
  prune: true
```

```yaml
# clusters/subscription-a/prod-cluster/infrastructure.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: infrastructure
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./environments/production
  prune: true
```

## Step 7: Deploy Applications with Subscription-Specific Configurations

Some configurations differ per subscription, such as ACR endpoints or Key Vault references:

```yaml
# clusters/subscription-a/prod-cluster/apps.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: apps
  namespace: flux-system
spec:
  interval: 10m
  dependsOn:
    - name: infrastructure
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./base/apps
  prune: true
  postBuild:
    substitute:
      ACR_NAME: subascr
      KEY_VAULT_NAME: suba-keyvault
      SUBSCRIPTION_ID: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
      ENVIRONMENT: production
      REGION: eastus
    substituteFrom:
      - kind: ConfigMap
        name: cluster-config
```

Create a cluster-specific ConfigMap with subscription details:

```yaml
# clusters/subscription-a/prod-cluster/cluster-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: cluster-config
  namespace: flux-system
data:
  CLUSTER_NAME: prod-cluster-a
  SUBSCRIPTION_NAME: Subscription-A
  COST_CENTER: "12345"
```

## Step 8: Set Up Cross-Subscription Identity

For workloads that need to access resources in a different subscription, assign Azure RBAC to the user-assigned managed identity used by the Kubernetes service account:

```bash
# Grant the Subscription A workload identity access to Subscription B resources
AKS_OIDC_ISSUER=$(az aks show \
  --subscription "Subscription-A-ID" \
  --resource-group rg-prod \
  --name prod-cluster-a \
  --query oidcIssuerProfile.issuerUrl -o tsv)

az identity create \
  --subscription "Subscription-A-ID" \
  --resource-group rg-prod \
  --name prod-app-workload-identity \
  --location eastus

WORKLOAD_CLIENT_ID=$(az identity show \
  --subscription "Subscription-A-ID" \
  --resource-group rg-prod \
  --name prod-app-workload-identity \
  --query clientId -o tsv)

WORKLOAD_PRINCIPAL_ID=$(az identity show \
  --subscription "Subscription-A-ID" \
  --resource-group rg-prod \
  --name prod-app-workload-identity \
  --query principalId -o tsv)

az identity federated-credential create \
  --subscription "Subscription-A-ID" \
  --resource-group rg-prod \
  --identity-name prod-app-workload-identity \
  --name prod-app-sa \
  --issuer "$AKS_OIDC_ISSUER" \
  --subject system:serviceaccount:production:prod-app \
  --audience api://AzureADTokenExchange

az role assignment create \
  --subscription "Subscription-B-ID" \
  --assignee-object-id "$WORKLOAD_PRINCIPAL_ID" \
  --assignee-principal-type ServicePrincipal \
  --role "Reader" \
  --scope "/subscriptions/Subscription-B-ID/resourceGroups/shared-resources"
```

Annotate the workload's Kubernetes service account with `azure.workload.identity/client-id: "$WORKLOAD_CLIENT_ID"` and run the pods with that service account.

## Step 9: Configure Flux Notifications Across Clusters

Set up centralized alerting for all clusters:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Provider
metadata:
  name: central-alerting
  namespace: flux-system
spec:
  type: slack
  address: https://slack.com/api/chat.postMessage
  channel: fleet-alerts
  secretRef:
    name: slack-bot-token
---
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: fleet-alerts
  namespace: flux-system
spec:
  providerRef:
    name: central-alerting
  eventSeverity: error
  eventSources:
    - kind: Kustomization
      name: "*"
    - kind: HelmRelease
      name: "*"
  eventMetadata:
    summary: "Flux reconciliation failed"
    cluster: "${CLUSTER_NAME}"
    subscription: "${SUBSCRIPTION_NAME}"
```

## Step 10: Implement Progressive Delivery

Use separate Git refs to roll out changes progressively across environments:

```yaml
# In the dev cluster
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: apps
  namespace: flux-system
spec:
  interval: 5m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./base/apps
  prune: true
```

For production clusters, use a different branch or tag:

```yaml
# In the prod cluster
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: flux-system
  namespace: flux-system
spec:
  interval: 10m
  url: https://github.com/my-org/fleet-infra
  ref:
    tag: "v1.5.0"
```

## Verifying the Multi-Subscription Setup

Check Flux status on each cluster:

```bash
# Iterate through clusters
for ctx in dev-cluster staging-cluster prod-cluster-a prod-cluster-b; do
  echo "=== $ctx ==="
  kubectl --context "$ctx" get kustomizations -n flux-system
  echo ""
done
```

## Troubleshooting

**Git authentication failures on specific clusters**: Each Flux installation has its own deploy key. Ensure all deploy keys are added to the shared repository with at least read access.

**Variable substitution not working**: Verify the ConfigMap exists in the flux-system namespace and that `postBuild.substituteFrom` references the correct ConfigMap name.

**Drift between clusters**: Use `flux diff kustomization <name>` to compare the desired state with the live state on each cluster. Consider setting up a CI job that runs `flux build` for each cluster path to catch issues before merging.

**Cross-subscription access denied**: Confirm that role assignments have propagated and that the managed identity principal ID is correct. Cross-subscription role assignments may take several minutes to become effective.

## Conclusion

Flux multi-subscription deployment on Azure provides a scalable, auditable approach to managing Kubernetes workloads across your entire Azure estate. By using a single Git repository with environment overlays and cluster-specific configurations, you maintain consistency while allowing per-subscription customization. The combination of GitOps automation, variable substitution, and progressive delivery creates a production-ready platform for enterprise-scale Kubernetes management.
