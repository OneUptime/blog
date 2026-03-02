# How to Set Up Helm Package Manager on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Kubernetes, Helm, DevOps, Package Management

Description: Full walkthrough for installing and using Helm on Ubuntu to manage Kubernetes applications, including chart repositories, releases, upgrades, and creating custom charts.

---

Helm is the package manager for Kubernetes. Where apt and dpkg handle application installation on Ubuntu, Helm handles deploying applications onto Kubernetes clusters. It packages Kubernetes manifests into charts - versioned, configurable collections of templates - and manages their lifecycle through installations, upgrades, and rollbacks.

A chart defines an application's entire Kubernetes resource structure. Users customize it through values files rather than editing raw YAML, making complex deployments repeatable and shareable.

## Installing Helm on Ubuntu

The recommended installation method pulls the binary directly from Helm's official release repository:

```bash
# Download and run the official install script
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# Verify the installation
helm version
# version.BuildInfo{Version:"v3.14.0", ...}
```

Alternatively, install via apt for easier updates:

```bash
# Add Helm's GPG key and repository
curl https://baltocdn.com/helm/signing.asc | \
  gpg --dearmor | \
  sudo tee /usr/share/keyrings/helm.gpg > /dev/null

echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/helm.gpg] \
  https://baltocdn.com/helm/stable/debian/ all main" | \
  sudo tee /etc/apt/sources.list.d/helm-stable-debian.list

sudo apt-get update
sudo apt-get install -y helm
```

### Shell Completion

```bash
# Add bash completion (adjust for zsh if needed)
helm completion bash | sudo tee /etc/bash_completion.d/helm > /dev/null

# For the current session
source <(helm completion bash)
```

## Adding Chart Repositories

Helm uses repositories to distribute charts. The official Artifact Hub hosts thousands of community charts.

```bash
# Add the stable charts repository (maintained by the community)
helm repo add stable https://charts.helm.sh/stable

# Add Bitnami - one of the most comprehensive chart collections
helm repo add bitnami https://charts.bitnami.com/bitnami

# Add Ingress NGINX
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx

# Add cert-manager for TLS certificate management
helm repo add jetstack https://charts.jetstack.io

# Update all repos to get latest chart versions
helm repo update

# List your configured repos
helm repo list
```

## Searching for Charts

```bash
# Search Artifact Hub for charts matching a keyword
helm search hub postgresql

# Search your local repos
helm search repo nginx

# Show all available versions of a chart
helm search repo bitnami/postgresql --versions
```

## Installing a Chart

### Basic Installation

```bash
# Install nginx ingress controller
helm install my-ingress ingress-nginx/ingress-nginx

# Install into a specific namespace (creates it if needed)
helm install my-ingress ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace
```

### Customizing Values

Every Helm chart exposes configuration through values. Override the defaults:

```bash
# See all configurable values for a chart
helm show values bitnami/postgresql

# Install with a custom value inline
helm install my-postgres bitnami/postgresql \
  --set auth.postgresPassword=secretpassword \
  --set primary.persistence.size=20Gi

# Better: use a values file for complex configurations
```

Create a values file:

```yaml
# postgres-values.yaml
auth:
  postgresPassword: "supersecret"
  database: "myapp"

primary:
  persistence:
    enabled: true
    size: 20Gi
    storageClass: "nfs-client"

  resources:
    requests:
      memory: "512Mi"
      cpu: "250m"
    limits:
      memory: "1Gi"
      cpu: "1000m"

metrics:
  enabled: true
```

```bash
# Install using the values file
helm install my-postgres bitnami/postgresql \
  --namespace database \
  --create-namespace \
  --values postgres-values.yaml
```

### Dry Run Before Installing

```bash
# Preview what Kubernetes resources will be created without applying them
helm install my-postgres bitnami/postgresql \
  --values postgres-values.yaml \
  --dry-run \
  --debug

# The output shows all rendered manifests that would be applied
```

## Managing Releases

```bash
# List all Helm releases across all namespaces
helm list -A

# List releases in a specific namespace
helm list -n database

# Get detailed status of a release
helm status my-postgres -n database

# View the values used in an installed release
helm get values my-postgres -n database

# View all resources created by a release
helm get manifest my-postgres -n database
```

