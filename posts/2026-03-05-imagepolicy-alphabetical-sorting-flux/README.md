# How to Configure ImagePolicy with Alphabetical Sorting in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Image Automation, ImagePolicy, Alphabetical Sorting

Description: Learn how to configure Flux ImagePolicy with alphabetical sorting to select image tags based on lexicographic order.

---

Not all container image tags follow semantic versioning. Some projects use date-based tags, build identifiers, or other naming conventions that sort naturally in alphabetical order. Flux ImagePolicy supports alphabetical sorting for these cases. This guide explains how to configure alphabetical tag selection.

## Prerequisites

- A Kubernetes cluster with Flux and image automation controllers installed
- An ImageRepository scanning an image with alphabetically sortable tags
- kubectl access to your cluster

## When to Use Alphabetical Sorting

Alphabetical sorting is useful when your tags follow a lexicographic ordering, such as:

- Date-based tags: `2026-01-15`, `2026-02-20`, `2026-03-05`
- Timestamped tags: `20260305T120000`, `20260305T130000`
- Build number prefixed tags: `build-0100`, `build-0200`, `build-0300`

Because alphabetical sorting uses lexicographic comparison, it works correctly for zero-padded numbers and ISO date formats.

## Step 1: Select the Latest Alphabetical Tag

The `order: asc` setting selects the tag that comes last alphabetically, which is the "latest" for date-based and incrementing tags.

```yaml
# imagepolicy-alphabetical.yaml
# Select the alphabetically last (latest) tag
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: my-app
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  policy:
    alphabetical:
      # asc means ascending order; the last tag in ascending order is selected
      order: asc
```

Apply the manifest.

```bash
# Apply the alphabetical ImagePolicy
kubectl apply -f imagepolicy-alphabetical.yaml
```

## Step 2: Select the Earliest Alphabetical Tag

Use `order: desc` to select the tag that comes first alphabetically (the "earliest" tag).

```yaml
# imagepolicy-alphabetical-desc.yaml
# Select the alphabetically first (earliest) tag
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: my-app-earliest
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  policy:
    alphabetical:
      # desc means descending order; the first tag in descending order is selected
      order: desc
```

## Step 3: Combine with Tag Filtering for Date-Based Tags

Use `filterTags` to only consider tags that match a specific date format.

```yaml
# imagepolicy-date-tags.yaml
# Select the latest date-based tag (YYYY-MM-DD format)
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: my-app-daily
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  filterTags:
    # Only consider tags matching the YYYY-MM-DD format
    pattern: "^(?P<date>[0-9]{4}-[0-9]{2}-[0-9]{2})$"
    extract: "$date"
  policy:
    alphabetical:
      order: asc
```

## Step 4: Filter Tags with a Prefix

If your date-based tags include a prefix, use `filterTags` to extract the sortable part.

```yaml
# imagepolicy-prefixed-date.yaml
# Select the latest tag with a 'release-' prefix followed by a date
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: my-app-release
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  filterTags:
    # Match tags like release-2026-03-05 and extract the date
    pattern: "^release-(?P<date>[0-9]{4}-[0-9]{2}-[0-9]{2})$"
    extract: "$date"
  policy:
    alphabetical:
      order: asc
```

## Step 5: Use Alphabetical Sorting for Timestamp Tags

Tags with full timestamps sort correctly alphabetically when they use a consistent format.

```yaml
# imagepolicy-timestamp.yaml
# Select the latest timestamp tag (YYYYMMDDHHMMSS format)
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: my-app-timestamp
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  filterTags:
    # Match timestamp tags like 20260305120000
    pattern: "^(?P<ts>[0-9]{14})$"
    extract: "$ts"
  policy:
    alphabetical:
      order: asc
```

## Step 6: Combine Environment and Date Tags

Some teams tag images with an environment prefix and date suffix.

```yaml
# imagepolicy-env-date.yaml
# Select the latest staging build by date
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: my-app-staging
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  filterTags:
    # Match staging-YYYYMMDD tags and extract the date for sorting
    pattern: "^staging-(?P<date>[0-9]{8})$"
    extract: "$date"
  policy:
    alphabetical:
      order: asc
```

## Step 7: Verify the Selected Tag

```bash
# Check which tag was selected by the alphabetical policy
flux get image policy my-app -n flux-system

# Get detailed status
kubectl describe imagepolicy my-app -n flux-system
```

## Understanding Alphabetical Sort Behavior

Alphabetical sorting uses standard lexicographic comparison. Important considerations:

- Numbers are compared character by character, not by value. `9` comes after `10` alphabetically because `9` > `1`.
- Zero-padded numbers sort correctly: `01`, `02`, ..., `09`, `10`.
- ISO date format (`YYYY-MM-DD`) sorts correctly.
- Mixed formats may produce unexpected results.

For non-padded numeric tags, use the `numerical` policy instead.

## Troubleshooting

- **Wrong tag selected**: Check if your tags have consistent formatting. Mixed formats cause incorrect sorting.
- **No tag selected**: Verify the `filterTags` pattern matches at least one tag.
- **Unexpected ordering**: Remember that alphabetical sorting is character-by-character. `build-9` sorts after `build-10` unless zero-padded.

```bash
# List available tags from the ImageRepository
kubectl describe imagerepository my-app -n flux-system
```

## Summary

You have learned how to configure alphabetical sorting in Flux ImagePolicy. This approach is ideal for date-based, timestamp-based, or other lexicographically ordered tag naming conventions. Combined with `filterTags`, alphabetical sorting gives you flexible control over tag selection when semantic versioning is not used.
