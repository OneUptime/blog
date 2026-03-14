# How to Configure SemVer Image Tags with Pre-Release Suffix for Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, SemVer, Pre-Release, Image-automation, ImagePolicy, GitOps, Kubernetes

Description: Learn how to configure Flux ImagePolicy to handle SemVer image tags that include pre-release suffixes like alpha, beta, and rc.

---

## Introduction

Many teams use pre-release suffixes in their container image tags to indicate development stages. Tags like `1.2.0-alpha.1`, `1.2.0-beta.3`, or `1.2.0-rc.1` follow the SemVer specification and carry important metadata about the stability of a release. Flux ImagePolicy supports these pre-release tags through its SemVer range matching, allowing you to track either stable releases only or include pre-release versions in your automation.

This guide explains how to configure Flux ImagePolicy to work with pre-release suffixed image tags and how to control which pre-release stages your deployments track.

## Prerequisites

- A Kubernetes cluster with Flux v2 installed
- The image-reflector-controller and image-automation-controller deployed
- A container registry with images tagged using SemVer format including pre-release suffixes
- A GitRepository source configured in Flux

## How SemVer Pre-Release Ordering Works

According to the SemVer specification, a pre-release version has lower precedence than its associated release. This means `1.2.0-alpha.1` is considered lower than `1.2.0`. Pre-release versions are compared by splitting the suffix at dots and comparing each identifier. Numeric identifiers are compared as integers, and alphanumeric identifiers are compared lexically.

The ordering for a typical release cycle looks like this: `1.2.0-alpha.1 < 1.2.0-alpha.2 < 1.2.0-beta.1 < 1.2.0-rc.1 < 1.2.0`.

## Tracking Only Stable Releases

By default, a SemVer range in Flux will match pre-release tags if they fall within the range. To track only stable releases and exclude pre-releases, use a range that does not explicitly include them:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImagePolicy
metadata:
  name: my-app-stable
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  policy:
    semver:
      range: ">=1.0.0"
```

If your registry contains `1.0.0`, `1.1.0-beta.1`, and `1.1.0`, this policy selects `1.1.0` because stable releases take precedence over pre-releases in the same range.

## Including Pre-Release Tags

To explicitly include pre-release versions, you need to specify a range that covers them. The way Flux handles this follows the standard SemVer range library behavior:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImagePolicy
metadata:
  name: my-app-with-prereleases
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  policy:
    semver:
      range: ">=1.0.0-0"
```

The `-0` suffix in the range lower bound tells the SemVer library to include pre-release versions. If the registry contains `1.0.0`, `1.1.0-alpha.1`, `1.1.0-beta.2`, and `1.1.0`, this selects `1.1.0` because stable releases still have higher precedence.

## Tracking a Specific Pre-Release Channel

If you want to track only release candidates for a specific version:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImagePolicy
metadata:
  name: my-app-rc
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  policy:
    semver:
      range: ">=1.2.0-rc.0 <1.2.0"
```

This range includes all release candidate tags for version `1.2.0` but excludes the final `1.2.0` stable release. If the registry has `1.2.0-rc.1`, `1.2.0-rc.2`, and `1.2.0`, it selects `1.2.0-rc.2`.

## Tracking Beta and RC Together

To track both beta and release candidate tags for a version:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImagePolicy
metadata:
  name: my-app-pre
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  policy:
    semver:
      range: ">=1.3.0-beta.0 <1.3.0"
```

Since `beta` sorts before `rc` lexically, this range captures both beta and rc pre-releases for version `1.3.0`.

## Using Pre-Release Tags in Staging Environments

A common pattern is to run pre-release versions in staging while keeping stable versions in production. Here is the staging ImagePolicy:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImagePolicy
metadata:
  name: my-app-staging
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  policy:
    semver:
      range: ">=1.0.0-0"
```

And the production ImagePolicy:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImagePolicy
metadata:
  name: my-app-production
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  policy:
    semver:
      range: ">=1.0.0"
```

The staging policy includes pre-releases while the production policy only matches stable releases. Pair each policy with its own deployment marker:

```yaml
# Staging deployment
containers:
  - name: my-app
    image: docker.io/myorg/my-app:1.0.0-beta.1 # {"$imagepolicy": "flux-system:my-app-staging"}

# Production deployment
containers:
  - name: my-app
    image: docker.io/myorg/my-app:1.0.0 # {"$imagepolicy": "flux-system:my-app-production"}
```

## Setting Up the ImageRepository

Make sure your ImageRepository is configured to scan the registry:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  image: docker.io/myorg/my-app
  interval: 5m
```

## Verifying Pre-Release Tag Selection

Check which tag the policy has selected:

```bash
flux get image policy my-app-staging
flux get image policy my-app-production
```

You can also inspect the ImageRepository to see all discovered tags:

```bash
kubectl -n flux-system describe imagerepository my-app
```

## Conclusion

Configuring Flux ImagePolicy to handle SemVer pre-release suffixes gives you flexibility in how you roll out new versions across environments. By adjusting the version range, you can track only stable releases for production while allowing pre-release versions in staging or development clusters. The SemVer ordering rules ensure that stable releases always take precedence over their pre-release counterparts, giving you a predictable promotion path from alpha through beta and release candidate to stable.
