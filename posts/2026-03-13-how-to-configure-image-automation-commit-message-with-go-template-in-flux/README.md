# How to Configure Image Automation Commit Message with Go Template in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Image-automation, Go-Template, Commit-Message, GitOps, Kubernetes

Description: Learn how to use Go template syntax to customize Flux ImageUpdateAutomation commit messages with dynamic content about changed images.

---

## Introduction

When Flux ImageUpdateAutomation creates commits for image tag updates, the commit message is your primary record of what changed and why. Flux supports Go template syntax in the `messageTemplate` field, giving you access to variables about the automation run, changed files, and updated resources. Well-crafted commit messages make it easier to audit changes, debug issues, and understand deployment history.

This guide shows you how to use Go template syntax to create informative and structured commit messages for image automation.

## Prerequisites

- A Kubernetes cluster with Flux v2 installed
- The image-reflector-controller and image-automation-controller deployed
- At least one ImagePolicy and ImageUpdateAutomation configured
- Familiarity with Go template syntax

## Available Template Variables

The commit message template has access to several variables:

- `{{ .AutomationObject }}` - The namespace and name of the ImageUpdateAutomation resource
- `{{ .Changed.FileChanges }}` - A map of changed files to their changes
- `{{ .Changed.Objects }}` - A map of changed Kubernetes objects to their image changes
- `{{ .Changed.Changes }}` - A flat list of all individual changes

## Basic Commit Message

A simple commit message with the automation name:

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
      messageTemplate: "chore: update images via {{ .AutomationObject }}"
    push:
      branch: main
  update:
    path: ./clusters/production
    strategy: Setters
```

## Listing Changed Files

Include the list of files that were modified:

```yaml
spec:
  git:
    commit:
      author:
        name: Flux Bot
        email: flux@example.com
      messageTemplate: |
        chore: automated image update

        Automation: {{ .AutomationObject }}

        Files changed:
        {{ range $filename, $_ := .Changed.FileChanges -}}
        - {{ $filename }}
        {{ end -}}
```

This produces a commit message like:

```text
chore: automated image update

Automation: flux-system/image-updates

Files changed:
- clusters/production/apps/my-app/deployment.yaml
- clusters/production/apps/web/deployment.yaml
```

## Listing Changed Objects

Include details about which Kubernetes resources were updated:

```yaml
spec:
  git:
    commit:
      author:
        name: Flux Bot
        email: flux@example.com
      messageTemplate: |
        chore: image updates

        Updated resources:
        {{ range $resource, $changes := .Changed.Objects -}}
        - {{ $resource.Resource.Kind }}/{{ $resource.Resource.Name }} ({{ $resource.Resource.Namespace }})
        {{ end -}}
```

## Including Old and New Image Values

Show what each image changed from and to:

```yaml
spec:
  git:
    commit:
      author:
        name: Flux Bot
        email: flux@example.com
      messageTemplate: |
        chore: update container images

        Changes:
        {{ range .Changed.Changes -}}
        - {{ .OldValue }} -> {{ .NewValue }}
        {{ end -}}
```

This produces messages like:

```text
chore: update container images

Changes:
- docker.io/myorg/my-app:1.2.3 -> docker.io/myorg/my-app:1.2.4
- docker.io/myorg/web:2.0.0 -> docker.io/myorg/web:2.1.0
```

## Comprehensive Commit Message Template

Combining all available information:

```yaml
spec:
  git:
    commit:
      author:
        name: Flux Bot
        email: flux@example.com
      messageTemplate: |
        chore(images): automated update

        Automation: {{ .AutomationObject }}

        Image updates:
        {{ range .Changed.Changes -}}
        - {{ .OldValue }} -> {{ .NewValue }}
        {{ end }}
        Affected files:
        {{ range $filename, $_ := .Changed.FileChanges -}}
        - {{ $filename }}
        {{ end }}
        Affected resources:
        {{ range $resource, $_ := .Changed.Objects -}}
        - {{ $resource.Resource.Kind }}/{{ $resource.Resource.Name }}
        {{ end -}}
```

## Using Conditional Logic

You can use Go template conditionals to vary the message:

```yaml
spec:
  git:
    commit:
      author:
        name: Flux Bot
        email: flux@example.com
      messageTemplate: |
        {{ $numChanges := len .Changed.Changes -}}
        {{ if eq $numChanges 1 -}}
        chore: update 1 image
        {{ else -}}
        chore: update {{ $numChanges }} images
        {{ end }}
        {{ range .Changed.Changes -}}
        - {{ .OldValue }} -> {{ .NewValue }}
        {{ end -}}
```

## Conventional Commit Format

For teams using conventional commits:

```yaml
spec:
  git:
    commit:
      author:
        name: Flux Bot
        email: flux@example.com
      messageTemplate: |
        ci(flux): update container images [skip ci]

        Automated by {{ .AutomationObject }}

        {{ range .Changed.Changes -}}
        - {{ .OldValue }} -> {{ .NewValue }}
        {{ end -}}
```

The `[skip ci]` tag prevents CI from running on the automated commit, which is useful to avoid infinite loops where CI triggers another image build.

## Verifying the Commit Message

After the automation runs, check the commit:

```bash
git log -1 --format="%B"
```

Or check the automation events:

```bash
kubectl -n flux-system events --for ImageUpdateAutomation/image-updates
```

## Conclusion

Go template syntax in Flux ImageUpdateAutomation commit messages lets you create informative, structured records of every automated image update. By including changed files, affected resources, and old-to-new image values, your Git history becomes a clear audit trail of deployments. Use conventional commit formats for consistency with your team practices, and consider adding skip-CI tags to prevent unnecessary CI runs on automated commits.
