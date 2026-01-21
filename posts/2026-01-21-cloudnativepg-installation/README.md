# How to Install CloudNativePG Operator on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: CloudNativePG, Kubernetes, PostgreSQL, Operator, Helm, Installation

Description: A comprehensive guide to installing the CloudNativePG operator on Kubernetes using Helm and kubectl, including configuration options, verification steps, and production deployment considerations.

---

CloudNativePG is a Kubernetes operator that covers the full lifecycle of a PostgreSQL database cluster with a primary and optional read replicas. This guide walks you through installing the operator on your Kubernetes cluster using various methods.

## Prerequisites

- Kubernetes cluster version 1.25 or higher
- kubectl configured with cluster access
- Helm 3.x (for Helm installation)
- Cluster admin permissions

## Verify Prerequisites

```bash
# Check Kubernetes version
kubectl version --short

# Verify cluster access
kubectl get nodes

# Check for existing CRDs (if upgrading)
kubectl get crd | grep cnpg
```

## Installation Methods

### Method 1: Helm Installation (Recommended)

Helm provides the most flexible installation with easy upgrades and configuration.

#### Add the Helm Repository

```bash
# Add CloudNativePG Helm repository
helm repo add cloudnative-pg https://cloudnative-pg.github.io/charts

# Update repository cache
helm repo update

# Search for available versions
helm search repo cloudnative-pg
```

#### Install with Default Configuration

```bash
# Create namespace
kubectl create namespace cnpg-system

# Install operator
helm install cnpg cloudnative-pg/cloudnative-pg \
  --namespace cnpg-system

# Verify installation
kubectl get pods -n cnpg-system
```

#### Install with Custom Configuration

Create a `values.yaml` file:

```yaml
# values.yaml

# Replica count for operator
replicaCount: 2

# Resource configuration
resources:
  limits:
    cpu: 500m
    memory: 512Mi
  requests:
    cpu: 100m
    memory: 256Mi

# Pod priority class
priorityClassName: system-cluster-critical

# Node selector
nodeSelector:
  kubernetes.io/os: linux

# Tolerations for operator pods
tolerations:
  - key: node-role.kubernetes.io/control-plane
    effect: NoSchedule

# Pod affinity rules
affinity:
  podAntiAffinity:
    preferredDuringSchedulingIgnoredDuringExecution:
      - weight: 100
        podAffinityTerm:
          labelSelector:
            matchLabels:
              app.kubernetes.io/name: cloudnative-pg
          topologyKey: kubernetes.io/hostname

# Monitoring configuration
monitoring:
  podMonitorEnabled: true
  grafanaDashboard:
    create: true
    namespace: monitoring

# Webhook configuration
webhook:
  port: 9443
  mutating:
    create: true
  validating:
    create: true

# Service account
serviceAccount:
  create: true
  name: cnpg-manager

# RBAC configuration
rbac:
  create: true
  aggregateClusterRoles: true

# Image configuration
image:
  repository: ghcr.io/cloudnative-pg/cloudnative-pg
  pullPolicy: IfNotPresent

# Additional environment variables
additionalEnv:
  - name: WATCH_NAMESPACE
    value: ""  # Empty = watch all namespaces
```

Install with custom values:

```bash
helm install cnpg cloudnative-pg/cloudnative-pg \
  --namespace cnpg-system \
  --create-namespace \
  -f values.yaml
```

### Method 2: kubectl Installation

For environments without Helm or preferring raw manifests.

#### Install Latest Release

```bash
# Apply the latest release manifest
kubectl apply --server-side -f \
  https://raw.githubusercontent.com/cloudnative-pg/cloudnative-pg/release-1.22/releases/cnpg-1.22.0.yaml
```

#### Install Specific Version

```bash
# List available releases
curl -s https://api.github.com/repos/cloudnative-pg/cloudnative-pg/releases | jq '.[].tag_name'

# Install specific version
VERSION=1.22.0
kubectl apply --server-side -f \
  https://raw.githubusercontent.com/cloudnative-pg/cloudnative-pg/v${VERSION}/releases/cnpg-${VERSION}.yaml
```

