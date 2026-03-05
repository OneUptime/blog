# How to Use HelmRelease with Chart from GitRepository in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Helm, HelmRelease, GitRepository, Chart Source

Description: Learn how to configure a HelmRelease to source Helm charts directly from a GitRepository in Flux CD using the chartRef field.

---

Flux CD does not require Helm charts to be published in a Helm repository. You can source charts directly from a Git repository, which is useful when your charts live alongside your application code or when you maintain internal charts that are not published to a registry. Flux v2 provides two approaches for this: the legacy `spec.chart.spec.sourceRef` with a GitRepository and the newer `spec.chartRef` field.

## Why Source Charts from Git?

There are several reasons to pull Helm charts from Git instead of a Helm repository:

- **Monorepo workflows** -- Charts live in the same repository as the application source code.
- **Unpublished charts** -- Internal charts that do not have a Helm repository or OCI registry.
- **Development workflows** -- Test chart changes by pointing at a branch before publishing.
- **Single source of truth** -- Manage chart versions through Git tags and branches rather than a separate registry.

## Prerequisites

- Kubernetes cluster with Flux CD v2.x or later
- A Git repository containing one or more Helm charts
- `kubectl` and `flux` CLI tools
- Git credentials configured if the repository is private

## Setting Up the GitRepository Source

First, create a GitRepository source that points to the repository containing your Helm chart:

```yaml
# GitRepository source pointing to a repo with Helm charts
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: my-app-repo
  namespace: flux-system
spec:
  interval: 5m
  url: https://github.com/my-org/my-app
  ref:
    branch: main
```

For private repositories, you will need a Secret with credentials:

```yaml
# GitRepository with authentication for a private repo
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: my-app-repo
  namespace: flux-system
spec:
  interval: 5m
  url: https://github.com/my-org/my-app
  ref:
    branch: main
  secretRef:
    name: git-credentials
---
# Secret with Git credentials
apiVersion: v1
kind: Secret
metadata:
  name: git-credentials
  namespace: flux-system
type: Opaque
stringData:
  username: git
  password: <your-token>
```

## Repository Structure

A typical Git repository structure with a Helm chart might look like this:

```text
my-app/
  src/
    ...
  charts/
    my-app/
      Chart.yaml
      values.yaml
      templates/
        deployment.yaml
        service.yaml
```

## Using spec.chart.spec with GitRepository

The traditional approach uses `spec.chart.spec.sourceRef` pointing to the GitRepository, with the `chart` field specifying the path to the chart within the repository:

```yaml
# HelmRelease sourcing chart from GitRepository using spec.chart.spec
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app
  namespace: default
spec:
  interval: 10m
  chart:
    spec:
      # Path to the chart directory within the Git repository
      chart: ./charts/my-app
      sourceRef:
        kind: GitRepository
        name: my-app-repo
        namespace: flux-system
      # Reconcile the chart source at this interval
      reconcileStrategy: Revision
  values:
    replicaCount: 3
    image:
      repository: my-registry/my-app
      tag: "1.0.0"
```

The `chart` field is the relative path from the repository root to the directory containing `Chart.yaml`. The `reconcileStrategy: Revision` setting ensures the chart is re-evaluated whenever the Git revision changes.

## Using spec.chartRef with GitRepository

Flux v2 also supports referencing an OCIRepository or GitRepository via `spec.chartRef`. However, for GitRepository sources, the `spec.chart.spec` approach shown above is the standard method. The `spec.chartRef` field is primarily designed for OCIRepository references. When working with Git-hosted charts, use `spec.chart.spec.sourceRef` with `kind: GitRepository`.

## Pinning to a Git Tag

To deploy a specific version of a chart, pin the GitRepository to a tag:

```yaml
# GitRepository pinned to a specific tag
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: my-app-repo
  namespace: flux-system
spec:
  interval: 5m
  url: https://github.com/my-org/my-app
  ref:
    # Pin to a specific release tag
    tag: v1.2.0
```

## Using a Specific Branch

For development or staging environments, point to a feature branch:

```yaml
# GitRepository pointing to a development branch
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: my-app-repo-dev
  namespace: flux-system
spec:
  interval: 1m
  url: https://github.com/my-org/my-app
  ref:
    branch: develop
```

Then reference this source in your HelmRelease:

```yaml
# HelmRelease using the development branch source
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app-dev
  namespace: staging
spec:
  interval: 5m
  chart:
    spec:
      chart: ./charts/my-app
      sourceRef:
        kind: GitRepository
        name: my-app-repo-dev
        namespace: flux-system
      reconcileStrategy: Revision
  values:
    replicaCount: 1
```

## Using a Semver Range with Git Tags

If your repository uses semver-compatible tags, you can use a semver range:

```yaml
# GitRepository with semver tag selection
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: my-app-repo
  namespace: flux-system
spec:
  interval: 5m
  url: https://github.com/my-org/my-app
  ref:
    semver: ">=1.0.0 <2.0.0"
```

## Verifying the Setup

After applying both the GitRepository and the HelmRelease, verify they are working:

```bash
# Check the GitRepository is synced
flux get source git my-app-repo -n flux-system

# Check the HelmRelease is reconciled
flux get helmrelease my-app -n default

# View the chart artifact details
kubectl describe gitrepository my-app-repo -n flux-system

# Check if the Helm release was created
helm list -n default
```

## Troubleshooting

Common issues when sourcing charts from Git:

```bash
# If the chart path is wrong, you will see an error like:
# "chart not found at path './charts/my-app'"
# Verify the path exists in the repository

# Check GitRepository status for fetch errors
kubectl describe gitrepository my-app-repo -n flux-system

# Check HelmRelease events for chart-related errors
kubectl describe helmrelease my-app -n default
```

## Best Practices

1. **Use tags for production.** Pin your GitRepository to a tag or semver range for production environments to ensure reproducible deployments.
2. **Use branches for development.** Use branch references with short intervals for fast iteration in dev/staging environments.
3. **Set reconcileStrategy to Revision.** This ensures the HelmRelease re-evaluates whenever the Git commit changes.
4. **Keep charts in a consistent location.** Standardize where charts live in your repository (e.g., `charts/` directory) for clarity.
5. **Use separate GitRepository objects per environment.** This lets you point different environments at different branches or tags without conflicts.

## Conclusion

Sourcing Helm charts from a GitRepository in Flux gives you flexibility to manage charts alongside application code. By configuring `spec.chart.spec.sourceRef` with `kind: GitRepository` and specifying the chart path, you can deploy charts directly from Git branches, tags, or semver ranges. This approach simplifies monorepo workflows and eliminates the need to publish charts to a separate registry during development.
