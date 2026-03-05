# How to Create an ImagePolicy in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Image Automation, ImagePolicy, Tag Selection

Description: Learn how to create an ImagePolicy resource in Flux to select the correct container image tag from scanned results.

---

The ImagePolicy resource in Flux selects a specific image tag from the tags discovered by an ImageRepository. It defines rules for choosing the right tag based on semantic versioning, alphabetical order, numerical order, or timestamp. This guide walks you through creating your first ImagePolicy resource.

## Prerequisites

- A Kubernetes cluster with Flux and image automation controllers installed
- At least one ImageRepository resource that has successfully scanned tags
- kubectl access to your cluster

## What Is an ImagePolicy?

An ImagePolicy watches an ImageRepository and applies a policy to select one tag from the available tags. The selected tag is stored in the ImagePolicy's status and can be used by ImageUpdateAutomation to update your deployment manifests in Git.

The ImagePolicy supports several sorting strategies:

- **SemVer** -- Select the latest semantic version tag
- **Alphabetical** -- Select the tag that sorts first or last alphabetically
- **Numerical** -- Select the highest or lowest numerical tag

You can also use a `filterTags` pattern to narrow down which tags are considered.

## Step 1: Create a Basic ImagePolicy with SemVer

The most common policy selects the latest semantic version tag.

```yaml
# imagepolicy-semver.yaml
# Select the latest semver tag for the my-app image
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
      # Select the latest version in the 1.x.x range
      range: "1.x"
```

Apply the manifest.

```bash
# Apply the ImagePolicy
kubectl apply -f imagepolicy-semver.yaml
```

## Step 2: Understand the Key Fields

- **imageRepositoryRef** -- References the ImageRepository resource that provides the scanned tags. Must be in the same namespace.
- **policy** -- Defines the selection strategy. Only one of `semver`, `alphabetical`, or `numerical` can be specified.
- **filterTags** -- An optional field to pre-filter tags using a regex pattern before applying the policy.

## Step 3: Create an ImagePolicy with Alphabetical Sorting

Select the tag that sorts last alphabetically, which can be useful for date-based tags.

```yaml
# imagepolicy-alphabetical.yaml
# Select the alphabetically last tag
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImagePolicy
metadata:
  name: my-app-alpha
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  policy:
    alphabetical:
      # Select the last tag alphabetically (latest date-based tag)
      order: asc
```

## Step 4: Create an ImagePolicy with Numerical Sorting

Select the highest numerical tag.

```yaml
# imagepolicy-numerical.yaml
# Select the highest numerical tag
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImagePolicy
metadata:
  name: my-app-num
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  policy:
    numerical:
      # Select the highest number
      order: asc
```

## Step 5: Add Tag Filtering

Use the `filterTags` field to limit which tags are considered by the policy.

```yaml
# imagepolicy-filtered.yaml
# Select the latest semver tag that starts with 'v'
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImagePolicy
metadata:
  name: my-app-filtered
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  filterTags:
    # Only consider tags matching this pattern
    pattern: "^v(?P<version>[0-9]+\\.[0-9]+\\.[0-9]+)$"
    # Extract the version part for policy evaluation
    extract: "$version"
  policy:
    semver:
      range: ">=1.0.0"
```

The `pattern` field uses Go regular expressions with named capture groups. The `extract` field specifies which capture group to use for policy evaluation.

## Step 6: Verify the ImagePolicy

Check which tag the ImagePolicy has selected.

```bash
# Check the selected tag for all ImagePolicies
flux get image policy -n flux-system

# Get detailed status
kubectl describe imagepolicy my-app -n flux-system
```

The output shows the latest image reference including the selected tag.

## Step 7: Create an ImagePolicy Using the Flux CLI

```bash
# Generate an ImagePolicy manifest
flux create image policy my-app \
  --image-ref=my-app \
  --select-semver=">=1.0.0" \
  --namespace=flux-system \
  --export > imagepolicy.yaml
```

## Step 8: Store ImagePolicy in Git

For a GitOps workflow, commit the ImagePolicy manifest alongside your ImageRepository.

```yaml
# clusters/my-cluster/image-automation/imagepolicy.yaml
# ImagePolicy for the application image
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
      range: ">=1.0.0 <2.0.0"
```

## Troubleshooting

- **No tag selected**: The ImageRepository may not have scanned yet, or no tags match the policy criteria. Check the ImageRepository status first.
- **Wrong tag selected**: Review the filterTags pattern and policy range. Use `kubectl describe` to see the evaluation details.

```bash
# Check ImagePolicy and ImageRepository status together
flux get image repository -n flux-system
flux get image policy -n flux-system

# Check logs for policy evaluation
kubectl logs -n flux-system deployment/image-reflector-controller | grep -i "policy\|select"
```

## Summary

You have learned how to create an ImagePolicy in Flux. The ImagePolicy selects the right tag from the tags discovered by an ImageRepository, using strategies like semantic versioning, alphabetical, or numerical sorting. Combined with tag filtering, ImagePolicy gives you precise control over which image tag is used in your deployments. The next step is to create an ImageUpdateAutomation to automatically update your manifests with the selected tag.