### Method 3: Kustomize Installation

For GitOps workflows with Kustomize.

Create `kustomization.yaml`:

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: cnpg-system

resources:
  - https://raw.githubusercontent.com/cloudnative-pg/cloudnative-pg/release-1.22/releases/cnpg-1.22.0.yaml

# Optional: patch the deployment
patches:
  - target:
      group: apps
      version: v1
      kind: Deployment
      name: cnpg-controller-manager
    patch: |
      - op: replace
        path: /spec/replicas
        value: 2
```

Apply with Kustomize:

```bash
kubectl apply -k .
```

### Method 4: OLM Installation (OpenShift)

For Red Hat OpenShift environments using Operator Lifecycle Manager.

```bash
# Create operator group
cat <<EOF | kubectl apply -f -
apiVersion: operators.coreos.com/v1
kind: OperatorGroup
metadata:
  name: cloudnative-pg
  namespace: cnpg-system
spec:
  targetNamespaces:
    - cnpg-system
EOF

# Create subscription
cat <<EOF | kubectl apply -f -
apiVersion: operators.coreos.com/v1alpha1
kind: Subscription
metadata:
  name: cloudnative-pg
  namespace: cnpg-system
spec:
  channel: stable
  name: cloudnative-pg
  source: community-operators
  sourceNamespace: openshift-marketplace
EOF
```

## Verify Installation

### Check Operator Deployment

```bash
# Check pods
kubectl get pods -n cnpg-system

# Expected output:
# NAME                                       READY   STATUS    RESTARTS   AGE
# cnpg-controller-manager-7f4d8b6f9d-xxxxx   1/1     Running   0          2m

# Check deployment
kubectl get deployment -n cnpg-system

# Check service
kubectl get svc -n cnpg-system
```

### Verify CRDs

```bash
# List CloudNativePG CRDs
kubectl get crd | grep cnpg

# Expected CRDs:
# backups.postgresql.cnpg.io
# clusters.postgresql.cnpg.io
# poolers.postgresql.cnpg.io
# scheduledbackups.postgresql.cnpg.io
```

### Check Operator Logs

```bash
# View operator logs
kubectl logs -n cnpg-system deployment/cnpg-controller-manager -f

# Check for any errors
kubectl logs -n cnpg-system deployment/cnpg-controller-manager | grep -i error
```

### Test with Simple Cluster

```bash
# Create test cluster
cat <<EOF | kubectl apply -f -
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: test-cluster
  namespace: default
spec:
  instances: 1
  storage:
    size: 1Gi
EOF

# Watch cluster creation
kubectl get cluster test-cluster -w

# Check pods
kubectl get pods -l cnpg.io/cluster=test-cluster

# Clean up test
kubectl delete cluster test-cluster
```

## Configure Watched Namespaces

By default, the operator watches all namespaces. To restrict to specific namespaces:

### Helm Configuration

```yaml
# values.yaml
additionalEnv:
  - name: WATCH_NAMESPACE
    value: "database,production"  # Comma-separated list
```

### Manifest Patch

```bash
kubectl patch deployment cnpg-controller-manager -n cnpg-system --type='json' -p='[
  {
    "op": "add",
    "path": "/spec/template/spec/containers/0/env/-",
    "value": {
      "name": "WATCH_NAMESPACE",
      "value": "database,production"
    }
  }
]'
```

## High Availability Operator Setup

For production, run multiple operator replicas:

```yaml
# values.yaml for HA setup
replicaCount: 2

affinity:
  podAntiAffinity:
    requiredDuringSchedulingIgnoredDuringExecution:
      - labelSelector:
          matchLabels:
            app.kubernetes.io/name: cloudnative-pg
        topologyKey: kubernetes.io/hostname

resources:
  limits:
    cpu: 500m
    memory: 512Mi
  requests:
    cpu: 100m
    memory: 256Mi

