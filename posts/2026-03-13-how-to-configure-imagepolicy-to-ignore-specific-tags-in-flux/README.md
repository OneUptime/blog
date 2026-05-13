# How to Configure ImagePolicy to Ignore Specific Tags in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Fluxcd, Image-policy, Kubernetes, GitOps, Image-Tags

Description: Learn how to configure Flux CD ImagePolicy to exclude specific tags like latest, debug, or test from automated image updates.

---

## Introduction

Container registries often contain tags that should never be deployed automatically. Tags like `latest`, `debug`, `test`, or `nightly` can cause unexpected behavior if selected by Flux CD's image automation. By configuring the ImagePolicy resource with carefully crafted regex patterns, you can exclude these unwanted tags from consideration.

This guide shows you how to set up tag filtering in Flux to ignore specific tags while still selecting the correct image for deployment.

## Prerequisites

- A Kubernetes cluster with Flux CD installed
- The `image-reflector-controller` and `image-automation-controller` deployed
- A container registry with mixed tag formats
- Basic understanding of regular expressions

## The Problem with Unfiltered Tags

Without tag filtering, an ImagePolicy using a simple alphabetical or numerical policy might select tags you never intended for production. Consider a registry with these tags:

- `v1.0.0`, `v1.1.0`, `v1.2.0`
- `latest`
- `debug-v1.2.0`
- `test-20260313`
- `nightly-abc1234`

An unfiltered alphabetical policy would select `v1.2.0`, but if someone pushes a tag like `z-experimental`, it would be selected instead.

## Filtering with Positive Match Patterns

The most reliable approach is to use a positive match pattern that only allows tags matching your expected format. This implicitly ignores everything else.

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
    pattern: '^v(?P<version>\d+\.\d+\.\d+)$'
    extract: '$version'
  policy:
    semver:
      range: '>=1.0.0'
```

This pattern only matches tags that start with `v`, followed by exactly three dot-separated numbers, and nothing else. Tags like `latest`, `debug-v1.2.0`, and `nightly-abc1234` are automatically excluded because they do not match the pattern.

## Excluding Specific Prefixes

Flux uses Go regular expressions for tag filters, so lookahead assertions are not supported. If your tags have varied formats but you want to exclude tags with certain prefixes, write the filter as a positive match for the tag formats you do want:

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
    pattern: '^(?:release-|prod-)?v(?P<version>\d+\.\d+\.\d+)$'
    extract: '$version'
  policy:
    semver:
      range: '>=1.0.0'
```

This pattern allows tags such as `v1.2.0`, `release-v1.2.0`, and `prod-v1.2.0`. Tags starting with prefixes like `debug-`, `test-`, or `nightly-` are excluded because they do not match the allowed formats.

## Excluding the latest Tag

The `latest` tag is a common source of problems. To exclude it specifically:

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
    pattern: '^v(?P<version>\d+\.\d+\.\d+)$'
    extract: '$version'
  policy:
    semver:
      range: '>=1.0.0'
```

The `v` prefix and numeric version requirement ensure the tag `latest` is excluded because it does not match the allowed format.

## Excluding Pre-Release Tags

To exclude pre-release versions like `v1.2.0-rc.1` or `v1.2.0-beta.2`:

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
    pattern: '^v(?P<version>\d+\.\d+\.\d+)$'
    extract: '$version'
  policy:
    semver:
      range: '>=1.0.0'
```

By anchoring the pattern with `$` right after the three-part version number, any tag with a pre-release suffix is excluded because the regex requires the string to end immediately after the patch number.

## Excluding Tags with Specific Suffixes

To ignore tags ending in `-dirty` or `-snapshot`:

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
    pattern: '^v(?P<version>\d+\.\d+\.\d+)$'
    extract: '$version'
  policy:
    semver:
      range: '>=1.0.0'
```

The same anchored positive pattern ignores `v1.2.0-dirty` and `v1.2.0-snapshot` because it only allows the tag to contain the three-part version after `v`.

## Combining Multiple Exclusions

For complex scenarios, combine the allowed formats into one positive pattern:

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
    pattern: '^(?:release-|prod-)?v(?P<version>\d+\.\d+\.\d+)$'
    extract: '$version'
  policy:
    semver:
      range: '>=1.0.0'
```

This pattern excludes `latest`, any tag ending in `-dirty` or `-snapshot`, and any tag prefixed with `debug-` or `test-`, because it only matches the approved semantic version tag formats.

## Verifying Exclusions

After applying the policy, confirm the selected image:

```bash
kubectl -n flux-system get imagepolicy my-app -o jsonpath='{.status.latestRef.image}:{.status.latestRef.tag}'
```

Check for errors or unexpected selections:

```bash
kubectl -n flux-system describe imagepolicy my-app
```

Review the conditions in the status to verify the policy is reconciling successfully.

## Conclusion

Ignoring specific tags in Flux CD ImagePolicy is essential for production safety. The most robust approach is to use a positive match pattern that explicitly defines the expected tag format. Whichever approach you use, always verify the policy status after applying changes to confirm the correct image is being selected.
