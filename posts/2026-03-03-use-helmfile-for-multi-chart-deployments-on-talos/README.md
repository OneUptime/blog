# How to Use Helmfile for Multi-Chart Deployments on Talos

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Helm, Helmfile, Kubernetes, Multi-Chart Deployment, GitOps

Description: Learn how to use Helmfile to manage multiple Helm chart deployments declaratively on your Talos Linux cluster.

---

When you run a Talos Linux cluster in production, you rarely deploy just one application. A typical cluster has an ingress controller, a monitoring stack, a certificate manager, a storage solution, and several application workloads. Managing all of these individually with `helm install` commands gets messy fast. Helmfile solves this problem by letting you declare all your Helm releases in a single file and deploy them together.

This guide walks through installing Helmfile, writing a helmfile configuration, and managing complex multi-chart deployments on Talos Linux.

## What is Helmfile?

Helmfile is a declarative spec for deploying Helm charts. Instead of running multiple `helm install` and `helm upgrade` commands, you write a YAML file that describes all your releases, their values, and their dependencies. Then you run a single command to synchronize your cluster with the desired state.

Think of it as "infrastructure as code" for your Helm releases.

## Installing Helmfile

### On macOS

```bash
# Install Helmfile using Homebrew
brew install helmfile
```

### On Linux

```bash
# Download the latest release
wget https://github.com/helmfile/helmfile/releases/latest/download/helmfile_linux_amd64.tar.gz

# Extract and install
tar -zxvf helmfile_linux_amd64.tar.gz
sudo mv helmfile /usr/local/bin/helmfile

# Verify the installation
helmfile version
```

You also need the Helm diff plugin, which Helmfile uses to show changes before applying them:

```bash
# Install the helm-diff plugin
helm plugin install https://github.com/databus23/helm-diff
```

## Writing Your First Helmfile

Create a `helmfile.yaml` in your project directory:

```yaml
# helmfile.yaml
repositories:
  - name: bitnami
    url: https://charts.bitnami.com/bitnami
  - name: ingress-nginx
    url: https://kubernetes.github.io/ingress-nginx
  - name: jetstack
    url: https://charts.jetstack.io
  - name: prometheus-community
    url: https://prometheus-community.github.io/helm-charts

releases:
  - name: ingress-nginx
    namespace: ingress-nginx
    createNamespace: true
    chart: ingress-nginx/ingress-nginx
    version: 4.9.0
    values:
      - ./values/ingress-nginx.yaml

  - name: cert-manager
    namespace: cert-manager
    createNamespace: true
    chart: jetstack/cert-manager
    version: 1.14.0
    set:
      - name: installCRDs
        value: true

  - name: prometheus-stack
    namespace: monitoring
    createNamespace: true
    chart: prometheus-community/kube-prometheus-stack
    version: 56.0.0
    values:
      - ./values/prometheus-stack.yaml
```

## Organizing Values Files

For each release, create a values file in a dedicated directory:

```bash
# Create the values directory
mkdir -p values
```

```yaml
# values/ingress-nginx.yaml
controller:
  replicaCount: 2
  service:
    type: LoadBalancer
  resources:
    requests:
      cpu: 100m
      memory: 128Mi
    limits:
      cpu: 200m
      memory: 256Mi
  metrics:
    enabled: true
```

```yaml
# values/prometheus-stack.yaml
prometheus:
  prometheusSpec:
    retention: 15d
    storageSpec:
      volumeClaimTemplate:
        spec:
          storageClassName: local-path
          accessModes:
            - ReadWriteOnce
          resources:
            requests:
              storage: 50Gi

grafana:
  adminPassword: "secure-grafana-password"
  persistence:
    enabled: true
    size: 5Gi
    storageClass: local-path

alertmanager:
  alertmanagerSpec:
    storage:
      volumeClaimTemplate:
        spec:
          storageClassName: local-path
          accessModes:
            - ReadWriteOnce
          resources:
            requests:
              storage: 5Gi
```

## Deploying with Helmfile

Now you can deploy everything with a single command:

```bash
# Preview what will be deployed (diff against current state)
helmfile diff

# Deploy all releases
helmfile sync

# Or apply only the changes (uses diff to determine what changed)
helmfile apply
```

