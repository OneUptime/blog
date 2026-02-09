# How to implement Kustomize overlays for environment-specific configurations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Kustomize, DevOps

Description: Master Kustomize overlays to manage environment-specific configurations across development, staging, and production without duplicating YAML manifests.

---

Kustomize overlays provide a powerful pattern for managing environment-specific configurations without duplicating base manifests. Instead of maintaining separate YAML files for each environment, you define a base configuration once and apply environment-specific modifications through overlays. This approach reduces maintenance burden and ensures consistency across environments.

## Understanding Kustomize overlays

Overlays are directories containing kustomization files that reference a base and apply patches or modifications. The base contains common configuration shared across all environments, while overlays add environment-specific settings like replica counts, resource limits, or ingress rules. When you build an overlay, Kustomize merges the base with the overlay's modifications.

This pattern follows the DRY principle by avoiding duplication while still allowing necessary differences between environments. Changes to common configuration happen once in the base and automatically propagate to all overlays.

## Basic directory structure

Here's a typical Kustomize overlay structure:

```
app/
├── base/
│   ├── deployment.yaml
│   ├── service.yaml
│   └── kustomization.yaml
├── overlays/
│   ├── development/
│   │   └── kustomization.yaml
│   ├── staging/
│   │   └── kustomization.yaml
│   └── production/
│       ├── kustomization.yaml
│       ├── replica-patch.yaml
│       └── ingress.yaml
```

The base defines core resources while each overlay customizes them for specific environments.

## Creating the base configuration

Define your base Kubernetes resources:

```yaml
# base/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
spec:
  replicas: 1
  selector:
    matchLabels:
      app: web-app
  template:
    metadata:
      labels:
        app: web-app
    spec:
      containers:
      - name: app
        image: myapp:latest
        ports:
        - containerPort: 8080
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "200m"
---
# base/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: web-app
spec:
  selector:
    app: web-app
  ports:
  - port: 80
    targetPort: 8080
---
# base/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
- deployment.yaml
- service.yaml

commonLabels:
  app: web-app
```

This base defines the minimal configuration needed across all environments.

## Development overlay

Create a development overlay with debug settings:

```yaml
# overlays/development/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: development

bases:
- ../../base

namePrefix: dev-

commonLabels:
  environment: development

images:
- name: myapp
  newTag: dev

patches:
- patch: |-
    - op: replace
      path: /spec/template/spec/containers/0/env
      value:
      - name: LOG_LEVEL
        value: debug
      - name: ENVIRONMENT
        value: development
  target:
    kind: Deployment
    name: web-app

configMapGenerator:
- name: app-config
  literals:
  - debug=true
  - db_host=dev-postgres.development.svc.cluster.local
```

Build and apply the development overlay:

```bash
kubectl apply -k overlays/development/
```

## Staging overlay

Create a staging overlay with moderate resources:

```yaml
# overlays/staging/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: staging

bases:
- ../../base

namePrefix: staging-

commonLabels:
  environment: staging

images:
- name: myapp
  newTag: v1.2.3-rc1

replicas:
- name: web-app
  count: 3

patches:
- patch: |-
    - op: replace
      path: /spec/template/spec/containers/0/resources
      value:
        requests:
          memory: "256Mi"
          cpu: "200m"
        limits:
          memory: "512Mi"
          cpu: "500m"
  target:
    kind: Deployment
    name: web-app

configMapGenerator:
- name: app-config
  literals:
  - debug=false
  - db_host=staging-postgres.staging.svc.cluster.local
  - replicas=3
```

Staging uses specific versions and increased resources for realistic testing.

## Production overlay

Create a production overlay with high availability settings:

```yaml
# overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: production

bases:
- ../../base

namePrefix: prod-

commonLabels:
  environment: production
  managed-by: kustomize

images:
- name: myapp
  newTag: v1.2.3

replicas:
- name: web-app
  count: 10

patchesStrategicMerge:
- replica-patch.yaml

resources:
- ingress.yaml

configMapGenerator:
- name: app-config
  literals:
  - debug=false
  - db_host=prod-postgres.production.svc.cluster.local
  - replicas=10
  - cache_enabled=true

secretGenerator:
- name: app-secrets
  envs:
  - secrets.env
```

