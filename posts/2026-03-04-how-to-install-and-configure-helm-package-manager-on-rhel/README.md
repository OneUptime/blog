# How to Install and Configure Helm Package Manager on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Helm, Kubernetes, Package Manager, Charts

Description: Learn how to install and configure Helm on RHEL to manage Kubernetes applications using charts.

---

Helm is the package manager for Kubernetes. It uses "charts" to define, install, and upgrade Kubernetes applications. Charts bundle all the YAML manifests, configuration, and dependencies into a single deployable unit.

## Installing Helm

```bash
# Install using the official script
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# Verify installation
helm version
```

Alternatively, install from a downloaded binary:

```bash
# Download and install manually
curl -L https://get.helm.sh/helm-v3.14.0-linux-amd64.tar.gz -o /tmp/helm.tar.gz
tar xzf /tmp/helm.tar.gz -C /tmp/
sudo mv /tmp/linux-amd64/helm /usr/local/bin/
```

## Adding Chart Repositories

```bash
# Add the official stable charts repository
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo add grafana https://grafana.github.io/helm-charts

# Update repository cache
helm repo update

# List added repositories
helm repo list
```

## Searching for Charts

```bash
# Search the Helm Hub
helm search hub wordpress

# Search local repositories
helm search repo nginx
helm search repo bitnami/postgresql --versions
```

## Installing a Chart

```bash
# Install nginx-ingress with default values
helm install my-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace

# Install with custom values
helm install my-postgres bitnami/postgresql \
  --namespace database \
  --create-namespace \
  --set auth.postgresPassword=secretpassword \
  --set primary.persistence.size=20Gi
```

## Using a Values File

```yaml
# Save as postgres-values.yaml
auth:
  postgresPassword: secretpassword
  database: myapp
primary:
  persistence:
    size: 20Gi
  resources:
    requests:
      memory: 256Mi
      cpu: 250m
    limits:
      memory: 1Gi
      cpu: 1000m
```

```bash
# Install with values file
helm install my-postgres bitnami/postgresql \
  -f postgres-values.yaml \
  --namespace database \
  --create-namespace
```

## Managing Releases

```bash
# List installed releases
helm list -A

# Check release status
helm status my-postgres -n database

# Upgrade a release
helm upgrade my-postgres bitnami/postgresql \
  -f postgres-values.yaml \
  --namespace database

# View release history
helm history my-postgres -n database

# Rollback to a previous version
helm rollback my-postgres 1 -n database

# Uninstall a release
helm uninstall my-postgres -n database
```

## Helm Autocompletion

```bash
# Enable bash autocompletion
helm completion bash | sudo tee /etc/bash_completion.d/helm > /dev/null
source /etc/bash_completion.d/helm
```

Helm charts encapsulate best practices for deploying applications on Kubernetes. Always review the chart's default values with `helm show values <chart>` before installation to understand what you are deploying.
