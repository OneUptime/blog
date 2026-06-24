# How to Use Flux CD with Kluctl for Deployments

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kluctl, Kubernetes, GitOps, Deployment, Templating

Description: Learn how to integrate Kluctl with Flux CD to leverage advanced templating, multi-environment deployments, and diff-based deployment strategies.

---

## Introduction

Kluctl is a deployment tool for Kubernetes that combines the flexibility of Kustomize with Jinja2 templating and a powerful diff-based deployment approach. When used alongside Flux CD through the Kluctl Controller, you get the best of both worlds: Kluctl's advanced templating and multi-environment capabilities with GitOps-style reconciliation.

This guide demonstrates how to set up the Kluctl Controller alongside Flux CD and build sophisticated deployment pipelines.

## Prerequisites

Before starting, ensure you have:

- A Kubernetes cluster (v1.25 or later)
- Flux CD installed and bootstrapped
- Kluctl CLI installed
- A Git repository connected to Flux CD
- kubectl configured for your cluster

## Installing Kluctl CLI

```bash
# Install on macOS

brew install kluctl/tap/kluctl

# Install on Linux
curl -sSL https://kluctl.io/install.sh | bash

# Verify installation
kluctl version
```

## Installing the Kluctl Controller

The Kluctl Controller provides the GitOps reconciliation loop for Kluctl deployments:

```bash
# Install the Kluctl controller into your cluster
kluctl controller install

# Verify the controller is running
kubectl get pods -n kluctl-system
```

Alternatively, manage the controller from a Kluctl deployment project:

```yaml
# deployment.yaml
deployments:
  - git:
      url: https://github.com/kluctl/kluctl.git
      subDir: install/controller
      ref:
        tag: v2.27.0
```

## Understanding Kluctl Project Structure

A Kluctl project uses a hierarchical structure with targets for different environments:

```mermaid
graph TD
    A[Kluctl Project] --> B[.kluctl.yaml]
    A --> C[deployment.yaml]
    A --> D[targets/]
    D --> E[staging.yaml]
    D --> F[production.yaml]
    A --> G[apps/]
    G --> H[frontend/]
    G --> I[backend/]
    G --> J[database/]
```

## Creating a Kluctl Project

### Project Configuration

```yaml
# .kluctl.yaml
# Main Kluctl project configuration
args:
  - name: environment
  - name: replicas
  - name: domain

targets:
  # Staging environment target
  - name: staging
    context: staging-cluster
    args:
      environment: staging
      replicas: 1
      domain: staging.example.com
    discriminator: "staging-{{ args.environment }}"

  # Production environment target
  - name: production
    context: production-cluster
    args:
      environment: production
      replicas: 3
      domain: example.com
    discriminator: "production-{{ args.environment }}"
```

### Root Deployment File

```yaml
# deployment.yaml
# Root deployment descriptor
deployments:
  # Deploy namespace first
  - path: namespaces

  # Deploy infrastructure components
  - path: infrastructure

  # Wait for infrastructure before proceeding
  - barrier: true

  # Deploy application workloads
  - include: apps

# Common variables available to all deployments
commonLabels:
  managed-by: kluctl
  environment: "{{ args.environment }}"

# Load files for environment-specific values
vars:
  - file: "targets/{{ args.environment }}.yaml"
```

### Environment-Specific Variables

```yaml
# targets/staging.yaml
# Variables specific to the staging environment
database:
  host: postgres-staging.internal
  port: 5432
  name: myapp_staging
  replicas: 1

redis:
  host: redis-staging.internal
  port: 6379

monitoring:
  enabled: false

resources:
  cpu_limit: "500m"
  memory_limit: "256Mi"
  cpu_request: "100m"
  memory_request: "128Mi"
```

```yaml
# targets/production.yaml
# Variables specific to the production environment
database:
  host: postgres-production.internal
  port: 5432
  name: myapp_production
  replicas: 3

redis:
  host: redis-production.internal
  port: 6379

monitoring:
  enabled: true

resources:
  cpu_limit: "2000m"
  memory_limit: "1Gi"
  cpu_request: "500m"
  memory_request: "512Mi"
```

## Defining Application Deployments

### Namespace Definition

```yaml
# namespaces/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: "{{ args.environment }}"
  labels:
    environment: "{{ args.environment }}"
```

### Backend Application with Jinja2 Templating

```yaml
# apps/backend/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
  namespace: "{{ args.environment }}"
  labels:
    app: backend
    environment: "{{ args.environment }}"
spec:
  # Replicas from target-specific args
  replicas: {{ args.replicas }}
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
    spec:
      containers:
        - name: backend
          image: myregistry.io/backend:v2.1.0
          ports:
            - containerPort: 8080
          env:
            # Database configuration from environment variables
            - name: DATABASE_HOST
              value: "{{ database.host }}"
            - name: DATABASE_PORT
              value: "{{ database.port }}"
            - name: DATABASE_NAME
              value: "{{ database.name }}"
            - name: REDIS_URL
              value: "redis://{{ redis.host }}:{{ redis.port }}"
          resources:
            limits:
              cpu: "{{ resources.cpu_limit }}"
              memory: "{{ resources.memory_limit }}"
            requests:
              cpu: "{{ resources.cpu_request }}"
              memory: "{{ resources.memory_request }}"
          # Health check probes
          livenessProbe:
            httpGet:
              path: /healthz
              port: 8080
            initialDelaySeconds: 15
            periodSeconds: 20
          readinessProbe:
            httpGet:
              path: /ready
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 10
```