The production replica patch:

```yaml
# overlays/production/replica-patch.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
spec:
  template:
    spec:
      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
          - labelSelector:
              matchExpressions:
              - key: app
                operator: In
                values:
                - web-app
            topologyKey: kubernetes.io/hostname
      containers:
      - name: app
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 5
```

Production ingress configuration:

```yaml
# overlays/production/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: web-app
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - app.example.com
    secretName: web-app-tls
  rules:
  - host: app.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: web-app
            port:
              number: 80
```

## Multi-region overlays

Create overlays for different geographic regions:

```yaml
# overlays/production-us-west/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: production

bases:
- ../production

nameSuffix: -us-west

commonLabels:
  region: us-west

patches:
- patch: |-
    - op: add
      path: /spec/template/spec/nodeSelector
      value:
        topology.kubernetes.io/region: us-west-2
  target:
    kind: Deployment
    name: web-app

configMapGenerator:
- name: app-config
  behavior: merge
  literals:
  - region=us-west
  - cdn_endpoint=https://cdn-us-west.example.com
```

This builds on the production overlay while adding region-specific configuration.

## Environment-specific HPA

Add horizontal pod autoscaling per environment:

```yaml
# overlays/production/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: web-app
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: web-app
  minReplicas: 10
  maxReplicas: 50
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

Add it to production kustomization:

```yaml
# overlays/production/kustomization.yaml
resources:
- ingress.yaml
- hpa.yaml
```

## Testing overlay builds

Build and preview each overlay without applying:

```bash
# Build development overlay
kustomize build overlays/development/

# Build staging overlay
kustomize build overlays/staging/

# Build production overlay
kustomize build overlays/production/

# Diff between environments
diff <(kustomize build overlays/staging/) <(kustomize build overlays/production/)

# Validate production build
kustomize build overlays/production/ | kubectl apply --dry-run=client -f -
```

## CI/CD integration

Use overlays in your deployment pipeline:

```yaml
# .github/workflows/deploy.yaml
name: Deploy

on:
  push:
    branches:
    - main
    - develop

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3

    - name: Deploy to Development
      if: github.ref == 'refs/heads/develop'
      run: |
        kubectl apply -k overlays/development/

    - name: Deploy to Production
      if: github.ref == 'refs/heads/main'
      run: |
        kubectl apply -k overlays/production/
```

## Advanced overlay patterns

Compose multiple overlays using bases:

```yaml
# overlays/production-debug/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

bases:
- ../production

patches:
- patch: |-
    - op: replace
      path: /spec/template/spec/containers/0/env/0/value
      value: debug
  target:
    kind: Deployment
    name: web-app
```

This creates a production environment with debug logging enabled.

## Managing overlay complexity

Keep overlays simple and focused:

```yaml
# overlays/production/kustomization.yaml - Good
bases:
- ../../base
resources:
- ingress.yaml
- hpa.yaml
patchesStrategicMerge:
- replica-patch.yaml
configMapGenerator:
- name: app-config
  literals:
  - env=production
```

Avoid deeply nested overlays that become hard to reason about.

## Validation and best practices

Validate your overlay structure:

```bash
# Check for common issues
kustomize build overlays/production/ | kubeval

# Validate resource names are unique
kustomize build overlays/production/ | grep "^  name:"

# Ensure all references resolve
kustomize build overlays/production/ > /dev/null && echo "Build successful"
```

Always test overlay changes in lower environments before production.

## Conclusion

Kustomize overlays provide a maintainable approach to managing environment-specific configurations. By defining common resources once in a base and customizing them through overlays, you reduce duplication and ensure consistency. Whether you need simple development versus production differences or complex multi-region deployments, overlays give you the flexibility to customize without sacrificing maintainability.
