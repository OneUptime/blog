# How to Configure Image Automation to Commit to Same Branch in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, image-automation, GitOps, Git, Kubernetes, Continuous-Deployment

Description: Learn how to configure Flux ImageUpdateAutomation to commit image tag updates directly to the same branch it checks out from.

---

## Introduction

Flux image automation can automatically update container image tags in your Git repository when new images are detected in your registry. The simplest deployment model is to have Flux commit these updates directly to the same branch it monitors, typically `main` or `production`. This creates a tight loop where image updates are committed, pushed, and then reconciled by Flux automatically.

This guide walks you through configuring ImageUpdateAutomation to commit image tag changes directly to the branch it checks out from, which is the most straightforward approach for continuous deployment.

## Prerequisites

- A Kubernetes cluster with Flux v2 installed
- The image-reflector-controller and image-automation-controller deployed
- At least one ImageRepository and ImagePolicy configured
- A GitRepository source with write access (SSH key or token with push permissions)
- Deployment manifests with image policy markers

## Setting Up Git Write Access

For Flux to push commits, the GitRepository source needs credentials with write access. Create a secret with an SSH deploy key that has write permissions:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: git-ssh-credentials
  namespace: flux-system
type: Opaque
stringData:
  identity: |
    -----BEGIN OPENSSH PRIVATE KEY-----
    <your-deploy-key-here>
    -----END OPENSSH PRIVATE KEY-----
  known_hosts: |
    github.com ssh-rsa AAAA...
```

Reference this secret in your GitRepository:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: my-repo
  namespace: flux-system
spec:
  interval: 5m
  url: ssh://git@github.com/myorg/my-repo.git
  ref:
    branch: main
  secretRef:
    name: git-ssh-credentials
```

## Configuring ImageUpdateAutomation for Same Branch

The key configuration is setting both the checkout branch and push branch to the same value:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
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
        name: flux-bot
        email: flux@example.com
      messageTemplate: "Automated image update"
    push:
      branch: main
  update:
    path: ./clusters/production
    strategy: Setters
```

In this configuration, Flux checks out the `main` branch, scans for image policy markers in the `./clusters/production` directory, updates any tags that have changed, commits the changes, and pushes back to `main`.

## Understanding the Update Loop

The workflow operates as follows:

1. A new container image is pushed to the registry
2. The ImageRepository detects the new tag during its scan interval
3. The ImagePolicy selects the new tag based on its policy rules
4. The ImageUpdateAutomation runs on its interval and detects the policy change
5. It checks out the configured branch, updates the image tags in manifests, commits, and pushes
6. The GitRepository detects the new commit and triggers reconciliation
7. The Kustomization or HelmRelease applies the updated manifests to the cluster

## Configuring the Update Path

The `update.path` field specifies which directory to scan for image policy markers. You can set it to the root of your repository or limit it to a specific directory:

```yaml
spec:
  update:
    path: ./
    strategy: Setters
```

Or scope it to a specific cluster or environment directory:

```yaml
spec:
  update:
    path: ./clusters/production/apps
    strategy: Setters
```

## Customizing the Commit Message

You can use Go template syntax in the commit message to include details about what changed:

```yaml
spec:
  git:
    commit:
      author:
        name: flux-bot
        email: flux@example.com
      messageTemplate: |
        Automated image update

        Automation: {{ .AutomationObject }}

        Files:
        {{ range $filename, $_ := .Changed.FileChanges -}}
        - {{ $filename }}
        {{ end -}}

        Objects:
        {{ range $resource, $changes := .Changed.Objects -}}
        - {{ $resource.Resource.Kind }}/{{ $resource.Resource.Name }}
        {{ end -}}
```

## Adding Image Policy Markers to Deployments

Your deployment manifests need markers so the automation knows which image references to update:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: default
spec:
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
          image: docker.io/myorg/my-app:1.2.3 # {"$imagepolicy": "flux-system:my-app"}
```

The marker comment format is `# {"$imagepolicy": "<namespace>:<imagepolicy-name>"}`.

## Handling Concurrent Updates

When Flux pushes a commit to the same branch, it may encounter conflicts if another process pushed between Flux's checkout and push. Flux handles this by retrying the operation on the next interval. If conflicts are frequent, consider increasing the automation interval or using a dedicated branch for image updates.

## Verifying the Configuration

Check the automation status:

```bash
flux get image update image-updates
```

Watch for recent commits:

```bash
git log --oneline -5
```

Check the events:

```bash
kubectl -n flux-system events --for ImageUpdateAutomation/image-updates
```

## Conclusion

Committing image updates to the same branch provides the fastest path from a new image to a running deployment. The automation loop is simple: scan, update, commit, reconcile. This approach works well for teams that practice continuous deployment and want every new image to be deployed automatically without manual intervention. For teams that need review steps or approval gates, consider committing to a separate branch and creating pull requests instead.
