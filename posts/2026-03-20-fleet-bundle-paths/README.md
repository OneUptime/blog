# How to Customize Fleet Bundle Paths

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Fleet, GitOps, Rancher, Kubernetes, Bundles

Description: Learn how to customize Fleet bundle paths to control which directories in your Git repository are deployed as separate bundles to your Kubernetes clusters.

## Introduction

When Fleet processes a Git repository, each entry in the `paths` field of your GitRepo resource is scanned independently. That scanned path becomes a Bundle, and any subdirectory under it with its own `fleet.yaml` becomes a separate Bundle. Understanding bundle paths is key to building a clean, maintainable GitOps repository structure.

## Prerequisites

- Fleet installed in Rancher
- A Git repository with Kubernetes manifests
- `kubectl` access to Fleet manager

## How Fleet Discovers Bundles

Fleet traverses your repository starting from the specified paths. Each path in `spec.paths` is scanned independently, and Fleet looks for:
- Kubernetes YAML files (`.yaml` or `.yml`)
- A `fleet.yaml` file
- A `kustomization.yaml` file
- A `Chart.yaml` file (Helm chart)

Each subdirectory with its own `fleet.yaml` becomes a separate bundle. YAML files in nested directories without their own `fleet.yaml` stay in the bundle for the scanned path.

## Basic Path Configuration

### Deploy from Repository Root

```yaml
# gitrepo-root.yaml - Deploy all directories from root

apiVersion: fleet.cattle.io/v1alpha1
kind: GitRepo
metadata:
  name: my-app
  namespace: fleet-default
spec:
  repo: https://github.com/my-org/my-app
  branch: main
  # No paths specified - defaults to root "/"
  targets:
    - clusterSelector: {}
```

### Deploy from Specific Directories

```yaml
# gitrepo-paths.yaml - Deploy from specific paths only
apiVersion: fleet.cattle.io/v1alpha1
kind: GitRepo
metadata:
  name: platform-apps
  namespace: fleet-default
spec:
  repo: https://github.com/my-org/platform-configs
  branch: main

  # Only deploy from these directories
  paths:
    - apps/frontend
    - apps/backend
    - infrastructure/networking

  targets:
    - clusterSelector: {}
```

## Repository Structures for Different Use Cases

### Monorepo with Multiple Applications

```text
platform-configs/
├── apps/
│   ├── frontend/
│   │   ├── fleet.yaml          # Bundle: platform-configs-apps-frontend
│   │   ├── deployment.yaml
│   │   └── service.yaml
│   ├── backend/
│   │   ├── fleet.yaml          # Bundle: platform-configs-apps-backend
│   │   ├── deployment.yaml
│   │   └── service.yaml
│   └── database/
│       ├── fleet.yaml          # Bundle: platform-configs-apps-database
│       └── statefulset.yaml
└── infrastructure/
    ├── monitoring/
    │   ├── fleet.yaml          # Bundle: platform-configs-infrastructure-monitoring
    │   └── prometheus.yaml
    └── networking/
        ├── fleet.yaml          # Bundle: platform-configs-infrastructure-networking
        └── network-policy.yaml
```

```yaml
# gitrepo-monorepo.yaml
spec:
  repo: https://github.com/my-org/platform-configs
  branch: main
  paths:
    - apps
    - infrastructure
```

### Environment-Specific Paths

```text
k8s-configs/
├── base/                     # Common resources
│   ├── fleet.yaml
│   └── common-rbac.yaml
├── staging/
│   ├── frontend/
│   │   ├── fleet.yaml        # Staging frontend bundle
│   │   └── deployment.yaml
│   └── backend/
│       ├── fleet.yaml        # Staging backend bundle
│       └── deployment.yaml
└── production/
    ├── frontend/
    │   ├── fleet.yaml        # Production frontend bundle
    │   └── deployment.yaml
    └── backend/
        ├── fleet.yaml        # Production backend bundle
        └── deployment.yaml
```

```yaml
# gitrepo-environments.yaml
---
# Staging GitRepo - points to staging paths
apiVersion: fleet.cattle.io/v1alpha1
kind: GitRepo
metadata:
  name: staging-apps
  namespace: fleet-default
spec:
  repo: https://github.com/my-org/k8s-configs
  branch: main
  paths:
    - base
    - staging
  targets:
    - clusterSelector:
        matchLabels:
          env: staging
---
# Production GitRepo - points to production paths
apiVersion: fleet.cattle.io/v1alpha1
kind: GitRepo
metadata:
  name: production-apps
  namespace: fleet-default
spec:
  repo: https://github.com/my-org/k8s-configs
  branch: main
  paths:
    - base
    - production
  targets:
    - clusterSelector:
        matchLabels:
          env: production
```

## Controlling Bundle Names

Fleet generates bundle names from the GitRepo name and directory path. You can see these names:

```bash
# See the automatically generated bundle names
kubectl get bundles -n fleet-default

# Example output:
# NAME                                      BUNDLEDEPLOYMENTS-READY   STATUS
# my-app-apps-frontend                      1/1                       Ready
# my-app-apps-backend                       1/1                       Ready
# my-app-infrastructure-monitoring          1/1                       Ready
```

## Using .fleetignore to Exclude Paths

Exclude specific files or directories from being processed:

```bash
# Create .fleetignore in your repository root
cat > .fleetignore <<EOF
# Exclude test files
tests/
*_test.yaml

# Exclude local development configs
local/
.local/

# Exclude documentation
docs/

# Exclude specific files
scratch.yaml
temp-*.yaml
EOF
```

## Nested fleet.yaml Files

Fleet processes nested directories independently when they have their own `fleet.yaml`:

```text
my-app/
├── fleet.yaml          # Top-level bundle config
├── deployment.yaml
├── service.yaml
└── monitoring/
    ├── fleet.yaml      # Creates a SEPARATE bundle for monitoring
    └── prometheus-rule.yaml
```

Each directory with a `fleet.yaml` becomes its own bundle. Use `overrideTargets` if a nested bundle should target a different set of clusters than the parent `GitRepo`:

```yaml
# my-app/fleet.yaml
namespace: my-app
overrideTargets:
  - clusterSelector:
      matchLabels:
        env: production
```

```yaml
# my-app/monitoring/fleet.yaml
namespace: monitoring
overrideTargets:
  # Monitoring only goes to clusters with monitoring enabled
  - clusterSelector:
      matchLabels:
        monitoring: enabled
```

## Verifying Bundle Path Configuration

```bash
# List all bundles created from the GitRepo
kubectl get bundles -n fleet-default \
  -l fleet.cattle.io/repo-name=my-app

# Inspect a specific bundle definition
kubectl get bundle my-app-apps-frontend -n fleet-default -o yaml

# Verify which files were included in a bundle
kubectl get bundle my-app-apps-frontend -n fleet-default \
  -o jsonpath='{range .spec.resources[*]}{.name}{"\n"}{end}'
```

## Conclusion

Fleet bundle paths give you fine-grained control over how your Git repository is organized and deployed. A well-designed path structure separates concerns clearly - different applications, environments, and infrastructure components can each become their own bundle when you split them across GitRepo paths or nested `fleet.yaml` files. By combining GitRepo path configurations with nested `fleet.yaml` files and `.fleetignore` exclusions, you can build a scalable repository structure that cleanly maps to your deployment requirements.
