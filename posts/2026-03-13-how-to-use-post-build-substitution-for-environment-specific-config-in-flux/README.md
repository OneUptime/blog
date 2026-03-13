# How to Use Post-Build Substitution for Environment-Specific Config in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, GitOps, Kubernetes, Kustomization, Environment Configuration, Post-Build Substitution

Description: Learn how to use Flux post-build substitution to manage environment-specific configuration across staging, production, and other clusters from a single set of manifests.

---

## Introduction

Running the same application across multiple environments like staging and production typically means maintaining separate manifests or complex overlay structures. Flux post-build substitution offers a simpler approach. You write your manifests once with variable placeholders and let Flux inject the correct values for each environment at reconciliation time. This keeps your Git repository clean while supporting any number of deployment targets.

## Prerequisites

- A Kubernetes cluster running version 1.25 or later
- Flux v2.3 or later installed on the cluster
- kubectl configured to access the cluster
- A Git repository connected to Flux via a GitRepository source
- Basic familiarity with Flux Kustomization resources

## The Problem with Traditional Approaches

Without post-build substitution, managing environment-specific configuration usually involves one of these approaches:

- Duplicating manifests across environment directories, leading to drift and maintenance overhead
- Using Kustomize overlays with patches, which becomes complex as the number of differences grows
- Relying on Helm values files, which limits you to Helm-based deployments

Post-build substitution lets you use a single set of base manifests and swap out values per environment.

## Setting Up the Base Manifests

Start by creating your application manifests with variable placeholders in a shared directory:

```yaml
# apps/my-app/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: ${APP_NAMESPACE}
  labels:
    app: my-app
    environment: ${ENVIRONMENT}
spec:
  replicas: ${REPLICAS}
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
        environment: ${ENVIRONMENT}
    spec:
      containers:
        - name: my-app
          image: ${REGISTRY}/my-app:${IMAGE_TAG}
          resources:
            requests:
              cpu: ${CPU_REQUEST}
              memory: ${MEMORY_REQUEST}
            limits:
              cpu: ${CPU_LIMIT}
              memory: ${MEMORY_LIMIT}
          env:
            - name: APP_ENV
              value: "${ENVIRONMENT}"
            - name: DATABASE_URL
              value: "${DATABASE_URL}"
            - name: LOG_LEVEL
              value: "${LOG_LEVEL:=info}"
```

```yaml
# apps/my-app/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: my-app
  namespace: ${APP_NAMESPACE}
spec:
  selector:
    app: my-app
  ports:
    - port: 80
      targetPort: 8080
```

```yaml
# apps/my-app/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: my-app
  namespace: ${APP_NAMESPACE}
  annotations:
    cert-manager.io/cluster-issuer: ${CERT_ISSUER}
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - ${APP_HOSTNAME}
      secretName: my-app-tls
  rules:
    - host: ${APP_HOSTNAME}
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: my-app
                port:
                  number: 80
```

## Creating Environment ConfigMaps

Define a ConfigMap for each environment with the appropriate values:

```yaml
# clusters/staging/my-app-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: my-app-config
  namespace: flux-system
data:
  APP_NAMESPACE: "staging"
  ENVIRONMENT: "staging"
  REPLICAS: "1"
  REGISTRY: "registry.example.com/staging"
  IMAGE_TAG: "latest"
  CPU_REQUEST: "100m"
  MEMORY_REQUEST: "128Mi"
  CPU_LIMIT: "500m"
  MEMORY_LIMIT: "512Mi"
  LOG_LEVEL: "debug"
  APP_HOSTNAME: "app.staging.example.com"
  CERT_ISSUER: "letsencrypt-staging"
```

```yaml
# clusters/production/my-app-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: my-app-config
  namespace: flux-system
data:
  APP_NAMESPACE: "production"
  ENVIRONMENT: "production"
  REPLICAS: "3"
  REGISTRY: "registry.example.com/production"
  IMAGE_TAG: "v2.1.0"
  CPU_REQUEST: "250m"
  MEMORY_REQUEST: "256Mi"
  CPU_LIMIT: "1000m"
  MEMORY_LIMIT: "1Gi"
  LOG_LEVEL: "warn"
  APP_HOSTNAME: "app.example.com"
  CERT_ISSUER: "letsencrypt-prod"
```

## Creating Environment Secrets

Sensitive values go in Secrets, one per environment:

```yaml
# clusters/staging/my-app-secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: my-app-secrets
  namespace: flux-system
type: Opaque
stringData:
  DATABASE_URL: "postgresql://app:staging-pass@staging-db:5432/myapp"
```

```yaml
# clusters/production/my-app-secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: my-app-secrets
  namespace: flux-system
type: Opaque
stringData:
  DATABASE_URL: "postgresql://app:prod-secure-pass@prod-db:5432/myapp"
```

## Configuring the Flux Kustomizations

Create a Flux Kustomization for each environment pointing to the same base manifests but referencing different ConfigMaps and Secrets:

```yaml
# clusters/staging/my-app-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 5m
  path: ./apps/my-app
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  postBuild:
    substituteFrom:
      - kind: ConfigMap
        name: my-app-config
      - kind: Secret
        name: my-app-secrets
```

```yaml
# clusters/production/my-app-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps/my-app
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  postBuild:
    substituteFrom:
      - kind: ConfigMap
        name: my-app-config
      - kind: Secret
        name: my-app-secrets
```

## Adding a New Environment

To add a new environment like development, create the corresponding ConfigMap, Secret, and Kustomization:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: my-app-config
  namespace: flux-system
data:
  APP_NAMESPACE: "development"
  ENVIRONMENT: "development"
  REPLICAS: "1"
  REGISTRY: "registry.example.com/dev"
  IMAGE_TAG: "dev-latest"
  CPU_REQUEST: "50m"
  MEMORY_REQUEST: "64Mi"
  CPU_LIMIT: "250m"
  MEMORY_LIMIT: "256Mi"
  LOG_LEVEL: "debug"
  APP_HOSTNAME: "app.dev.example.com"
  CERT_ISSUER: "letsencrypt-staging"
```

The base manifests remain unchanged. Each environment only needs its own set of variable definitions.

## Handling Environment-Specific Resources

Sometimes an environment needs resources that others do not, such as a debug service or extra monitoring. Use a separate Kustomization for these:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app-extras
  namespace: flux-system
spec:
  interval: 5m
  path: ./apps/my-app/extras/staging
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  dependsOn:
    - name: my-app
  postBuild:
    substituteFrom:
      - kind: ConfigMap
        name: my-app-config
```

## Conclusion

Flux post-build substitution provides a straightforward way to manage environment-specific configuration without duplicating manifests or building complex overlay hierarchies. By defining your manifests once with variable placeholders and creating per-environment ConfigMaps and Secrets, you keep your repository organized and your deployments consistent. Adding a new environment becomes a matter of creating variable definitions rather than copying and modifying entire manifest trees.
