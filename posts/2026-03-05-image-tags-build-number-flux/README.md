# How to Configure Image Tags with Build Number for Flux Automation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Image Automation, Build Number, CI/CD

Description: Learn how to configure Flux CD image automation to select container image tags based on build numbers for predictable, sequential deployments.

---

## Introduction

When running continuous integration pipelines, many teams tag their container images with incrementing build numbers such as `build-42`, `build-43`, and so on. These numeric tags provide a clear ordering of releases and make it straightforward to identify which CI run produced a given image. Flux CD's image automation controllers can be configured to detect new build-number-based tags and automatically update your Kubernetes manifests. This guide walks through the complete setup.

## Prerequisites

- Flux CD v2.0 or later installed on your Kubernetes cluster
- Flux image-reflector-controller and image-automation-controller installed
- A container registry with images tagged using build numbers
- `kubectl` and `flux` CLI access to your cluster

## Installing Image Automation Controllers

If you have not already installed the image automation controllers, bootstrap Flux with them enabled.

```bash
# Bootstrap Flux with image automation components
flux bootstrap github \
  --owner=my-org \
  --repository=fleet-infra \
  --path=clusters/my-cluster \
  --components-extra=image-reflector-controller,image-automation-controller
```

If Flux is already bootstrapped, you can add the controllers separately.

```bash
# Install image automation controllers on an existing cluster
flux install --components-extra=image-reflector-controller,image-automation-controller
```

## Creating an ImageRepository

The ImageRepository tells Flux which container registry to scan for new tags.

```yaml
# image-automation/image-repository.yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  image: registry.example.com/my-org/my-app
  interval: 5m
  # Optional: limit scanning to tags matching a pattern
  filterTags:
    pattern: '^build-(?P<build>[0-9]+)$'
    extract: '$build'
```

The `filterTags` section uses a regular expression to match only tags that follow the `build-<number>` pattern and extracts the numeric portion for sorting.

## Creating an ImagePolicy with Numerical Ordering

The ImagePolicy defines how Flux selects the latest image from the scanned tags. For build numbers, use the `numerical` ordering policy.

```yaml
# image-automation/image-policy.yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: my-app
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  filterTags:
    pattern: '^build-(?P<build>[0-9]+)$'
    extract: '$build'
  policy:
    numerical:
      order: asc
```

The `numerical` policy with `order: asc` ensures that Flux selects the tag with the highest build number. The `asc` order means ascending, so the largest number is considered the latest.

Apply both resources and verify.

```bash
# Apply the image scanning resources
kubectl apply -f image-automation/

# Check the ImageRepository status
flux get image repository my-app -n flux-system

# Check which tag the ImagePolicy selected
flux get image policy my-app -n flux-system
```

The output should show the latest build number tag, for example `build-47`.

## Marking Deployment Manifests

Add a marker comment in your deployment manifest so Flux knows which image field to update.

```yaml
# apps/my-app/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: my-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
        - name: my-app
          image: registry.example.com/my-org/my-app:build-42 # {"$imagepolicy": "flux-system:my-app"}
          ports:
            - containerPort: 8080
```

The marker comment `{"$imagepolicy": "flux-system:my-app"}` tells the image-automation-controller to replace this image reference with the latest tag selected by the policy.

## Configuring ImageUpdateAutomation

Create an ImageUpdateAutomation resource to commit tag updates back to your Git repository.

```yaml
# image-automation/image-update-automation.yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageUpdateAutomation
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 5m
  sourceRef:
    kind: GitRepository
    name: fleet-infra
  git:
    checkout:
      ref:
        branch: main
    commit:
      author:
        name: fluxcdbot
        email: fluxcdbot@example.com
      messageTemplate: |
        Automated image update

        Automation name: {{ .AutomationObject }}

        Files:
        {{ range $filename, $_ := .Changed.FileChanges -}}
        - {{ $filename }}
        {{ end -}}

        Objects:
        {{ range $resource, $_ := .Changed.Objects -}}
        - {{ $resource.Kind }} {{ $resource.Name }}
        {{ end -}}
    push:
      branch: main
  update:
    path: ./apps
    strategy: Setters
```

## Handling Different Build Number Formats

Teams use various build number formats. Here are ImagePolicy configurations for common patterns.

For plain numeric tags like `100`, `101`, `102`:

```yaml
spec:
  filterTags:
    pattern: '^(?P<build>[0-9]+)$'
    extract: '$build'
  policy:
    numerical:
      order: asc
```

For tags with a prefix and padding like `v0042`, `v0043`:

```yaml
spec:
  filterTags:
    pattern: '^v(?P<build>[0-9]+)$'
    extract: '$build'
  policy:
    numerical:
      order: asc
```

For tags combining a branch name and build number like `main-build-55`:

```yaml
spec:
  filterTags:
    pattern: '^main-build-(?P<build>[0-9]+)$'
    extract: '$build'
  policy:
    numerical:
      order: asc
```

## Verifying the Automation

After applying all resources, verify that the full pipeline works.

```bash
# Check image repository scanning
flux get image repository my-app -n flux-system

# Check the selected image tag
flux get image policy my-app -n flux-system

# Check the automation status
flux get image update my-app -n flux-system

# View recent commits made by the automation
git log --oneline -5
```

## Troubleshooting

**ImagePolicy shows no latest image.** Check that your `filterTags` regex matches at least one tag in the registry. Test the pattern against your actual tags.

```bash
# List all tags from the image repository
kubectl describe imagerepository my-app -n flux-system
```

**Build numbers are not sorted correctly.** Ensure you are using the `numerical` policy, not `alphabetical`. Alphabetical sorting treats `9` as greater than `10` because it compares character by character.

**Automation is not creating commits.** Verify that the marker comment in your deployment manifest is syntactically correct and references the right namespace and policy name.

## Conclusion

Using build numbers as image tags provides a simple, monotonically increasing sequence that pairs well with Flux CD's numerical ordering policy. By configuring an ImageRepository to scan your registry, an ImagePolicy with numerical ordering to select the latest build, and an ImageUpdateAutomation to commit updates, you get a fully automated deployment pipeline that rolls out new builds as soon as they are pushed to your container registry.
