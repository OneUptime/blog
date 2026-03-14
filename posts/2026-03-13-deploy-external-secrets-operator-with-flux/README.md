# How to Deploy External Secrets Operator with Flux HelmRelease

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, External Secrets Operator, Secret Management

Description: Deploy the External Secrets Operator using Flux CD HelmRelease to enable GitOps-driven synchronization of secrets from external secret stores into Kubernetes.

---

## Introduction

Managing Kubernetes secrets securely in a GitOps workflow is one of the most common challenges teams face. Storing secrets in Git — even encrypted — adds operational complexity and key rotation burden. The External Secrets Operator (ESO) solves this by keeping secrets in purpose-built secret stores (AWS Secrets Manager, HashiCorp Vault, Azure Key Vault, etc.) and synchronizing them into Kubernetes as native Secret objects on demand.

Deploying ESO through Flux CD completes the GitOps story: the operator itself is managed declaratively in Git, and the `ExternalSecret` and `SecretStore` resources that define which secrets to sync are version-controlled, reviewed, and reconciled automatically. Your actual secret values never touch Git — only the references to them do.

This guide walks through deploying the External Secrets Operator using a Flux HelmRelease, verifying the installation, and preparing for secret store configuration.

## Prerequisites

- Kubernetes cluster (1.24+) with Flux CD bootstrapped
- `flux` and `kubectl` CLI tools
- An external secret store (AWS, Azure, GCP, or Vault) with secrets already populated
- IRSA, Workload Identity, or service account credentials configured for your cloud provider

## Step 1: Add the External Secrets Helm Repository

```yaml
# clusters/my-cluster/external-secrets/helmrepository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: external-secrets
  namespace: flux-system
spec:
  # Official External Secrets Operator chart repository
  url: https://charts.external-secrets.io
  # Check for new chart versions every 10 minutes
  interval: 10m
```

## Step 2: Create the Namespace

```yaml
# clusters/my-cluster/external-secrets/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: external-secrets
  labels:
    app.kubernetes.io/managed-by: flux
```

## Step 3: Deploy ESO via HelmRelease

```yaml
# clusters/my-cluster/external-secrets/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: external-secrets
  namespace: flux-system
spec:
  interval: 15m
  targetNamespace: external-secrets
  chart:
    spec:
      chart: external-secrets
      # Pin to a specific version for stability
      version: "0.x.x"
      sourceRef:
        kind: HelmRepository
        name: external-secrets
        namespace: flux-system
  values:
    # Install all ESO CRDs (ExternalSecret, SecretStore, ClusterSecretStore)
    installCRDs: true
    # Configure the webhook for secret validation
    webhook:
      port: 9443
    # Resource limits for the operator
    resources:
      requests:
        cpu: 10m
        memory: 64Mi
      limits:
        cpu: 100m
        memory: 128Mi
    # Enable metrics for Prometheus scraping
    serviceMonitor:
      enabled: true
      additionalLabels:
        release: prometheus
```

## Step 4: Create the Flux Kustomization

```yaml
# clusters/my-cluster/external-secrets/kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: external-secrets
  namespace: flux-system
spec:
  interval: 10m
  path: ./clusters/my-cluster/external-secrets
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: external-secrets
      namespace: external-secrets
    - apiVersion: apps/v1
      kind: Deployment
      name: external-secrets-webhook
      namespace: external-secrets
```

## Step 5: Verify the Installation

```bash
# Confirm Flux reconciled the HelmRelease
flux get helmreleases --namespace flux-system

# Check ESO pods are running
kubectl get pods -n external-secrets

# Verify all CRDs were installed
kubectl get crd | grep external-secrets.io

# Expected CRDs:
# clusterexternalsecrets.external-secrets.io
# clustersecretstores.external-secrets.io
# externalsecrets.external-secrets.io
# secretstores.external-secrets.io
```

## Step 6: Confirm the Webhook is Operational

```bash
# Check the webhook certificate is issued
kubectl get secret external-secrets-webhook -n external-secrets

# Test ESO is ready to validate resources
kubectl apply --dry-run=server -f - <<EOF
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: test
  namespace: default
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: my-store
    kind: SecretStore
  target:
    name: test-secret
  data:
    - secretKey: mykey
      remoteRef:
        key: mypath
        property: myfield
EOF
```

## Best Practices

- Pin the ESO Helm chart to a specific version in `HelmRelease` to avoid unexpected upgrades breaking existing `ExternalSecret` resources.
- Enable `serviceMonitor: true` from day one so you can monitor secret sync failures via Prometheus alerts.
- Set `installCRDs: true` in the chart values to manage CRD lifecycle with the Helm release.
- Use Flux health checks on both the `external-secrets` and `external-secrets-webhook` deployments so dependent Kustomizations (like SecretStores) wait for ESO to be fully ready.
- Grant the ESO service account only the minimum IRSA/Workload Identity permissions needed for the specific secret paths it must access.

## Conclusion

Deploying the External Secrets Operator through Flux CD gives you a fully GitOps-managed secret synchronization layer. Secret references, policies, and refresh intervals are all tracked in Git, while actual secret values remain secure in your external secret store. This is the foundation for building a scalable, auditable, and rotation-ready secrets management strategy for Kubernetes.
