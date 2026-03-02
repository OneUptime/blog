# How to Use Git File Generator Globbing Patterns in ArgoCD ApplicationSets

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, ApplicationSet, File Patterns

Description: Learn how to use globbing patterns in the ArgoCD ApplicationSet Git file generator to match config files across directories and subdirectories.

---

The Git file generator in ArgoCD ApplicationSets uses globbing patterns to find configuration files in your Git repository. Getting these patterns right is the difference between discovering all your config files and missing half of them. Understanding glob syntax, recursive matching, and exclusion patterns ensures your ApplicationSet finds exactly the files you intend.

This guide covers glob pattern syntax, common patterns, edge cases, and debugging techniques for the Git file generator.

## Glob Pattern Basics

The Git file generator's `path` field uses Go's `filepath.Match` style globbing with an extension for recursive directory matching (`**`). Here are the fundamental patterns.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: glob-examples
  namespace: argocd
spec:
  generators:
    - git:
        repoURL: https://github.com/myorg/configs.git
        revision: HEAD
        files:
          # Match all JSON files in the apps directory (not recursive)
          - path: 'apps/*.json'
  template:
    metadata:
      name: '{{app_name}}'
    spec:
      project: default
      source:
        repoURL: https://github.com/myorg/apps.git
        targetRevision: HEAD
        path: '{{deploy_path}}'
      destination:
        server: https://kubernetes.default.svc
        namespace: '{{namespace}}'
```

## Common Glob Patterns

Here is a reference of the most useful patterns and what they match.

```yaml
# Single directory level - matches apps/frontend.json, apps/backend.json
- path: 'apps/*.json'

# Recursive - matches apps/frontend/config.json, apps/team-a/frontend/config.json
- path: 'apps/**/config.json'

# Single character wildcard - matches apps/app1.json, apps/app2.json
- path: 'apps/app?.json'

# Character class - matches apps/dev.json, apps/stg.json (not apps/prod.json)
- path: 'apps/[ds]*.json'

# Any subdirectory, one level deep - matches envs/dev/config.json
- path: 'envs/*/config.json'

# Any number of subdirectory levels
- path: 'envs/**/config.json'

# All JSON files anywhere in the repo
- path: '**/*.json'
```

## Practical Pattern: Flat Config Directory

The simplest structure - all configs in one directory.

```
configs/
  frontend.json
  backend.json
  worker.json
  database.json
```

```yaml
generators:
  - git:
      repoURL: https://github.com/myorg/configs.git
      revision: HEAD
      files:
        - path: 'configs/*.json'
```

This matches all four files. It does NOT match files in subdirectories like `configs/v2/frontend.json`.

## Practical Pattern: Categorized Config Directories

Organize configs into categories.

```
configs/
  infrastructure/
    cert-manager.json
    external-dns.json
  applications/
    frontend.json
    backend.json
  monitoring/
    prometheus.json
    grafana.json
```

To match all categories:

```yaml
generators:
  - git:
      repoURL: https://github.com/myorg/configs.git
      revision: HEAD
      files:
        # Match JSON files one level deep in configs/
        - path: 'configs/*/*.json'
```

Or match a specific category:

```yaml
generators:
  - git:
      repoURL: https://github.com/myorg/configs.git
      revision: HEAD
      files:
        - path: 'configs/applications/*.json'
```

## Practical Pattern: Per-Environment Configs

Environment-specific config files in a structured tree.

```
environments/
  dev/
    us-east-1/
      frontend.json
      backend.json
    eu-west-1/
      frontend.json
      backend.json
  staging/
    us-east-1/
      frontend.json
      backend.json
  production/
    us-east-1/
      frontend.json
      backend.json
    us-west-2/
      frontend.json
      backend.json
    eu-west-1/
      frontend.json
      backend.json
```

Match all environments and regions:

```yaml
generators:
  - git:
      repoURL: https://github.com/myorg/configs.git
      revision: HEAD
      files:
        # Recursive glob - matches all JSON files under environments/
        - path: 'environments/**/*.json'
```

Match only production configs:

```yaml
generators:
  - git:
      repoURL: https://github.com/myorg/configs.git
      revision: HEAD
      files:
        - path: 'environments/production/**/*.json'
```

Match configs for a specific region across all environments:

```yaml
generators:
  - git:
      repoURL: https://github.com/myorg/configs.git
      revision: HEAD
      files:
        - path: 'environments/*/us-east-1/*.json'
