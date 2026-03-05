# How to Configure ImagePolicy with SemVer Filtering in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Image Automation, ImagePolicy, SemVer, Semantic Versioning

Description: Learn how to configure Flux ImagePolicy with semantic versioning (SemVer) constraints to select the right container image tag.

---

Semantic versioning (SemVer) is the most widely used tagging convention for container images. Flux ImagePolicy supports SemVer-based tag selection, allowing you to define version ranges and constraints to automatically select the correct image tag. This guide covers how to use SemVer filtering in ImagePolicy resources.

## Prerequisites

- A Kubernetes cluster with Flux and image automation controllers installed
- An ImageRepository scanning an image with SemVer-compliant tags
- kubectl access to your cluster

## Understanding SemVer in Flux

SemVer tags follow the format `MAJOR.MINOR.PATCH` (e.g., `1.2.3`). Optional pre-release identifiers (`1.2.3-beta.1`) and build metadata (`1.2.3+build.456`) are also supported. Flux uses the Masterminds/semver library for version parsing and range evaluation.

## Step 1: Select the Latest Version in Any Range

The broadest range selects the latest available version.

```yaml
# imagepolicy-semver-any.yaml
# Select the latest semver tag regardless of major version
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImagePolicy
metadata:
  name: my-app
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  policy:
    semver:
      # Match any version 0.0.0 and above
      range: ">=0.0.0"
```

## Step 2: Constrain to a Major Version

Lock to a specific major version to avoid breaking changes.

```yaml
# imagepolicy-semver-major.yaml
# Select the latest 1.x.x version
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImagePolicy
metadata:
  name: my-app
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  policy:
    semver:
      # Select latest 1.x.x (any minor, any patch)
      range: "1.x"
```

## Step 3: Constrain to a Minor Version

Lock to a specific minor version for maximum stability.

```yaml
# imagepolicy-semver-minor.yaml
# Select the latest 1.2.x version (patch updates only)
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImagePolicy
metadata:
  name: my-app
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  policy:
    semver:
      # Select latest 1.2.x (only patch updates)
      range: "~1.2.0"
```

The tilde (`~`) operator allows patch-level updates. `~1.2.0` matches `>=1.2.0` and `<1.3.0`.

## Step 4: Use Caret Ranges

The caret (`^`) operator allows minor and patch updates.

```yaml
# imagepolicy-semver-caret.yaml
# Allow minor and patch updates within major version 1
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImagePolicy
metadata:
  name: my-app
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  policy:
    semver:
      # ^1.2.0 matches >=1.2.0 and <2.0.0
      range: "^1.2.0"
```

## Step 5: Use Explicit Range Constraints

Combine comparison operators for precise control.

```yaml
# imagepolicy-semver-range.yaml
# Select versions between 1.5.0 (inclusive) and 2.0.0 (exclusive)
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImagePolicy
metadata:
  name: my-app
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  policy:
    semver:
      # Explicit range: at least 1.5.0 but less than 2.0.0
      range: ">=1.5.0 <2.0.0"
```

## Step 6: Handle Tags with a 'v' Prefix

Many projects use tags like `v1.2.3`. Use `filterTags` to strip the prefix before SemVer evaluation.

```yaml
# imagepolicy-semver-vprefix.yaml
# Handle 'v' prefixed semver tags
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImagePolicy
metadata:
  name: my-app
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  filterTags:
    # Match tags like v1.2.3 and extract the version number
    pattern: "^v(?P<version>[0-9]+\\.[0-9]+\\.[0-9]+)$"
    extract: "$version"
  policy:
    semver:
      range: ">=1.0.0"
```

## Step 7: Exclude Pre-Release Versions

By default, SemVer ranges in Flux do not match pre-release versions unless explicitly specified. Tags like `1.2.3-beta.1` are excluded from ranges like `>=1.0.0`.

To include pre-release versions, use a range that explicitly matches them.

```yaml
# imagepolicy-semver-prerelease.yaml
# Include pre-release versions in the range
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImagePolicy
metadata:
  name: my-app
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  policy:
    semver:
      # Include pre-release versions
      range: ">=1.0.0-0"
```

The `-0` suffix tells the SemVer library to include pre-release versions starting from the lowest pre-release identifier.

## Step 8: Use Multiple Range Constraints with OR

You can combine multiple ranges using the double-pipe (`||`) operator.

```yaml
# imagepolicy-semver-or.yaml
# Match either 1.x or 2.x versions
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImagePolicy
metadata:
  name: my-app
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  policy:
    semver:
      # Match 1.x or 2.x
      range: ">=1.0.0 <2.0.0 || >=2.0.0 <3.0.0"
```

## Common SemVer Range Patterns

| Range | Matches | Use Case |
|---|---|---|
| `*` | Any version | Latest available |
| `1.x` | 1.0.0 to <2.0.0 | Lock to major |
| `~1.2.0` | 1.2.0 to <1.3.0 | Patch updates only |
| `^1.2.0` | 1.2.0 to <2.0.0 | Minor+patch updates |
| `>=1.5.0 <2.0.0` | 1.5.0 to <2.0.0 | Explicit range |
| `>=1.0.0-0` | All including pre-release | Include betas |

## Step 9: Verify the Selected Tag

```bash
# Check which tag was selected by the SemVer policy
flux get image policy my-app -n flux-system

# Get detailed evaluation information
kubectl describe imagepolicy my-app -n flux-system
```

## Troubleshooting

- **No matching version**: Ensure your image tags are valid SemVer. Tags like `1.0` (missing patch) are not standard SemVer.
- **Pre-release tags not selected**: Add `-0` to your range to include pre-releases.
- **'v' prefix causing issues**: Use `filterTags` to strip the prefix.

```bash
# Check what tags are available from the ImageRepository
kubectl get imagerepository my-app -n flux-system -o jsonpath='{.status.lastScanResult.tagCount}'
```

## Summary

You have learned how to configure SemVer filtering in Flux ImagePolicy resources. SemVer ranges give you precise control over which version tags are eligible for automatic updates, from broad "any latest" policies to narrow "patch-only" constraints. This is the most popular and recommended approach for production image automation with Flux.
