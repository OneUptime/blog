# How to Configure ImagePolicy to Ignore Specific Tags in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, fluxcd, image-policy, Kubernetes, GitOps, Image-Tags

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
apiVersion: image.toolkit.fluxcd.io/v1beta2
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

If your tags have varied formats but you want to exclude tags with certain prefixes, use a negative lookahead:

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
    pattern: '^(?!debug-)(?!test-)(?!nightly-)(?P<version>.+)$'
    extract: '$version'
  policy:
    semver:
      range: '>=1.0.0'
```

The negative lookahead assertions `(?!debug-)`, `(?!test-)`, and `(?!nightly-)` cause the regex to reject any tag starting with those prefixes. All other tags pass through for policy evaluation.

## Excluding the latest Tag

The `latest` tag is a common source of problems. To exclude it specifically:

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
    pattern: '^(?!latest$)v(?P<version>\d+\.\d+\.\d+)$'
    extract: '$version'
  policy:
    semver:
      range: '>=1.0.0'
```

The `(?!latest$)` assertion ensures the entire tag `latest` is excluded. Combined with the `v` prefix requirement, this is doubly protected.

## Excluding Pre-Release Tags

To exclude pre-release versions like `v1.2.0-rc.1` or `v1.2.0-beta.2`:

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
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: my-app
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  filterTags:
    pattern: '^v(?P<version>\d+\.\d+\.\d+)(?!.*(-dirty|-snapshot))$'
    extract: '$version'
  policy:
    semver:
      range: '>=1.0.0'
```

## Combining Multiple Exclusions

For complex scenarios, you can chain multiple negative lookaheads:

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
    pattern: '^(?!latest$)(?!.*-dirty$)(?!.*-snapshot$)(?!debug-)(?!test-)v(?P<version>\d+\.\d+\.\d+)$'
    extract: '$version'
  policy:
    semver:
      range: '>=1.0.0'
```

This pattern excludes `latest`, any tag ending in `-dirty` or `-snapshot`, and any tag prefixed with `debug-` or `test-`, while only matching semantic version tags.

## Verifying Exclusions

After applying the policy, confirm the selected image:

```bash
kubectl -n flux-system get imagepolicy my-app -o jsonpath='{.status.latestImage}'
```

Check for errors or unexpected selections:

```bash
kubectl -n flux-system describe imagepolicy my-app
```

Review the conditions in the status to verify the policy is reconciling successfully.

## Conclusion

Ignoring specific tags in Flux CD ImagePolicy is essential for production safety. The most robust approach is to use a positive match pattern that explicitly defines the expected tag format. For more nuanced requirements, negative lookaheads provide a way to exclude specific tags or patterns. Whichever approach you use, always verify the policy status after applying changes to confirm the correct image is being selected.
