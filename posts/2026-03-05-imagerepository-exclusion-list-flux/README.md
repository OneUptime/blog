# How to Configure ImageRepository Exclusion List in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Image Automation, ImageRepository, Exclusion List, Tag Filtering

Description: Learn how to configure exclusion lists in Flux ImageRepository resources to filter out unwanted image tags from scanning results.

---

Container image repositories often contain many tags that are not relevant for deployment, such as development builds, SHA-based tags, or deprecated versions. The Flux ImageRepository resource supports an `exclusionList` field that lets you filter out tags using regular expressions. This guide shows you how to configure exclusion lists effectively.

## Prerequisites

- A Kubernetes cluster with Flux and image automation controllers installed
- At least one ImageRepository resource configured
- kubectl access to your cluster

## Understanding the Exclusion List

The `exclusionList` field in the ImageRepository spec accepts a list of regular expression patterns. Any tag that matches one or more of these patterns will be excluded from the scan results. The image reflector controller applies these filters before storing the tag list. This reduces the number of tags that ImagePolicy resources need to evaluate.

By default, if no `exclusionList` is specified, all discovered tags are included.

## Step 1: Create a Basic Exclusion List

Here is an ImageRepository that excludes the `latest` tag.

```yaml
# imagerepository-exclude-latest.yaml
# Exclude the 'latest' tag from scan results
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  image: ghcr.io/my-org/my-app
  interval: 5m0s
  exclusionList:
    # Exclude the exact 'latest' tag
    - "^latest$"
```

Apply the manifest.

```bash
# Apply the ImageRepository with exclusion list
kubectl apply -f imagerepository-exclude-latest.yaml
```

## Step 2: Exclude SHA-Based Tags

CI/CD systems often push tags based on Git commit SHAs. These tags are usually not suitable for production deployments.

```yaml
# imagerepository-exclude-sha.yaml
# Exclude SHA-based tags from CI/CD pipelines
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  image: ghcr.io/my-org/my-app
  interval: 5m0s
  exclusionList:
    # Exclude tags starting with 'sha-' (e.g., sha-abc1234)
    - "^sha-"
    # Exclude tags that are full 40-char SHA hashes
    - "^[a-f0-9]{40}$"
    # Exclude short SHA tags (7 characters)
    - "^[a-f0-9]{7}$"
```

## Step 3: Exclude Branch Name Tags

Some CI pipelines tag images with branch names. Exclude these to focus on version tags.

```yaml
# imagerepository-exclude-branches.yaml
# Exclude branch-name tags
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  image: ghcr.io/my-org/my-app
  interval: 5m0s
  exclusionList:
    # Exclude common branch names
    - "^main$"
    - "^master$"
    - "^develop$"
    - "^staging$"
    # Exclude feature branch tags
    - "^feature-"
    # Exclude pull request tags
    - "^pr-"
```

## Step 4: Exclude Pre-Release Tags

If you only want stable release tags, exclude pre-release versions.

```yaml
# imagerepository-exclude-prerelease.yaml
# Exclude pre-release and development tags
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  image: docker.io/myorg/my-app
  interval: 5m0s
  exclusionList:
    # Exclude alpha releases
    - ".*alpha.*"
    # Exclude beta releases
    - ".*beta.*"
    # Exclude release candidates
    - ".*rc.*"
    # Exclude development builds
    - ".*dev.*"
    # Exclude snapshot builds
    - ".*SNAPSHOT.*"
```

## Step 5: Exclude Old Version Tags

Filter out old versions that are no longer relevant.

```yaml
# imagerepository-exclude-old.yaml
# Exclude old major versions
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageRepository
metadata:
  name: nginx
  namespace: flux-system
spec:
  image: docker.io/library/nginx
  interval: 30m0s
  exclusionList:
    # Exclude nginx 1.x.x versions (only track 1.2x+)
    - "^1\\.[0-1][0-9]\\."
    # Exclude tags with OS suffixes
    - ".*-alpine.*"
    - ".*-slim.*"
    - ".*-bullseye.*"
    - ".*-bookworm.*"
```

## Step 6: Combine Multiple Exclusion Patterns

A comprehensive exclusion list might combine several types of patterns.

```yaml
# imagerepository-comprehensive-exclusion.yaml
# Comprehensive exclusion list for a production application
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  image: ghcr.io/my-org/my-app
  interval: 5m0s
  exclusionList:
    # Exclude the latest tag
    - "^latest$"
    # Exclude SHA-based tags
    - "^sha-"
    - "^[a-f0-9]{7,40}$"
    # Exclude branch name tags
    - "^main$"
    - "^develop$"
    - "^feature-"
    - "^pr-"
    # Exclude pre-release tags
    - ".*-alpha"
    - ".*-beta"
    - ".*-rc\\."
    # Exclude debug and test tags
    - ".*-debug$"
    - ".*-test$"
```

## Step 7: Test Your Exclusion Patterns

After applying the exclusion list, verify which tags are still visible.

```bash
# Check the number of tags after exclusion
kubectl get imagerepository my-app -n flux-system -o jsonpath='{.status.lastScanResult.tagCount}'

# See the last scan result details
kubectl describe imagerepository my-app -n flux-system
```

You can also reconcile the ImageRepository to force an immediate rescan with the new exclusions.

```bash
# Force a rescan with updated exclusion list
flux reconcile image repository my-app -n flux-system
```

## Step 8: Use Regex Anchors Correctly

Regex patterns in the exclusion list follow Go regular expression syntax. Key points:

- `^` anchors to the start of the tag string
- `$` anchors to the end of the tag string
- `.` matches any character (use `\\.` for a literal dot)
- `.*` matches any sequence of characters
- Without anchors, the pattern matches anywhere in the tag string

```yaml
# Example showing anchor importance
exclusionList:
  # This excludes ONLY the tag "latest" (exact match)
  - "^latest$"
  # This excludes any tag containing "latest" anywhere (e.g., "not-latest-build")
  - "latest"
  # This excludes tags starting with "v1." (e.g., v1.0.0, v1.9.9)
  - "^v1\\."
  # This excludes tags ending with "-debug"
  - "-debug$"
```

## Performance Benefits

Using exclusion lists has tangible performance benefits:

1. **Reduced memory usage** -- Fewer tags are stored in the ImageRepository status.
2. **Faster ImagePolicy evaluation** -- The ImagePolicy has fewer tags to sort and filter.
3. **Lower API response sizes** -- Less data is transferred and processed per scan.

For repositories with thousands of tags (like the official nginx image), exclusion lists can significantly improve performance.

## Troubleshooting

- **Tags not being excluded**: Verify your regex patterns using a Go regex tester. Ensure proper escaping of special characters.
- **Too many tags excluded**: Review your patterns for overly broad matches. Use anchors to be more specific.

```bash
# Check the image reflector controller logs for exclusion activity
kubectl logs -n flux-system deployment/image-reflector-controller | grep -i "exclu\|filter"
```

## Summary

You have learned how to configure exclusion lists in Flux ImageRepository resources. By using well-crafted regular expressions, you can filter out irrelevant tags and focus your image automation on the tags that matter for your deployments. This improves both the accuracy and performance of your image scanning pipeline.
