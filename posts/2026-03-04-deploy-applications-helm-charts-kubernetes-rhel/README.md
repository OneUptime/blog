# How to Deploy Applications with Helm Charts on Kubernetes Running on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Kubernetes, Helm, Containers, DevOps

Description: Install Helm on RHEL and use it to deploy, upgrade, and manage applications on a Kubernetes cluster.

---

Helm is the package manager for Kubernetes. It uses charts (pre-configured packages) to deploy applications with a single command. Here is how to install Helm on RHEL and use it to manage Kubernetes applications.

## Installing Helm

```bash
# Download the latest Helm binary
curl -fsSL -o get_helm.sh https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3
chmod 700 get_helm.sh
./get_helm.sh

# Verify the installation
helm version

# Helm uses your existing kubeconfig to talk to the cluster
kubectl cluster-info
```

## Adding Chart Repositories

```bash
# Add the official Helm stable charts repository
helm repo add stable https://charts.helm.sh/stable

# Add Bitnami charts (widely used community charts)
helm repo add bitnami https://charts.bitnami.com/bitnami

# Update repository metadata
helm repo update

# Search for available charts
helm search repo nginx
helm search repo postgresql
```

## Deploying an Application

```bash
# Deploy Nginx using the Bitnami chart
helm install my-nginx bitnami/nginx \
  --namespace web \
  --create-namespace \
  --set service.type=NodePort

# Check the release status
helm status my-nginx -n web

# List all Helm releases
helm list -n web

# View the deployed Kubernetes resources
kubectl get all -n web
```

## Customizing Deployments with Values

```bash
# View the default values for a chart
helm show values bitnami/postgresql > /tmp/pg-values.yaml

# Create a custom values file
cat > /tmp/my-pg-values.yaml << 'EOF'
auth:
  postgresPassword: "mysecretpassword"
  database: "myapp"
primary:
  persistence:
    size: 20Gi
  resources:
    requests:
      memory: 512Mi
      cpu: 250m
    limits:
      memory: 1Gi
      cpu: 500m
EOF

# Deploy PostgreSQL with custom values
helm install my-db bitnami/postgresql \
  --namespace database \
  --create-namespace \
  -f /tmp/my-pg-values.yaml
```

## Upgrading a Release

```bash
# Update the chart repositories
helm repo update

# Upgrade to a new chart version or change values
helm upgrade my-nginx bitnami/nginx \
  --namespace web \
  --set replicaCount=3

# View the upgrade history
helm history my-nginx -n web
```

## Rolling Back

```bash
# Roll back to a previous revision
helm rollback my-nginx 1 -n web

# Verify the rollback
helm status my-nginx -n web
kubectl get pods -n web
```

## Uninstalling a Release

```bash
# Remove a Helm release
helm uninstall my-nginx -n web

# Verify resources are cleaned up
kubectl get all -n web
```

## Creating a Simple Custom Chart

```bash
# Create a new chart skeleton
helm create my-app

# The directory structure:
# my-app/
#   Chart.yaml          - Chart metadata
#   values.yaml         - Default configuration values
#   templates/          - Kubernetes manifest templates
#     deployment.yaml
#     service.yaml
#     ingress.yaml

# Edit values.yaml to customize your application
# Then install from the local directory
helm install my-app ./my-app --namespace my-app --create-namespace

# Package the chart for sharing
helm package my-app
```

Helm simplifies Kubernetes application management by providing reproducible deployments, easy upgrades, and clean rollbacks.
