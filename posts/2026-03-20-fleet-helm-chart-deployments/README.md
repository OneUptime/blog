# How to Configure Fleet Helm Chart Deployments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Fleet, GitOps, Rancher, Kubernetes, Helm

Description: Learn how to configure Fleet to deploy Helm charts from Git repositories or Helm registries, including value overrides and per-cluster customization.

## Introduction

Fleet has native support for Helm chart deployments, allowing you to manage Helm releases as part of your GitOps workflow. You can deploy Helm charts stored directly in your Git repository or reference charts from a Helm registry (including OCI registries), with full support for value customization per cluster or environment.

This guide covers configuring Fleet to deploy Helm charts, managing values, and handling chart upgrades.

## Prerequisites

- Fleet installed in Rancher
- A Helm chart (either in Git or a Helm registry)
- `kubectl` access to Fleet manager
- Understanding of Helm chart structure

## Helm Chart in a Git Repository

The most straightforward approach is to include your Helm chart directly in your Git repository.

### Repository Structure

```text
my-helm-app/
├── fleet.yaml          # Fleet configuration
├── values-common.yaml  # Additional Fleet values
└── chart/
    ├── Chart.yaml      # Helm chart metadata
    ├── values.yaml     # Default values
    └── templates/
        ├── deployment.yaml
        ├── service.yaml
        └── _helpers.tpl
```

### Configuring fleet.yaml for Helm

```yaml
# fleet.yaml - Deploy a Helm chart from the repository

defaultNamespace: my-helm-app

helm:
  # Path to the chart relative to the fleet.yaml location
  chart: chart

  # Release name for the Helm deployment
  releaseName: my-helm-app

  # Override values from the chart's values.yaml
  values:
    replicaCount: 2
    image:
      repository: nginx
      tag: "1.25"
    service:
      type: ClusterIP
      port: 80

  # Additional values files to merge
  valuesFiles:
    - values-common.yaml
```

## Deploying a Helm Chart from a Registry

For charts stored in a Helm registry, use the `repo` field:

```yaml
# fleet.yaml - Deploy from Helm registry
defaultNamespace: ingress-nginx

helm:
  # Helm chart repository URL
  repo: https://kubernetes.github.io/ingress-nginx

  # Chart name in the repository
  chart: ingress-nginx

  # Specific chart version to deploy
  version: "4.9.0"

  # Helm release name
  releaseName: ingress-nginx

  # Override values
  values:
    controller:
      replicaCount: 2
      service:
        type: LoadBalancer
```

## Per-Cluster Value Overrides

One of Fleet's most powerful features is the ability to customize Helm values per cluster or environment:

```yaml
# fleet.yaml - Environment-specific Helm values
defaultNamespace: my-app

helm:
  # Base chart configuration
  repo: https://charts.example.com
  chart: my-app
  version: "2.1.0"
  releaseName: my-app

  # Default values applied to all clusters
  values:
    image:
      repository: my-registry/my-app
      tag: "1.0.0"
    monitoring:
      enabled: true

targetCustomizations:
  # Development: minimal resources
  - name: dev
    clusterSelector:
      matchLabels:
        env: dev
    helm:
      values:
        replicaCount: 1
        resources:
          requests:
            cpu: "50m"
            memory: "64Mi"
        debug:
          enabled: true

  # Production: full resources, HA
  - name: production
    clusterSelector:
      matchLabels:
        env: production
    helm:
      values:
        replicaCount: 3
        resources:
          requests:
            cpu: "500m"
            memory: "512Mi"
          limits:
            cpu: "1000m"
            memory: "1Gi"
        debug:
          enabled: false
```

## Using Values Files

Organize complex values across multiple files:

```yaml
# fleet.yaml - Using multiple values files
defaultNamespace: my-app

helm:
  chart: chart
  releaseName: my-app

  # Merge values from multiple files in order
  # Later files override earlier ones
  valuesFiles:
    - values/common.yaml
    - values/monitoring.yaml

targetCustomizations:
  - name: production
    clusterSelector:
      matchLabels:
        env: production
    helm:
      values:
        replicaCount: 3
        ingress:
          enabled: true  # Production-specific overrides
```

## Using Secret-Based Values

For sensitive values, reference Kubernetes secrets:

```yaml
# fleet.yaml - Using secret values
defaultNamespace: my-app

helm:
  chart: chart
  releaseName: my-app

  # Reference a secret containing Helm values
  # The secret must exist in the downstream cluster
  valuesFrom:
    - secretKeyRef:
        name: my-app-helm-values
        namespace: my-app
        key: values.yaml
```

```bash
# Create the secret with sensitive values
kubectl create secret generic my-app-helm-values \
  --from-file=values.yaml=sensitive-values.yaml \
  -n my-app
```

## Configuring Helm Options

```yaml
# fleet.yaml - Advanced Helm options
defaultNamespace: my-app

helm:
  chart: chart
  releaseName: my-app

  # Wait for Helm Jobs to complete before marking the GitRepo as ready
  waitForJobs: true

  # Set the timeout for Helm operations
  timeoutSeconds: 300

  # Force resource updates through delete/recreate if needed
  force: false

  # Take ownership of existing resources not managed by Helm
  takeOwnership: false

  # Atomic install - rollback on failure
  atomic: true

  # Disable Go template preprocessing for Fleet values
  disablePreProcess: false
```

## Upgrading Helm Charts

To upgrade a chart version, update the `version` field in fleet.yaml and commit:

```bash
# Edit fleet.yaml to update the chart version
# Change: version: "4.8.0" -> version: "4.9.0"
git add fleet.yaml
git commit -m "Upgrade ingress-nginx to 4.9.0"
git push origin main

# Fleet will automatically detect the change and upgrade
# Monitor the upgrade status
kubectl get gitrepo my-app -n fleet-default -w
kubectl get bundles -n fleet-default -w
```

## Verifying Helm Deployments

```bash
# Check that Fleet deployed the Helm release
# (Run on the downstream cluster)
helm list -n my-app

# Check Helm release history
helm history my-app -n my-app

# Verify deployed values
helm get values my-app -n my-app
```

## Conclusion

Fleet's Helm support brings GitOps principles to Helm chart management. By storing your Helm configuration in Git and leveraging Fleet's per-cluster value overrides, you gain the benefits of both Helm's templating power and Fleet's multi-cluster synchronization capabilities. This approach ensures that your Helm releases are always in the desired state, auditable through Git history, and consistently deployed across all your target clusters.
