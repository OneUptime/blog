# Configure Image Automation Commit Message with Changed Images in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, image-automation, Commit-Message, Changelog, GitOps, Kubernetes

Description: Learn how to configure Flux ImageUpdateAutomation commit messages to include a detailed list of all changed container images.

---

## Introduction

When Flux image automation updates multiple container images in a single commit, the commit message should clearly document every change. A detailed list of changed images serves as a deployment changelog, making it easy to understand what was deployed, when, and which services were affected. Flux provides template variables that let you iterate over all changed images and include their old and new values in the commit message.

This guide focuses specifically on building commit messages that list all changed images with full details, making your Git history a reliable deployment record.

## Prerequisites

- A Kubernetes cluster with Flux v2 installed
- The image-reflector-controller and image-automation-controller deployed
- Multiple ImagePolicies tracking different services
- An ImageUpdateAutomation configured
- Deployment manifests with image policy markers

## The Changed Images Data Structure

Flux provides changed image information through several template variables. The most useful for listing changed images is `.Changed.Changes`, which is a flat list of all image changes. Each change has:

- `.OldValue` - The previous image reference (registry/name:old-tag)
- `.NewValue` - The new image reference (registry/name:new-tag)

The `.Changed.Objects` variable groups changes by Kubernetes resource, and `.Changed.FileChanges` groups them by file.

## Basic Changed Images List

The simplest approach lists each change on its own line:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageUpdateAutomation
metadata:
  name: image-updates
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: my-repo
  git:
    checkout:
      ref:
        branch: main
    commit:
      author:
        name: Flux Bot
        email: flux@example.com
      messageTemplate: |
        chore: update container images

        Changed images:
        {{ range .Changed.Changes -}}
        - {{ .OldValue }} -> {{ .NewValue }}
        {{ end -}}
    push:
      branch: main
  update:
    path: ./clusters/production
    strategy: Setters
```

This produces a commit message like:

```text
chore: update container images

Changed images:
- docker.io/myorg/api:1.2.3 -> docker.io/myorg/api:1.2.4
- docker.io/myorg/web:3.0.0 -> docker.io/myorg/web:3.1.0
- docker.io/myorg/worker:2.5.1 -> docker.io/myorg/worker:2.5.2
```

## Grouping Changes by Resource

To see which Kubernetes resources each image change affects:

```yaml
spec:
  git:
    commit:
      author:
        name: Flux Bot
        email: flux@example.com
      messageTemplate: |
        chore: update container images

        {{ range $resource, $changes := .Changed.Objects -}}
        {{ $resource.Resource.Kind }}/{{ $resource.Resource.Name }}:
        {{ range $change := $changes -}}
          - {{ $change.OldValue }} -> {{ $change.NewValue }}
        {{ end }}
        {{ end -}}
```

This produces:

```yaml
chore: update container images

Deployment/api:
  - docker.io/myorg/api:1.2.3 -> docker.io/myorg/api:1.2.4

Deployment/web:
  - docker.io/myorg/web:3.0.0 -> docker.io/myorg/web:3.1.0

Deployment/worker:
  - docker.io/myorg/worker:2.5.1 -> docker.io/myorg/worker:2.5.2
```

## Grouping Changes by File

To see which manifest files were modified:

```yaml
spec:
  git:
    commit:
      author:
        name: Flux Bot
        email: flux@example.com
      messageTemplate: |
        chore: update container images

        {{ range $filename, $changes := .Changed.FileChanges -}}
        {{ $filename }}:
        {{ range $change := $changes -}}
          - {{ $change.OldValue }} -> {{ $change.NewValue }}
        {{ end }}
        {{ end -}}
```

This produces:

```yaml
chore: update container images

clusters/production/apps/api/deployment.yaml:
  - docker.io/myorg/api:1.2.3 -> docker.io/myorg/api:1.2.4

clusters/production/apps/web/deployment.yaml:
  - docker.io/myorg/web:3.0.0 -> docker.io/myorg/web:3.1.0
```

## Including a Summary Count

Add a summary line showing how many images were updated:

```yaml
spec:
  git:
    commit:
      author:
        name: Flux Bot
        email: flux@example.com
      messageTemplate: |
        chore: update {{ len .Changed.Changes }} container image(s)

        {{ range .Changed.Changes -}}
        - {{ .OldValue }} -> {{ .NewValue }}
        {{ end -}}

        Automation: {{ .AutomationObject }}
```

## Machine-Readable Format

For integration with other tools, you can format the changes in a structured way:

```yaml
spec:
  git:
    commit:
      author:
        name: Flux Bot
        email: flux@example.com
      messageTemplate: |
        chore: automated image update

        {{ range .Changed.Changes -}}
        image-update: {{ .OldValue }} -> {{ .NewValue }}
        {{ end -}}
```

The `image-update:` prefix makes it easy to parse these changes programmatically from the Git log.

## Combining with Conventional Commits

For teams that use conventional commit standards with detailed footers:

```yaml
spec:
  git:
    commit:
      author:
        name: Flux Bot
        email: flux@example.com
      messageTemplate: |
        ci(flux): update {{ len .Changed.Changes }} image(s)

        Updated by {{ .AutomationObject }}

        {{ range .Changed.Changes -}}
        Updated-Image: {{ .NewValue }}
        Previous-Image: {{ .OldValue }}
        {{ end -}}
```

## Practical Example with Multiple Services

Given a setup with three services tracked by Flux, the full configuration:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageUpdateAutomation
metadata:
  name: production-updates
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: my-repo
  git:
    checkout:
      ref:
        branch: main
    commit:
      author:
        name: Flux Bot
        email: flux@example.com
      messageTemplate: |
        chore(production): update container images

        The following images were updated in production:

        {{ range $resource, $changes := .Changed.Objects -}}
        ### {{ $resource.Resource.Kind }}/{{ $resource.Resource.Name }}
        {{ range $change := $changes -}}
        - {{ $change.OldValue }}
        + {{ $change.NewValue }}
        {{ end }}
        {{ end -}}

        ---
        Automation: {{ .AutomationObject }}
    push:
      branch: main
  update:
    path: ./clusters/production
    strategy: Setters
```

## Verifying Commit Messages

After automation runs, inspect the commits:

```bash
git log --oneline -5
git log -1 --format="%B"
```

## Conclusion

Including a detailed changed images list in your Flux automation commit messages transforms your Git history into a deployment changelog. By using Go template syntax with the `.Changed.Changes`, `.Changed.Objects`, and `.Changed.FileChanges` variables, you can format the image update information in whatever style best fits your team's workflows. Whether you prefer flat lists, grouped-by-resource views, or machine-readable formats, the template system gives you the flexibility to create commit messages that serve both human readers and automated tools.
