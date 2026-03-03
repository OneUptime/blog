# What's the Best Git Repo Structure for ArgoCD?

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Best Practices

Description: Compare different Git repository structures for ArgoCD deployments including monorepo, polyrepo, and hybrid approaches with practical recommendations.

---

This is one of the most debated topics in the GitOps community, and the answer depends on your team size, the number of services you manage, and how much separation you need between application code and deployment configuration. Let me break down the three main approaches and when to use each one.

## The Three Main Approaches

### Approach 1: Single Monorepo for Everything

All application code and Kubernetes manifests live in one repository.

```text
monorepo/
  services/
    api/
      src/
      Dockerfile
      k8s/
        base/
          deployment.yaml
          service.yaml
          kustomization.yaml
        overlays/
          dev/
            kustomization.yaml
          staging/
            kustomization.yaml
          production/
            kustomization.yaml
    frontend/
      src/
      Dockerfile
      k8s/
        base/
        overlays/
    worker/
      src/
      Dockerfile
      k8s/
  infrastructure/
    argocd/
    monitoring/
    cert-manager/
```

**Pros:**
- One place to look for everything
- Easy cross-service changes in a single PR
- Simple CI/CD - everything triggers from the same repo
- Good for small teams (under 10 engineers)

**Cons:**
- Gets unwieldy as the repo grows
- CI triggers on every change, even unrelated ones
- Deployment permissions are all-or-nothing (everyone who can push code can change k8s manifests)
- Git history becomes noisy

### Approach 2: Separate App and Config Repos (Recommended for Most Teams)

Application code and Kubernetes manifests live in separate repositories.

```text
# Repo 1: Application code (one per service or monorepo)
api-service/
  src/
  Dockerfile
  tests/

# Repo 2: GitOps config repo
gitops-config/
  apps/
    api/
      base/
        deployment.yaml
        service.yaml
        kustomization.yaml
      overlays/
        dev/
          kustomization.yaml
          patches.yaml
        staging/
          kustomization.yaml
        production/
          kustomization.yaml
    frontend/
      base/
      overlays/
    worker/
      base/
      overlays/
  infrastructure/
    argocd-apps/
      api.yaml
      frontend.yaml
      worker.yaml
    monitoring/
    cert-manager/
  clusters/
    dev/
    staging/
    production/
```

**Pros:**
- Clear separation of concerns
- Different access controls for code vs infrastructure
- Clean Git history for deployment changes
- ArgoCD only watches the config repo, so no noise from code changes
- Security team can review config changes separately

**Cons:**
- Two repos to manage per service
- CI/CD needs to update the config repo after building images
- Slight complexity in the CI pipeline

### Approach 3: Per-Service Config Repos

Each service has its own config repository alongside its code repository.

```text
# Service A code
service-a-code/
  src/
  Dockerfile

# Service A config
service-a-config/
  base/
  overlays/

# Service B code
service-b-code/
  src/
  Dockerfile

# Service B config
service-b-config/
  base/
  overlays/
```

**Pros:**
- Maximum isolation between services
- Teams fully own their deployment config
- Independent release cycles

**Cons:**
- Repository sprawl - 2N repos for N services
- Hard to make cross-cutting changes (updating a label across all services)
- Difficult to enforce standards across repos

## My Recommendation

For most teams, **Approach 2** (separate app and config repos) is the best balance. Here is a more detailed layout of what I recommend:

```text
gitops-config/
  # ArgoCD Application definitions (managed by platform team)
  argocd/
    applications/
      dev/
        api.yaml
        frontend.yaml
        worker.yaml
      staging/
        api.yaml
        frontend.yaml
        worker.yaml
      production/
        api.yaml
        frontend.yaml
        worker.yaml
    projects/
      dev-project.yaml
      staging-project.yaml
      production-project.yaml
    appsets/
      # ApplicationSets for auto-discovery
      dev-apps.yaml
      production-apps.yaml

  # Service manifests (managed by service teams)
  services/
    api/
      base/
        deployment.yaml
        service.yaml
        hpa.yaml
        kustomization.yaml
      overlays/
        dev/
          kustomization.yaml
          replicas-patch.yaml
        staging/
          kustomization.yaml
        production/
          kustomization.yaml
          replicas-patch.yaml
          resources-patch.yaml

  # Shared infrastructure (managed by platform team)
  infrastructure/
    monitoring/
      base/
      overlays/
    ingress/
      base/
      overlays/
    namespaces/
```

## Using ApplicationSets for Auto-Discovery

Instead of manually creating Application resources for each service and environment, use ApplicationSets with Git generators:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: production-services
  namespace: argocd
spec:
  generators:
    - git:
        repoURL: https://github.com/org/gitops-config.git
        revision: main
        directories:
          - path: services/*/overlays/production
  template:
    metadata:
      name: 'prod-{{path[1]}}'
    spec:
      project: production
      source:
        repoURL: https://github.com/org/gitops-config.git
        targetRevision: main
        path: '{{path}}'
      destination:
        server: https://production-cluster:6443
        namespace: '{{path[1]}}'
      syncPolicy:
        automated:
          prune: true
          selfHeal: true
```

When a team adds a new service directory under `services/`, the ApplicationSet automatically creates an ArgoCD Application for it. No manual intervention needed.

## CI/CD Pipeline Integration

The CI pipeline in the application code repo updates the config repo after building a new image:

```yaml
# GitHub Actions example in the application code repo
name: Build and Deploy
on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build and Push Image
        run: |
          docker build -t registry.example.com/api:${{ github.sha }} .
          docker push registry.example.com/api:${{ github.sha }}

      - name: Update GitOps Config
        run: |
          # Clone the config repo
          git clone https://x-access-token:${{ secrets.CONFIG_REPO_TOKEN }}@github.com/org/gitops-config.git
          cd gitops-config

          # Update the image tag in the appropriate overlay
          cd services/api/overlays/dev
          kustomize edit set image registry.example.com/api=registry.example.com/api:${{ github.sha }}

          # Commit and push
          git add .
          git commit -m "Update api image to ${{ github.sha }}"
          git push
```

ArgoCD detects the commit in the config repo and deploys the new image.

## Branch Strategy for the Config Repo

Some teams use branch-per-environment (separate branches for dev, staging, production). I recommend against this. Use directories instead.

**Branch-per-environment (not recommended):**
- `main` branch = production
- `staging` branch = staging
- `dev` branch = dev

This creates merge confusion and makes it hard to promote changes across environments.

**Directory-per-environment (recommended):**
- `main` branch with `overlays/dev/`, `overlays/staging/`, `overlays/production/`
- Promotion is done by copying or patching values between overlays
- All environments visible in a single PR

## Handling Multiple Clusters

If you have multiple clusters per environment (regional clusters, disaster recovery), extend the structure:

```text
services/
  api/
    base/
    overlays/
      production-us-east/
      production-us-west/
      production-eu-west/
```

Or use ApplicationSets with cluster generators:

```yaml
generators:
  - matrix:
      generators:
        - git:
            directories:
              - path: services/*/overlays/production
        - clusters:
            selector:
              matchLabels:
                env: production
```

## Key Principles

1. **Separate application code from deployment config** - Different change rates, different reviewers
2. **Use Kustomize overlays** for environment differences - Base manifests shared, overlays for environment-specific settings
3. **Automate Application discovery** with ApplicationSets - No manual creation of Application resources
4. **Use directories, not branches** for environments - Easier to review, promote, and reason about
5. **Keep infrastructure separate from services** - Different ownership, different change patterns

The "best" repo structure is the one your team can maintain consistently. Start with the separate config repo approach, use Kustomize for environment management, and let ApplicationSets handle the Application lifecycle. You can always restructure later as your needs evolve.