## Upgrading and Rolling Back

```bash
# Upgrade a release with new values
helm upgrade my-postgres bitnami/postgresql \
  --namespace database \
  --values postgres-values.yaml \
  --set auth.postgresPassword=newpassword

# Upgrade and install if not already present (--install flag)
helm upgrade --install my-postgres bitnami/postgresql \
  --namespace database \
  --create-namespace \
  --values postgres-values.yaml

# View release history
helm history my-postgres -n database

# Roll back to a previous revision
helm rollback my-postgres 1 -n database

# Roll back and wait for completion
helm rollback my-postgres 1 -n database --wait
```

## Uninstalling Releases

```bash
# Uninstall a release (removes all associated Kubernetes resources)
helm uninstall my-postgres -n database

# Uninstall but keep the release history for potential rollback
helm uninstall my-postgres -n database --keep-history
```

## Creating a Custom Chart

For applications you develop internally, creating a Helm chart is the recommended way to package deployments.

```bash
# Scaffold a new chart
helm create my-app

# The structure created:
# my-app/
# ├── Chart.yaml          # Chart metadata
# ├── values.yaml         # Default values
# ├── charts/             # Chart dependencies
# └── templates/          # Kubernetes manifest templates
#     ├── deployment.yaml
#     ├── service.yaml
#     ├── ingress.yaml
#     └── _helpers.tpl    # Template helper functions
```

A basic custom values file:

```yaml
# my-app/values.yaml
replicaCount: 2

image:
  repository: my-registry/my-app
  tag: "1.0.0"
  pullPolicy: IfNotPresent

service:
  type: ClusterIP
  port: 8080

ingress:
  enabled: true
  className: nginx
  hosts:
    - host: my-app.example.com
      paths:
        - path: /
          pathType: Prefix

resources:
  requests:
    memory: "128Mi"
    cpu: "100m"
  limits:
    memory: "256Mi"
    cpu: "500m"
```

### Packaging and Distributing the Chart

```bash
# Lint the chart to catch errors
helm lint my-app/

# Package the chart into a .tgz file
helm package my-app/

# Host the chart in your own repository using chart-museum or GitHub Pages
# For local testing, install directly from the directory
helm install my-release ./my-app --values custom-values.yaml
```

## Chart Dependencies

Charts can declare dependencies on other charts (subcharts). Declare them in `Chart.yaml`:

```yaml
# my-app/Chart.yaml
apiVersion: v2
name: my-app
version: 1.0.0
dependencies:
  - name: postgresql
    version: "12.x.x"
    repository: https://charts.bitnami.com/bitnami
    condition: postgresql.enabled
```

```bash
# Download dependencies before installing
helm dependency update my-app/

# Install with the dependency
helm install my-release ./my-app --set postgresql.enabled=true
```

## Useful Helm Plugins

```bash
# helm-diff: Show what changes an upgrade will make before applying
helm plugin install https://github.com/databus23/helm-diff
helm diff upgrade my-postgres bitnami/postgresql --values postgres-values.yaml -n database

# helm-secrets: Manage encrypted secrets in version control
helm plugin install https://github.com/jkroepke/helm-secrets
```

## Common Troubleshooting

**Release stuck in pending-install**: A previous failed install left state. Delete the secret holding the release history:

```bash
kubectl get secret -n <namespace> | grep helm
kubectl delete secret sh.helm.release.v1.<release-name>.v1 -n <namespace>
```

**Rendered manifests contain errors**: Use `helm template` to render locally and inspect:

```bash
helm template my-release ./my-app --values my-values.yaml | kubectl apply --dry-run=client -f -
```

**Cannot pull chart from repository**: Update the repo cache and check connectivity:

```bash
helm repo update
curl -v https://charts.bitnami.com/bitnami/index.yaml
```

Helm significantly reduces the complexity of deploying and maintaining Kubernetes applications. Once you standardize on charts for your internal applications, upgrades, environment promotion, and rollbacks become straightforward operations rather than manual YAML hunts.
