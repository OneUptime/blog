# How to Implement ArgoCD Git Generator

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, CI/CD

Description: Use ArgoCD ApplicationSet Git generators to dynamically create applications from Git repository structure for multi-environment deployments.

---

Managing dozens of applications manually in ArgoCD gets painful fast. The Git generator solves this by automatically creating Applications based on your repository structure. Drop a new folder into your repo, and ArgoCD picks it up without any manual configuration.

## Why Use the Git Generator?

Traditional ArgoCD setup requires you to create an Application manifest for every service. With 50 microservices across 3 environments, that means 150 Application YAMLs to maintain.

The Git generator flips this around. You define a template once, and ArgoCD creates Applications automatically based on directory structure or configuration files in your Git repo.

| Approach | Applications to Maintain | Effort to Add New Service |
|----------|-------------------------|---------------------------|
| Manual Applications | N x Environments | Create new YAML for each env |
| Git Generator | 1 ApplicationSet | Create directory, done |

## Git Generator Types

ArgoCD provides two Git generator types:

| Generator Type | Use Case | Detects |
|----------------|----------|---------|
| Directory | Monorepo with service folders | New directories |
| File | Config-driven deployments | JSON/YAML config files |

## Git Directory Generator

The directory generator scans for folders matching a pattern and creates an Application for each match.

### Basic Directory Generator

This ApplicationSet creates one Application per directory under `services/`:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: services
  namespace: argocd
spec:
  generators:
    # The directory generator scans a Git repo for directories
    # matching the specified path pattern
    - git:
        repoURL: https://github.com/myorg/platform.git
        revision: HEAD
        directories:
          # Each directory under services/ becomes an Application
          - path: services/*
  template:
    metadata:
      # {{path.basename}} extracts the directory name
      # services/api -> api
      name: '{{path.basename}}'
    spec:
      project: default
      source:
        repoURL: https://github.com/myorg/platform.git
        targetRevision: HEAD
        # {{path}} contains the full matched path
        path: '{{path}}'
      destination:
        server: https://kubernetes.default.svc
        namespace: '{{path.basename}}'
      syncPolicy:
        automated:
          prune: true
          selfHeal: true
        syncOptions:
          - CreateNamespace=true
```

Given this repository structure:

```
platform/
├── services/
│   ├── api/
│   │   ├── deployment.yaml
│   │   └── service.yaml
│   ├── worker/
│   │   └── deployment.yaml
│   └── scheduler/
│       └── deployment.yaml
```

ArgoCD creates three Applications: `api`, `worker`, and `scheduler`.

### Template Variables for Directory Generator

| Variable | Description | Example |
|----------|-------------|---------|
| `{{path}}` | Full path to matched directory | `services/api` |
| `{{path.basename}}` | Directory name only | `api` |
| `{{path.basenameNormalized}}` | DNS-safe directory name | `my-api` |
| `{{path[n]}}` | Nth path segment (0-indexed) | `services` (n=0) |

### Nested Directory Structure

For multi-environment setups, use nested paths:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: services-by-env
  namespace: argocd
spec:
  generators:
    - git:
        repoURL: https://github.com/myorg/platform.git
        revision: HEAD
        directories:
          # Match pattern: environments/{env}/services/{service}
          - path: environments/*/services/*
  template:
    metadata:
      # Combine environment and service name
      # environments/prod/services/api -> prod-api
      name: '{{path[1]}}-{{path[3]}}'
    spec:
      project: default
      source:
        repoURL: https://github.com/myorg/platform.git
        targetRevision: HEAD
        path: '{{path}}'
      destination:
        server: https://kubernetes.default.svc
        namespace: '{{path[1]}}-{{path[3]}}'
```

## Path Filtering

Control which directories the generator matches using include and exclude patterns.

### Exclude Paths

Exclude specific directories from matching:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: services-no-deprecated
  namespace: argocd
spec:
  generators:
    - git:
        repoURL: https://github.com/myorg/platform.git
        revision: HEAD
        directories:
          # Match all services
          - path: services/*
          # But exclude deprecated ones
          - path: services/old-*
            exclude: true
          # And exclude the templates directory
          - path: services/templates
            exclude: true
  template:
    metadata:
      name: '{{path.basename}}'
    spec:
      project: default
      source:
        repoURL: https://github.com/myorg/platform.git
        targetRevision: HEAD
        path: '{{path}}'
      destination:
        server: https://kubernetes.default.svc
        namespace: '{{path.basename}}'
```

## Git File Generator

The file generator reads JSON or YAML files from your repository and uses their contents as template parameters.

### Basic File Generator

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: config-driven-apps
  namespace: argocd
spec:
  generators:
    - git:
        repoURL: https://github.com/myorg/app-configs.git
        revision: HEAD
        files:
          # Read all config.json files under apps/
          - path: apps/*/config.json
  template:
    metadata:
      # Values come from the JSON file
      name: '{{name}}'
    spec:
      project: '{{project}}'
      source:
        repoURL: '{{repoURL}}'
        targetRevision: '{{targetRevision}}'
        path: '{{path}}'
      destination:
        server: '{{cluster.server}}'
        namespace: '{{namespace}}'
