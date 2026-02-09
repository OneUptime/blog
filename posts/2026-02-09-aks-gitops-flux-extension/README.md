# How to Set Up AKS GitOps Extension with Flux for Cluster Configuration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Azure, AKS, GitOps, Flux

Description: Learn how to enable and configure the AKS GitOps extension with Flux CD for declarative cluster management, automated deployments, and multi-cluster configuration synchronization.

---

The AKS GitOps extension provides managed Flux CD installation for declarative cluster management. It continuously synchronizes cluster state with Git repositories, enabling infrastructure-as-code workflows and automated deployment pipelines. The extension handles Flux lifecycle management, updates, and Azure integration automatically.

## Understanding AKS GitOps Extension

Traditional deployment workflows push changes to clusters through CI/CD pipelines. GitOps inverts this model by having clusters pull configuration from Git repositories. The AKS GitOps extension installs Flux controllers that watch Git repos and reconcile differences between repository state and cluster state.

The extension provides several advantages over self-managed Flux installations: automatic updates to Flux components, integration with Azure managed identities for authentication, multi-cluster management through Azure Arc, and centralized monitoring through Azure Monitor.

Flux consists of multiple controllers: source-controller fetches artifacts from Git and Helm repositories, kustomize-controller applies Kustomize overlays, helm-controller manages Helm releases, and notification-controller sends alerts about reconciliation events.

## Enabling GitOps Extension

Enable the extension on AKS clusters:

```bash
# Register required providers
az provider register --namespace Microsoft.Kubernetes
az provider register --namespace Microsoft.KubernetesConfiguration
az provider register --namespace Microsoft.ContainerService

# Enable GitOps extension
az k8s-extension create \
  --cluster-name production-cluster \
  --resource-group production-rg \
  --cluster-type managedClusters \
  --extension-type microsoft.flux \
  --name flux \
  --scope cluster \
  --configuration-settings \
    source-controller.enabled=true \
    kustomize-controller.enabled=true \
    helm-controller.enabled=true \
    notification-controller.enabled=true
```

Verify the installation:

```bash
# Check extension status
az k8s-extension show \
  --cluster-name production-cluster \
  --resource-group production-rg \
  --cluster-type managedClusters \
  --name flux

# Verify Flux components
kubectl get pods -n flux-system
kubectl get deploy -n flux-system
```

The flux-system namespace contains all Flux controllers and CRDs.

## Creating Git Source Configuration

Configure Flux to sync from a Git repository:

```bash
# Create GitOps configuration for public repo
az k8s-configuration flux create \
  --cluster-name production-cluster \
  --resource-group production-rg \
  --cluster-type managedClusters \
  --name cluster-config \
  --namespace cluster-config \
  --scope cluster \
  --url https://github.com/myorg/k8s-configs \
  --branch main \
  --kustomization name=infrastructure path=./infrastructure prune=true \
  --kustomization name=apps path=./apps prune=true depends_on=["infrastructure"]
```

This creates a GitRepository source and two Kustomizations. The infrastructure kustomization deploys cluster-level resources, and apps deploys applications after infrastructure is ready.

For private repositories, create SSH key authentication:

```bash
# Generate SSH key
ssh-keygen -t rsa -b 4096 -f flux-key -N ""

# Add public key to GitHub as deploy key
cat flux-key.pub

# Create configuration with SSH auth
az k8s-configuration flux create \
  --cluster-name production-cluster \
  --resource-group production-rg \
  --cluster-type managedClusters \
  --name cluster-config \
  --namespace cluster-config \
  --scope cluster \
  --url git@github.com:myorg/k8s-configs.git \
  --branch main \
  --ssh-private-key-file ./flux-key \
  --known-hosts-file ~/.ssh/known_hosts \
  --kustomization name=infrastructure path=./infrastructure prune=true
```

Verify the configuration:

```bash
# Check configuration status
az k8s-configuration flux show \
  --cluster-name production-cluster \
  --resource-group production-rg \
  --cluster-type managedClusters \
  --name cluster-config

# View Flux resources
kubectl get gitrepositories -n cluster-config
kubectl get kustomizations -n cluster-config
```

## Organizing Repository Structure

Structure your Git repository for effective cluster management:

```
k8s-configs/
├── infrastructure/
│   ├── namespaces/
│   │   ├── production.yaml
│   │   └── staging.yaml
│   ├── rbac/
│   │   ├── roles.yaml
│   │   └── bindings.yaml
│   ├── network/
│   │   └── network-policies.yaml
│   └── kustomization.yaml
├── apps/
│   ├── web-app/
│   │   ├── deployment.yaml
│   │   ├── service.yaml
│   │   └── kustomization.yaml
│   ├── api-service/
│   │   ├── deployment.yaml
│   │   ├── service.yaml
│   │   └── kustomization.yaml
│   └── kustomization.yaml
└── README.md
```

Create the infrastructure kustomization:

```yaml
# infrastructure/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
- namespaces/production.yaml
- namespaces/staging.yaml
- rbac/roles.yaml
- rbac/bindings.yaml
- network/network-policies.yaml
```

Create the apps kustomization:

```yaml
# apps/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
- web-app
- api-service
```

## Deploying Helm Charts

Configure Flux to deploy Helm charts from repositories:

```bash
# Add Helm repository source
az k8s-configuration flux create \
  --cluster-name production-cluster \
  --resource-group production-rg \
  --cluster-type managedClusters \
  --name nginx-ingress \
  --namespace ingress-system \
  --scope cluster \
  --kind HelmRepository \
  --url https://kubernetes.github.io/ingress-nginx \
  --kustomization name=nginx-ingress path=./charts/nginx-ingress prune=true
```

Create HelmRelease manifest in your repository:

```yaml
# charts/nginx-ingress/release.yaml
apiVersion: helm.toolkit.fluxcd.io/v2beta1
kind: HelmRelease
metadata:
  name: nginx-ingress
  namespace: ingress-system
spec:
  interval: 10m
  chart:
    spec:
      chart: ingress-nginx
      version: "4.x"
      sourceRef:
        kind: HelmRepository
        name: ingress-nginx
        namespace: flux-system
  values:
    controller:
      replicaCount: 3
      service:
        type: LoadBalancer
        annotations:
          service.beta.kubernetes.io/azure-load-balancer-health-probe-request-path: /healthz
      resources:
        requests:
          cpu: 100m
          memory: 128Mi
        limits:
          cpu: 200m
          memory: 256Mi
```

Commit and push:

```bash
git add charts/nginx-ingress/release.yaml
git commit -m "Add nginx ingress HelmRelease"
git push origin main
```

Flux detects the change and deploys the Helm chart.

## Implementing Multi-Environment Management

Use Kustomize overlays for environment-specific configurations:

```
k8s-configs/
├── base/
│   ├── deployment.yaml
│   ├── service.yaml
│   └── kustomization.yaml
├── overlays/
│   ├── production/
│   │   ├── replica-count.yaml
│   │   ├── resource-limits.yaml
│   │   └── kustomization.yaml
│   └── staging/
│       ├── replica-count.yaml
│       ├── resource-limits.yaml
│       └── kustomization.yaml
```

Base deployment:

```yaml
# base/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
spec:
  replicas: 1
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      containers:
      - name: web
        image: myregistry.azurecr.io/web-app:latest
        ports:
        - containerPort: 8080
```

Production overlay:

```yaml
# overlays/production/replica-count.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
spec:
  replicas: 5
```

```yaml
# overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
bases:
- ../../base
patchesStrategicMerge:
- replica-count.yaml
- resource-limits.yaml
namespace: production
```

Configure separate kustomizations for each environment:

```bash
az k8s-configuration flux create \
  --cluster-name production-cluster \
  --resource-group production-rg \
  --cluster-type managedClusters \
  --name production-apps \
  --namespace production \
  --scope namespace \
  --url https://github.com/myorg/k8s-configs \
  --branch main \
  --kustomization name=production path=./overlays/production prune=true
```

## Managing Secrets with External Secrets Operator

Integrate External Secrets Operator to avoid storing secrets in Git:

```yaml
# infrastructure/external-secrets/secret-store.yaml
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: azure-keyvault
  namespace: production
spec:
  provider:
    azurekv:
      authType: WorkloadIdentity
      vaultUrl: https://myvault.vault.azure.net
      serviceAccountRef:
        name: external-secrets-sa
```

