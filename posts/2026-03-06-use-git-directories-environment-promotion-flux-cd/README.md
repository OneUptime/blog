# How to Use Git Directories for Environment Promotion with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Directory-based promotion, Environment Management, Kustomize

Description: Learn how to use directory-based promotion to manage environment progression in Flux CD, keeping all environments visible on a single branch.

---

## Introduction

Directory-based environment promotion is a strategy where each environment has its own directory within a single Git branch. Promoting a change means copying or updating manifests from one directory to another. This approach avoids the merge conflicts of branch-based promotion and gives you full visibility into all environments from a single branch.

This guide walks through implementing directory-based promotion with Flux CD, including repository layout, automation strategies, and practical examples.

## Why Directory-Based Promotion?

Compared to branch-based and tag-based approaches, directory-based promotion offers:

- All environments visible on one branch, making it easy to compare configurations
- No merge conflicts since each environment has its own isolated directory
- Simple diffs to see what differs between environments
- Works with a single GitRepository resource in Flux
- Pull request reviews can show exactly what changes are being promoted

## Repository Structure

```text
fleet-repo/
├── base/
│   ├── kustomization.yaml
│   ├── deployment.yaml
│   ├── service.yaml
│   └── hpa.yaml
├── environments/
│   ├── development/
│   │   ├── kustomization.yaml
│   │   ├── deployment-patch.yaml
│   │   └── configmap.yaml
│   ├── staging/
│   │   ├── kustomization.yaml
│   │   ├── deployment-patch.yaml
│   │   └── configmap.yaml
│   └── production/
│       ├── kustomization.yaml
│       ├── deployment-patch.yaml
│       └── configmap.yaml
└── clusters/
    ├── dev-cluster/
    │   └── kustomization.yaml
    ├── staging-cluster/
    │   └── kustomization.yaml
    └── prod-cluster/
        └── kustomization.yaml
```

## Setting Up the Base Layer

The base layer contains shared manifests with default values.

```yaml
# base/kustomization.yaml
# Common resources shared by all environments
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - deployment.yaml
  - service.yaml
  - hpa.yaml
```

```yaml
# base/deployment.yaml
# Base deployment with default values
apiVersion: apps/v1
kind: Deployment
metadata:
  name: webapp
  labels:
    app: webapp
spec:
  replicas: 1
  selector:
    matchLabels:
      app: webapp
  template:
    metadata:
      labels:
        app: webapp
    spec:
      containers:
        - name: webapp
          image: myorg/webapp:latest
          ports:
            - containerPort: 3000
          envFrom:
            - configMapRef:
                name: webapp-config
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 200m
              memory: 256Mi
```

```yaml
# base/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: webapp
spec:
  selector:
    app: webapp
  ports:
    - port: 80
      targetPort: 3000
```

## Configuring Environment Directories

Each environment directory contains a Kustomize overlay that references the base and applies environment-specific patches.

```yaml
# environments/development/kustomization.yaml
# Development environment overlay
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base
  - configmap.yaml
patches:
  - path: deployment-patch.yaml
namespace: development
```

```yaml
# environments/development/deployment-patch.yaml
# Development: latest image, minimal replicas, debug mode
apiVersion: apps/v1
kind: Deployment
metadata:
  name: webapp
spec:
  replicas: 1
  template:
    spec:
      containers:
        - name: webapp
          image: myorg/webapp:v2.5.0-dev
          resources:
            requests:
              cpu: 50m
              memory: 64Mi
            limits:
              cpu: 100m
              memory: 128Mi
```

```yaml
# environments/development/configmap.yaml
# Development configuration values
apiVersion: v1
kind: ConfigMap
metadata:
  name: webapp-config
data:
  LOG_LEVEL: "debug"
  API_URL: "https://api.dev.example.com"
  FEATURE_FLAGS: "experimental=true"
  ENVIRONMENT: "development"
```

```yaml
# environments/staging/kustomization.yaml
# Staging environment overlay
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base
  - configmap.yaml
patches:
  - path: deployment-patch.yaml
namespace: staging
```

```yaml
# environments/staging/deployment-patch.yaml
# Staging: pinned version, moderate replicas
apiVersion: apps/v1
kind: Deployment
metadata:
  name: webapp
spec:
  replicas: 3
  template:
    spec:
      containers:
        - name: webapp
          image: myorg/webapp:v2.4.0
          resources:
            requests:
              cpu: 200m
              memory: 256Mi
            limits:
              cpu: 400m
              memory: 512Mi
```

```yaml
# environments/staging/configmap.yaml
# Staging configuration values
apiVersion: v1
kind: ConfigMap
metadata:
  name: webapp-config
data:
  LOG_LEVEL: "info"
  API_URL: "https://api.staging.example.com"
  FEATURE_FLAGS: "experimental=false"
  ENVIRONMENT: "staging"
```

```yaml
# environments/production/deployment-patch.yaml
# Production: pinned stable version, full replicas, generous resources
apiVersion: apps/v1
kind: Deployment
metadata:
  name: webapp
spec:
  replicas: 8
  template:
    spec:
      containers:
        - name: webapp
          image: myorg/webapp:v2.3.0
          resources:
            requests:
              cpu: 500m
              memory: 512Mi
            limits:
              cpu: "1"
              memory: 1Gi
```

## Flux Configuration for Each Cluster

Each cluster points to its environment directory using a Flux Kustomization.