```

Configuration file example (`apps/api/config.json`):

```json
{
  "name": "api-service",
  "project": "backend",
  "repoURL": "https://github.com/myorg/api.git",
  "targetRevision": "v2.1.0",
  "path": "k8s/production",
  "namespace": "api",
  "cluster": {
    "server": "https://kubernetes.default.svc"
  }
}
```

### YAML Configuration Files

Configuration file (`apps/api/app.yaml`):

```yaml
name: api-service
team: platform
tier: backend
project: default

source:
  repoURL: https://github.com/myorg/api.git
  revision: main
  path: helm/api
  valuesFile: values-prod.yaml

destination:
  server: https://kubernetes.default.svc
  namespace: api-prod
```

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: yaml-config-apps
  namespace: argocd
spec:
  generators:
    - git:
        repoURL: https://github.com/myorg/app-configs.git
        revision: HEAD
        files:
          - path: apps/*/app.yaml
  template:
    metadata:
      name: '{{name}}'
      labels:
        team: '{{team}}'
        tier: '{{tier}}'
    spec:
      project: '{{project}}'
      source:
        repoURL: '{{source.repoURL}}'
        targetRevision: '{{source.revision}}'
        path: '{{source.path}}'
      destination:
        server: '{{destination.server}}'
        namespace: '{{destination.namespace}}'
```

## Revision Selection

Control which Git revision the generator uses to scan for directories or files.

### Dynamic Revision per Environment

Use different revisions for different environments:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: env-specific-revision
  namespace: argocd