The difference between `sync` and `apply` is important. `sync` always runs a full install or upgrade for every release. `apply` first runs a diff and only touches releases that have changed. For large deployments, `apply` is faster and safer.

## Using Environments

Helmfile supports environments, which let you maintain different configurations for staging and production:

```yaml
# helmfile.yaml
environments:
  staging:
    values:
      - environments/staging.yaml
  production:
    values:
      - environments/production.yaml

repositories:
  - name: bitnami
    url: https://charts.bitnami.com/bitnami

releases:
  - name: my-app
    namespace: {{ .Values.namespace }}
    createNamespace: true
    chart: bitnami/nginx
    version: 15.0.0
    values:
      - values/my-app-base.yaml
      - values/my-app-{{ .Environment.Name }}.yaml
```

```yaml
# environments/staging.yaml
namespace: staging-apps
```

```yaml
# environments/production.yaml
namespace: production-apps
```

Deploy to a specific environment:

```bash
# Deploy to staging
helmfile -e staging apply

# Deploy to production
helmfile -e production apply
```

## Release Dependencies and Ordering

Some charts need to be deployed in a specific order. For example, cert-manager CRDs must exist before you create Certificate resources. Helmfile handles this with needs:

```yaml
releases:
  - name: cert-manager
    namespace: cert-manager
    createNamespace: true
    chart: jetstack/cert-manager
    version: 1.14.0
    set:
      - name: installCRDs
        value: true

  - name: cert-manager-issuers
    namespace: cert-manager
    chart: ./charts/cert-manager-issuers
    needs:
      - cert-manager/cert-manager
    # This release will wait for cert-manager to be fully deployed

  - name: ingress-nginx
    namespace: ingress-nginx
    createNamespace: true
    chart: ingress-nginx/ingress-nginx
    version: 4.9.0
    needs:
      - cert-manager/cert-manager-issuers
```

## Using Helmfile with Multiple Files

For larger setups, split your helmfile across multiple files:

```
helmfile.d/
  00-infrastructure.yaml
  10-storage.yaml
  20-monitoring.yaml
  30-applications.yaml
```

Helmfile automatically picks up all YAML files in the `helmfile.d` directory when you run commands from the parent directory:

```bash
# Apply all files in helmfile.d/
helmfile apply
```

Or reference them explicitly:

```yaml
# helmfile.yaml
helmfiles:
  - path: helmfile.d/00-infrastructure.yaml
  - path: helmfile.d/10-storage.yaml
  - path: helmfile.d/20-monitoring.yaml
  - path: helmfile.d/30-applications.yaml
```

## Selective Deployments with Labels

When you have many releases, you might want to deploy only a subset:

```yaml
releases:
  - name: ingress-nginx
    namespace: ingress-nginx
    chart: ingress-nginx/ingress-nginx
    labels:
      tier: infrastructure
      component: networking

  - name: prometheus-stack
    namespace: monitoring
    chart: prometheus-community/kube-prometheus-stack
    labels:
      tier: infrastructure
      component: monitoring

  - name: my-app
    namespace: apps
    chart: ./charts/my-app
    labels:
      tier: application
      component: backend
```

```bash
# Deploy only infrastructure releases
helmfile -l tier=infrastructure apply

# Deploy only the monitoring component
helmfile -l component=monitoring apply
```

## Talos-Specific Considerations

When using Helmfile on Talos Linux, keep in mind:

- Talos nodes are immutable, so any chart that tries to modify the host filesystem will fail. Stick to charts that work within the Kubernetes container model.
- Storage classes must be configured before deploying charts that need persistent storage. Put storage-related releases early in your ordering.
- If your Talos cluster uses a specific CNI like Cilium, make sure your Helmfile includes the CNI deployment as one of the first releases.

## Destroying Releases

To tear down everything:

```bash
# Destroy all releases managed by Helmfile
helmfile destroy

# Destroy only specific releases
helmfile -l tier=application destroy
```

## Summary

Helmfile brings order to multi-chart deployments on Talos Linux. Instead of maintaining a collection of shell scripts or manually running Helm commands, you declare your entire cluster configuration in version-controlled YAML files. The environment support makes it easy to manage staging and production differences, and the dependency system ensures things deploy in the right order. For any Talos Linux cluster running more than a handful of Helm releases, Helmfile is worth adopting.