```yaml
# clusters/dev-cluster/kustomization.yaml
# Flux Kustomization for the development cluster
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: fleet-repo
  namespace: flux-system
spec:
  interval: 1m
  url: https://github.com/myorg/fleet-repo.git
  ref:
    branch: main
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: apps
  namespace: flux-system
spec:
  interval: 5m
  sourceRef:
    kind: GitRepository
    name: fleet-repo
  # Points to the development environment directory
  path: ./environments/development
  prune: true
  timeout: 3m
```

```yaml
# clusters/prod-cluster/kustomization.yaml
# Flux Kustomization for the production cluster
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: fleet-repo
  namespace: flux-system
spec:
  interval: 5m
  url: https://github.com/myorg/fleet-repo.git
  ref:
    branch: main
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: apps
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: fleet-repo
  # Points to the production environment directory
  path: ./environments/production
  prune: true
  timeout: 10m
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: webapp
      namespace: production
```

## The Promotion Workflow

### Step 1: Update Development

```bash
# Update the image version in the development environment
# Edit environments/development/deployment-patch.yaml
git checkout main
git add environments/development/deployment-patch.yaml
git commit -m "Deploy webapp v2.5.0-dev to development"
git push origin main
```

### Step 2: Promote to Staging

Promoting means updating the staging directory to match the desired state. This can be done manually or via a script.

```bash
# Manual promotion: copy the image version to staging
# Update environments/staging/deployment-patch.yaml with the new image

# Or use a promotion script
./scripts/promote.sh development staging
```

```bash
#!/bin/bash
# scripts/promote.sh
# Promotes the image version from one environment to another

SOURCE_ENV=$1
TARGET_ENV=$2

if [ -z "$SOURCE_ENV" ] || [ -z "$TARGET_ENV" ]; then
  echo "Usage: ./promote.sh <source-env> <target-env>"
  exit 1
fi

# Extract the image from the source environment patch
IMAGE=$(grep "image:" "environments/${SOURCE_ENV}/deployment-patch.yaml" | awk '{print $2}')

echo "Promoting image ${IMAGE} from ${SOURCE_ENV} to ${TARGET_ENV}"

# Update the image in the target environment patch
# Uses sed to replace the image line
sed -i "s|image: myorg/webapp:.*|image: ${IMAGE}|" \
  "environments/${TARGET_ENV}/deployment-patch.yaml"

echo "Updated environments/${TARGET_ENV}/deployment-patch.yaml"
echo "Review the changes and commit when ready"
```

### Step 3: Create a Promotion Pull Request

```bash
# Create a feature branch for the promotion
git checkout -b promote/webapp-v2.5.0-to-staging
git add environments/staging/deployment-patch.yaml
git commit -m "Promote webapp v2.5.0 from development to staging"
git push origin promote/webapp-v2.5.0-to-staging

# Create a PR for review
gh pr create \
  --base main \
  --title "Promote webapp v2.5.0 to staging" \
  --body "Promotes webapp v2.5.0 from development to staging after validation."
```

### Step 4: Promote to Production

Repeat the process for production after staging validation.

```bash
git checkout main
git pull
git checkout -b promote/webapp-v2.5.0-to-production
./scripts/promote.sh staging production
git add environments/production/deployment-patch.yaml
git commit -m "Promote webapp v2.5.0 from staging to production"
git push origin promote/webapp-v2.5.0-to-production

gh pr create \
  --base main \
  --title "Promote webapp v2.5.0 to production" \
  --body "Promotes webapp v2.5.0 from staging to production after staging validation."
```

## Comparing Environments

One of the key benefits is being able to compare environments easily.

```bash
# See what differs between staging and production
diff environments/staging/deployment-patch.yaml \
     environments/production/deployment-patch.yaml

# Full kustomize build comparison
diff <(kustomize build environments/staging) \
     <(kustomize build environments/production)

# Check image versions across all environments
grep "image:" environments/*/deployment-patch.yaml
```

## Automating Promotion with GitHub Actions

```yaml
# .github/workflows/promote.yaml
name: Environment Promotion
on:
  workflow_dispatch:
    inputs:
      source:
        description: "Source environment"
        required: true
        type: choice
        options: [development, staging]
      target:
        description: "Target environment"
        required: true
        type: choice
        options: [staging, production]

jobs:
  promote:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run promotion script
        run: ./scripts/promote.sh ${{ inputs.source }} ${{ inputs.target }}

      - name: Create promotion PR
        run: |
          BRANCH="promote/${{ inputs.source }}-to-${{ inputs.target }}-$(date +%s)"
          git checkout -b "$BRANCH"
          git add "environments/${{ inputs.target }}/"
          git commit -m "Promote from ${{ inputs.source }} to ${{ inputs.target }}"
          git push origin "$BRANCH"
          gh pr create \
            --base main \
            --title "Promote from ${{ inputs.source }} to ${{ inputs.target }}" \
            --body "Automated promotion from ${{ inputs.source }} to ${{ inputs.target }}"
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## Best Practices

### Keep Environment Patches Focused

Each environment's patch files should only contain the values that differ from the base. Avoid duplicating the entire manifest.

### Use a Promotion Script

Automate the promotion process to avoid human error. A script ensures that only the intended values are changed during promotion.

### Review Promotions via Pull Requests

Always use pull requests for promotions to staging and production. This creates an audit trail and allows team review.

### Version Pin in Production

Production should always use exact image tags, never floating tags like `latest` or branch-based tags.

## Conclusion

Directory-based environment promotion with Flux CD provides full visibility into all environments from a single branch. By keeping each environment in its own directory and using Kustomize overlays, you avoid merge conflicts while maintaining clear separation. Combined with promotion scripts and pull request workflows, this approach offers a practical and auditable path for moving changes through your deployment pipeline.
