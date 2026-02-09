# How to Build a GitOps Repository Structure for Multi-Cluster Multi-Environment Deployments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GitOps, Multi-Cluster, Kubernetes, Repository Structure, Best Practices

Description: Learn how to organize Git repositories for managing multiple Kubernetes clusters across different environments using GitOps principles and practical patterns.

---

Managing a single Kubernetes cluster with GitOps is straightforward. But what happens when you have development, staging, and production environments spread across multiple clusters in different regions? Your repository structure becomes critical. A well-designed structure reduces duplication, prevents errors, and makes deployments predictable.

This guide presents battle-tested patterns for organizing GitOps repositories at scale.

## The Multi-Cluster Challenge

Consider a typical enterprise setup:

- 3 environments: development, staging, production
- 2 regions per environment: us-east-1, eu-west-1
- Shared infrastructure components
- Application-specific configurations
- Environment-specific secrets and scaling

That's 6 clusters with overlapping but distinct configurations. Poor organization leads to duplicated YAML, configuration drift, and deployment accidents.

## Repository Structure Patterns

Three main patterns exist for multi-cluster GitOps. Each has tradeoffs.

### Pattern 1: Monorepo with Environment Overlays

Single repository containing all clusters and environments:

```
gitops-fleet/
├── base/
│   ├── apps/
│   │   ├── frontend/
│   │   │   ├── deployment.yaml
│   │   │   ├── service.yaml
│   │   │   └── kustomization.yaml
│   │   └── backend/
│   │       ├── deployment.yaml
│   │       ├── service.yaml
│   │       └── kustomization.yaml
│   └── infrastructure/
│       ├── ingress-nginx/
│       ├── cert-manager/
│       └── external-secrets/
├── environments/
│   ├── development/
│   │   ├── us-east-1/
│   │   │   ├── apps/
│   │   │   │   ├── frontend/
│   │   │   │   │   └── kustomization.yaml
│   │   │   │   └── backend/
│   │   │   │       └── kustomization.yaml
│   │   │   ├── infrastructure/
│   │   │   └── flux-system/
│   │   └── eu-west-1/
│   ├── staging/
│   │   ├── us-east-1/
│   │   └── eu-west-1/
│   └── production/
│       ├── us-east-1/
│       └── eu-west-1/
└── clusters/
    ├── dev-us-east-1/
    │   └── flux-system/
    ├── staging-us-east-1/
    │   └── flux-system/
    └── prod-us-east-1/
        └── flux-system/
```

Base definitions live in `base/`, environment-specific overlays in `environments/`, and cluster-specific Flux configurations in `clusters/`.

### Pattern 2: Repository per Environment

Separate repository for each environment:

```
gitops-development/
├── clusters/
│   ├── us-east-1/
│   └── eu-west-1/
├── apps/
└── infrastructure/

gitops-staging/
├── clusters/
│   ├── us-east-1/
│   └── eu-west-1/
├── apps/
└── infrastructure/

gitops-production/
├── clusters/
│   ├── us-east-1/
│   └── eu-west-1/
├── apps/
└── infrastructure/
```

Provides clear separation and access control. Promoting changes from dev to staging to production requires cross-repo workflows.

### Pattern 3: Hybrid Approach

Shared library repository plus environment repositories:

```
gitops-library/
├── apps/
│   ├── frontend/
│   └── backend/
└── infrastructure/
    ├── ingress/
    └── monitoring/

gitops-production/
├── clusters/
│   ├── us-east-1/
│   │   ├── apps.yaml
│   │   └── infrastructure.yaml
│   └── eu-west-1/
└── config/
    ├── values-us-east-1.yaml
    └── values-eu-west-1.yaml
```

Library repository contains base definitions. Environment repositories reference the library and add environment-specific config.

## Recommended Structure: Monorepo with Kustomize

For most organizations, the monorepo with Kustomize overlays provides the best balance. Here's a complete example:

```
fleet-gitops/
├── README.md
├── base/
│   ├── apps/
│   │   ├── api-server/
│   │   │   ├── deployment.yaml
│   │   │   ├── service.yaml
│   │   │   ├── configmap.yaml
│   │   │   └── kustomization.yaml
│   │   ├── web-frontend/
│   │   │   ├── deployment.yaml
│   │   │   ├── service.yaml
│   │   │   ├── ingress.yaml
│   │   │   └── kustomization.yaml
│   │   └── worker/
│   │       ├── deployment.yaml
│   │       └── kustomization.yaml
│   └── infrastructure/
│       ├── ingress-nginx/
│       │   ├── release.yaml
│       │   └── kustomization.yaml
│       ├── cert-manager/
│       │   ├── namespace.yaml
│       │   ├── crds.yaml
│       │   ├── release.yaml
│       │   └── kustomization.yaml
│       └── external-dns/
│           ├── deployment.yaml
│           ├── rbac.yaml
│           └── kustomization.yaml
├── clusters/
│   ├── dev-us-east-1/
│   │   ├── apps.yaml
│   │   ├── infrastructure.yaml
│   │   └── flux-system/
│   │       ├── gotk-components.yaml
│   │       ├── gotk-sync.yaml
│   │       └── kustomization.yaml
│   ├── staging-us-east-1/
│   │   ├── apps.yaml
│   │   ├── infrastructure.yaml
│   │   └── flux-system/
│   └── prod-us-east-1/
│       ├── apps.yaml
│       ├── infrastructure.yaml
│       └── flux-system/
└── overlays/
    ├── development/
    │   ├── api-server/
    │   │   ├── kustomization.yaml
    │   │   └── patches.yaml
    │   ├── web-frontend/
    │   │   ├── kustomization.yaml
    │   │   └── patches.yaml
    │   └── ingress-nginx/
    │       └── kustomization.yaml
    ├── staging/
    │   ├── api-server/
    │   │   ├── kustomization.yaml
    │   │   └── patches.yaml
    │   └── web-frontend/
    │       ├── kustomization.yaml
    │       └── patches.yaml
    └── production/
        ├── api-server/
        │   ├── kustomization.yaml
        │   ├── patches.yaml
        │   └── hpa.yaml
        └── web-frontend/
            ├── kustomization.yaml
            ├── patches.yaml
            └── hpa.yaml
```