```yaml
# apps/web-app/external-secret.yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: database-credentials
  namespace: production
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: azure-keyvault
    kind: SecretStore
  target:
    name: database-credentials
    creationPolicy: Owner
  data:
  - secretKey: username
    remoteRef:
      key: db-username
  - secretKey: password
    remoteRef:
      key: db-password
```

Flux deploys the ExternalSecret, which fetches actual secrets from Azure Key Vault.

## Monitoring Flux Reconciliation

Track Flux synchronization status:

```bash
# Check Flux kustomizations
kubectl get kustomizations -A

# View reconciliation status
kubectl describe kustomization infrastructure -n cluster-config

# Check for sync errors
kubectl get kustomizations -A -o json | jq -r '.items[] | select(.status.conditions[]?.type=="Ready" and .status.conditions[]?.status=="False") | .metadata.name'
```

View Flux source status:

```bash
# Check Git repository sync
kubectl get gitrepositories -A

# View last sync time
kubectl get gitrepository cluster-config -n cluster-config -o jsonpath='{.status.artifact.lastUpdateTime}'
```

Enable notifications for sync failures:

```yaml
# infrastructure/alerts/provider.yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta1
kind: Provider
metadata:
  name: teams
  namespace: flux-system
spec:
  type: msteams
  address: https://outlook.office.com/webhook/...
---
apiVersion: notification.toolkit.fluxcd.io/v1beta1
kind: Alert
metadata:
  name: flux-alerts
  namespace: flux-system
spec:
  providerRef:
    name: teams
  eventSeverity: error
  eventSources:
  - kind: Kustomization
    name: '*'
  - kind: HelmRelease
    name: '*'
```

## Implementing Progressive Delivery

Use Flagger for canary deployments:

```yaml
# apps/web-app/canary.yaml
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: web-app
  namespace: production
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: web-app
  service:
    port: 8080
  analysis:
    interval: 1m
    threshold: 5
    maxWeight: 50
    stepWeight: 10
    metrics:
    - name: request-success-rate
      thresholdRange:
        min: 99
      interval: 1m
    - name: request-duration
      thresholdRange:
        max: 500
      interval: 1m
```

Flux deploys the Canary resource, and Flagger manages progressive rollout based on metrics.

## Multi-Cluster Management with Azure Arc

Manage multiple clusters from a single Git repository:

```bash
# Enable Arc for on-premises cluster
az connectedk8s connect \
  --name onprem-cluster \
  --resource-group production-rg

# Apply same configuration to Arc-enabled cluster
az k8s-configuration flux create \
  --cluster-name onprem-cluster \
  --resource-group production-rg \
  --cluster-type connectedClusters \
  --name cluster-config \
  --namespace cluster-config \
  --scope cluster \
  --url https://github.com/myorg/k8s-configs \
  --branch main \
  --kustomization name=infrastructure path=./infrastructure prune=true
```

Use cluster-specific overlays:

```
k8s-configs/
├── base/
├── clusters/
│   ├── aks-production/
│   │   └── kustomization.yaml
│   ├── aks-staging/
│   │   └── kustomization.yaml
│   └── onprem/
│       └── kustomization.yaml
```

## Troubleshooting Sync Issues

When Flux fails to sync, investigate:

```bash
# Check Flux controller logs
kubectl logs -n flux-system deploy/source-controller
kubectl logs -n flux-system deploy/kustomize-controller

# Verify Git access
kubectl get gitrepositories -n cluster-config cluster-config -o yaml

# Test SSH connectivity manually
kubectl run test -it --rm --image=alpine/git -- sh
# Inside pod: git ls-remote git@github.com:myorg/k8s-configs.git
```

Common issues and fixes:

```bash
# Refresh Git credentials
kubectl delete secret flux-system -n flux-system
# Recreate configuration with new credentials

# Force reconciliation
flux reconcile source git cluster-config -n cluster-config
flux reconcile kustomization infrastructure -n cluster-config

# Check for conflicts
kubectl get all -n production -o yaml | grep -i "managed-by"
```

The AKS GitOps extension simplifies Flux deployment and management while providing Azure-native integration. It enables scalable, declarative cluster management with automated synchronization from Git repositories.
