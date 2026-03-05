# How to Use ResourceSets for Image Update Automation in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Image Automation, ResourceSets, Templating

Description: Learn how to use Flux CD ResourceSets to template and manage image update automation resources across multiple applications and environments.

---

## Introduction

Flux CD ResourceSets provide a way to generate multiple Kubernetes resources from a single template with variable inputs. When managing image update automation across many applications, you often end up creating repetitive ImageRepository, ImagePolicy, and ImageUpdateAutomation resources. ResourceSets let you define these once as a template and instantiate them for each application, reducing boilerplate and making it easier to maintain consistency. This guide covers how to use ResourceSets to manage image automation at scale.

## Prerequisites

- Flux CD v2.3 or later installed on your Kubernetes cluster (ResourceSets require recent Flux versions)
- Flux image-reflector-controller and image-automation-controller installed
- `kubectl` and `flux` CLI access to your cluster

## The Problem: Repetitive Image Automation Resources

For each application managed by Flux image automation, you typically need three resources: an ImageRepository, an ImagePolicy, and an ImageUpdateAutomation. With ten applications, that means thirty nearly identical YAML files. ResourceSets solve this by letting you define the pattern once.

## Understanding ResourceSets

A ResourceSet is a Flux resource that takes a list of inputs and a set of resource templates. For each input entry, Flux renders the templates with the input values substituted. The result is a set of generated Kubernetes resources that Flux manages.

## Creating a ResourceSet for Image Automation

Here is a ResourceSet that generates ImageRepository and ImagePolicy resources for multiple applications.

```yaml
# image-automation/resourceset.yaml
apiVersion: fluxcd.controlplane.io/v1
kind: ResourceSet
metadata:
  name: image-automation
  namespace: flux-system
spec:
  inputs:
    - app: frontend
      image: registry.example.com/my-org/frontend
      semverRange: "^1.0.0"
    - app: backend
      image: registry.example.com/my-org/backend
      semverRange: "~2.3.0"
    - app: worker
      image: registry.example.com/my-org/worker
      semverRange: ">=1.5.0 <2.0.0"
  resources:
    - apiVersion: image.toolkit.fluxcd.io/v1
      kind: ImageRepository
      metadata:
        name: << .app >>
        namespace: flux-system
      spec:
        image: << .image >>
        interval: 5m
    - apiVersion: image.toolkit.fluxcd.io/v1
      kind: ImagePolicy
      metadata:
        name: << .app >>
        namespace: flux-system
      spec:
        imageRepositoryRef:
          name: << .app >>
        policy:
          semver:
            range: << .semverRange >>
```

Note that ResourceSets use `<< >>` delimiters for template expressions to avoid conflicts with other templating systems.

## Adding Build Number Policies

You can mix different policy types across applications by including the policy configuration in the inputs.

```yaml
apiVersion: fluxcd.controlplane.io/v1
kind: ResourceSet
metadata:
  name: image-policies-numerical
  namespace: flux-system
spec:
  inputs:
    - app: api-gateway
      image: registry.example.com/my-org/api-gateway
      tagPattern: '^build-(?P<build>[0-9]+)$'
      tagExtract: '$build'
    - app: scheduler
      image: registry.example.com/my-org/scheduler
      tagPattern: '^build-(?P<build>[0-9]+)$'
      tagExtract: '$build'
  resources:
    - apiVersion: image.toolkit.fluxcd.io/v1
      kind: ImageRepository
      metadata:
        name: << .app >>
        namespace: flux-system
      spec:
        image: << .image >>
        interval: 5m
    - apiVersion: image.toolkit.fluxcd.io/v1
      kind: ImagePolicy
      metadata:
        name: << .app >>
        namespace: flux-system
      spec:
        imageRepositoryRef:
          name: << .app >>
        filterTags:
          pattern: << .tagPattern >>
          extract: << .tagExtract >>
        policy:
          numerical:
            order: asc
```

## Shared ImageUpdateAutomation

A single ImageUpdateAutomation resource can handle updates for all image policies in a namespace. You do not need one per application.

```yaml
# image-automation/image-update-automation.yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageUpdateAutomation
metadata:
  name: all-apps
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
    path: ./apps
    strategy: Setters
```

## ResourceSet with Registry Credentials

If your applications use different registries, include the secret reference in the inputs.

```yaml
apiVersion: fluxcd.controlplane.io/v1
kind: ResourceSet
metadata:
  name: image-repos-multi-registry
  namespace: flux-system
spec:
  inputs:
    - app: public-app
      image: docker.io/my-org/public-app
      secretName: dockerhub-creds
    - app: private-app
      image: ghcr.io/my-org/private-app
      secretName: ghcr-creds
    - app: internal-app
      image: registry.internal.com/my-org/internal-app
      secretName: internal-registry-creds
  resources:
    - apiVersion: image.toolkit.fluxcd.io/v1
      kind: ImageRepository
      metadata:
        name: << .app >>
        namespace: flux-system
      spec:
        image: << .image >>
        interval: 5m
        secretRef:
          name: << .secretName >>
```

## Marking Deployment Manifests

Each application deployment needs the image policy marker.

```yaml
# apps/frontend/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
spec:
  template:
    spec:
      containers:
        - name: frontend
          image: registry.example.com/my-org/frontend:1.0.0 # {"$imagepolicy": "flux-system:frontend"}
---
# apps/backend/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
spec:
  template:
    spec:
      containers:
        - name: backend
          image: registry.example.com/my-org/backend:2.3.0 # {"$imagepolicy": "flux-system:backend"}
```

## Applying and Verifying

```bash
# Apply the ResourceSet
kubectl apply -f image-automation/resourceset.yaml

# Verify generated resources
kubectl get imagerepository -n flux-system
kubectl get imagepolicy -n flux-system

# Check the ResourceSet status
kubectl describe resourceset image-automation -n flux-system
```

## Adding a New Application

To add a new application, simply add an entry to the ResourceSet inputs. No new YAML files are needed.

```yaml
spec:
  inputs:
    # ... existing entries ...
    - app: notifications
      image: registry.example.com/my-org/notifications
      semverRange: "^3.0.0"
```

## Troubleshooting

**ResourceSet not generating resources.** Verify the ResourceSet API version and that your Flux version supports ResourceSets. Check status with `kubectl describe resourceset -n flux-system`.

**Template rendering errors.** Ensure all input fields referenced in templates are present in every input entry. Missing fields will cause rendering failures.

**Image policies not selecting tags.** Check each generated ImagePolicy individually with `flux get image policy -n flux-system` to identify which specific application has a configuration problem.

## Conclusion

ResourceSets eliminate the repetitive work of creating individual image automation resources for each application. By defining ImageRepository and ImagePolicy templates once and providing application-specific inputs, you can manage image automation for dozens of services with a single, maintainable configuration. Combined with a shared ImageUpdateAutomation resource, this approach keeps your GitOps repository clean and consistent as the number of managed applications grows.
