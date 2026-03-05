# How to Configure ImagePolicy with Timestamp Sorting in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Image Automation, ImagePolicy, Timestamp, Tag Sorting

Description: Learn how to configure Flux ImagePolicy to select image tags based on timestamp values for time-based deployments.

---

Some CI/CD pipelines tag container images with timestamps, making it natural to select the most recent image by sorting tags by time. Flux ImagePolicy can handle timestamp-based tags using alphabetical or numerical sorting combined with `filterTags` to extract and compare the time components. This guide covers different timestamp formats and how to configure policies for each.

## Prerequisites

- A Kubernetes cluster with Flux and image automation controllers installed
- An ImageRepository scanning an image with timestamp-based tags
- kubectl access to your cluster

## Common Timestamp Tag Formats

CI/CD systems use various timestamp formats for image tags:

- ISO date: `2026-03-05`
- Compact date: `20260305`
- Full timestamp: `20260305T120000`
- Epoch seconds: `1709640000`
- Date with build: `2026-03-05-build42`

## Step 1: Sort ISO Date Tags (YYYY-MM-DD)

ISO date format sorts correctly with alphabetical ordering because the most significant component (year) comes first.

```yaml
# imagepolicy-iso-date.yaml
# Select the latest ISO date tag
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImagePolicy
metadata:
  name: my-app
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  filterTags:
    # Match YYYY-MM-DD formatted tags
    pattern: "^(?P<date>[0-9]{4}-[0-9]{2}-[0-9]{2})$"
    extract: "$date"
  policy:
    alphabetical:
      order: asc
```

Apply the manifest.

```bash
# Apply the timestamp-based ImagePolicy
kubectl apply -f imagepolicy-iso-date.yaml
```

## Step 2: Sort Compact Date Tags (YYYYMMDD)

Compact date tags without separators also sort correctly alphabetically.

```yaml
# imagepolicy-compact-date.yaml
# Select the latest compact date tag
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImagePolicy
metadata:
  name: my-app-compact
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  filterTags:
    # Match YYYYMMDD formatted tags
    pattern: "^(?P<date>[0-9]{8})$"
    extract: "$date"
  policy:
    alphabetical:
      order: asc
```

## Step 3: Sort Full Timestamp Tags (YYYYMMDDTHHMMSS)

Tags with full date and time information provide the most precise ordering.

```yaml
# imagepolicy-full-timestamp.yaml
# Select the latest full timestamp tag
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImagePolicy
metadata:
  name: my-app-precise
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  filterTags:
    # Match YYYYMMDDTHHMMSS formatted tags
    pattern: "^(?P<ts>[0-9]{8}T[0-9]{6})$"
    extract: "$ts"
  policy:
    alphabetical:
      order: asc
```

## Step 4: Sort Epoch Timestamp Tags

Unix epoch timestamps (seconds since 1970-01-01) are numeric and should use numerical sorting.

```yaml
# imagepolicy-epoch.yaml
# Select the latest epoch timestamp tag
apiVersion: image.toolkit.fluxcd.io/v1
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

## Step 5: Handle Timestamp Tags with Prefixes

Many pipelines prepend a prefix to timestamp tags.

```yaml
# imagepolicy-prefixed-timestamp.yaml
# Select the latest tag with a 'release-' prefix and date suffix
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImagePolicy
metadata:
  name: my-app-release
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  filterTags:
    # Match release-YYYYMMDD-HHMMSS tags
    pattern: "^release-(?P<ts>[0-9]{8}-[0-9]{6})$"
    extract: "$ts"
  policy:
    alphabetical:
      order: asc
```

## Step 6: Handle Timestamp with Version and Build Number

Some tags combine a version and timestamp.

```yaml
# imagepolicy-version-timestamp.yaml
# Select the latest tag combining version and timestamp
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImagePolicy
metadata:
  name: my-app-versioned
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  filterTags:
    # Match v1.0.0-20260305120000 format, sort by timestamp
    pattern: "^v[0-9]+\\.[0-9]+\\.[0-9]+-(?P<ts>[0-9]{14})$"
    extract: "$ts"
  policy:
    alphabetical:
      order: asc
```

## Step 7: Handle Multiple Builds Per Day

When you have multiple builds per day, include the build number in the sort.

```yaml
# imagepolicy-daily-builds.yaml
# Select the latest daily build (date + build number)
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImagePolicy
metadata:
  name: my-app-daily
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  filterTags:
    # Match 20260305-003 format (date + zero-padded build number)
    pattern: "^(?P<ts>[0-9]{8}-[0-9]{3})$"
    extract: "$ts"
  policy:
    alphabetical:
      order: asc
```

## Step 8: Filter by Date Range

To only consider recent tags, combine timestamp filtering with a pattern that limits the date range.

```yaml
# imagepolicy-recent-only.yaml
# Only consider tags from 2026 onwards
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImagePolicy
metadata:
  name: my-app-recent
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  filterTags:
    # Only match 2026 dates
    pattern: "^(?P<ts>2026[0-9]{4}T[0-9]{6})$"
    extract: "$ts"
  policy:
    alphabetical:
      order: asc
```

## Step 9: Verify the Selected Tag

```bash
# Check which tag was selected
flux get image policy my-app -n flux-system

# Get detailed policy status
kubectl describe imagepolicy my-app -n flux-system
```

## Choosing Between Alphabetical and Numerical

| Timestamp Format | Recommended Policy |
|---|---|
| YYYY-MM-DD | Alphabetical |
| YYYYMMDD | Alphabetical |
| YYYYMMDDTHHMMSS | Alphabetical |
| Unix epoch (seconds) | Numerical |
| Build numbers (non-padded) | Numerical |
| Zero-padded build numbers | Alphabetical |

## Troubleshooting

- **Wrong tag selected**: Verify the timestamp format is consistent across all tags. Mixed formats cause incorrect sorting.
- **No tags matched**: Check the `filterTags` pattern against actual tag names in the ImageRepository.
- **Epoch timestamps not sorting**: Use `numerical` policy for epoch timestamps, not `alphabetical`.

```bash
# Check available tags from the ImageRepository
kubectl describe imagerepository my-app -n flux-system
```

## Summary

You have learned how to configure Flux ImagePolicy for timestamp-based tag sorting. Whether your tags use ISO dates, compact dates, full timestamps, or epoch values, the right combination of `filterTags` and sorting policy ensures the latest image is always selected. This pattern is common in CI/CD pipelines that generate a new tagged image for every build.
