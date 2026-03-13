# How to Configure ImagePolicy with Custom Sorting by Date Suffix

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux, fluxcd, image-policy, kubernetes, gitops, sorting, date-tags

Description: Learn how to configure Flux CD ImagePolicy to sort image tags by date suffix in formats like YYYYMMDD or YYYYMMDDHHMMSS.

---

## Introduction

Many container image tagging strategies incorporate dates to indicate when an image was built. Tags like `v1.0-20260313`, `build-20260313143000`, or `main-2026.03.13` are common in CI/CD pipelines. Flux CD can sort these date-encoded tags to select the most recent image, but you need to configure the extraction and sorting policy correctly.

This guide shows how to handle various date-based tag formats with Flux CD ImagePolicy.

## Prerequisites

- A Kubernetes cluster with Flux CD installed
- The `image-reflector-controller` and `image-automation-controller` deployed
- Container images with date-encoded tags in your registry
- An ImageRepository resource configured

## How Date Sorting Works in Flux

Flux CD does not have a dedicated date policy. Instead, you leverage either the `numerical` or `alphabetical` policy depending on the date format:

- **Numerical**: Works when the date can be extracted as a pure number (e.g., `20260313` or `20260313143000`)
- **Alphabetical**: Works when the date format sorts lexicographically (e.g., `2026-03-13` or `2026.03.13T14.30.00`)

The key insight is that ISO-style date formats sort correctly in both numerical and alphabetical order, as long as they use a consistent format with zero-padded values.

## Example 1: YYYYMMDD Numeric Date

For tags like `build-20260313`:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  image: registry.example.com/my-app
  interval: 5m
---
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: my-app
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  filterTags:
    pattern: '^build-(?P<date>\d{8})$'
    extract: '$date'
  policy:
    numerical:
      order: asc
```

The `\d{8}` pattern matches exactly 8 digits, corresponding to YYYYMMDD. The numerical policy with ascending order selects the highest number, which is the most recent date.

## Example 2: YYYYMMDDHHMMSS Timestamp

For tags like `deploy-20260313143000`:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: my-app
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  filterTags:
    pattern: '^deploy-(?P<ts>\d{14})$'
    extract: '$ts'
  policy:
    numerical:
      order: asc
```

The 14-digit pattern captures the full timestamp. Since `20260313143000` is a valid number and later timestamps produce larger numbers, numerical sorting works correctly.

## Example 3: Hyphenated Date Format

For tags like `release-2026-03-13`:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: my-app
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  filterTags:
    pattern: '^release-(?P<date>\d{4}-\d{2}-\d{2})$'
    extract: '$date'
  policy:
    alphabetical:
      order: asc
```

Since the date contains hyphens, it cannot be treated as a number. However, the ISO date format `YYYY-MM-DD` sorts correctly alphabetically, so the `alphabetical` policy with ascending order works.

## Example 4: Date with Build Sequence

For tags like `main-20260313-3` where `3` is the build number within that day:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: my-app
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  filterTags:
    pattern: '^main-(?P<sort>\d{8}-\d+)$'
    extract: '$sort'
  policy:
    alphabetical:
      order: asc
```

This extracts the combined date and build number. Alphabetical sorting works for the date portion, but there is a caveat: build numbers `10` and above may sort incorrectly against single-digit numbers. If your build numbers are zero-padded (e.g., `main-20260313-003`), alphabetical sorting is reliable.

For non-padded build numbers, consider using a different tag format or concatenating the date and build number without separators (e.g., `main-2026031300003`).

## Example 5: Dotted Date with Time

For tags like `v1.0-2026.03.13T14.30.00`:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: my-app
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  filterTags:
    pattern: '^v\d+\.\d+-(?P<datetime>\d{4}\.\d{2}\.\d{2}T\d{2}\.\d{2}\.\d{2})$'
    extract: '$datetime'
  policy:
    alphabetical:
      order: asc
```

The dotted date-time format sorts correctly alphabetically. The version prefix is matched but not extracted, so sorting is based solely on the datetime component.

## Example 6: Weekly Build Tags

For tags like `weekly-2026-w11` (year and ISO week number):

```yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: my-app
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  filterTags:
    pattern: '^weekly-(?P<yearweek>\d{4}-w\d{2})$'
    extract: '$yearweek'
  policy:
    alphabetical:
      order: asc
```

The format `YYYY-wWW` sorts alphabetically since both components are zero-padded.

## Verifying the Configuration

After applying the policy:

```bash
kubectl -n flux-system get imagepolicy my-app -o jsonpath='{.status.latestImage}'
```

If the selected image does not reflect the most recent date, verify:

```bash
kubectl -n flux-system describe imagepolicy my-app
```

Check for reconciliation errors and confirm the tag count in the ImageRepository.

## Conclusion

Sorting by date suffix in Flux CD relies on choosing the right policy type for your date format. Pure numeric dates work with the `numerical` policy, while formatted dates with separators work with the `alphabetical` policy. The critical requirement is that your date format maintains consistent sorting order, which is naturally satisfied by ISO-style date formats with zero-padded values. By extracting the date portion with regex, you can reliably track the most recent image build regardless of what other information is encoded in the tag.
