# How to Use Generic Helm Chart Pattern with Flux HelmRelease

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Helm, HelmRelease, Generic Chart, Reusable Patterns

Description: Learn how to create and use a generic Helm chart pattern with Flux HelmRelease to deploy multiple applications using a single reusable chart template.

---

In many organizations, teams deploy dozens of microservices that share similar Kubernetes resource structures: a Deployment, a Service, a ConfigMap, and perhaps an Ingress. Rather than maintaining a separate Helm chart for each service, you can create a single generic chart and reuse it across multiple HelmRelease resources in Flux. This guide explains the generic Helm chart pattern and shows you how to implement it effectively.

## What Is the Generic Helm Chart Pattern?

The generic chart pattern involves creating one Helm chart with highly configurable templates that can represent any standard application. Each application is then deployed as a separate HelmRelease, passing different values to customize the deployment. This reduces chart maintenance overhead and enforces consistency across services.

## Prerequisites

- A Kubernetes cluster with Flux CD installed
- A Git repository connected to Flux
- A container registry or Helm chart repository to host your generic chart

## Creating the Generic Helm Chart

First, create a generic chart in your Git repository. The chart should accept values for all configurable aspects of a typical application deployment.

Here is the structure of a generic chart stored in your GitOps repository:

```bash
# Create the generic chart directory structure
mkdir -p charts/generic-app/templates
```

The `Chart.yaml` for your generic chart:

```yaml
# charts/generic-app/Chart.yaml - Generic application chart definition
apiVersion: v2
name: generic-app
description: A generic Helm chart for deploying standard applications
type: application
version: 1.0.0
appVersion: "1.0.0"
```

A simplified `values.yaml` for the generic chart:

```yaml
# charts/generic-app/values.yaml - Default values for the generic chart
# Application name (used for labels and resource names)
appName: my-app

# Container image configuration
image:
  repository: nginx
  tag: latest
  pullPolicy: IfNotPresent

# Replica count for the Deployment
replicaCount: 1

# Container port configuration
containerPort: 8080

# Service configuration
service:
  enabled: true
  type: ClusterIP
  port: 80

# Ingress configuration
ingress:
  enabled: false
  className: nginx
  host: ""
  annotations: {}

# Resource requests and limits
resources:
  requests:
    cpu: 100m
    memory: 128Mi
  limits:
    cpu: 500m
    memory: 512Mi

# Environment variables passed to the container
env: []

# ConfigMap data (key-value pairs)
configMap:
  enabled: false
  data: {}

# Health check probes
livenessProbe:
  enabled: true
  path: /healthz
  port: 8080

readinessProbe:
  enabled: true
  path: /readyz
  port: 8080
```

## Hosting the Generic Chart

You can host the generic chart in a Git repository that Flux watches directly using a GitRepository source, or push it to a Helm chart repository. Using a GitRepository source is the simplest approach.

```yaml
# gitrepository.yaml - Points Flux to the Git repo containing the generic chart
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: platform-charts
  namespace: flux-system
spec:
  interval: 5m
  url: https://github.com/your-org/platform-charts.git
  ref:
    branch: main
```

## Deploying Applications with the Generic Chart

Now deploy multiple applications using the same generic chart but different values. Each HelmRelease references the same chart source.

Here is a HelmRelease for a frontend application:

```yaml
# helmrelease-frontend.yaml - Frontend app using the generic chart
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: frontend
  namespace: apps
spec:
  interval: 10m
  chart:
    spec:
      # Reference the generic chart inside the Git repository
      chart: ./charts/generic-app
      sourceRef:
        kind: GitRepository
        name: platform-charts
        namespace: flux-system
      interval: 10m
  install:
    createNamespace: true
    remediation:
      retries: 3
  upgrade:
    remediation:
      retries: 3
      strategy: rollback
  # Application-specific values override the chart defaults
  values:
    appName: frontend
    image:
      repository: your-registry.io/frontend
      tag: "v2.1.0"
    replicaCount: 3
    containerPort: 3000
    service:
      enabled: true
      type: ClusterIP
      port: 80
    ingress:
      enabled: true
      className: nginx
      host: frontend.example.com
    resources:
      requests:
        cpu: 200m
        memory: 256Mi
      limits:
        cpu: 1000m
        memory: 1Gi
    env:
      - name: API_URL
        value: "http://backend.apps.svc.cluster.local"
      - name: NODE_ENV
        value: "production"
    livenessProbe:
      enabled: true
      path: /health
      port: 3000
    readinessProbe:
      enabled: true
      path: /ready
      port: 3000
```

Here is a HelmRelease for a backend API using the same generic chart:

```yaml
# helmrelease-backend.yaml - Backend API using the generic chart
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: backend-api
  namespace: apps
spec:
  interval: 10m
  chart:
    spec:
      chart: ./charts/generic-app
      sourceRef:
        kind: GitRepository
        name: platform-charts
        namespace: flux-system
      interval: 10m
  install:
    createNamespace: true
    remediation:
      retries: 3
  upgrade:
    remediation:
      retries: 3
      strategy: rollback
  values:
    appName: backend-api
    image:
      repository: your-registry.io/backend-api
      tag: "v3.0.5"
    replicaCount: 2
    containerPort: 8080
    service:
      enabled: true
      type: ClusterIP
      port: 80
    ingress:
      enabled: true
      className: nginx
      host: api.example.com
    resources:
      requests:
        cpu: 500m
        memory: 512Mi
      limits:
        cpu: 2000m
        memory: 2Gi
    env:
      - name: DATABASE_URL
        valueFrom:
          secretKeyRef:
            name: backend-secrets
            key: database-url
      - name: LOG_LEVEL
        value: "info"
    configMap:
      enabled: true
      data:
        config.json: |
          {"feature_flags": {"new_dashboard": true}}
```

## Scaling the Pattern Across Teams

When you have many services, organize your HelmReleases by team or domain in your GitOps repository:

```bash
# Recommended directory structure for multi-team generic chart usage
clusters/production/
  apps/
    team-platform/
      frontend.yaml        # HelmRelease for frontend
      backend-api.yaml     # HelmRelease for backend API
    team-data/
      data-pipeline.yaml   # HelmRelease for data pipeline
      analytics-api.yaml   # HelmRelease for analytics API
  infrastructure/
    sources/
      platform-charts.yaml # GitRepository source for the generic chart
```

## Verifying Deployments

After committing your HelmRelease manifests, Flux will reconcile them automatically. Check the status of all releases.

```bash
# List all HelmReleases across namespaces
flux get helmrelease --all-namespaces

# Check a specific release
flux get helmrelease frontend -n apps

# Verify the deployed resources
kubectl get deploy,svc,ingress -n apps
```

## Benefits and Trade-Offs

The generic chart pattern reduces chart duplication and enforces organizational standards. Every service follows the same deployment structure, making operations and debugging more predictable. However, it can become complex if your services have vastly different resource requirements (for example, some need StatefulSets, some need CronJobs). In those cases, consider creating a small family of generic charts rather than one chart that tries to handle every scenario.

## Summary

The generic Helm chart pattern combined with Flux HelmRelease is a powerful way to standardize application deployments at scale. By maintaining a single configurable chart and deploying each service as a separate HelmRelease with unique values, you minimize chart maintenance, enforce consistency, and make your GitOps repository easier to navigate and manage.
