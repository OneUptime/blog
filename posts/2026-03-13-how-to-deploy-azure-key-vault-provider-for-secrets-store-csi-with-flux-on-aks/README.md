# How to Deploy Azure Key Vault Provider for Secrets Store CSI with Flux on AKS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Azure, AKS, Key Vault, CSI, Secrets Store, Security, Workload Identity

Description: Learn how to deploy the Azure Key Vault Provider for the Secrets Store CSI Driver on AKS using Flux CD to securely mount secrets from Key Vault into pods.

---

## Introduction

The Secrets Store CSI Driver allows Kubernetes pods to mount secrets from external secret stores as volumes. The Azure Key Vault Provider is a plugin for this driver that integrates with Azure Key Vault, enabling your workloads to access secrets, certificates, and keys without storing them as Kubernetes secrets.

Deploying this stack through Flux ensures that your secret management infrastructure is consistent across clusters and follows GitOps principles. This guide covers the full setup, from deploying the driver and provider to configuring SecretProviderClass resources and mounting secrets in pods.

## Prerequisites

- An Azure subscription
- An AKS cluster with workload identity enabled
- Flux CLI version 2.0 or later bootstrapped on the cluster
- An Azure Key Vault with secrets you want to expose to workloads

## Step 1: Enable the Secrets Store CSI Driver Add-on

AKS provides the Secrets Store CSI Driver as a managed add-on:

```bash
az aks enable-addons \
  --resource-group my-resource-group \
  --name my-flux-cluster \
  --addons azure-keyvault-secrets-provider
```

Verify the add-on is running:

```bash
kubectl get pods -n kube-system -l app=secrets-store-csi-driver
kubectl get pods -n kube-system -l app=secrets-store-provider-azure
```

If you prefer to manage the driver yourself through Flux instead of the add-on, continue with the Helm-based deployment below.

## Step 2: Add Helm Repositories

Define the Helm repositories for both the Secrets Store CSI Driver and the Azure provider:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: secrets-store-csi
  namespace: flux-system
spec:
  interval: 1h
  url: https://kubernetes-sigs.github.io/secrets-store-csi-driver/charts
---
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: azure-kv-provider
  namespace: flux-system
spec:
  interval: 1h
  url: https://azure.github.io/secrets-store-csi-driver-provider-azure/charts
```

## Step 3: Deploy the Secrets Store CSI Driver

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: secrets-store-csi-driver
  namespace: flux-system
spec:
  interval: 30m
  chart:
    spec:
      chart: secrets-store-csi-driver
      version: "1.4.*"
      sourceRef:
        kind: HelmRepository
        name: secrets-store-csi
  targetNamespace: kube-system
  values:
    syncSecret:
      enabled: true
    enableSecretRotation: true
    rotationPollInterval: 2m
```

## Step 4: Deploy the Azure Key Vault Provider

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: azure-kv-provider
  namespace: flux-system
spec:
  interval: 30m
  dependsOn:
    - name: secrets-store-csi-driver
  chart:
    spec:
      chart: csi-secrets-store-provider-azure
      version: "1.5.*"
      sourceRef:
        kind: HelmRepository
        name: azure-kv-provider
  targetNamespace: kube-system
  values:
    secrets-store-csi-driver:
      install: false
    linux:
      enabled: true
    windows:
      enabled: false
```

## Step 5: Configure Workload Identity

Create a managed identity and federated credential for your workload:

```bash
az identity create \
  --resource-group my-resource-group \
  --name keyvault-workload-identity \
  --location eastus

IDENTITY_CLIENT_ID=$(az identity show \
  --resource-group my-resource-group \
  --name keyvault-workload-identity \
  --query clientId -o tsv)

IDENTITY_OBJECT_ID=$(az identity show \
  --resource-group my-resource-group \
  --name keyvault-workload-identity \
  --query principalId -o tsv)

az keyvault set-policy \
  --name my-keyvault \
  --object-id "$IDENTITY_OBJECT_ID" \
  --secret-permissions get list