### Service with Conditional Configuration

```yaml
# apps/backend/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: backend
  namespace: "{{ args.environment }}"
spec:
  selector:
    app: backend
  ports:
    - port: 80
      targetPort: 8080
      protocol: TCP
  type: ClusterIP
```

### Apps Deployment Descriptor

```yaml
# apps/deployment.yaml
deployments:
  - path: backend
  - path: frontend
{% if monitoring.enabled %}
  # Only deploy monitoring in environments where it is enabled
  - path: monitoring
{% endif %}
```

## Integrating Kluctl with Flux CD

### Create a KluctlDeployment Resource

The KluctlDeployment CRD is the GitOps interface for Kluctl deployments:

```yaml
# clusters/production/apps/kluctl-deployment.yaml
apiVersion: gitops.kluctl.io/v1beta1
kind: KluctlDeployment
metadata:
  name: my-application
  namespace: kluctl-system
spec:
  # Reconciliation interval
  interval: 10m
  # Source repository
  source:
    git:
      url: https://github.com/example-org/my-application.git
      path: "."
  # Target to deploy (maps to .kluctl.yaml targets)
  target: production
  # Use the controller-generated kubeconfig context
  context: default
  # Enable pruning of orphaned resources
  prune: true
  # Run without applying changes when set to true
  dryRun: false
  # Timeout for deployment
  timeout: 5m
```

### KluctlDeployment with Manual Approval

For production deployments that require approval:

```yaml
# clusters/production/apps/kluctl-deployment-manual.yaml
apiVersion: gitops.kluctl.io/v1beta1
kind: KluctlDeployment
metadata:
  name: my-application-manual
  namespace: kluctl-system
spec:
  interval: 10m
  source:
    git:
      url: https://github.com/example-org/my-application.git
      path: "."
  target: production
  context: default
  prune: true
  # Require manual approval before a real deployment
  manual: true
  # The Kluctl Webui can approve a deployment by setting manualObjectsHash
  # to the rendered objects hash shown in status.lastObjectsHash.
```

## Using Kluctl Diff for Safe Deployments

Kluctl's diff feature lets you preview changes before they are applied:

```bash
# Preview changes for staging
kluctl diff -t staging

# Preview changes for production
kluctl diff -t production

# Deploy after reviewing the diff
kluctl deploy -t production --yes
```

## Multi-Cluster Deployment with Kluctl and Flux

Deploy the same application to multiple clusters:

```yaml
# clusters/staging/apps/kluctl-staging.yaml
apiVersion: gitops.kluctl.io/v1beta1
kind: KluctlDeployment
metadata:
  name: my-application
  namespace: kluctl-system
spec:
  interval: 5m
  source:
    git:
      url: https://github.com/example-org/my-application.git
      path: "."
  # Deploy to staging target
  target: staging
  context: default
  prune: true
```

```yaml
# clusters/production/apps/kluctl-production.yaml
apiVersion: gitops.kluctl.io/v1beta1
kind: KluctlDeployment
metadata:
  name: my-application
  namespace: kluctl-system
spec:
  interval: 10m
  source:
    git:
      url: https://github.com/example-org/my-application.git
      path: "."
  # Deploy to production target
  target: production
  context: default
  prune: true
  # Longer timeout for production
  timeout: 10m
```

## Monitoring Kluctl Deployments

Check the status of your Kluctl deployments:

```bash
# List all KluctlDeployments
kubectl get kluctldeployments -n kluctl-system

# View detailed deployment status
kubectl describe kluctldeployment my-application -n kluctl-system

# Check deployment conditions
kubectl get kluctldeployment my-application -n kluctl-system \
  -o jsonpath='{.status.conditions[*].message}'
```

## Setting Up Notifications for Kluctl Deployments

```yaml
# clusters/production/monitoring/kluctl-alerts.yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: kluctl-deployments
  namespace: flux-system
spec:
  eventSeverity: info
  providerRef:
    name: slack-notifications
  eventSources:
    # Watch the Flux Kustomization that applies KluctlDeployment resources
    - kind: Kustomization
      name: kluctl-deployments
      namespace: flux-system
```

## Troubleshooting

### Kluctl Template Rendering Errors

```bash
# Validate templates locally
kluctl render -t staging

# Check for undefined variables
kluctl render -t production --print-all
```

### KluctlDeployment Not Reconciling

```bash
# Check controller logs
kubectl logs -n kluctl-system deployment/kluctl-controller

# Force reconciliation
kluctl gitops reconcile --namespace kluctl-system --name my-application
```

## Best Practices

1. **Use targets for environments** - Define separate targets in `.kluctl.yaml` for each environment with appropriate variables.
2. **Leverage barriers** - Add `barrier: true` deployment items to wait until previous deployment items have been applied before continuing.
3. **Preview with diff** - Always run `kluctl diff` before deploying to production to review changes.
4. **Use discriminators** - Set unique discriminators per target to prevent resource conflicts across environments.
5. **Enable prune carefully** - Start with `prune: false` and enable it only after verifying your deployment configurations are correct.

## Conclusion

Kluctl and Flux CD together provide a powerful deployment solution that combines Kluctl's advanced Jinja2 templating, multi-environment targets, and diff-based deployments with GitOps workflows managed in-cluster. The KluctlDeployment CRD gives you a production-grade deployment pipeline with full visibility into changes before they hit your cluster.