## Base Application Definition

Define the core application in base:

```yaml
# base/apps/api-server/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
  labels:
    app: api-server
spec:
  replicas: 1  # Will be overridden per environment
  selector:
    matchLabels:
      app: api-server
  template:
    metadata:
      labels:
        app: api-server
    spec:
      containers:
      - name: api
        image: myregistry.io/api-server:latest  # Tag overridden per environment
        ports:
        - containerPort: 8080
        env:
        - name: LOG_LEVEL
          value: info
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "200m"
```

```yaml
# base/apps/api-server/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - deployment.yaml
  - service.yaml
  - configmap.yaml
```

## Environment Overlays

Override values for each environment:

```yaml
# overlays/production/api-server/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
namespace: production
bases:
  - ../../../base/apps/api-server
images:
  - name: myregistry.io/api-server
    newTag: v2.4.1  # Pin production to specific version
patches:
  - path: patches.yaml
resources:
  - hpa.yaml  # Add autoscaling in production
```

```yaml
# overlays/production/api-server/patches.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
spec:
  replicas: 5  # More replicas in production
  template:
    spec:
      containers:
      - name: api
        env:
        - name: LOG_LEVEL
          value: warn  # Less verbose logging
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
```

```yaml
# overlays/production/api-server/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-server
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-server
  minReplicas: 5
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

## Cluster-Level Flux Configuration

Each cluster has Flux Kustomizations pointing to overlays:

```yaml
# clusters/prod-us-east-1/infrastructure.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: infrastructure
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./base/infrastructure
  prune: true
  wait: true
```

```yaml
# clusters/prod-us-east-1/apps.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: production-apps
  namespace: flux-system
spec:
  interval: 5m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./overlays/production
  prune: true
  dependsOn:
    - name: infrastructure
```

## Handling Secrets

Never commit secrets to Git. Use sealed-secrets or external-secrets-operator:

```yaml
# base/apps/api-server/external-secret.yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: api-server-secrets
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: vault-backend
    kind: SecretStore
  target:
    name: api-server-secrets
  data:
  - secretKey: database-url
    remoteRef:
      key: production/api-server/database-url
  - secretKey: api-key
    remoteRef:
      key: production/api-server/api-key
```

Different clusters reference different secret paths based on environment.

## Region-Specific Configuration

Handle region-specific values with Kustomize components:

```yaml
# overlays/production/regions/us-east-1/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
bases:
  - ../../api-server
patches:
  - target:
      kind: Deployment
      name: api-server
    patch: |-
      - op: add
        path: /spec/template/spec/containers/0/env/-
        value:
          name: AWS_REGION
          value: us-east-1
      - op: add
        path: /spec/template/spec/containers/0/env/-
        value:
          name: S3_BUCKET
          value: myapp-prod-us-east-1
```

## Promotion Strategy

To promote changes from development to production:

1. **Commit to base or dev overlay**: Test in development clusters
2. **Verify reconciliation**: Ensure Flux applies changes successfully
3. **Update staging overlay**: Copy or reference changes
4. **Test in staging**: Run integration tests
5. **Update production overlay**: Pin to tested versions
6. **Monitor rollout**: Watch production clusters

Use pull requests for production changes with required approvals.

## Directory Naming Conventions

Maintain consistency:

- **Environments**: `development`, `staging`, `production` (full names, not abbreviations)
- **Regions**: Use cloud provider convention (`us-east-1`, not `us-e1`)
- **Clusters**: `{environment}-{region}` format (`prod-us-east-1`)
- **Applications**: Lowercase with hyphens (`api-server`, not `apiServer` or `api_server`)

## Documentation

Include a README at the repository root:

```markdown
# Fleet GitOps Repository

## Structure
- `base/`: Base resource definitions
- `overlays/`: Environment-specific customizations
- `clusters/`: Cluster-specific Flux configurations

## Clusters
- dev-us-east-1: Development cluster in US East
- staging-us-east-1: Staging cluster in US East
- prod-us-east-1: Production cluster in US East
- prod-eu-west-1: Production cluster in EU West

## Making Changes
1. Edit base or overlay
2. Commit to feature branch
3. Open pull request
4. After approval, Flux syncs automatically

## Emergency Rollback
```bash
git revert <commit-hash>
git push origin main
```
```

## Testing Your Structure

Validate before pushing to production:

```bash
# Test Kustomize builds
kustomize build overlays/production/api-server

# Dry run
kubectl apply --dry-run=server -k overlays/production/api-server

# Validate with kubeval
kustomize build overlays/production | kubeval
```

## Conclusion

A well-structured GitOps repository is the foundation for reliable multi-cluster deployments. Use Kustomize overlays to reduce duplication while keeping environment-specific configurations clear. Organize by environment and region for scalability. Document your structure and establish promotion workflows. With these patterns, managing dozens of clusters becomes straightforward and predictable.
