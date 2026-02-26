# How to Structure Helm Values for Multiple Environments in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Helm, Environment Management

Description: Practical patterns for organizing Helm values files across dev, staging, and production environments in ArgoCD with clear examples and best practices.

---

Managing Helm values across multiple environments is one of those things that seems simple until you have 10 services, each with 4 environments, and half the values are the same everywhere. The file structure you choose at the start determines whether environment management is easy or painful as you scale.

Here are the patterns that work well with ArgoCD, from simplest to most sophisticated.

## Pattern 1: Separate Values Files Per Environment

The most straightforward approach. One values file per environment, each containing the complete set of values.

```
charts/myapp/
  Chart.yaml
  templates/
  values.yaml                # Default values
  values-dev.yaml            # Dev overrides
  values-staging.yaml        # Staging overrides
  values-production.yaml     # Production overrides
```

ArgoCD Application for each environment:

```yaml
# Dev environment
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: myapp-dev
  namespace: argocd
spec:
  source:
    repoURL: https://github.com/org/repo.git
    targetRevision: main
    path: charts/myapp
    helm:
      valueFiles:
        - values.yaml
        - values-dev.yaml
  destination:
    server: https://kubernetes.default.svc
    namespace: myapp-dev
---
# Production environment
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: myapp-production
  namespace: argocd
spec:
  source:
    repoURL: https://github.com/org/repo.git
    targetRevision: main
    path: charts/myapp
    helm:
      valueFiles:
        - values.yaml
        - values-production.yaml
  destination:
    server: https://production-cluster:6443
    namespace: myapp
```

The environment-specific values file only contains overrides. Values not specified in the override file use the defaults from `values.yaml`.

Example files:

```yaml
# values.yaml (defaults - used by all environments)
replicaCount: 1
image:
  repository: myregistry.com/myapp
  tag: latest
  pullPolicy: IfNotPresent
service:
  type: ClusterIP
  port: 80
resources:
  requests:
    cpu: 100m
    memory: 128Mi
  limits:
    cpu: 500m
    memory: 512Mi
ingress:
  enabled: false
autoscaling:
  enabled: false
```

```yaml
# values-dev.yaml (dev overrides)
image:
  tag: dev-latest
  pullPolicy: Always
resources:
  requests:
    cpu: 50m
    memory: 64Mi
  limits:
    cpu: 200m
    memory: 256Mi
```

```yaml
# values-production.yaml (production overrides)
replicaCount: 3
image:
  tag: v1.2.3
resources:
  requests:
    cpu: 500m
    memory: 512Mi
  limits:
    cpu: "2"
    memory: 2Gi
ingress:
  enabled: true
  hosts:
    - host: myapp.example.com
      paths:
        - path: /
          pathType: Prefix
autoscaling:
  enabled: true
  minReplicas: 3
  maxReplicas: 10
  targetCPUUtilization: 70
```

**Pros:** Simple, everything is explicit, easy to diff between environments.
**Cons:** Some duplication if environments share many values.

## Pattern 2: Values in a Separate Config Repository

Keep the Helm chart in one repository and the values files in a separate config repository. This allows you to update values without changing the chart.

```
# Chart repository
helm-charts/
  myapp/
    Chart.yaml
    templates/
    values.yaml

# Config repository (separate repo)
gitops-config/
  environments/
    dev/
      myapp-values.yaml
    staging/
      myapp-values.yaml
    production/
      myapp-values.yaml
```

ArgoCD Application using multiple sources:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: myapp-production
  namespace: argocd
spec:
  sources:
    - repoURL: https://github.com/org/helm-charts.git
      targetRevision: main
      path: myapp
      helm:
        valueFiles:
          - $values/environments/production/myapp-values.yaml
    - repoURL: https://github.com/org/gitops-config.git
      targetRevision: main
      ref: values
  destination:
    server: https://production-cluster:6443
    namespace: myapp
```

The `ref: values` creates a reference that can be used in `$values/` paths. This lets the chart and values live in different repositories.

**Pros:** Chart updates are independent from value changes. Different teams can own chart vs values.
**Cons:** More complex Application spec. Two repos to manage.

## Pattern 3: Layered Values with Common Base

For services with many environments that share most values, use a layered approach:

```
config/myapp/
  values-common.yaml       # Shared across ALL environments
  values-nonprod.yaml      # Shared by dev and staging
  values-prod.yaml         # Shared by production environments
  values-dev.yaml          # Dev-specific
  values-staging.yaml      # Staging-specific
  values-production-us.yaml    # US production specific
  values-production-eu.yaml    # EU production specific