AKS_OIDC_ISSUER=$(az aks show \
  --resource-group my-resource-group \
  --name my-flux-cluster \
  --query "oidcIssuerProfile.issuerUrl" -o tsv)

az identity federated-credential create \
  --name keyvault-federated \
  --identity-name keyvault-workload-identity \
  --resource-group my-resource-group \
  --issuer "$AKS_OIDC_ISSUER" \
  --subject system:serviceaccount:default:keyvault-sa \
  --audience api://AzureADTokenExchange
```

## Step 6: Create a Kubernetes Service Account

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: keyvault-sa
  namespace: default
  annotations:
    azure.workload.identity/client-id: "<IDENTITY_CLIENT_ID>"
  labels:
    azure.workload.identity/use: "true"
```

## Step 7: Define a SecretProviderClass

Create a SecretProviderClass that maps Key Vault secrets to volume mounts:

```yaml
apiVersion: secrets-store.csi.x-k8s.io/v1
kind: SecretProviderClass
metadata:
  name: azure-keyvault-secrets
  namespace: default
spec:
  provider: azure
  parameters:
    usePodIdentity: "false"
    clientID: "<IDENTITY_CLIENT_ID>"
    keyvaultName: my-keyvault
    objects: |
      array:
        - |
          objectName: database-connection-string
          objectType: secret
        - |
          objectName: api-key
          objectType: secret
        - |
          objectName: tls-cert
          objectType: secret
    tenantId: "<AZURE_TENANT_ID>"
  secretObjects:
    - secretName: app-secrets-k8s
      type: Opaque
      data:
        - objectName: database-connection-string
          key: DB_CONNECTION_STRING
        - objectName: api-key
          key: API_KEY
```

The `secretObjects` section optionally syncs the Key Vault secrets to Kubernetes secrets, which is useful for workloads that read from environment variables rather than mounted files.

## Step 8: Deploy a Workload Using the Secrets

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: default
spec:
  replicas: 2
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      serviceAccountName: keyvault-sa
      containers:
        - name: my-app
          image: myapp:latest
          envFrom:
            - secretRef:
                name: app-secrets-k8s
          volumeMounts:
            - name: secrets-store
              mountPath: /mnt/secrets
              readOnly: true
      volumes:
        - name: secrets-store
          csi:
            driver: secrets-store.csi.k8s.io
            readOnly: true
            volumeAttributes:
              secretProviderClass: azure-keyvault-secrets
```

## Step 9: Organize with Flux Kustomization

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: secrets-store-infra
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./infrastructure/secrets-store
  prune: true
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: app-with-secrets
  namespace: flux-system
spec:
  interval: 10m
  dependsOn:
    - name: secrets-store-infra
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./apps/my-app
  prune: true
```

## Secret Rotation

With `enableSecretRotation: true` and `rotationPollInterval: 2m` configured on the CSI driver, secrets are automatically rotated when updated in Key Vault. The driver polls Key Vault at the configured interval and updates the mounted files and synced Kubernetes secrets.

## Verifying the Setup

```bash
flux get helmreleases -A
kubectl get secretproviderclass -A
kubectl exec -it deploy/my-app -- ls /mnt/secrets
kubectl get secret app-secrets-k8s -o yaml
```

## Troubleshooting

**SecretProviderClass not found**: Ensure the CRD is installed by the CSI driver Helm chart. Check with `kubectl get crd | grep secretproviderclass`.

**Mount failures**: Inspect pod events with `kubectl describe pod <pod-name>`. Common issues include incorrect tenant ID, Key Vault name, or missing secret permissions.

**Secrets not syncing to Kubernetes**: The `syncSecret.enabled: true` flag must be set on the CSI driver. Also, the Kubernetes secret is only created after a pod mounts the SecretProviderClass.

## Conclusion

The Azure Key Vault Provider for Secrets Store CSI, deployed through Flux, provides a secure and automated approach to secret management on AKS. Secrets stay in Key Vault, are mounted directly into pods, and can be rotated automatically. By managing the entire stack through GitOps, you maintain full visibility into your security configuration and can replicate it consistently across clusters.
