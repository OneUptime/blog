# How to Configure Image Automation Exclude Paths to Skip Directories in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Image-automation, Exclude-Paths, GitOps, Kubernetes

Description: Learn how to configure Flux ImageUpdateAutomation to exclude specific directories from image tag scanning and updates.

---

## Introduction

When Flux ImageUpdateAutomation scans a directory for image policy markers, it processes all YAML files within the specified path. Sometimes you want to scan a broad directory but exclude certain subdirectories from being updated. Common cases include excluding test environments, legacy applications, or directories managed by a different automation process.

This guide shows you how to use path exclusions and structural patterns to prevent Flux from updating image tags in specific directories.

## Prerequisites

- A Kubernetes cluster with Flux v2 installed
- The image-reflector-controller and image-automation-controller deployed
- A repository with multiple directories containing Kubernetes manifests
- ImagePolicies configured for your container images

## Understanding Flux Path Handling

The `update.path` field in ImageUpdateAutomation defines the root directory to scan. All YAML files within this path (recursively) are checked for image policy markers. Flux does not have a built-in `excludePaths` field, so you need to use alternative strategies to achieve path exclusion.

## Strategy 1: Use Narrow Include Paths

Instead of excluding directories, narrow your include path to cover only the directories you want:

```yaml
# Instead of scanning ./clusters/production and excluding ./clusters/production/legacy
# Use a more specific path:
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageUpdateAutomation
metadata:
  name: production-updates
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: my-repo
  git:
    checkout:
      ref:
        branch: main
    commit:
      author:
        name: Flux Bot
        email: flux@example.com
      messageTemplate: "chore: update production images"
    push:
      branch: main
  update:
    path: ./clusters/production/apps
    strategy: Setters
```

By pointing to `./clusters/production/apps` instead of `./clusters/production`, you naturally exclude `./clusters/production/legacy` and `./clusters/production/infrastructure`.

## Strategy 2: Multiple Automations for Included Paths

When you need to include multiple non-contiguous directories while excluding others, create separate automation resources:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageUpdateAutomation
metadata:
  name: production-apps-updates
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: my-repo
  git:
    checkout:
      ref:
        branch: main
    commit:
      author:
        name: Flux Bot
        email: flux@example.com
      messageTemplate: "chore: update production app images"
    push:
      branch: main
  update:
    path: ./clusters/production/apps
    strategy: Setters
---
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageUpdateAutomation
metadata:
  name: production-monitoring-updates
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: my-repo
  git:
    checkout:
      ref:
        branch: main
    commit:
      author:
        name: Flux Bot
        email: flux@example.com
      messageTemplate: "chore: update production monitoring images"
    push:
      branch: main
  update:
    path: ./clusters/production/monitoring
    strategy: Setters
```

This effectively includes `apps/` and `monitoring/` while excluding everything else under `clusters/production/`.

## Strategy 3: Remove Image Policy Markers from Excluded Files

The most direct way to prevent image updates in specific files is to not add the image policy marker comment. If a deployment file does not contain the `# {"$imagepolicy": "..."}` marker, the automation will skip it regardless of which directory it is in:

```yaml
# This deployment WILL be updated (has marker)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
spec:
  template:
    spec:
      containers:
        - name: api
          image: myorg/api:1.2.3 # {"$imagepolicy": "flux-system:api"}

---
# This deployment will NOT be updated (no marker)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: legacy-app
spec:
  template:
    spec:
      containers:
        - name: legacy-app
          image: myorg/legacy-app:0.9.0
```

## Strategy 4: Separate Repositories

For strong isolation between automated and non-automated content, use separate Git repositories:

```yaml
# Repository for automated deployments
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: automated-apps
  namespace: flux-system
spec:
  url: ssh://git@github.com/myorg/automated-apps.git
  ref:
    branch: main
---
# ImageUpdateAutomation for automated apps only
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageUpdateAutomation
metadata:
  name: app-updates
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: automated-apps
  git:
    checkout:
      ref:
        branch: main
    commit:
      author:
        name: Flux Bot
        email: flux@example.com
      messageTemplate: "chore: update images"
    push:
      branch: main
  update:
    path: ./
    strategy: Setters
```

Content in other repositories is completely excluded from this automation.

## Strategy 5: Directory Structure Design

Design your repository structure to make path inclusion simple:

```text
clusters/
  production/
    automated/           # Scanned by image automation
      api/
      web/
      worker/
    manual/              # Not scanned
      legacy-app/
      third-party/
    infrastructure/      # Separate automation or not scanned
      monitoring/
      ingress/
```

```yaml
spec:
  update:
    path: ./clusters/production/automated
    strategy: Setters
```

## Practical Example: Excluding Test Fixtures

If your repository contains test fixtures with image references that should not be updated:

```text
clusters/
  production/
    apps/
      api/
        deployment.yaml      # Should be updated
        test-fixtures/
          test-deployment.yaml  # Should NOT be updated
```

Move the automation path to be more specific, or remove markers from test files:

```yaml
# test-fixtures/test-deployment.yaml - no marker comment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: test-api
spec:
  template:
    spec:
      containers:
        - name: api
          image: myorg/api:1.0.0-test
```

## Verifying Exclusions

After configuring your automation, verify which files are being scanned by checking the commit output:

```bash
flux get image update production-apps-updates
git log --author="Flux Bot" -1 --stat
```

The `--stat` flag shows which files were modified by the last automated commit.

## Conclusion

While Flux ImageUpdateAutomation does not have a built-in exclude paths feature, you can effectively exclude directories through several strategies: narrowing include paths, creating multiple automation resources, removing image policy markers, separating repositories, or designing your directory structure for clean path boundaries. The best approach depends on your repository structure and how many directories need to be excluded. For most cases, narrowing the include path or using multiple automation resources provides the cleanest solution.