```

ArgoCD Application with layered values:

```yaml
# US Production - layers: common + prod + production-us
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: myapp-production-us
spec:
  source:
    path: charts/myapp
    helm:
      valueFiles:
        - ../../config/myapp/values-common.yaml
        - ../../config/myapp/values-prod.yaml
        - ../../config/myapp/values-production-us.yaml
```

Values are merged in order, with later files overriding earlier ones. So `values-production-us.yaml` overrides `values-prod.yaml`, which overrides `values-common.yaml`.

Example layer content:

```yaml
# values-common.yaml - same for all environments
image:
  repository: myregistry.com/myapp
service:
  type: ClusterIP
  port: 80
healthCheck:
  path: /health
  initialDelaySeconds: 10

# values-prod.yaml - production base settings
replicaCount: 3
resources:
  requests:
    cpu: 500m
    memory: 512Mi
autoscaling:
  enabled: true
  minReplicas: 3
  maxReplicas: 10

# values-production-us.yaml - US-specific overrides
ingress:
  hosts:
    - host: myapp.us.example.com
autoscaling:
  maxReplicas: 20  # US has more traffic
```

**Pros:** Minimal duplication. Changes to common values propagate everywhere.
**Cons:** Harder to understand the final merged values. Debugging requires understanding the merge order.

## Pattern 4: ApplicationSet with Values Matrix

Use ApplicationSets to generate Applications for each environment automatically:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: myapp
  namespace: argocd
spec:
  generators:
    - list:
        elements:
          - environment: dev
            cluster: https://kubernetes.default.svc
            namespace: myapp-dev
            values_file: values-dev.yaml
          - environment: staging
            cluster: https://kubernetes.default.svc
            namespace: myapp-staging
            values_file: values-staging.yaml
          - environment: production
            cluster: https://production-cluster:6443
            namespace: myapp
            values_file: values-production.yaml
  template:
    metadata:
      name: 'myapp-{{environment}}'
    spec:
      source:
        repoURL: https://github.com/org/repo.git
        targetRevision: main
        path: charts/myapp
        helm:
          valueFiles:
            - values.yaml
            - '{{values_file}}'
      destination:
        server: '{{cluster}}'
        namespace: '{{namespace}}'
      syncPolicy:
        automated:
          prune: true
          selfHeal: true
```

**Pros:** Single definition generates all environments. Adding a new environment is one list entry.
**Cons:** All environments share the same sync policy and project settings.

## Pattern 5: Inline Values for Small Overrides

For small differences between environments, use inline values in the Application spec instead of separate files:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: myapp-dev
spec:
  source:
    path: charts/myapp
    helm:
      valueFiles:
        - values.yaml
      # Inline overrides for small differences
      values: |
        image:
          tag: dev-latest
        replicaCount: 1
        resources:
          requests:
            cpu: 50m
```

**Pros:** No extra files for minor differences.
**Cons:** Values are in the Application spec, not in the chart repo. Inline values override file values, which can be confusing.

## Best Practices

### Keep Environment Differences Minimal

The more your environments differ, the less useful testing in staging becomes. Aim for identical configuration with only these differences:

- Image tag
- Replica count
- Resource requests/limits
- Ingress hostnames
- Feature flags
- External service URLs

### Use Helm Schema Validation

Add a `values.schema.json` to validate values across all environments:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["image", "service"],
  "properties": {
    "replicaCount": {
      "type": "integer",
      "minimum": 1
    },
    "image": {
      "type": "object",
      "required": ["repository", "tag"],
      "properties": {
        "repository": { "type": "string" },
        "tag": { "type": "string" }
      }
    }
  }
}
```

### Promote Changes Through Environments

Use your CI pipeline to promote changes from dev to staging to production:

```bash
# Promote staging image tag to production
STAGING_TAG=$(yq '.image.tag' config/myapp/values-staging.yaml)
yq -i ".image.tag = \"$STAGING_TAG\"" config/myapp/values-production.yaml
git commit -am "Promote myapp $STAGING_TAG to production"
```

### Document the Merge Order

If you use layered values, document which files are used for each environment and in what order. Future maintainers will thank you.

## My Recommendation

For most teams, **Pattern 1** (separate values files per environment) is the right starting point. It is simple, explicit, and easy to understand. Move to Pattern 3 (layered values) only when you have many environments with significant overlap.

If you have a separate platform team managing the chart and service teams managing values, use Pattern 2 (separate config repository).

If you manage many services across many environments, Pattern 4 (ApplicationSet) reduces boilerplate.

The most important thing is consistency. Pick a pattern and use it for all services. Mixing patterns across services creates confusion and makes it harder to automate environment management.
