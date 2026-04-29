# How to Configure K3s Automatic Manifest Deployment

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: k3s, Kubernetes, GitOps, Automation, DevOps

Description: Learn how to use K3s's built-in auto-deploying manifests directory to automatically apply Kubernetes resources on cluster startup.

## Introduction

K3s includes a powerful built-in feature called **auto-deploying manifests**: any YAML files placed in `/var/lib/rancher/k3s/server/manifests/` are automatically applied when K3s starts. This provides a simple form of GitOps for bootstrapping cluster infrastructure - no Helm, ArgoCD, or Flux required for basic use cases. This guide explains how to leverage this feature effectively.

## How Auto-Deploy Works

K3s watches the manifests directory and:
1. **On startup**: Applies all YAML/JSON files found in the directory
2. **While running**: Watches for changes and applies them automatically
3. **On restart**: Re-applies all manifests (idempotent)

Manifest files are tracked and applied by the AddOn controller; if a manifest defines a `HelmChart`, the embedded `helm-controller` reconciles that chart.

## The Default Manifests

K3s ships with several built-in manifests:

```bash
# View the default K3s manifests

ls /var/lib/rancher/k3s/server/manifests/

# Common defaults:
# ccm.yaml          - Cloud controller manager
# coredns.yaml      - CoreDNS configuration
# local-storage.yaml - Local path provisioner
# metrics-server/   - Metrics server (if enabled)
# traefik.yaml      - Traefik ingress controller
```

## Step 1: Create a Custom Manifest

Place any valid Kubernetes YAML in the manifests directory:

```bash
# Create a namespace manifest
cat > /var/lib/rancher/k3s/server/manifests/production-namespace.yaml << 'EOF'
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    environment: production
    managed-by: k3s-auto-deploy
EOF
```

K3s will apply this immediately (if running) or on next startup.

## Step 2: Deploy Multiple Resources in One File

Use `---` separators to include multiple resources:

```yaml
# /var/lib/rancher/k3s/server/manifests/monitoring-setup.yaml
---
apiVersion: v1
kind: Namespace
metadata:
  name: monitoring
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: monitoring-config
  namespace: monitoring
data:
  retention: "30d"
  scrape-interval: "15s"
---
apiVersion: v1
kind: LimitRange
metadata:
  name: default-limits
  namespace: monitoring
spec:
  limits:
    - default:
        cpu: "500m"
        memory: "512Mi"
      defaultRequest:
        cpu: "100m"
        memory: "128Mi"
      type: Container
```

## Step 3: Deploy RBAC Resources

Auto-deploy RBAC resources for the `production` namespace:

```yaml
# /var/lib/rancher/k3s/server/manifests/rbac-setup.yaml
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: app-service-account
  namespace: production
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: app-readonly
rules:
  - apiGroups: [""]
    resources: ["pods", "services", "configmaps"]
    verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: app-readonly-binding
subjects:
  - kind: ServiceAccount
    name: app-service-account
    namespace: production
roleRef:
  kind: ClusterRole
  name: app-readonly
  apiGroup: rbac.authorization.k8s.io
```

## Step 4: Deploy StorageClasses

Auto-configure storage classes:

```yaml
# /var/lib/rancher/k3s/server/manifests/storage-classes.yaml
---
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: fast-local
  annotations:
    storageclass.kubernetes.io/is-default-class: "false"
provisioner: rancher.io/local-path
reclaimPolicy: Delete
volumeBindingMode: WaitForFirstConsumer
---
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: standard
  annotations:
    storageclass.kubernetes.io/is-default-class: "true"
provisioner: rancher.io/local-path
reclaimPolicy: Retain
volumeBindingMode: WaitForFirstConsumer
```

## Step 5: Organize Manifests with Subdirectories

K3s also watches subdirectories:

```bash
# Create an organized structure
mkdir -p /var/lib/rancher/k3s/server/manifests/namespaces
mkdir -p /var/lib/rancher/k3s/server/manifests/rbac
mkdir -p /var/lib/rancher/k3s/server/manifests/storage

# Place manifests in appropriate directories
mv /var/lib/rancher/k3s/server/manifests/production-namespace.yaml \
   /var/lib/rancher/k3s/server/manifests/namespaces/

mv /var/lib/rancher/k3s/server/manifests/rbac-setup.yaml \
   /var/lib/rancher/k3s/server/manifests/rbac/
```

## Step 6: Disable Default Manifests

To disable built-in K3s components:

```yaml
# /etc/rancher/k3s/config.yaml
# Disable Traefik to use NGINX instead
disable:
  - traefik
  - metrics-server
  - coredns  # Only if you want to manage CoreDNS yourself
```

Or using environment variables:

```bash
# Install K3s without Traefik or metrics-server
curl -sfL https://get.k3s.io | \
  INSTALL_K3S_EXEC="--disable traefik --disable metrics-server" \
  sh -
```

## Step 7: Monitor Auto-Deploy Status

Check if manifests were applied successfully:

```bash
# Watch the AddOn status
kubectl get addons -A

# Check K3s logs for manifest application
journalctl -u k3s -f | grep -i "manifest\|addon\|helm"

# Verify resources were created
kubectl get namespaces
kubectl get configmaps -A | grep -v kube-system
kubectl get clusterroles | grep app-
```

## Step 8: Sync Manifests from Git

Combine auto-deploy with a Git sync for basic manifest synchronization:

```bash
#!/bin/bash
# /usr/local/bin/sync-k3s-manifests.sh

GIT_REPO="https://github.com/your-org/k3s-manifests.git"
MANIFEST_DIR="/var/lib/rancher/k3s/server/manifests/gitops"

# Clone or pull the repository
if [ -d "$MANIFEST_DIR/.git" ]; then
  git -C "$MANIFEST_DIR" pull
else
  git clone "$GIT_REPO" "$MANIFEST_DIR"
fi

echo "Manifests synced from Git"
```

Schedule with cron:

```bash
# Sync every 5 minutes
echo "*/5 * * * * root bash /usr/local/bin/sync-k3s-manifests.sh" \
  > /etc/cron.d/k3s-manifest-sync
```

This pattern updates and adds manifests, but deleting a file from Git will not delete resources that were already applied to the cluster.

## Conclusion

K3s's auto-deploying manifests feature provides a simple, zero-dependency way to bootstrap cluster infrastructure. For small teams and edge deployments, it's often sufficient without needing full GitOps tools. For more complex scenarios, combine it with Git synchronization or eventually graduate to dedicated GitOps tools like Flux or ArgoCD. The key advantage is that manifests are automatically re-applied on every K3s restart, helping keep bootstrap resources declaratively configured across restarts.
