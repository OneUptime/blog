# How to Pass Environment Variables to ArgoCD Components

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Environment Variables, Configuration

Description: Learn how to pass environment variables to all ArgoCD components including the server, controller, repo server, and notification controller using different installation methods.

---

Every ArgoCD component - the API server, application controller, repo server, Dex server, Redis, and notification controller - can be configured through environment variables. Knowing how to set these variables across different installation methods (kubectl, Helm, Kustomize) is essential for customizing ArgoCD behavior in production.

This guide covers the practical methods for passing environment variables to each ArgoCD component.

## ArgoCD Component Architecture

Before setting environment variables, understand which component does what:

```mermaid
graph TD
    A[argocd-server] --> |Serves UI and API| B[Users/CLI]
    C[argocd-application-controller] --> |Syncs apps| D[Kubernetes Clusters]
    E[argocd-repo-server] --> |Generates manifests| F[Git Repositories]
    G[argocd-dex-server] --> |Handles SSO| H[Identity Providers]
    I[argocd-redis] --> |Caches data| A
    I --> C
    J[argocd-notifications-controller] --> |Sends alerts| K[Notification Channels]
```

Each component has its own Deployment (or StatefulSet for the controller) where you set environment variables.

## Method 1: Direct Deployment Patches

The most straightforward method is patching the component Deployment directly:

### API Server

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: argocd-server
  namespace: argocd
spec:
  template:
    spec:
      containers:
        - name: argocd-server
          env:
            - name: ARGOCD_SERVER_INSECURE
              value: "true"
            - name: ARGOCD_LOG_LEVEL
              value: "info"
            - name: ARGOCD_LOG_FORMAT
              value: "json"
```

### Application Controller

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: argocd-application-controller
  namespace: argocd
spec:
  template:
    spec:
      containers:
        - name: argocd-application-controller
          env:
            - name: ARGOCD_CONTROLLER_STATUS_PROCESSORS
              value: "50"
            - name: ARGOCD_CONTROLLER_OPERATION_PROCESSORS
              value: "25"
            - name: ARGOCD_K8S_CLIENT_QPS
              value: "50"
            - name: ARGOCD_K8S_CLIENT_BURST
              value: "100"
```

### Repo Server

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: argocd-repo-server
  namespace: argocd
spec:
  template:
    spec:
      containers:
        - name: argocd-repo-server
          env:
            - name: ARGOCD_EXEC_TIMEOUT
              value: "180"
            - name: ARGOCD_GIT_ATTEMPTS_COUNT
              value: "3"
            - name: HELM_CACHE_HOME
              value: "/tmp/helm-cache"
            - name: HELM_CONFIG_HOME
              value: "/tmp/helm-config"
            - name: HELM_DATA_HOME
              value: "/tmp/helm-data"
            # Custom vars for plugins
            - name: ARGOCD_ENV_CLUSTER_NAME
              value: "production"
            - name: ARGOCD_ENV_REGION
              value: "us-east-1"
```

### Notification Controller

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: argocd-notifications-controller
  namespace: argocd
spec:
  template:
    spec:
      containers:
        - name: argocd-notifications-controller
          env:
            - name: ARGOCD_NOTIFICATIONS_LOG_LEVEL
              value: "info"
```

## Method 2: Using argocd-cmd-params-cm ConfigMap

The `argocd-cmd-params-cm` ConfigMap is the recommended approach for most settings. ArgoCD components read this ConfigMap at startup and translate entries to internal configuration:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cmd-params-cm
  namespace: argocd
data:
  # Server settings
  server.insecure: "true"
  server.log.level: "info"
  server.log.format: "json"
  server.basehref: "/"
  server.enable.gzip: "true"

  # Controller settings
  controller.log.level: "info"
  controller.log.format: "json"
  controller.status.processors: "50"
  controller.operation.processors: "25"
  controller.repo.server.timeout.seconds: "180"
  controller.diff.server.side: "true"

  # Repo server settings
  reposerver.log.level: "info"
  reposerver.log.format: "json"
  reposerver.parallelism.limit: "20"

  # Redis settings
  redis.server: "argocd-redis:6379"

  # Global reconciliation timeout
  timeout.reconciliation: "300"
