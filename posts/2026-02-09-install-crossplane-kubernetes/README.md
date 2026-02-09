# How to Install Crossplane on Kubernetes Cluster

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Crossplane, Infrastructure as Code

Description: Learn how to install and configure Crossplane on your Kubernetes cluster to enable infrastructure provisioning through Kubernetes APIs and manage cloud resources declaratively.

---

Crossplane transforms your Kubernetes cluster into a universal control plane for infrastructure. Instead of learning Terraform, Pulumi, and cloud-specific CLIs, you define infrastructure using Kubernetes manifests. Install Crossplane once, and you can provision S3 buckets, databases, networks, and any cloud resource through kubectl.

Crossplane extends Kubernetes with Custom Resource Definitions (CRDs) representing cloud resources. You create an S3 bucket by applying a Kubernetes manifest, just like deploying a pod. Crossplane controllers watch these resources and reconcile them with actual cloud infrastructure.

## Prerequisites

Before installing Crossplane, ensure your cluster meets these requirements:

```bash
# Check Kubernetes version (1.19+)
kubectl version --short

# Verify RBAC is enabled
kubectl auth can-i create customresourcedefinitions

# Check available storage for Crossplane packages
kubectl get storageclass

# Ensure you have cluster-admin access
kubectl auth can-i '*' '*' --all-namespaces
```

Crossplane requires cluster-level permissions to install CRDs and create controllers across namespaces.

## Installing Crossplane with Helm

Helm provides the simplest installation method:

```bash
# Add Crossplane Helm repository
helm repo add crossplane-stable https://charts.crossplane.io/stable
helm repo update

# Create namespace
kubectl create namespace crossplane-system

# Install Crossplane
helm install crossplane \
  --namespace crossplane-system \
  crossplane-stable/crossplane \
  --wait

# Verify installation
kubectl get pods -n crossplane-system

# Expected output:
# NAME                                     READY   STATUS    RESTARTS   AGE
# crossplane-5f9d8c6b5d-x7k2m             1/1     Running   0          2m
# crossplane-rbac-manager-74c9fb4f8-k9n4w 1/1     Running   0          2m
```

The installation creates two primary components:

**crossplane pod**: Core controller managing lifecycle of infrastructure resources
**rbac-manager pod**: Automatically creates RBAC rules for Crossplane resources

## Verifying Crossplane Installation

Check that Crossplane CRDs are installed:

```bash
# List Crossplane CRDs
kubectl get crds | grep crossplane.io

# You should see core Crossplane resources:
# compositeresourcedefinitions.apiextensions.crossplane.io
# compositionrevisions.apiextensions.crossplane.io
# compositions.apiextensions.crossplane.io
# configurationrevisions.pkg.crossplane.io
# configurations.pkg.crossplane.io
# locks.pkg.crossplane.io
# providerrevisions.pkg.crossplane.io
# providers.pkg.crossplane.io

# Check Crossplane version
kubectl get deployment crossplane -n crossplane-system -o jsonpath='{.spec.template.spec.containers[0].image}'
```

## Installing Crossplane CLI

The Crossplane CLI simplifies package management:

```bash
# Install on Linux
curl -sL https://raw.githubusercontent.com/crossplane/crossplane/master/install.sh | sh
sudo mv crossplane /usr/local/bin

# Install on macOS
brew install crossplane/tap/crossplane

# Verify installation
crossplane --version

# Enable CLI autocompletion (bash)
echo 'source <(crossplane completion bash)' >> ~/.bashrc
source ~/.bashrc
```

The CLI lets you manage providers and configurations without writing YAML.

## Configuring Crossplane with Custom Settings

Customize the installation for production environments:

```yaml
# crossplane-values.yaml
# Configure resource limits
resources:
  limits:
    cpu: 500m
    memory: 512Mi
  requests:
    cpu: 100m
    memory: 256Mi

# Enable metrics
metrics:
  enabled: true

# Configure package cache
packageCache:
  medium: Memory
  sizeLimit: 5Mi
  pvc: package-cache

# Set custom image registry (for air-gapped environments)
image:
  repository: my-registry.com/crossplane
  tag: v1.14.0

# Configure webhook
webhooks:
  enabled: true
```

Apply the custom configuration:

```bash
helm upgrade crossplane \
  --namespace crossplane-system \
  crossplane-stable/crossplane \
  --values crossplane-values.yaml \
  --wait
```

## Setting Up Monitoring

Deploy ServiceMonitor for Prometheus integration:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: crossplane
  namespace: crossplane-system
  labels:
    app: crossplane
spec:
  selector:
    matchLabels:
      app: crossplane
  endpoints:
  - port: metrics
    interval: 30s
    path: /metrics
```

Create alerts for Crossplane health:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: crossplane-alerts
  namespace: crossplane-system
spec:
  groups:
  - name: crossplane
    rules:
    - alert: CrossplaneDown
      expr: up{job="crossplane"} == 0
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "Crossplane is down"

    - alert: CrossplaneReconciliationErrors
      expr: rate(crossplane_reconcile_errors_total[5m]) > 0.1
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "High reconciliation error rate"
```

## Configuring RBAC for Multi-Tenant Usage