# Leader election is enabled by default
```

## Configure Image Pull Secrets

For air-gapped environments or private registries:

```yaml
# values.yaml
imagePullSecrets:
  - name: my-registry-secret

image:
  repository: my-registry.example.com/cloudnative-pg/cloudnative-pg
  pullPolicy: Always
```

Create the secret:

```bash
kubectl create secret docker-registry my-registry-secret \
  --docker-server=my-registry.example.com \
  --docker-username=user \
  --docker-password=password \
  -n cnpg-system
```

## Enable Monitoring

### Enable PodMonitor (Prometheus Operator)

```yaml
# values.yaml
monitoring:
  podMonitorEnabled: true
  podMonitorNamespace: monitoring
  podMonitorAdditionalLabels:
    release: prometheus
```

### Manual ServiceMonitor

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: cnpg-controller-manager
  namespace: cnpg-system
  labels:
    release: prometheus
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: cloudnative-pg
  endpoints:
    - port: metrics
      interval: 30s
```

## Upgrade the Operator

### Helm Upgrade

```bash
# Update repository
helm repo update

# Check current version
helm list -n cnpg-system

# Upgrade to latest
helm upgrade cnpg cloudnative-pg/cloudnative-pg \
  --namespace cnpg-system \
  -f values.yaml

# Upgrade to specific version
helm upgrade cnpg cloudnative-pg/cloudnative-pg \
  --namespace cnpg-system \
  --version 0.20.0 \
  -f values.yaml
```

### kubectl Upgrade

```bash
# Apply new version manifest
kubectl apply --server-side -f \
  https://raw.githubusercontent.com/cloudnative-pg/cloudnative-pg/v1.22.0/releases/cnpg-1.22.0.yaml
```

## Uninstall

### Helm Uninstall

```bash
# Uninstall operator (keeps CRDs)
helm uninstall cnpg -n cnpg-system

# Delete namespace
kubectl delete namespace cnpg-system

# Optionally delete CRDs (WARNING: deletes all clusters!)
kubectl delete crd backups.postgresql.cnpg.io
kubectl delete crd clusters.postgresql.cnpg.io
kubectl delete crd poolers.postgresql.cnpg.io
kubectl delete crd scheduledbackups.postgresql.cnpg.io
```

### kubectl Uninstall

```bash
# Delete operator resources
kubectl delete -f https://raw.githubusercontent.com/cloudnative-pg/cloudnative-pg/v1.22.0/releases/cnpg-1.22.0.yaml
```

## Troubleshooting

### Operator Not Starting

```bash
# Check events
kubectl get events -n cnpg-system --sort-by='.lastTimestamp'

# Check resource constraints
kubectl describe pod -n cnpg-system -l app.kubernetes.io/name=cloudnative-pg

# Check RBAC
kubectl auth can-i --list --as=system:serviceaccount:cnpg-system:cnpg-manager
```

### Webhook Errors

```bash
# Check webhook service
kubectl get svc -n cnpg-system | grep webhook

# Check webhook configuration
kubectl get validatingwebhookconfiguration | grep cnpg
kubectl get mutatingwebhookconfiguration | grep cnpg

# Check certificate
kubectl get secret -n cnpg-system | grep webhook
```

### CRD Issues

```bash
# Verify CRDs are installed
kubectl get crd | grep cnpg

# Check CRD status
kubectl describe crd clusters.postgresql.cnpg.io
```

## Conclusion

CloudNativePG installation is straightforward with multiple methods available:

1. **Helm** - Best for production with easy configuration and upgrades
2. **kubectl** - Simple direct installation from manifests
3. **Kustomize** - GitOps-friendly with customization support
4. **OLM** - Native OpenShift operator management

Key recommendations:

- Use Helm for production deployments
- Run multiple operator replicas for high availability
- Enable monitoring with Prometheus
- Test installation with a simple cluster before production use

With the operator installed, you're ready to create and manage PostgreSQL clusters on Kubernetes.