```

This approach is cleaner because:
- All settings are in one place
- Easy to manage with GitOps
- No need to patch individual Deployments
- Settings are clearly documented by their key names

## Method 3: Helm Values

When installing ArgoCD with the official Helm chart, use the `extraEnv` field:

```yaml
# values.yaml
global:
  logging:
    level: info
    format: json

server:
  extraEnv:
    - name: ARGOCD_SERVER_INSECURE
      value: "true"
    - name: ARGOCD_SERVER_ENABLE_GZIP
      value: "true"

controller:
  extraEnv:
    - name: ARGOCD_K8S_CLIENT_QPS
      value: "50"
    - name: ARGOCD_K8S_CLIENT_BURST
      value: "100"

  # Or use the configs section for cmd-params-cm
  env: []

repoServer:
  extraEnv:
    - name: HELM_CACHE_HOME
      value: "/tmp/helm-cache"
    - name: HELM_CONFIG_HOME
      value: "/tmp/helm-config"
    - name: ARGOCD_ENV_CLUSTER_NAME
      value: "production"

notifications:
  extraEnv:
    - name: ARGOCD_NOTIFICATIONS_LOG_LEVEL
      value: "info"

dex:
  extraEnv: []

redis:
  extraEnv: []

# ConfigMap-based settings
configs:
  params:
    server.insecure: true
    controller.status.processors: 50
    controller.operation.processors: 25
    controller.diff.server.side: true
    reposerver.parallelism.limit: 20
    timeout.reconciliation: 300
```

Install with:

```bash
helm upgrade --install argocd argo/argo-cd \
  -n argocd \
  --create-namespace \
  -f values.yaml
```

## Method 4: Kustomize Patches

For Kustomize-based installations, use strategic merge patches or JSON patches:

### Strategic Merge Patch

```yaml
# kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - https://raw.githubusercontent.com/argoproj/argo-cd/v2.10.0/manifests/install.yaml

patchesStrategicMerge:
  - server-env.yaml
  - controller-env.yaml
  - repo-server-env.yaml
```

```yaml
# server-env.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: argocd-server
spec:
  template:
    spec:
      containers:
        - name: argocd-server
          env:
            - name: ARGOCD_SERVER_INSECURE
              value: "true"
            - name: ARGOCD_LOG_FORMAT
              value: "json"
```

### JSON Patch

```yaml
# kustomization.yaml
patches:
  - target:
      kind: Deployment
      name: argocd-server
    patch: |
      - op: add
        path: /spec/template/spec/containers/0/env/-
        value:
          name: ARGOCD_SERVER_INSECURE
          value: "true"
      - op: add
        path: /spec/template/spec/containers/0/env/-
        value:
          name: ARGOCD_LOG_FORMAT
          value: "json"

  - target:
      kind: StatefulSet
      name: argocd-application-controller
    patch: |
      - op: add
        path: /spec/template/spec/containers/0/env/-
        value:
          name: ARGOCD_CONTROLLER_STATUS_PROCESSORS
          value: "50"

  - target:
      kind: Deployment
      name: argocd-repo-server
    patch: |
      - op: add
        path: /spec/template/spec/containers/0/env/-
        value:
          name: ARGOCD_ENV_CLUSTER_NAME
          value: "production"
```

## Passing Secrets as Environment Variables

For sensitive configuration, use Kubernetes Secrets:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: argocd-env-secrets
  namespace: argocd
type: Opaque
stringData:
  ARGOCD_ENV_AWS_ACCESS_KEY_ID: "AKIAIOSFODNN7EXAMPLE"
  ARGOCD_ENV_AWS_SECRET_ACCESS_KEY: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
```

