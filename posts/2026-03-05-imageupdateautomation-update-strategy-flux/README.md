# How to Configure ImageUpdateAutomation Update Strategy in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, ImageUpdateAutomation, Image Automation, Update Strategy

Description: Learn how to configure the update strategy for Flux CD's ImageUpdateAutomation to control how image references are updated in your manifests.

---

The update strategy in Flux CD's ImageUpdateAutomation determines how the controller finds and replaces image references in your Git repository. Currently, the Setters strategy is the supported approach, and understanding how it works is essential for reliable image automation.

## Understanding the Setters Strategy

The Setters strategy uses marker comments in your YAML manifests to identify which image references should be updated. When the controller runs, it scans files in the specified path for these markers and replaces the associated values with the latest image selected by the corresponding ImagePolicy.

```yaml
apiVersion: image.toolkit.fluxcd.io/v1
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
        email: flux@example.com
        name: Flux Bot
      messageTemplate: 'Automated image update'
    push:
      branch: main
  update:
    path: ./clusters/my-cluster
    strategy: Setters
```

The two key fields under `update` are `path` and `strategy`.

## Configuring the Update Path

The `path` field restricts which directory the controller scans for marker comments. This is important for limiting the scope of automated changes:

```yaml
spec:
  update:
    path: ./clusters/my-cluster
    strategy: Setters
```

The path is relative to the root of the Git repository. Only files within this directory and its subdirectories will be scanned for image policy markers.

### Path Selection Strategies

**Single cluster, single path**:

```yaml
spec:
  update:
    path: ./clusters/production
    strategy: Setters
```

**Multiple directories via a common parent**:

```yaml
spec:
  update:
    path: ./clusters
    strategy: Setters
```

This scans all subdirectories under `clusters/`, which could include production, staging, and development manifests. Be careful with this approach as it may update images across multiple environments simultaneously.

**Application-specific path**:

```yaml
spec:
  update:
    path: ./apps/frontend
    strategy: Setters
```

This limits updates to a specific application's manifests.

## Using Setter Markers

The Setters strategy relies on inline comments that reference an ImagePolicy. The format is:

```json
# {"$imagepolicy": "<namespace>:<policy-name>"}
```

### Updating the Full Image Reference

To replace the entire image value (repository and tag):

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
spec:
  template:
    spec:
      containers:
        - name: frontend
          image: docker.io/myorg/frontend:v1.2.3 # {"$imagepolicy": "flux-system:frontend"}
```

When the `frontend` ImagePolicy selects a new tag, the controller replaces the entire value after `image:` with the policy's result.

### Updating Only the Tag

To replace only the tag portion, use the `:tag` suffix on the policy reference:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
spec:
  template:
    spec:
      containers:
        - name: frontend
          image: docker.io/myorg/frontend:v1.2.3 # {"$imagepolicy": "flux-system:frontend:tag"}
```

This is useful when you want to keep the registry and repository path unchanged and only update the tag.

### Updating Only the Image Name

To replace only the image name (registry and repository), use the `:name` suffix:

```yaml
spec:
  containers:
    - name: frontend
      image: docker.io/myorg/frontend:v1.2.3 # {"$imagepolicy": "flux-system:frontend:name"}
```

## Working with Different Resource Types

The Setters strategy works with any YAML file, not just Deployments. Here are examples for common resource types.

### CronJobs

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: data-sync
spec:
  schedule: "0 */6 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: sync
              image: docker.io/myorg/data-sync:v2.0.1 # {"$imagepolicy": "flux-system:data-sync"}
```

### StatefulSets

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: database
spec:
  template:
    spec:
      containers:
        - name: db
          image: docker.io/myorg/database:v5.3.0 # {"$imagepolicy": "flux-system:database"}
```

### Kustomize Overlays

You can place markers in Kustomize patch files:

```yaml
# kustomization patch
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
spec:
  template:
    spec:
      containers:
        - name: frontend
          image: docker.io/myorg/frontend:v1.2.3 # {"$imagepolicy": "flux-system:frontend"}
```

### HelmRelease Values

For HelmRelease resources, you can place markers on values:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app
spec:
  values:
    image:
      repository: docker.io/myorg/myapp # {"$imagepolicy": "flux-system:myapp:name"}
      tag: v1.2.3 # {"$imagepolicy": "flux-system:myapp:tag"}
```

## Multiple ImageUpdateAutomation Resources

You can create multiple ImageUpdateAutomation resources to manage different paths or different Git repositories independently:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageUpdateAutomation
metadata:
  name: apps-updater
  namespace: flux-system
spec:
  interval: 15m
  sourceRef:
    kind: GitRepository
    name: flux-system
  git:
    checkout:
      ref:
        branch: main
    commit:
      author:
        email: flux@example.com
        name: Flux Bot
      messageTemplate: 'Update app images'
    push:
      branch: main
  update:
    path: ./apps
    strategy: Setters
---
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageUpdateAutomation
metadata:
  name: infra-updater
  namespace: flux-system
spec:
  interval: 60m
  sourceRef:
    kind: GitRepository
    name: flux-system
  git:
    checkout:
      ref:
        branch: main
    commit:
      author:
        email: flux@example.com
        name: Flux Bot
      messageTemplate: 'Update infra images'
    push:
      branch: main
  update:
    path: ./infrastructure
    strategy: Setters
```

## Verifying the Update Strategy

Check that markers are being detected and updated:

```bash
# Check automation status
flux get image update --all-namespaces

# View the last applied image for each policy
flux get image policy --all-namespaces
```

If the automation runs but does not update any files, verify that your marker comments are syntactically correct and that the policy namespace and name match an existing ImagePolicy.

## Troubleshooting

**Markers not detected**: Ensure the marker comment is on the same line as the value to be updated. The comment must be valid JSON with the exact key `$imagepolicy`.

**Wrong value updated**: Check whether you need `:tag` or `:name` suffix. Without a suffix, the entire image reference is replaced.

**Path not scanned**: Verify the `update.path` matches the directory structure in your repository. The path is relative to the repository root.

**Files outside the path not updated**: This is by design. Each ImageUpdateAutomation only scans its configured path. Create additional resources for other paths if needed.

The Setters strategy provides a simple yet powerful mechanism for automated image updates. By carefully placing marker comments and configuring the update path, you maintain full control over which images are updated and where.
