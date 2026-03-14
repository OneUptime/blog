# Migrate Image Automation from Flux v1 to v2: Quick Start Guide

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Image Automation, Migration, Flux v1, Flux v2

Description: Learn how to migrate your image update automation from Flux v1 to Flux v2, including mapping annotations to image policies and update automation resources.

---

## Introduction

Flux v1 handled image automation through annotations on workload resources. You would annotate a Deployment with `fluxcd.io/automated: "true"` and Flux would scan registries and update image tags directly. Flux v2 takes a fundamentally different approach with dedicated Custom Resources: ImageRepository, ImagePolicy, and ImageUpdateAutomation. This guide walks through the migration process step by step.

## Key Differences Between v1 and v2

In Flux v1, image automation was configured through workload annotations:

```yaml
# Flux v1 style - annotations on the Deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  annotations:
    fluxcd.io/automated: "true"
    fluxcd.io/tag.my-app: semver:~1.0
```

In Flux v2, image automation uses three separate Custom Resources:

1. **ImageRepository** - Defines which registry to scan
2. **ImagePolicy** - Defines how to select the latest tag
3. **ImageUpdateAutomation** - Defines how to commit changes back to Git

## Migration Steps Overview

1. Install Flux v2 image automation controllers
2. Create ImageRepository resources for each scanned registry
3. Create ImagePolicy resources to replace annotation-based tag filters
4. Add marker comments to deployment manifests
5. Create ImageUpdateAutomation to replace the automated commit behavior
6. Remove Flux v1 annotations
7. Decommission Flux v1

## Step 1: Install Image Automation Controllers

Flux v2 image automation is not included by default. Install the extra controllers.

```bash
flux install --components-extra=image-reflector-controller,image-automation-controller
```

Or if bootstrapping fresh:

```bash
flux bootstrap github \
  --owner=my-org \
  --repository=fleet-infra \
  --path=clusters/my-cluster \
  --components-extra=image-reflector-controller,image-automation-controller
```

## Step 2: Map v1 Annotations to ImageRepository

For each unique container image referenced in your v1-annotated workloads, create an ImageRepository.

Flux v1 would scan all images referenced by annotated workloads automatically. In v2, you must be explicit.

```yaml
# v1: No separate resource needed - scanning was implicit
# v2: Create an ImageRepository for each image
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  image: registry.example.com/my-org/my-app
  interval: 5m
```

If your v1 setup used a private registry, create registry credentials.

```bash
kubectl create secret docker-registry regcred \
  --namespace flux-system \
  --docker-server=registry.example.com \
  --docker-username=user \
  --docker-password=pass
```

Reference the secret in the ImageRepository:

```yaml
spec:
  secretRef:
    name: regcred
```

## Step 3: Map v1 Tag Filters to ImagePolicy

Flux v1 used annotation values to define tag filtering. Here is how each v1 filter maps to v2.

### SemVer Filter

```yaml
# v1 annotation
fluxcd.io/tag.my-app: semver:~1.0

# v2 ImagePolicy
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImagePolicy
metadata:
  name: my-app
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  policy:
    semver:
      range: "~1.0.0"
```

### Glob Filter

```yaml
# v1 annotation
fluxcd.io/tag.my-app: glob:main-*

# v2 ImagePolicy (use filterTags + alphabetical)
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImagePolicy
metadata:
  name: my-app
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  filterTags:
    pattern: '^main-(?P<ts>.+)$'
    extract: '$ts'
  policy:
    alphabetical:
      order: asc
```

### Regex Filter

```yaml
# v1 annotation
fluxcd.io/tag.my-app: regexp:^build-[0-9]+$

# v2 ImagePolicy
apiVersion: image.toolkit.fluxcd.io/v1
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

## Step 4: Replace Annotations with Marker Comments

Flux v1 used annotations on the resource. Flux v2 uses inline comments on the image field.

```yaml
# v1: Annotation-driven
metadata:
  annotations:
    fluxcd.io/automated: "true"
    fluxcd.io/tag.my-app: semver:~1.0
spec:
  template:
    spec:
      containers:
        - name: my-app
          image: registry.example.com/my-org/my-app:1.0.5

# v2: Marker comment on the image line
spec:
  template:
    spec:
      containers:
        - name: my-app
          image: registry.example.com/my-org/my-app:1.0.5 # {"$imagepolicy": "flux-system:my-app"}
```

## Step 5: Create ImageUpdateAutomation

In v1, Flux committed directly to the repo it was watching. In v2, you configure this behavior explicitly.

```yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageUpdateAutomation
metadata:
  name: flux-system
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

        {{ range $resource, $_ := .Changed.Objects -}}
        - {{ $resource.Kind }} {{ $resource.Name }}
        {{ end -}}
    push:
      branch: main
  update:
    path: ./
    strategy: Setters
```

## Step 6: Verify and Remove v1 Annotations

Apply the v2 resources and verify they work before removing v1 configuration.

```bash
# Verify image scanning
flux get image repository --all-namespaces

# Verify policy selection
flux get image policy --all-namespaces

# Verify automation
flux get image update --all-namespaces
```

Once confirmed, remove the Flux v1 annotations from your deployments:

```yaml
# Remove these annotations
metadata:
  annotations:
    fluxcd.io/automated: "true"       # Remove
    fluxcd.io/tag.my-app: semver:~1.0 # Remove
```

## Step 7: Decommission Flux v1

After confirming v2 image automation works correctly, remove the Flux v1 operator.

```bash
# Delete the Flux v1 deployment
kubectl delete deployment flux -n flux

# Remove Flux v1 CRDs if no longer needed
kubectl delete crd fluxhelmreleases.helm.integrations.flux.weave.works
```

## Migration Checklist

- Identify all Deployments with `fluxcd.io/automated` annotations
- Create an ImageRepository for each unique container image
- Map each `fluxcd.io/tag.*` annotation to an ImagePolicy
- Add `$imagepolicy` marker comments to all image lines
- Create an ImageUpdateAutomation resource
- Test that new images are detected and committed
- Remove Flux v1 annotations
- Remove Flux v1 operator

## Conclusion

Migrating image automation from Flux v1 to v2 requires replacing implicit annotation-based configuration with explicit Custom Resources. While this involves more YAML upfront, the v2 approach provides better visibility through dedicated status fields, more flexible tag filtering with regex support, and clearer separation of concerns between scanning, policy selection, and Git automation. Plan the migration methodically by mapping each v1 annotation to its v2 equivalent and testing thoroughly before decommissioning v1.