Reference them in the Deployment:

```yaml
env:
  - name: ARGOCD_ENV_AWS_ACCESS_KEY_ID
    valueFrom:
      secretKeyRef:
        name: argocd-env-secrets
        key: ARGOCD_ENV_AWS_ACCESS_KEY_ID
  - name: ARGOCD_ENV_AWS_SECRET_ACCESS_KEY
    valueFrom:
      secretKeyRef:
        name: argocd-env-secrets
        key: ARGOCD_ENV_AWS_SECRET_ACCESS_KEY
```

Or use `envFrom` to load all keys from a Secret:

```yaml
envFrom:
  - secretRef:
      name: argocd-env-secrets
```

## Using ConfigMaps as Environment Source

Load all entries from a ConfigMap as environment variables:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-custom-env
  namespace: argocd
data:
  ARGOCD_ENV_CLUSTER_NAME: "production"
  ARGOCD_ENV_REGION: "us-east-1"
  ARGOCD_ENV_ENVIRONMENT: "prod"
```

```yaml
envFrom:
  - configMapRef:
      name: argocd-custom-env
```

## Verifying Environment Variables

After setting environment variables, verify they are applied:

```bash
# Check server environment
kubectl exec -n argocd deployment/argocd-server -- env | sort | grep ARGOCD

# Check controller environment
kubectl exec -n argocd statefulset/argocd-application-controller -- env | sort | grep ARGOCD

# Check repo server environment
kubectl exec -n argocd deployment/argocd-repo-server -- env | sort | grep ARGOCD

# Check the cmd-params ConfigMap
kubectl get configmap argocd-cmd-params-cm -n argocd -o yaml
```

## Restarting Components After Changes

Environment variable changes require pod restarts:

```bash
# Restart all ArgoCD components
kubectl rollout restart deployment/argocd-server -n argocd
kubectl rollout restart statefulset/argocd-application-controller -n argocd
kubectl rollout restart deployment/argocd-repo-server -n argocd
kubectl rollout restart deployment/argocd-dex-server -n argocd
kubectl rollout restart deployment/argocd-notifications-controller -n argocd

# Or restart all at once
kubectl rollout restart deployment,statefulset -n argocd

# Watch rollouts complete
kubectl rollout status deployment/argocd-server -n argocd
kubectl rollout status statefulset/argocd-application-controller -n argocd
kubectl rollout status deployment/argocd-repo-server -n argocd
```

## Complete Production Configuration

Here is a full production setup combining all methods:

```yaml
# argocd-cmd-params-cm - primary configuration
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cmd-params-cm
  namespace: argocd
data:
  # Server
  server.insecure: "true"
  server.log.level: "info"
  server.log.format: "json"
  server.enable.gzip: "true"

  # Controller
  controller.log.level: "info"
  controller.log.format: "json"
  controller.status.processors: "50"
  controller.operation.processors: "25"
  controller.diff.server.side: "true"
  controller.repo.server.timeout.seconds: "180"

  # Repo server
  reposerver.log.level: "info"
  reposerver.log.format: "json"
  reposerver.parallelism.limit: "20"

  # Global
  timeout.reconciliation: "300"

---
# Custom env vars for plugins (loaded by repo server)
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-custom-env
  namespace: argocd
data:
  ARGOCD_ENV_CLUSTER_NAME: "production"
  ARGOCD_ENV_REGION: "us-east-1"
```

## Summary

Passing environment variables to ArgoCD components is the primary mechanism for customizing ArgoCD behavior. Use the `argocd-cmd-params-cm` ConfigMap for standard settings, direct environment variables for component-specific tuning, and Kubernetes Secrets for sensitive values. Whether you install with kubectl, Helm, or Kustomize, the same environment variables apply - only the method of setting them differs. Always verify your changes are applied and restart components after modifying their environment.
