# How to Configure ImagePolicy with Custom Sorting by Numeric Suffix

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, fluxcd, image-policy, Kubernetes, GitOps, Sorting

Description: Learn how to configure Flux CD ImagePolicy to sort image tags by a numeric suffix such as build numbers or Unix timestamps.

---

## Introduction

Not all container image tags follow semantic versioning. Many CI/CD pipelines produce tags with numeric suffixes representing build numbers, sequence counters, or Unix timestamps. Flux CD's ImagePolicy supports numerical sorting, which lets you extract a numeric portion of the tag and select the highest or lowest value.

This guide explains how to configure Flux to sort image tags by numeric suffix and select the most recent build.

## Prerequisites

- A Kubernetes cluster with Flux CD installed
- The `image-reflector-controller` and `image-automation-controller` deployed
- Container images tagged with numeric suffixes in your registry
- An ImageRepository resource configured for your registry

## Understanding Numerical Policy

The `numerical` policy in Flux CD sorts extracted values as numbers rather than strings. This is important because string sorting would rank `9` higher than `10` (since `9` > `1` lexicographically), while numerical sorting correctly identifies `10` as greater than `9`.

The `order` field determines sorting direction:
- `asc` (ascending): selects the highest number (most common for build numbers)
- The selected image is always the one at the end of the sort order

## Example 1: Build Number Suffix

For tags like `myapp-build-42`, `myapp-build-100`, `myapp-build-7`:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  image: registry.example.com/my-app
  interval: 5m
---
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImagePolicy
metadata:
  name: my-app
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  filterTags:
    pattern: '^myapp-build-(?P<build>\d+)$'
    extract: '$build'
  policy:
    numerical:
      order: asc
```

With ascending order, Flux selects `myapp-build-100` because `100` is the highest number. Without the `numerical` policy and using alphabetical sorting instead, `myapp-build-9` would incorrectly be selected as the latest.

## Example 2: Unix Timestamp Suffix

For tags like `deploy-1710300000`, `deploy-1710400000`:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImagePolicy
metadata:
  name: my-app
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  filterTags:
    pattern: '^deploy-(?P<ts>\d+)$'
    extract: '$ts'
  policy:
    numerical:
      order: asc
```

Unix timestamps naturally increase over time, so ascending numerical order picks the most recently built image.

## Example 3: Combined SHA and Build Number

For tags like `abc1234-42` where the first part is a Git SHA and the second is a build number:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImagePolicy
metadata:
  name: my-app
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  filterTags:
    pattern: '^[a-f0-9]+-(?P<num>\d+)$'
    extract: '$num'
  policy:
    numerical:
      order: asc
```

The regex matches any hex string followed by a hyphen and digits. Only the numeric portion is extracted for sorting.

## Example 4: Version with Build Metadata

For tags like `v1.5.0-42` where `42` is a build sequence number and you want to sort by the build number within a specific version:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImagePolicy
metadata:
  name: my-app
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  filterTags:
    pattern: '^v1\.5\.0-(?P<build>\d+)$'
    extract: '$build'
  policy:
    numerical:
      order: asc
```

This locks the version to `v1.5.0` and sorts only by the build number suffix. To track a different version, update the pattern.

## Example 5: Date-Encoded Numeric Tags

For tags using numeric dates like `20260313001` (YYYYMMDD + sequence):

```yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImagePolicy
metadata:
  name: my-app
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  filterTags:
    pattern: '^(?P<dataseq>\d{11})$'
    extract: '$dataseq'
  policy:
    numerical:
      order: asc
```

Since the date comes first in the number, the natural numeric ordering ensures later dates and higher sequences are selected.

## Applying and Verifying

Apply the configuration:

```bash
kubectl apply -f imagerepository.yaml
kubectl apply -f imagepolicy.yaml
```

Check the selected image:

```bash
kubectl -n flux-system get imagepolicy my-app -o jsonpath='{.status.latestImage}'
```

Verify the scan found tags:

```bash
kubectl -n flux-system get imagerepository my-app -o jsonpath='{.status.lastScanResult.tagCount}'
```

## Deployment Marker

Add the policy marker to your deployment:

```yaml
spec:
  containers:
    - name: my-app
      image: registry.example.com/my-app:deploy-1710300000 # {"$imagepolicy": "flux-system:my-app"}
```

## Troubleshooting

If the wrong tag is selected:

1. Confirm the regex matches the expected tags by testing your pattern against sample tags
2. Verify the extracted value is purely numeric. Non-numeric characters cause the numerical policy to fail
3. Check that `order: asc` is set. Without it, the lowest number may be selected
4. Look at the ImagePolicy events for reconciliation errors:

```bash
kubectl -n flux-system events --for imagepolicy/my-app
```

## Conclusion

The numerical policy in Flux CD ImagePolicy is essential for tags that encode ordering information as numbers. Build numbers, Unix timestamps, and date-sequence identifiers all benefit from numerical sorting over alphabetical or semver sorting. By combining regex extraction with the numerical policy, you can reliably select the most recent image regardless of your tagging convention.
