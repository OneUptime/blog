# How to Configure ImagePolicy with Numerical Sorting in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Image Automation, ImagePolicy, Numerical Sorting

Description: Learn how to configure Flux ImagePolicy with numerical sorting to select image tags based on numeric value.

---

Some container image tags use plain numbers as identifiers, such as build numbers or sequential release numbers. Flux ImagePolicy supports numerical sorting for these cases, comparing tags by their numeric value rather than lexicographic order. This guide covers how to configure numerical tag selection.

## Prerequisites

- A Kubernetes cluster with Flux and image automation controllers installed
- An ImageRepository scanning an image with numerically tagged versions
- kubectl access to your cluster

## When to Use Numerical Sorting

Numerical sorting is the right choice when your tags are numeric values that should be compared by magnitude:

- Build numbers: `100`, `101`, `102`
- Sequential release numbers: `1`, `2`, `10`, `20`
- Epoch timestamps: `1709640000`, `1709726400`

Unlike alphabetical sorting, numerical sorting correctly handles non-padded numbers. For example, `10` is greater than `9` numerically, whereas alphabetically `9` comes after `10`.

## Step 1: Select the Highest Numerical Tag

The `order: asc` setting selects the highest numeric value.

```yaml
# imagepolicy-numerical.yaml
# Select the highest numerical tag (latest build number)
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: my-app
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  policy:
    numerical:
      # asc order selects the highest number
      order: asc
```

Apply the manifest.

```bash
# Apply the numerical ImagePolicy
kubectl apply -f imagepolicy-numerical.yaml
```

## Step 2: Select the Lowest Numerical Tag

Use `order: desc` to select the lowest numeric value.

```yaml
# imagepolicy-numerical-desc.yaml
# Select the lowest numerical tag
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: my-app-oldest
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  policy:
    numerical:
      # desc order selects the lowest number
      order: desc
```

## Step 3: Combine with Tag Filtering

Use `filterTags` to extract the numeric part from tags that have a prefix or suffix.

```yaml
# imagepolicy-numerical-filtered.yaml
# Extract build number from tags like 'build-123'
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: my-app-build
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  filterTags:
    # Match tags like build-123 and extract the number
    pattern: "^build-(?P<num>[0-9]+)$"
    extract: "$num"
  policy:
    numerical:
      order: asc
```

## Step 4: Use Numerical Sorting for CI Build Numbers

CI/CD systems like Jenkins, GitLab CI, and GitHub Actions often assign sequential build numbers to pipeline runs.

```yaml
# imagepolicy-ci-build.yaml
# Select the latest CI build number
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: my-app-ci
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  filterTags:
    # Match tags that are pure numbers (CI build numbers)
    pattern: "^(?P<buildnum>[0-9]+)$"
    extract: "$buildnum"
  policy:
    numerical:
      order: asc
```

## Step 5: Use Numerical Sorting for Epoch Timestamps

Unix epoch timestamps are numeric and sort correctly with numerical ordering.

```yaml
# imagepolicy-epoch.yaml
# Select the latest epoch timestamp tag
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: my-app-epoch
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  filterTags:
    # Match 10-digit epoch timestamps
    pattern: "^(?P<epoch>[0-9]{10})$"
    extract: "$epoch"
  policy:
    numerical:
      order: asc
```

## Step 6: Filter by Environment and Sort Numerically

Select the latest build for a specific environment.

```yaml
# imagepolicy-env-build.yaml
# Select the latest production build number
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: my-app-prod
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  filterTags:
    # Match prod-NNN tags and extract the number
    pattern: "^prod-(?P<num>[0-9]+)$"
    extract: "$num"
  policy:
    numerical:
      order: asc
```

## Step 7: Numerical vs Alphabetical Comparison

To illustrate the difference, consider these tags: `1`, `2`, `9`, `10`, `20`, `100`.

- **Numerical ascending**: Selects `100` (highest value)
- **Alphabetical ascending**: Selects `9` (last in lexicographic order: `1`, `10`, `100`, `2`, `20`, `9`)

This is why numerical sorting is essential for non-padded numeric tags.

## Step 8: Verify the Selected Tag

```bash
# Check which tag was selected by the numerical policy
flux get image policy my-app -n flux-system

# Get detailed status
kubectl describe imagepolicy my-app -n flux-system
```

## Step 9: Multiple ImagePolicies for Different Environments

Create separate policies for different environments using the same ImageRepository.

```yaml
# imagepolicy-multi-env.yaml
# Production: latest build above 500
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: my-app-prod
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  filterTags:
    pattern: "^prod-(?P<num>[0-9]+)$"
    extract: "$num"
  policy:
    numerical:
      order: asc
---
# Staging: latest build from any environment
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: my-app-staging
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  filterTags:
    pattern: "^(?P<num>[0-9]+)$"
    extract: "$num"
  policy:
    numerical:
      order: asc
```

## Troubleshooting

- **Non-numeric tags causing errors**: Ensure your `filterTags` pattern only matches tags that are purely numeric after extraction.
- **Wrong tag selected**: Verify the order field. `asc` selects the highest, `desc` selects the lowest.
- **No tag selected**: Check that the ImageRepository has tags matching the filter pattern.

```bash
# Check logs for policy evaluation details
kubectl logs -n flux-system deployment/image-reflector-controller | grep -i "policy\|numerical"
```

## Summary

You have learned how to configure numerical sorting in Flux ImagePolicy. Numerical sorting is essential when tags represent build numbers, sequential releases, or epoch timestamps where lexicographic ordering would produce incorrect results. Combined with `filterTags` for prefix extraction, numerical sorting provides precise control over tag selection.