```

## Multiple Path Patterns

You can specify multiple file patterns. The generator produces a union of all matches.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: multi-pattern-apps
  namespace: argocd
spec:
  generators:
    - git:
        repoURL: https://github.com/myorg/configs.git
        revision: HEAD
        files:
          # Match infrastructure configs
          - path: 'infrastructure/*.json'
          # Also match application configs
          - path: 'applications/**/*.json'
          # Also match a specific shared config
          - path: 'shared/monitoring.json'
  template:
    metadata:
      name: '{{app_name}}'
    spec:
      project: '{{project}}'
      source:
        repoURL: '{{source_repo}}'
        targetRevision: HEAD
        path: '{{deploy_path}}'
      destination:
        server: https://kubernetes.default.svc
        namespace: '{{namespace}}'
```

## Excluding Paths

The Git file generator also supports exclude patterns to filter out specific matches.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: exclude-pattern-apps
  namespace: argocd
spec:
  generators:
    - git:
        repoURL: https://github.com/myorg/configs.git
        revision: HEAD
        files:
          # Include all JSON files under apps/
          - path: 'apps/**/*.json'
          # Exclude test and example configs
          - path: 'apps/**/test-*.json'
            exclude: true
          - path: 'apps/**/example-*.json'
            exclude: true
          - path: 'apps/_templates/*.json'
            exclude: true
  template:
    metadata:
      name: '{{app_name}}'
    spec:
      project: default
      source:
        repoURL: '{{source_repo}}'
        targetRevision: HEAD
        path: '{{deploy_path}}'
      destination:
        server: https://kubernetes.default.svc
        namespace: '{{namespace}}'
```

This includes all JSON files in `apps/` but excludes files starting with `test-` or `example-` and anything in the `_templates` directory.

## Named Config Files Pattern

Instead of using directory names, use a consistent filename pattern.

```
services/
  frontend/
    argocd-config.json
    README.md
    Dockerfile
  backend/
    argocd-config.json
    README.md
    Dockerfile
  worker/
    argocd-config.json
    README.md
```

```yaml
generators:
  - git:
      repoURL: https://github.com/myorg/services.git
      revision: HEAD
      files:
        # Only match the specific config filename
        - path: 'services/*/argocd-config.json'
```

This precisely matches only the ArgoCD config files, ignoring other JSON files that might exist alongside them.

## Path Parameters in Templates

The Git file generator provides additional path-related parameters.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: path-aware-apps
  namespace: argocd
spec:
  goTemplate: true
  goTemplateOptions: ["missingkey=error"]
  generators:
    - git:
        repoURL: https://github.com/myorg/configs.git
        revision: HEAD
        files:
          - path: 'environments/*/apps/*.json'
  template:
    metadata:
      # The file parameters include path info
      # For environments/production/apps/frontend.json:
      # .path = environments/production/apps
      # .path.filename = frontend.json
      # .path.basename = frontend (without extension)
      # .path.basenameNormalized = frontend (DNS-safe)
      name: '{{.app_name}}-{{.env}}'
    spec:
      project: default
      source:
        repoURL: https://github.com/myorg/apps.git
        targetRevision: HEAD
        path: '{{.deploy_path}}'
      destination:
        server: https://kubernetes.default.svc
        namespace: '{{.namespace}}'
```

## Debugging Glob Patterns

When your glob pattern is not matching expected files, here are troubleshooting steps.

```bash
# Check the ApplicationSet controller logs for file discovery
kubectl logs -n argocd \
  -l app.kubernetes.io/name=argocd-applicationset-controller \
  --tail=100 | grep -i "file\|glob\|match\|discover"

# Verify the ApplicationSet status
kubectl describe applicationset glob-examples -n argocd

# Check how many applications were generated
argocd appset get glob-examples

# Test glob patterns locally with find (approximate)
# Note: Go glob and shell glob have slight differences
find . -path './apps/*.json'
find . -path './apps/**/*.json'
```

Common gotchas:
- `*.json` only matches the current directory level, not subdirectories
- `**` must be used for recursive matching
- Leading slashes are not needed (paths are relative to repo root)
- The glob pattern matches the full path from the repo root

Mastering glob patterns gives you precise control over which configuration files drive your ApplicationSet generation. Combined with exclude patterns and multiple path entries, you can build flexible file discovery that scales with your organization. For monitoring applications generated through your glob-matched configs, [OneUptime](https://oneuptime.com/blog/post/2026-02-26-argocd-applicationset-git-file-json/view) provides centralized health and sync tracking.
