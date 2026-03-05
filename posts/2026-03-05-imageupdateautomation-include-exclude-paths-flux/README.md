# How to Configure ImageUpdateAutomation Include/Exclude Paths in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Image Automation, ImageUpdateAutomation, Path Filtering

Description: Learn how to configure include and exclude paths in Flux ImageUpdateAutomation to control which files are updated during automated image updates.

---

Flux image automation can automatically update container image references in your Git repository when new images are detected. However, in repositories with many manifests, you may want to restrict which files Flux modifies. The ImageUpdateAutomation resource supports include and exclude path configurations that give you fine-grained control over which directories and files are eligible for image updates. In this post, we will explore how to set up these path filters effectively.

## Why Path Filtering Matters

In a typical GitOps repository, you may have manifests for multiple environments (staging, production), shared libraries, Helm chart templates, and other files that should not be modified by automation. Without path filtering, Flux will scan and potentially modify any YAML file in the repository that contains an image policy marker. This can lead to unintended changes in files that are managed differently or belong to separate teams.

## The ImageUpdateAutomation Resource

Before diving into path filtering, here is a basic ImageUpdateAutomation resource:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageUpdateAutomation
metadata:
  name: my-app-automation
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

The `update.path` field defines the root directory that Flux will scan for image policy markers. By default, Flux scans all files under that path recursively.

## Configuring Include Paths

To restrict image updates to specific subdirectories or files, you can use the `update.path` field in combination with multiple ImageUpdateAutomation resources. Each resource targets a different path:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageUpdateAutomation
metadata:
  name: production-automation
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
      messageTemplate: "chore: update production images"
    push:
      branch: main
  update:
    path: ./clusters/production
    strategy: Setters
```

This configuration tells Flux to only look for image policy markers within the `./clusters/production` directory. Files outside this path will not be modified.

## Using Multiple Paths with Separate Resources

If you need to update images in multiple directories but exclude others, create separate ImageUpdateAutomation resources:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageUpdateAutomation
metadata:
  name: staging-automation
  namespace: flux-system
spec:
  interval: 15m
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
      messageTemplate: "chore: update staging images"
    push:
      branch: main
  update:
    path: ./clusters/staging
    strategy: Setters
---
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageUpdateAutomation
metadata:
  name: production-automation
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
      messageTemplate: "chore: update production images"
    push:
      branch: main
  update:
    path: ./clusters/production
    strategy: Setters
```

This setup ensures that staging and production image updates are handled independently with different intervals and commit messages.

## Excluding Paths by Structuring Your Repository

Flux does not provide a native exclude path field in the ImageUpdateAutomation spec. Instead, you achieve exclusion by structuring your repository so that the `update.path` only covers the directories you want modified. Consider a repository layout like this:

```
my-repo/
  clusters/
    staging/
      apps/           # Flux updates images here
      infrastructure/  # Should not be auto-updated
    production/
      apps/           # Flux updates images here
      infrastructure/  # Should not be auto-updated
  base/
    shared-configs/    # Should not be auto-updated
```

To exclude the `infrastructure` directories and the `base` directory, set the update path to target only the `apps` subdirectories:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageUpdateAutomation
metadata:
  name: staging-apps-automation
  namespace: flux-system
spec:
  interval: 15m
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
      messageTemplate: "chore: update staging app images"
    push:
      branch: main
  update:
    path: ./clusters/staging/apps
    strategy: Setters
```

## Controlling Updates with Image Policy Markers

Another way to control which files are updated is to only place image policy markers in the files you want Flux to modify. If a YAML file under the update path does not contain an image policy marker, Flux will not touch it:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    spec:
      containers:
        - name: app
          image: ghcr.io/my-org/my-app:1.0.0 # {"$imagepolicy": "flux-system:my-app-policy"}
```

Files without the `# {"$imagepolicy": ...}` comment will remain unchanged regardless of the update path setting.

## Verifying Your Configuration

After applying your ImageUpdateAutomation resources, verify they are working correctly:

```bash
flux get image update --all-namespaces
```

Check the status of each automation:

```bash
kubectl describe imageupdateautomation production-automation -n flux-system
```

Look for the `Last Automation Run Time` and `Last Push Commit` fields in the status to confirm that updates are being applied to the expected paths.

## Troubleshooting Common Issues

If images are not being updated, verify the following:

1. The `update.path` points to an existing directory in the Git repository.
2. Image policy markers are present in the YAML files under the specified path.
3. The ImagePolicy resources are resolving to newer image tags.
4. The Git credentials have write access to the target branch.

You can check the image automation logs for detailed information:

```bash
kubectl logs -n flux-system deployment/image-automation-controller
```

By carefully structuring your update paths and using image policy markers selectively, you can ensure that Flux image automation only modifies the files you intend while leaving everything else untouched.
