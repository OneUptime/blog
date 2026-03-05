# How to Configure ImagePolicy for Branch-Based Tags in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, ImagePolicy, Image Automation, Branch Tagging

Description: Learn how to configure Flux CD ImagePolicy to filter and select container image tags based on Git branch names for environment-specific deployments.

---

When teams use branch-based tagging strategies for container images, each environment deploys images built from a specific branch. For example, the staging environment uses images tagged with `staging-*` while production uses `main-*` tags. Flux CD's ImagePolicy resource supports this pattern through tag filtering with regular expressions.

## Understanding Branch-Based Tagging

A common CI convention is to tag container images with the branch name followed by a build identifier. For example:

- `main-20260305-a1b2c3d` for production
- `staging-20260305-d4e5f6a` for staging
- `develop-20260305-b7c8d9e` for development

This tagging strategy lets you control which images reach each environment by filtering on the branch prefix.

## Prerequisites

Ensure you have the Flux image automation controllers installed:

```bash
flux install --components-extra=image-reflector-controller,image-automation-controller
```

You also need an ImageRepository configured to scan your container registry:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageRepository
metadata:
  name: myapp
  namespace: flux-system
spec:
  image: docker.io/myorg/myapp
  interval: 5m
```

## Configuring ImagePolicy for a Specific Branch

To select only images tagged from the `main` branch, create an ImagePolicy with a `filterTags` pattern that matches the branch prefix:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: myapp-production
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: myapp
  filterTags:
    pattern: '^main-(?P<timestamp>[0-9]{8})-[a-f0-9]{7}$'
    extract: '$timestamp'
  policy:
    alphabetical:
      order: asc
```

This policy filters for tags starting with `main-`, extracts the date portion, and selects the latest one by alphabetical ordering. Since the timestamp format `YYYYMMDD` is lexicographically sortable, the highest value corresponds to the most recent build.

## Creating Separate Policies Per Environment

For a multi-environment setup, create distinct ImagePolicy resources for each branch. Here is the staging policy:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: myapp-staging
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: myapp
  filterTags:
    pattern: '^staging-(?P<timestamp>[0-9]{8})-[a-f0-9]{7}$'
    extract: '$timestamp'
  policy:
    alphabetical:
      order: asc
```

And the development policy:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: myapp-develop
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: myapp
  filterTags:
    pattern: '^develop-(?P<timestamp>[0-9]{8})-[a-f0-9]{7}$'
    extract: '$timestamp'
  policy:
    alphabetical:
      order: asc
```

## Using Numeric Policies with Build Numbers

If your CI system appends a build number instead of a date, you can use a numeric policy to select the highest build number:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: myapp-production
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: myapp
  filterTags:
    pattern: '^main-(?P<build>[0-9]+)$'
    extract: '$build'
  policy:
    numerical:
      order: asc
```

This matches tags like `main-142`, `main-143`, and selects the one with the highest build number.

## Applying Image Policies to Manifests

Reference the environment-specific policies in your deployment manifests using marker comments. In the production cluster directory:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
  namespace: default
spec:
  template:
    spec:
      containers:
        - name: myapp
          image: docker.io/myorg/myapp:main-20260305-a1b2c3d # {"$imagepolicy": "flux-system:myapp-production"}
```

In the staging cluster directory:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
  namespace: default
spec:
  template:
    spec:
      containers:
        - name: myapp
          image: docker.io/myorg/myapp:staging-20260305-d4e5f6a # {"$imagepolicy": "flux-system:myapp-staging"}
```

Each environment's manifests reference the corresponding ImagePolicy, so Flux updates them independently based on the branch filter.

## Handling Complex Branch Names

Some teams use branch names with slashes like `feature/my-feature` or `release/v2.0`. Since slashes are not valid in Docker tags, CI systems typically replace them with dashes. Adjust your regex accordingly:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: myapp-release
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: myapp
  filterTags:
    pattern: '^release-v2\.0-(?P<timestamp>[0-9]{14})$'
    extract: '$timestamp'
  policy:
    alphabetical:
      order: asc
```

## Setting Up ImageUpdateAutomation

To complete the automation loop, create an ImageUpdateAutomation resource that commits tag changes back to Git:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageUpdateAutomation
metadata:
  name: image-updater
  namespace: flux-system
spec:
  interval: 30m
  sourceRef:
    kind: GitRepository
    name: flux-system
  git:
    checkout:
      ref:
        branch: main
    commit:
      author:
        email: flux@myorg.com
        name: Flux Bot
      messageTemplate: 'Update {{ .AutomationObject }} images'
    push:
      branch: main
  update:
    path: ./clusters
    strategy: Setters
```

## Verifying Your Configuration

Check the status of each component:

```bash
# Verify scanned tags
flux get image repository myapp

# Check each environment's selected tag
flux get image policy myapp-production
flux get image policy myapp-staging
flux get image policy myapp-develop
```

The output for each policy should show the latest tag matching that branch prefix. If a policy shows no selected tag, verify that the regex pattern matches your actual tag format by listing the tags in your registry:

```bash
kubectl -n flux-system describe imagerepository myapp
```

Look at the `Last Scan Result` section to see which tags were discovered.

## Troubleshooting Common Issues

**No tags matched by the filter**: Double-check the regex pattern against actual tags in your registry. A common mistake is forgetting to anchor the pattern with `^` and `$`, which can lead to unexpected matches or missed tags.

**Wrong tag selected**: Verify that the extracted portion is truly sortable. If you extract a commit SHA instead of a timestamp, alphabetical sorting will not produce the correct chronological order.

**Multiple branches matching**: If branch names overlap (for example, `main` and `main-feature`), make your regex more specific. Use `^main-(?P<ts>[0-9]{8})` rather than `main` without the anchor.

Branch-based image policies give you fine-grained control over which builds reach each environment, all while maintaining the GitOps principle of declarative, version-controlled configuration.