spec:
  generators:
    - git:
        repoURL: https://github.com/myorg/configs.git
        revision: HEAD
        files:
          - path: environments/*/config.yaml
  template:
    metadata:
      name: '{{name}}'
    spec:
      project: default
      source:
        repoURL: https://github.com/myorg/platform.git
        # Revision comes from the config file
        targetRevision: '{{targetRevision}}'
        path: '{{deployPath}}'
      destination:
        server: '{{clusterServer}}'
        namespace: '{{namespace}}'
```

Environment configs:

```yaml
# environments/dev/config.yaml
name: myapp-dev
targetRevision: main  # Always latest
deployPath: k8s/overlays/dev
clusterServer: https://kubernetes.default.svc
namespace: dev
```

```yaml
# environments/prod/config.yaml
name: myapp-prod
targetRevision: v2.1.0  # Pinned version
deployPath: k8s/overlays/prod
clusterServer: https://prod.example.com
namespace: prod
```

## Combining with Other Generators

Use matrix generators to combine Git generators with other generator types.

### Matrix Generator - Git x List

Deploy each service to multiple clusters:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: services-multi-cluster
  namespace: argocd
spec:
  generators:
    # Matrix combines two generators
    - matrix:
        generators:
          # First: Get all services from Git
          - git:
              repoURL: https://github.com/myorg/platform.git
              revision: HEAD
              directories:
                - path: services/*
          # Second: List of target clusters
          - list:
              elements:
                - cluster: us-east
                  server: https://us-east.example.com
                - cluster: us-west
                  server: https://us-west.example.com
                - cluster: eu-central
                  server: https://eu-central.example.com
  template:
    metadata:
      # Combination: api-us-east, api-us-west, etc.
      name: '{{path.basename}}-{{cluster}}'
    spec:
      project: default
      source:
        repoURL: https://github.com/myorg/platform.git
        targetRevision: HEAD
        path: '{{path}}'
      destination:
        server: '{{server}}'
        namespace: '{{path.basename}}'
```

### Matrix Generator - Git x Clusters

Deploy to all registered ArgoCD clusters:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: services-all-clusters
  namespace: argocd
spec:
  generators:
    - matrix:
        generators:
          - git:
              repoURL: https://github.com/myorg/platform.git
              revision: HEAD
              directories:
                - path: services/*
          # Cluster generator returns all registered clusters
          - clusters:
              selector:
                matchLabels:
                  environment: production
  template:
    metadata:
      name: '{{path.basename}}-{{name}}'
    spec:
      project: default
      source:
        repoURL: https://github.com/myorg/platform.git
        targetRevision: HEAD
        path: '{{path}}'
      destination:
        # {{server}} comes from cluster generator
        server: '{{server}}'
        namespace: '{{path.basename}}'
```

### Merge Generator

Override parameters for specific combinations:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: services-with-overrides
  namespace: argocd
spec:
  generators:
    - merge:
        # mergeKeys determines which fields identify a unique app
        mergeKeys:
          - path.basename
        generators:
          # Base generator - all services get these defaults
          - git:
              repoURL: https://github.com/myorg/platform.git
              revision: HEAD
              directories:
                - path: services/*
              values:
                replicas: "3"
                memory: "512Mi"
          # Override generator - specific services get custom values
          - list:
              elements:
                - path.basename: api
                  values.replicas: "10"
                  values.memory: "2Gi"
                - path.basename: worker
                  values.replicas: "20"
  template:
    metadata:
      name: '{{path.basename}}'
    spec:
      project: default
      source:
        repoURL: https://github.com/myorg/platform.git
        targetRevision: HEAD
        path: '{{path}}'
      destination:
        server: https://kubernetes.default.svc
        namespace: '{{path.basename}}'
```

## Handling Deletions

Control what happens when a directory is removed:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: services-with-deletion-policy
  namespace: argocd
spec:
  generators:
    - git:
        repoURL: https://github.com/myorg/platform.git
        revision: HEAD
        directories:
          - path: services/*
  # Controls ApplicationSet behavior
  syncPolicy:
    # Delete Applications when their directory is removed
    preserveResourcesOnDeletion: false
  template:
    metadata:
      name: '{{path.basename}}'
      # Add finalizer to ensure proper cleanup
      finalizers:
        - resources-finalizer.argocd.argoproj.io
    spec:
      project: default
      source:
        repoURL: https://github.com/myorg/platform.git
        targetRevision: HEAD
        path: '{{path}}'
      destination:
        server: https://kubernetes.default.svc
        namespace: '{{path.basename}}'
      syncPolicy:
        automated:
          prune: true
```

Warning: Setting `preserveResourcesOnDeletion: false` means removing a directory deletes all Kubernetes resources. Use with caution in production.

## Troubleshooting

### Application Not Created

Check that the path pattern matches:

```bash
# List what ArgoCD sees
argocd appset get services --output yaml

# Check ApplicationSet events
kubectl describe appset services -n argocd
```

### Wrong Template Variables

Verify variable values by adding debug annotations:

```yaml
template:
  metadata:
    name: '{{path.basename}}'
    annotations:
      debug-path: '{{path}}'
      debug-basename: '{{path.basename}}'
      debug-path-0: '{{path[0]}}'
```

### Sync Issues After Directory Rename

Renaming a directory creates a new Application (old name deleted, new name created). To preserve history:

1. Create the new directory
2. Wait for new Application to sync
3. Delete the old directory

---

The Git generator transforms ArgoCD from a tool you configure into a tool that configures itself. Start with directory generators for simple monorepo setups, then add file generators when you need more configuration flexibility. Combined with matrix generators, you can manage hundreds of applications with a single ApplicationSet.