Restrict Crossplane access by namespace:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: crossplane-user
  namespace: team-a
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: crossplane-user
  namespace: team-a
rules:
- apiGroups: ["database.aws.crossplane.io"]
  resources: ["rdsinstances"]
  verbs: ["get", "list", "watch", "create", "update", "delete"]
- apiGroups: ["storage.aws.crossplane.io"]
  resources: ["buckets"]
  verbs: ["get", "list", "watch", "create", "update", "delete"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: crossplane-user
  namespace: team-a
subjects:
- kind: ServiceAccount
  name: crossplane-user
  namespace: team-a
roleRef:
  kind: Role
  name: crossplane-user
  apiGroup: rbac.authorization.k8s.io
```

This allows team-a to manage databases and storage in their namespace while restricting access to other resources.

## Installing Provider Packages

Crossplane needs providers to manage cloud resources. Install the provider package (detailed provider setup covered in subsequent posts):

```bash
# List available providers
kubectl crossplane install provider crossplane/provider-aws:v0.40.0
kubectl crossplane install provider crossplane/provider-azure:v0.35.0
kubectl crossplane install provider crossplane/provider-gcp:v0.36.0

# Check provider installation status
kubectl get providers

# Wait for providers to become healthy
kubectl wait --for=condition=Healthy provider/provider-aws --timeout=300s
```

## Upgrading Crossplane

Upgrade Crossplane safely:

```bash
# Check current version
helm list -n crossplane-system

# Update Helm repository
helm repo update

# Review changes
helm diff upgrade crossplane \
  --namespace crossplane-system \
  crossplane-stable/crossplane

# Perform upgrade
helm upgrade crossplane \
  --namespace crossplane-system \
  crossplane-stable/crossplane \
  --wait

# Verify upgrade
kubectl get pods -n crossplane-system
kubectl logs -n crossplane-system deployment/crossplane
```

## Troubleshooting Installation Issues

Common installation problems and solutions:

**Pod fails to start**:
```bash
# Check pod logs
kubectl logs -n crossplane-system deployment/crossplane

# Check events
kubectl get events -n crossplane-system --sort-by='.lastTimestamp'

# Verify RBAC permissions
kubectl auth can-i create customresourcedefinitions
```

**Provider installation hangs**:
```bash
# Check provider status
kubectl describe provider provider-aws

# Check package manager logs
kubectl logs -n crossplane-system deployment/crossplane | grep package

# Verify image pull secrets if using private registry
kubectl get secret -n crossplane-system
```

**CRD conflicts**:
```bash
# List all Crossplane CRDs
kubectl get crds | grep crossplane

# Delete specific CRD if needed (caution: deletes all instances)
kubectl delete crd <crd-name>

# Reinstall Crossplane
helm upgrade --install crossplane crossplane-stable/crossplane -n crossplane-system
```

## Uninstalling Crossplane

Remove Crossplane completely:

```bash
# Delete all managed resources first
kubectl get managed -A

# Uninstall providers
kubectl delete providers --all

# Uninstall Crossplane
helm uninstall crossplane -n crossplane-system

# Delete CRDs (optional - removes all resource definitions)
kubectl get crds | grep crossplane.io | awk '{print $1}' | xargs kubectl delete crd

# Delete namespace
kubectl delete namespace crossplane-system
```

Warning: Deleting Crossplane CRDs removes all infrastructure resource definitions, but may not delete the actual cloud resources. Manually clean up cloud resources to avoid orphaned infrastructure.

## Configuring High Availability

Run multiple Crossplane replicas for production:

```yaml
# ha-values.yaml
replicas: 3

affinity:
  podAntiAffinity:
    requiredDuringSchedulingIgnoredDuringExecution:
    - labelSelector:
        matchExpressions:
        - key: app
          operator: In
          values:
          - crossplane
      topologyKey: kubernetes.io/hostname

resources:
  limits:
    cpu: 1000m
    memory: 1Gi
  requests:
    cpu: 500m
    memory: 512Mi

leaderElection: true
```

Apply HA configuration:

```bash
helm upgrade crossplane \
  --namespace crossplane-system \
  crossplane-stable/crossplane \
  --values ha-values.yaml \
  --wait
```

## Enabling Webhook Validation

Enable webhook for resource validation:

```yaml
# webhook-values.yaml
webhooks:
  enabled: true

args:
- --enable-composition-revisions
- --enable-composition-webhook-schema-validation
```

This validates Composition and XRD changes before applying them, catching errors early.

## Next Steps

After installing Crossplane:

1. Install and configure cloud providers (AWS, Azure, GCP)
2. Create ProviderConfigs for authentication
3. Define CompositeResourceDefinitions (XRDs) for your infrastructure
4. Build Compositions as templates
5. Create Claims for end users

Crossplane installation is just the foundation. The real power comes from building abstractions that let application teams provision infrastructure through simple, declarative APIs.

## Conclusion

Installing Crossplane on Kubernetes is straightforward with Helm. The installation provides a foundation for managing cloud infrastructure through Kubernetes APIs. By configuring monitoring, RBAC, and high availability settings, you create a production-ready control plane that enables declarative infrastructure management across any cloud provider.
