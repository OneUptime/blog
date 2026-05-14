# How to Use Git Sparse Checkout Patterns with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Git sparse checkout, GitOps, Kubernetes, Repository Pattern

Description: Learn how to use Git sparse checkout patterns with Flux CD to selectively sync only the files and directories your cluster needs from large monorepos.

---

## Introduction

When working with large monorepos that contain configurations for many teams, environments, or clusters, cloning the entire repository for each Flux CD source is wasteful and slow. Git sparse checkout lets you check out only a subset of files from a repository. Flux CD supports this through the `sparseCheckout` field on GitRepository resources, allowing you to include only the directories relevant to a specific cluster or application in the source artifact.

## Why Use Sparse Checkout with Flux CD

Sparse checkout is valuable when:

- **Large monorepos**: Your repository contains hundreds of directories but each cluster only needs a few.
- **Operational isolation**: You want each Flux Kustomization to build and apply only its own configurations.
- **Performance**: Reducing the amount of data Flux needs to download and process.
- **Team boundaries**: Different teams manage different subdirectories in the same repository.

## Prerequisites

- A running Kubernetes cluster with Flux CD installed
- A Git repository with multiple directories for different environments or services
- `flux` CLI installed locally

## Understanding the Monorepo Structure

Consider a typical monorepo used by an organization with multiple teams and environments:

```text
platform-repo/
  infrastructure/
    cert-manager/
    ingress-nginx/
    monitoring/
    logging/
  teams/
    team-alpha/
      staging/
      production/
    team-beta/
      staging/
      production/
    team-gamma/
      staging/
      production/
  clusters/
    staging/
      kustomization.yaml
    production/
      kustomization.yaml
  policies/
    network-policies/
    pod-security/
    resource-quotas/
```

## Configuring Flux CD GitRepository with Sparse Checkout Paths

Flux CD supports sparse checkout on GitRepository resources with the `sparseCheckout` field. This field lists directories to check out when source-controller clones the repository, and only those directory contents are present in the produced artifact.

Use `sparseCheckout` on the GitRepository to reduce the source artifact, and use the `path` field in Kustomization resources to point each reconciliation at the directory it should build.

```yaml
# flux-system/source.yaml

# Main GitRepository source pointing to the monorepo
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: platform-repo
  namespace: flux-system
spec:
  interval: 5m
  url: https://github.com/your-org/platform-repo.git
  ref:
    branch: main
  secretRef:
    name: git-credentials
  sparseCheckout:
    - infrastructure
    - teams/team-alpha/staging
    - policies/network-policies
```

## Using Path-Based Filtering with Kustomizations

The most common approach to scope what Flux applies is to create Kustomization resources that each point to a specific path in the GitRepository artifact.

```yaml
# flux-system/infrastructure-kustomization.yaml
# Only sync infrastructure components from the monorepo
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: infrastructure
  namespace: flux-system
spec:
  interval: 10m
  # Only process files under the infrastructure directory
  path: ./infrastructure
  prune: true
  sourceRef:
    kind: GitRepository
    name: platform-repo
  wait: true
  timeout: 5m
```

```yaml
# flux-system/team-alpha-staging.yaml
# Only sync team-alpha's staging configurations
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: team-alpha-staging
  namespace: flux-system
spec:
  interval: 10m
  # Narrow down to just team-alpha's staging directory
  path: ./teams/team-alpha/staging
  prune: true
  sourceRef:
    kind: GitRepository
    name: platform-repo
  dependsOn:
    # Ensure infrastructure is deployed first
    - name: infrastructure
```

## Using the Include Field for Cross-Repository References

Flux CD's `include` field on GitRepository allows you to compose artifacts from multiple sources. This is useful when you need files from a shared repository alongside your main configurations.

```yaml
# flux-system/shared-source.yaml
# GitRepository pointing to a shared library of configurations
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: shared-library
  namespace: flux-system
spec:
  interval: 10m
  url: https://github.com/your-org/shared-library.git
  ref:
    tag: v2.1.0
  secretRef:
    name: git-credentials
```

```yaml
# flux-system/platform-repo-with-includes.yaml
# Main repo that includes specific paths from the shared library
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: platform-repo-composed
  namespace: flux-system
spec:
  interval: 5m
  url: https://github.com/your-org/platform-repo.git
  ref:
    branch: main
  secretRef:
    name: git-credentials
  include:
    # Pull in only the network-policies directory from shared-library
    - repository:
        name: shared-library
      fromPath: policies/network-policies
      toPath: included/network-policies
    # Pull in monitoring dashboards from shared-library
    - repository:
        name: shared-library
      fromPath: dashboards/grafana
      toPath: included/dashboards
```

## Setting Up Per-Team GitRepository Sources

For stricter operational isolation, create separate GitRepository resources per team, each with its own credentials and sparse checkout scope. The Git provider must still enforce any repository or path-level access restrictions; Flux path settings alone are not a security boundary for Git access.

```yaml
# flux-system/team-alpha-source.yaml
# Dedicated source for team-alpha with team-specific credentials
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: team-alpha-repo
  namespace: flux-system
spec:
  interval: 5m
  url: https://github.com/your-org/platform-repo.git
  ref:
    branch: main
  secretRef:
    # Team-alpha has its own deploy key with limited access
    name: team-alpha-git-credentials
  sparseCheckout:
    - teams/team-alpha/staging
```

