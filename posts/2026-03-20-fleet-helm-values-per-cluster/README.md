# How to Configure Fleet Helm Values per Cluster

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Fleet, GitOps, Rancher, Kubernetes, Helm

Description: Learn how to configure Fleet to apply different Helm values to different clusters, enabling environment-specific customizations without duplicating chart definitions.

## Introduction

One of Fleet's most powerful capabilities is the ability to customize Helm values on a per-cluster or per-environment basis without duplicating your Helm chart configuration. This allows you to deploy the same application to development, staging, and production clusters with different resource allocations, replica counts, feature flags, and other settings - all from a single Git repository.

## Prerequisites

- Fleet installed in Rancher
- A Helm chart (in Git or a Helm registry)
- Multiple clusters registered with labels
- `kubectl` access to the Fleet manager and downstream clusters

## Helm Values Inheritance Model

Fleet applies Helm values in a merge hierarchy:
1. Chart's default `values.yaml` (lowest priority)
2. Root values in `fleet.yaml`'s `helm.values`
3. Values files specified in root `helm.valuesFiles`
4. Values loaded from root `helm.valuesFrom`
5. Matching `targetCustomizations[].helm` overrides for that cluster (highest priority)

Later values override earlier ones, giving you fine-grained control.

## Basic Per-Cluster Values

```yaml
# fleet.yaml - Environment-specific Helm values

defaultNamespace: my-app

helm:
  chart: chart
  releaseName: my-app

  # Base values applied to ALL clusters
  values:
    image:
      repository: my-registry/my-app
      tag: "v1.5.0"
    service:
      type: ClusterIP
      port: 80

targetCustomizations:
  # Development: minimal setup
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
        autoscaling:
          enabled: false
        ingress:
          enabled: true
          host: "my-app.dev.example.com"

  # Staging: moderate resources, feature parity with prod
  - name: staging
    clusterSelector:
      matchLabels:
        env: staging
    helm:
      values:
        replicaCount: 2
        resources:
          requests:
            cpu: "200m"
            memory: "256Mi"
        autoscaling:
          enabled: false
        ingress:
          enabled: true
          host: "my-app.staging.example.com"

  # Production: full HA configuration
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
            cpu: "1"
            memory: "1Gi"
        autoscaling:
          enabled: true
          minReplicas: 3
          maxReplicas: 10
          targetCPUUtilizationPercentage: 70
        ingress:
          enabled: true
          host: "my-app.example.com"
          tls:
            enabled: true
```

## Using Values Files per Target

Organize complex values into separate files:

```text
my-app/
├── fleet.yaml
├── chart/
│   ├── Chart.yaml
│   └── values.yaml
└── values/
    ├── common.yaml        # Shared across all environments
    ├── dev.yaml           # Dev-specific values
    ├── staging.yaml       # Staging-specific values
    ├── production.yaml    # Production-specific values
    └── us-east-1.yaml     # Region-specific values
```

```yaml
# fleet.yaml - Using values files per target
defaultNamespace: my-app

helm:
  chart: chart
  releaseName: my-app
  # Common values applied to all
  valuesFiles:
    - values/common.yaml

targetCustomizations:
  - name: dev
    clusterSelector:
      matchLabels:
        env: dev
    helm:
      valuesFiles:
        - values/dev.yaml  # Overrides common values for dev

  - name: production-us-east
    clusterSelector:
      matchLabels:
        env: production
        region: us-east-1
    helm:
      valuesFiles:
        - values/production.yaml
        - values/us-east-1.yaml  # Region-specific overrides
```

## Using Cluster Labels as Helm Values

Pass cluster labels directly into Helm values using template functions:

```yaml
# fleet.yaml - Inject cluster information into Helm values
defaultNamespace: my-app

helm:
  chart: chart
  releaseName: my-app

targetCustomizations:
  - name: all-clusters
    clusterSelector: {}
    helm:
      values:
        # These values will be different per cluster based on its labels
        # Note: Use Fleet's `${ }` templating with `.ClusterLabels`
        clusterConfig:
          environment: '${ if hasKey .ClusterLabels "env" }${ .ClusterLabels.env }${ else }unknown${ end}'
          region: '${ if hasKey .ClusterLabels "region" }${ .ClusterLabels.region }${ else }unknown${ end}'
```

## Secrets-Based Values per Cluster

For sensitive per-cluster values, use Kubernetes secrets in the downstream clusters:

```bash
# Create cluster-specific secrets in each downstream cluster
kubectl --context staging-cluster create secret generic my-app-staging-values \
  --from-literal=values.yaml='
database:
  host: "staging-db.internal"
  port: "5432"
api:
  key: "staging-api-key-here"
' -n my-app

kubectl --context production-cluster create secret generic my-app-production-values \
  --from-literal=values.yaml='
database:
  host: "prod-db.internal"
  port: "5432"
api:
  key: "production-api-key-here"
' -n my-app
```

```yaml
# fleet.yaml - Reference secrets for sensitive values
targetCustomizations:
  - name: staging
    clusterSelector:
      matchLabels:
        env: staging
    helm:
      valuesFrom:
        - secretKeyRef:
            name: my-app-staging-values
            namespace: my-app
            key: values.yaml

  - name: production
    clusterSelector:
      matchLabels:
        env: production
    helm:
      valuesFrom:
        - secretKeyRef:
            name: my-app-production-values
            namespace: my-app
            key: values.yaml
```

## Regional Configuration Example

Configure an application differently per AWS region:

```yaml
# fleet.yaml - Region-based Helm configuration
defaultNamespace: my-app

helm:
  repo: https://charts.example.com
  chart: my-app
  version: "3.2.0"
  releaseName: my-app
  values:
    # Shared defaults
    monitoring:
      enabled: true
    cache:
      enabled: true

targetCustomizations:
  - name: us-east-1
    clusterSelector:
      matchLabels:
        region: us-east-1
    helm:
      values:
        region: us-east-1
        s3:
          bucket: "my-app-data-us-east-1"
          region: "us-east-1"
        database:
          endpoint: "db.us-east-1.rds.amazonaws.com"

  - name: eu-central-1
    clusterSelector:
      matchLabels:
        region: eu-central-1
    helm:
      values:
        region: eu-central-1
        s3:
          bucket: "my-app-data-eu-central-1"
          region: "eu-central-1"
        database:
          endpoint: "db.eu-central-1.rds.amazonaws.com"
        # GDPR compliance setting for EU
        gdpr:
          enabled: true
          dataResidency: eu
```

## Verifying Deployed Values

```bash
# Check what values were deployed to a specific cluster
# (Switch context to the downstream cluster)
helm get values my-app -n my-app

# Compare values across clusters
# On staging cluster:
helm get values my-app -n my-app > /tmp/staging-values.yaml

# On production cluster:
helm get values my-app -n my-app > /tmp/prod-values.yaml

# Diff the values
diff /tmp/staging-values.yaml /tmp/prod-values.yaml
```

## Conclusion

Fleet's per-cluster Helm values configuration is one of its most powerful features for managing multi-environment deployments. By combining base values in `fleet.yaml` with target-specific overrides and environment-specific values files, you can maintain a single Helm chart definition while delivering appropriately configured deployments to every cluster in your fleet. This approach eliminates duplication, reduces configuration drift between environments, and makes auditing environment-specific settings straightforward.
