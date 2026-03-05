# How to Use Image Policy Markers in YAML Manifests for Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Image Policy, Image Automation, YAML Markers

Description: Learn how to use image policy markers in YAML manifests so Flux can automatically update container image references when new versions are available.

---

Flux image automation relies on special comment markers embedded in your YAML manifests to know which image references to update. These markers, known as image policy markers, connect a specific image field in your manifest to an ImagePolicy resource that determines which tag to use. In this post, we will cover how to write and place these markers correctly in plain YAML Kubernetes manifests.

## What Are Image Policy Markers

An image policy marker is a YAML inline comment that tells the Flux image automation controller which ImagePolicy should govern the value of an image field. The marker follows this format:

```yaml
# {"$imagepolicy": "namespace:policy-name"}
```

When Flux processes your manifests, it looks for these comments and replaces the image reference on the same line with the latest image resolved by the referenced ImagePolicy.

## Prerequisites

Before using image policy markers, you need three Flux image automation components in place:

1. An **ImageRepository** that tells Flux which container registry to scan.
2. An **ImagePolicy** that defines the rules for selecting a tag.
3. An **ImageUpdateAutomation** that tells Flux where and how to commit changes.

Here is a minimal setup:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  image: ghcr.io/my-org/my-app
  interval: 5m
---
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImagePolicy
metadata:
  name: my-app-policy
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  policy:
    semver:
      range: ">=1.0.0"
---
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageUpdateAutomation
metadata:
  name: my-automation
  namespace: flux-system
spec:
  interval: 30m
  sourceRef:
    kind: GitRepository
    name: my-repo
  git:
    checkout:
      ref:
        branch: main
    commit:
      author:
        name: fluxcdbot
        email: fluxcdbot@example.com
      messageTemplate: "chore: update images"
    push:
      branch: main
  update:
    path: ./clusters/production
    strategy: Setters
```

## Basic Marker Syntax for Deployments

The most common use case is marking the container image field in a Deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: default
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
        - name: app
          image: ghcr.io/my-org/my-app:1.0.0 # {"$imagepolicy": "flux-system:my-app-policy"}
          ports:
            - containerPort: 8080
```

When the ImagePolicy `my-app-policy` in the `flux-system` namespace resolves to a new tag (for example `1.2.0`), Flux will update the line to:

```yaml
          image: ghcr.io/my-org/my-app:1.2.0 # {"$imagepolicy": "flux-system:my-app-policy"}
```

## Marker Variants

Flux supports several marker variants that control what portion of the image reference is replaced.

### Full Image Reference (Default)

The default marker replaces the entire image value (registry, repository, and tag):

```yaml
image: ghcr.io/my-org/my-app:1.0.0 # {"$imagepolicy": "flux-system:my-app-policy"}
```

### Tag Only

If you want Flux to update only the tag portion, use the `:tag` suffix:

```yaml
image: ghcr.io/my-org/my-app:1.0.0 # {"$imagepolicy": "flux-system:my-app-policy:tag"}
```

This is useful when the image name is already correct and you only need the tag to change.

### Name Only

To update only the image name (repository) without changing the tag, use the `:name` suffix:

```yaml
image: ghcr.io/my-org/my-app:1.0.0 # {"$imagepolicy": "flux-system:my-app-policy:name"}
```

## Using Markers in Different Resource Types

Image policy markers work with any YAML field that holds a container image reference. Here are examples for several Kubernetes resource types.

### CronJob

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: backup-job
spec:
  schedule: "0 2 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: backup
              image: ghcr.io/my-org/backup-tool:2.1.0 # {"$imagepolicy": "flux-system:backup-policy"}
          restartPolicy: OnFailure
```

### StatefulSet

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: database
spec:
  serviceName: database
  replicas: 3
  selector:
    matchLabels:
      app: database
  template:
    metadata:
      labels:
        app: database
    spec:
      containers:
        - name: db
          image: ghcr.io/my-org/my-database:5.7.0 # {"$imagepolicy": "flux-system:database-policy"}
```

### DaemonSet

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: log-agent
spec:
  selector:
    matchLabels:
      app: log-agent
  template:
    metadata:
      labels:
        app: log-agent
    spec:
      containers:
        - name: agent
          image: ghcr.io/my-org/log-agent:3.0.1 # {"$imagepolicy": "flux-system:log-agent-policy"}
```

## Using Markers with Init Containers and Sidecars

You can place markers on any container in a pod spec, including init containers:

```yaml
spec:
  template:
    spec:
      initContainers:
        - name: migrate
          image: ghcr.io/my-org/migrator:1.5.0 # {"$imagepolicy": "flux-system:migrator-policy"}
          command: ["./migrate"]
      containers:
        - name: app
          image: ghcr.io/my-org/my-app:2.0.0 # {"$imagepolicy": "flux-system:my-app-policy"}
        - name: sidecar
          image: ghcr.io/my-org/proxy:1.1.0 # {"$imagepolicy": "flux-system:proxy-policy"}
```

Each marker references a different ImagePolicy, allowing independent version tracking for each container.

## Common Mistakes to Avoid

There are several common issues when working with image policy markers.

The marker must be on the same line as the image field. This will not work:

```yaml
# Wrong - marker on a separate line
image: ghcr.io/my-org/my-app:1.0.0
# {"$imagepolicy": "flux-system:my-app-policy"}
```

The marker must be valid JSON inside the comment. Missing quotes or braces will cause Flux to ignore it:

```yaml
# Wrong - invalid JSON
image: ghcr.io/my-org/my-app:1.0.0 # {$imagepolicy: flux-system:my-app-policy}
```

The namespace and policy name must match an existing ImagePolicy resource exactly. A typo in either will result in no updates.

## Verifying Markers Are Detected

After committing your manifests with markers, you can verify that Flux detects them:

```bash
flux get image update --all-namespaces
```

Check the automation status for the last update result:

```bash
kubectl get imageupdateautomation my-automation -n flux-system -o yaml
```

Look at the `status.lastAutomationRunTime` and `status.lastPushCommit` fields to confirm that the automation is running and pushing updates.

By placing image policy markers correctly in your YAML manifests, you enable Flux to keep your container images up to date automatically while maintaining full visibility into every change through Git commits.
