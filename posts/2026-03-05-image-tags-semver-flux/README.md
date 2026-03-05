# How to Configure Image Tags with SemVer for Flux Automation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Image Automation, SemVer, Semantic Versioning

Description: Learn how to configure Flux CD image automation to select container image tags based on semantic versioning ranges for controlled deployments.

---

## Introduction

Semantic versioning (SemVer) is a widely adopted versioning scheme that uses a `MAJOR.MINOR.PATCH` format to communicate the nature of changes. Flux CD has built-in support for SemVer-based image tag selection, allowing you to define version ranges that control which updates are automatically applied. For example, you can configure Flux to automatically deploy patch updates while requiring manual approval for major version bumps. This guide covers the complete setup for SemVer-based image automation.

## Prerequisites

- Flux CD v2.0 or later installed on your Kubernetes cluster
- Flux image-reflector-controller and image-automation-controller installed
- A container registry with images tagged using SemVer format
- `kubectl` and `flux` CLI access to your cluster

## Installing Image Automation Controllers

```bash
flux bootstrap github \
  --owner=my-org \
  --repository=fleet-infra \
  --path=clusters/my-cluster \
  --components-extra=image-reflector-controller,image-automation-controller
```

## Creating an ImageRepository

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
```

## Configuring ImagePolicy with SemVer

The `semver` policy type lets you define a version range constraint. Flux uses the Go semver library, which follows the SemVer 2.0.0 specification.

### Allow All Updates

To always select the latest version regardless of major, minor, or patch level:

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
  policy:
    semver:
      range: "*"
```

### Allow Only Patch Updates

To pin to a specific major and minor version and only accept patch updates (e.g., stay on 2.1.x):

```yaml
spec:
  policy:
    semver:
      range: ">=2.1.0 <2.2.0"
```

This selects versions like `2.1.0`, `2.1.1`, `2.1.5`, but not `2.2.0` or `3.0.0`.

The equivalent tilde range syntax:

```yaml
spec:
  policy:
    semver:
      range: "~2.1.0"
```

### Allow Minor and Patch Updates

To accept any minor or patch update within a major version (e.g., stay on 2.x.x):

```yaml
spec:
  policy:
    semver:
      range: ">=2.0.0 <3.0.0"
```

The equivalent caret range syntax:

```yaml
spec:
  policy:
    semver:
      range: "^2.0.0"
```

### Allow a Specific Range

To accept versions between two specific points:

```yaml
spec:
  policy:
    semver:
      range: ">=1.5.0 <1.8.0"
```

## Handling SemVer Tags with a Prefix

Many registries use a `v` prefix on version tags (e.g., `v1.2.3`). Flux's `filterTags` can strip the prefix before applying the SemVer policy.

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
    pattern: '^v(?P<version>.*)$'
    extract: '$version'
  policy:
    semver:
      range: "^2.0.0"
```

This matches tags like `v2.0.0`, `v2.1.3`, `v2.5.0` and extracts the version portion for SemVer comparison.

## SemVer Pre-Release Tags

SemVer supports pre-release identifiers like `1.2.3-rc.1` or `2.0.0-alpha.5`. By default, the SemVer policy excludes pre-release versions unless your range explicitly includes them.

To include release candidates:

```yaml
spec:
  policy:
    semver:
      range: ">=2.0.0-rc.0 <2.1.0"
```

This matches `2.0.0-rc.1`, `2.0.0-rc.2`, and `2.0.0`.

## Marking Deployment Manifests

Add the image policy marker comment to your deployment.

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
          image: registry.example.com/my-org/my-app:2.1.0 # {"$imagepolicy": "flux-system:my-app"}
          ports:
            - containerPort: 8080
```

## Configuring ImageUpdateAutomation

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

        {{ range .Changed.Objects -}}
        - {{ .Kind }} {{ .Name }}: {{ .OldValue }} -> {{ .NewValue }}
        {{ end -}}
    push:
      branch: main
  update:
    path: ./apps
    strategy: Setters
```

## Environment-Specific SemVer Ranges

A common pattern is to use different SemVer ranges per environment. Development gets all updates, staging gets minor and patch, and production only gets patches.

```yaml
# clusters/dev/image-policy.yaml
spec:
  policy:
    semver:
      range: "*"
---
# clusters/staging/image-policy.yaml
spec:
  policy:
    semver:
      range: "^2.0.0"
---
# clusters/production/image-policy.yaml
spec:
  policy:
    semver:
      range: "~2.1.0"
```

## Verifying the Setup

```bash
# Check scanned tags
flux get image repository my-app -n flux-system

# Check the selected version
flux get image policy my-app -n flux-system

# Check automation status
flux get image update my-app -n flux-system
```

## Troubleshooting

**No tags match the SemVer range.** Verify that your registry contains tags in valid SemVer format. Tags like `latest`, `stable`, or `v1.2` (missing patch) are not valid SemVer.

**Pre-release versions are not selected.** SemVer ranges exclude pre-releases by default. Include a pre-release lower bound in your range to opt in.

**Tags with a `v` prefix are ignored.** Use `filterTags` with a regex to strip the `v` prefix before SemVer comparison.

**Policy selects an unexpected version.** Run `kubectl describe imagepolicy my-app -n flux-system` to see the list of candidate versions and the applied range.

## Conclusion

SemVer-based image policies give you fine-grained control over which version updates Flux applies automatically. By choosing appropriate range constraints, you can automate patch deployments while gating minor or major changes behind manual review. Combined with environment-specific policies, this approach creates a graduated rollout pipeline where new versions flow from development through staging to production at controlled pace.