```yaml
# flux-system/team-alpha-apps.yaml
# Kustomization scoped to team-alpha's directory only
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: team-alpha-apps
  namespace: flux-system
spec:
  interval: 10m
  path: ./teams/team-alpha/staging
  prune: true
  sourceRef:
    kind: GitRepository
    name: team-alpha-repo
  serviceAccountName: team-alpha-sa
  targetNamespace: team-alpha
```

## Combining Include with Kustomize Overlays

Create a Kustomize overlay that references included paths from multiple sources.

```yaml
# teams/team-alpha/staging/kustomization.yaml
# Team overlay that combines shared policies with team-specific resources
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  # Shared network policies pulled in via include
  - ../../../included/network-policies
  # Team-specific application manifests
  - app-deployment.yaml
  - app-service.yaml
  - app-ingress.yaml
patches:
  # Customize network policy for team-alpha's namespace
  - target:
      kind: NetworkPolicy
      name: default-deny
    patch: |
      - op: replace
        path: /metadata/namespace
        value: team-alpha
```

```yaml
# teams/team-alpha/staging/app-deployment.yaml
# Team-alpha's application deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: alpha-api
  namespace: team-alpha
spec:
  replicas: 2
  selector:
    matchLabels:
      app: alpha-api
  template:
    metadata:
      labels:
        app: alpha-api
    spec:
      containers:
        - name: alpha-api
          image: your-org/alpha-api:v1.5.0
          ports:
            - containerPort: 3000
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 250m
              memory: 256Mi
```

## Notification and Alerting for Specific Paths

Configure Flux alerts for the Kustomization resources that reconcile specific paths.

```yaml
# flux-system/alert-team-alpha.yaml
# Alert provider for team-alpha's Slack channel
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Provider
metadata:
  name: team-alpha-slack
  namespace: flux-system
spec:
  type: slack
  channel: team-alpha-deployments
  secretRef:
    name: slack-webhook-team-alpha
---
# Alert that forwards events for team-alpha's Kustomization resources
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: team-alpha-alerts
  namespace: flux-system
spec:
  providerRef:
    name: team-alpha-slack
  eventSeverity: info
  eventSources:
    # Only watch team-alpha's Kustomization resources
    - kind: Kustomization
      name: team-alpha-apps
    - kind: Kustomization
      name: team-alpha-staging
```

## Performance Considerations

When dealing with very large repositories, consider these optimizations:

```yaml
# flux-system/optimized-source.yaml
# GitRepository with optimized settings for large repos
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: platform-repo-optimized
  namespace: flux-system
spec:
  interval: 10m
  url: https://github.com/your-org/platform-repo.git
  ref:
    branch: main
  secretRef:
    name: git-credentials
  # Ignore files that are not needed for deployment
  ignore: |
    # Exclude documentation and CI files from the artifact
    docs/
    .github/
    *.md
    tests/
    scripts/
    LICENSE
    CONTRIBUTING
```

## Verifying Sparse Checkout Behavior

Check that Flux is correctly processing the paths you specified.

```bash
# Verify the Kustomization is only reconciling the expected path
flux get kustomizations

# Check the GitRepository artifact size to confirm sparseCheckout is reducing the artifact
kubectl get gitrepository platform-repo -n flux-system -o jsonpath='{.status.artifact.size}'

# Inspect what resources were applied by a specific Kustomization
flux tree kustomization team-alpha-apps
```

## Troubleshooting

### Include Path Not Found

If Flux reports that an included path does not exist, verify the path exists in the source repository:

```bash
# Check the source repository status
flux get sources git shared-library

# Verify the path exists in the referenced repository
git ls-tree -d HEAD policies/network-policies
```

### Kustomization Failing on Missing Resources

When using path-based filtering, ensure all referenced resources exist within the scoped path:

```bash
# Describe the Kustomization to see the error message
kubectl describe kustomization team-alpha-apps -n flux-system

# Check if the path exists in the fetched artifact
flux logs --kind=Kustomization --name=team-alpha-apps
```

## Best Practices

1. **Use `sparseCheckout` on GitRepository sources** to reduce the directories included in source artifacts.
2. **Leverage the ignore field** to exclude non-deployment files from GitRepository artifacts.
3. **Create per-team sources** when strict access isolation is required.
4. **Use the include field** to compose configurations from multiple repositories without submodules.
5. **Use path-based Kustomizations** to scope which directory each reconciliation builds and applies.
6. **Keep paths stable** to avoid breaking Kustomization references when restructuring the repo.
7. **Document directory conventions** so all teams understand which paths map to which clusters.

## Conclusion

Git sparse checkout patterns in Flux CD allow you to work efficiently with large monorepos by scoping each cluster or team to only the directories they need. By combining GitRepository `sparseCheckout`, the `include` field, and Kustomization path specifications, you can achieve fine-grained control over what gets synced where. This approach reduces resource consumption, improves operational isolation, and keeps your GitOps workflow manageable at scale.
