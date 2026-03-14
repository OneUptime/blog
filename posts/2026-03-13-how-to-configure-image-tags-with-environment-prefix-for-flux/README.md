# How to Configure Image Tags with Environment Prefix for Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, fluxcd, image-automation, Kubernetes, GitOps, Image-Tags

Description: Learn how to configure Flux CD ImagePolicy to filter image tags by environment prefix such as prod-, staging-, or dev-.

---

## Introduction

When working with container registries in a multi-environment setup, it is common to prefix image tags with the target environment name. For example, tags like `prod-v1.2.3`, `staging-v1.2.3`, or `dev-v1.2.3` help teams identify which images are intended for which environment. Flux CD's image automation controllers allow you to filter and select tags based on these prefixes, ensuring that each environment only picks up images meant for it.

This guide walks you through configuring an ImagePolicy resource in Flux to filter tags by environment prefix and select the latest matching image.

## Prerequisites

- A Kubernetes cluster with Flux CD installed
- The `image-reflector-controller` and `image-automation-controller` components deployed
- An OCI-compliant container registry with images tagged using environment prefixes
- Basic familiarity with Flux CD custom resources

## Setting Up the ImageRepository

Before configuring the ImagePolicy, you need an ImageRepository resource that tells Flux which container registry to scan.

```yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  image: registry.example.com/my-app
  interval: 5m
```

This resource instructs Flux to scan the `registry.example.com/my-app` repository every five minutes and build a list of available tags.

## Configuring ImagePolicy with Environment Prefix

The ImagePolicy resource defines which tag to select from the scanned list. To filter by environment prefix, use the `filterTags` field with a regex pattern.

### Production Environment

To select only tags prefixed with `prod-` and then sort by semantic versioning:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImagePolicy
metadata:
  name: my-app-prod
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  filterTags:
    pattern: '^prod-(?P<version>.*)'
    extract: '$version'
  policy:
    semver:
      range: '>=1.0.0'
```

In this configuration, `filterTags.pattern` uses a named capture group `(?P<version>.*)` to extract the version portion after the `prod-` prefix. The `extract` field tells Flux to use the captured group named `version` for policy evaluation. The `policy.semver.range` then selects the highest semantic version from the filtered set.

### Staging Environment

For a staging environment, change the prefix in the pattern:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImagePolicy
metadata:
  name: my-app-staging
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  filterTags:
    pattern: '^staging-(?P<version>.*)'
    extract: '$version'
  policy:
    semver:
      range: '>=0.1.0-0'
```

The semver range `>=0.1.0-0` includes pre-release versions, which is useful for staging environments where you may publish release candidates.

### Development Environment

For development, you might want to select the most recent tag by timestamp rather than semver:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImagePolicy
metadata:
  name: my-app-dev
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  filterTags:
    pattern: '^dev-(?P<timestamp>\d+)'
    extract: '$timestamp'
  policy:
    numerical:
      order: asc
```

Here, the `numerical` policy with `order: asc` selects the tag with the highest numeric value, assuming tags like `dev-1710000000` where the suffix is a Unix timestamp.

## Applying the Configuration

Apply the resources to your cluster:

```bash
kubectl apply -f imagepolicy-prod.yaml
kubectl apply -f imagepolicy-staging.yaml
kubectl apply -f imagepolicy-dev.yaml
```

Verify the policy is working by checking its status:

```bash
kubectl -n flux-system get imagepolicy my-app-prod -o yaml
```

The status section will show the latest selected image:

```yaml
status:
  latestImage: registry.example.com/my-app:prod-v1.5.2
```

## Marking Deployments for Updates

To have Flux automatically update your deployment manifests, add a marker comment in your YAML:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    spec:
      containers:
        - name: my-app
          image: registry.example.com/my-app:prod-v1.5.0 # {"$imagepolicy": "flux-system:my-app-prod"}
```

The marker comment `{"$imagepolicy": "flux-system:my-app-prod"}` tells the image automation controller to replace the image reference on that line with the latest image selected by the `my-app-prod` policy.

## Troubleshooting

If the policy does not select the expected tag, check the following:

1. Verify the ImageRepository has scanned successfully:

```bash
kubectl -n flux-system describe imagerepository my-app
```

2. Check that your regex pattern matches the tags in your registry. You can list discovered tags:

```bash
kubectl -n flux-system get imagerepository my-app -o jsonpath='{.status.lastScanResult}'
```

3. Ensure the extracted portion of the tag is valid for the chosen policy type. For semver policies, the extracted string must be a valid semantic version.

## Conclusion

Configuring Flux CD ImagePolicy with environment prefix filtering gives you precise control over which images are deployed to each environment. By combining `filterTags` with appropriate policies like `semver` or `numerical`, you can automate image updates while maintaining environment isolation. This approach scales well across multiple environments and keeps your GitOps workflows clean and predictable.
