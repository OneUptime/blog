# How to Configure ImagePolicy with Regex Tag Filtering in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Image Automation, ImagePolicy, Regex, Tag Filtering

Description: Learn how to use regular expression tag filtering in Flux ImagePolicy to precisely control which image tags are considered for selection.

---

The `filterTags` field in Flux ImagePolicy provides powerful regular expression-based filtering that lets you narrow down which tags from an ImageRepository are considered by the selection policy. This guide covers the `filterTags` syntax, common regex patterns, and advanced filtering techniques.

## Prerequisites

- A Kubernetes cluster with Flux and image automation controllers installed
- An ImageRepository with scanned tags
- Basic understanding of regular expressions
- kubectl access to your cluster

## Understanding filterTags

The `filterTags` field has two subfields:

- **pattern** -- A Go regular expression that tags must match to be considered. Tags that do not match are ignored.
- **extract** -- An optional template string that extracts part of the tag for policy evaluation. It uses named capture groups from the pattern.

When `extract` is specified, the policy (semver, alphabetical, or numerical) operates on the extracted value, not the full tag string.

## Step 1: Filter Tags by Prefix

Only consider tags that start with a specific prefix.

```yaml
# imagepolicy-prefix-filter.yaml
# Only consider tags starting with 'v'
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: my-app
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  filterTags:
    # Match tags starting with 'v' followed by semver
    pattern: "^v(?P<version>[0-9]+\\.[0-9]+\\.[0-9]+)$"
    # Extract just the version number for semver evaluation
    extract: "$version"
  policy:
    semver:
      range: ">=1.0.0"
```

Apply the manifest.

```bash
# Apply the ImagePolicy with regex filtering
kubectl apply -f imagepolicy-prefix-filter.yaml
```

## Step 2: Filter Tags by Suffix

Select tags that end with a specific suffix.

```yaml
# imagepolicy-suffix-filter.yaml
# Only consider tags ending with '-linux-amd64'
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: my-app-amd64
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  filterTags:
    # Match tags like 1.2.3-linux-amd64
    pattern: "^(?P<version>[0-9]+\\.[0-9]+\\.[0-9]+)-linux-amd64$"
    extract: "$version"
  policy:
    semver:
      range: ">=1.0.0"
```

## Step 3: Filter Tags by Environment

Select tags for a specific deployment environment.

```yaml
# imagepolicy-env-filter.yaml
# Only consider production-tagged images
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: my-app-prod
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  filterTags:
    # Match tags like prod-1.2.3
    pattern: "^prod-(?P<version>[0-9]+\\.[0-9]+\\.[0-9]+)$"
    extract: "$version"
  policy:
    semver:
      range: ">=1.0.0"
```

## Step 4: Filter Tags with Multiple Components

Extract a specific component from complex tags.

```yaml
# imagepolicy-complex-filter.yaml
# Extract version from tags like 'myapp-v1.2.3-abc1234-linux'
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: my-app
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  filterTags:
    # Match complex tags and extract just the version
    pattern: "^myapp-v(?P<version>[0-9]+\\.[0-9]+\\.[0-9]+)-[a-f0-9]+-linux$"
    extract: "$version"
  policy:
    semver:
      range: ">=1.0.0"
```

## Step 5: Use Alternation in Patterns

Match tags with different formats using the `|` operator.

```yaml
# imagepolicy-alternation.yaml
# Match tags with or without a 'v' prefix
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: my-app
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  filterTags:
    # Match both '1.2.3' and 'v1.2.3' formats
    pattern: "^v?(?P<version>[0-9]+\\.[0-9]+\\.[0-9]+)$"
    extract: "$version"
  policy:
    semver:
      range: ">=1.0.0"
```

The `v?` makes the 'v' prefix optional.

## Step 6: Filter by Branch and Extract Build Number

For tags that encode the branch and build number.

```yaml
# imagepolicy-branch-build.yaml
# Select the latest main branch build
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: my-app-main
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  filterTags:
    # Match main-<build-number> tags
    pattern: "^main-(?P<build>[0-9]+)$"
    extract: "$build"
  policy:
    numerical:
      order: asc
```

## Step 7: Exclude Certain Patterns Within filterTags

The `filterTags` pattern acts as an inclusion filter. Tags that do not match are excluded. To exclude specific patterns, design the regex to not match them.

```yaml
# imagepolicy-exclude-pattern.yaml
# Match semver tags but exclude those with pre-release suffixes
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: my-app
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  filterTags:
    # Match only clean semver tags (no pre-release suffix)
    pattern: "^(?P<version>[0-9]+\\.[0-9]+\\.[0-9]+)$"
    extract: "$version"
  policy:
    semver:
      range: ">=1.0.0"
```

This pattern does not match tags like `1.2.3-beta.1` or `1.2.3-rc.1` because they contain a hyphen and additional text after the patch number.

## Step 8: Use Named Capture Groups Correctly

Go regex uses the `(?P<name>...)` syntax for named capture groups. The extract field references them with `$name`.

```yaml
# Examples of named capture groups
filterTags:
  # Single group
  pattern: "^v(?P<version>.+)$"
  extract: "$version"

  # Multiple groups (only one is used in extract)
  pattern: "^(?P<env>[a-z]+)-(?P<version>[0-9.]+)$"
  extract: "$version"
```

## Step 9: Test Regex Patterns

Before applying, test your regex patterns against actual tags.

```bash
# List tags from the ImageRepository to test against
kubectl get imagerepository my-app -n flux-system -o jsonpath='{.status.lastScanResult.tagCount}'

# Check the ImagePolicy status to see if tags matched
kubectl describe imagepolicy my-app -n flux-system
```

## Common Regex Patterns

| Pattern | Matches | Does Not Match |
|---|---|---|
| `^v[0-9]+\.[0-9]+\.[0-9]+$` | v1.2.3 | 1.2.3, v1.2.3-beta |
| `^[0-9]+\.[0-9]+\.[0-9]+$` | 1.2.3 | v1.2.3, latest |
| `^[0-9]+$` | 123, 456 | v1, build-123 |
| `^prod-` | prod-1.0, prod-latest | dev-1.0 |
| `^[0-9]{8}$` | 20260305 | 2026-03-05 |

## Troubleshooting

- **No tags matched**: The regex pattern may be too restrictive. Test it against actual tag names.
- **Wrong tag extracted**: Verify the named capture group captures the intended part of the tag.
- **Regex syntax error**: Go regex does not support lookaheads or lookbehinds. Keep patterns simple.

```bash
# Check for filter-related errors in the logs
kubectl logs -n flux-system deployment/image-reflector-controller | grep -i "filter\|pattern\|regex"
```

## Summary

You have learned how to use regex tag filtering in Flux ImagePolicy. The `filterTags` field with `pattern` and `extract` gives you fine-grained control over which tags are considered and how they are evaluated. This is essential when working with complex tagging conventions that go beyond simple semantic versioning.
