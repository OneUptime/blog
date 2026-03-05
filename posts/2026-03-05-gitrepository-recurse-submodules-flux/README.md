# How to Configure GitRepository Recurse Submodules in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Git Submodules, GitRepository, Source Controller

Description: Learn how to configure Flux CD GitRepository resources to recursively clone Git submodules for projects that depend on external repositories.

---

Many projects rely on Git submodules to pull in shared libraries, configuration templates, or Helm charts from external repositories. By default, Flux does not clone submodules when it fetches a GitRepository. This guide shows you how to enable recursive submodule cloning using the `spec.recurseSubmodules` field so that your Flux deployments have access to all the code they need.

## Prerequisites

Before you begin, make sure you have:

- A Kubernetes cluster with Flux CD installed
- The Flux CLI (`flux`) installed on your local machine
- A Git repository that uses submodules
- `kubectl` access to your cluster

## Understanding Git Submodules in Flux

When Flux reconciles a GitRepository source, it clones the repository at the specified branch or tag. However, submodule directories remain empty unless you explicitly tell Flux to recurse into them. The `spec.recurseSubmodules` field controls this behavior.

## Step 1: Check Your Repository's Submodules

First, verify that your repository actually uses submodules by inspecting the `.gitmodules` file.

```bash
# Check for submodules in your repository
cat .gitmodules
```

You should see output similar to:

```text
[submodule "shared-charts"]
    path = shared-charts
    url = https://github.com/your-org/shared-charts.git
[submodule "common-configs"]
    path = common-configs
    url = https://github.com/your-org/common-configs.git
```

## Step 2: Create a GitRepository with Recurse Submodules Enabled

The following manifest defines a GitRepository that recursively clones all submodules.

```yaml
# gitrepository-with-submodules.yaml
# Enables recursive submodule cloning for the application repository
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 5m
  url: https://github.com/your-org/my-app.git
  ref:
    branch: main
  # Enable recursive submodule cloning
  recurseSubmodules: true
```

Apply this manifest to your cluster.

```bash
# Apply the GitRepository resource
kubectl apply -f gitrepository-with-submodules.yaml
```

## Step 3: Using the Flux CLI

You can also create the GitRepository with submodule support using the Flux CLI.

```bash
# Create a GitRepository source with recurse submodules enabled
flux create source git my-app \
  --url=https://github.com/your-org/my-app.git \
  --branch=main \
  --interval=5m \
  --recurse-submodules
```

## Step 4: Verify the GitRepository is Ready

After applying the resource, confirm that Flux successfully cloned the repository including its submodules.

```bash
# Check the status of the GitRepository
flux get source git my-app
```

You should see output indicating the source is ready:

```text
NAME    REVISION        SUSPENDED   READY   MESSAGE
my-app  main@sha1:abc123 False      True    stored artifact for revision 'main@sha1:abc123'
```

For more detailed status information, use kubectl.

```bash
# Get detailed status including conditions
kubectl describe gitrepository my-app -n flux-system
```

## Step 5: Handling Submodules with Authentication

If your submodules point to private repositories, you need to ensure that the credentials provided to the GitRepository also grant access to those submodule URLs. The same Secret referenced in `spec.secretRef` is used for both the main repository and its submodules.

```yaml
# gitrepository-private-submodules.yaml
# GitRepository with authentication for private submodules
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 5m
  url: https://github.com/your-org/my-app.git
  ref:
    branch: main
  recurseSubmodules: true
  # Secret must have access to both the main repo and submodule repos
  secretRef:
    name: git-credentials
---
# Secret containing credentials that work for all repositories
apiVersion: v1
kind: Secret
metadata:
  name: git-credentials
  namespace: flux-system
type: Opaque
stringData:
  # Use a personal access token with access to all relevant repos
  username: git
  password: <your-token>
```

```bash
# Apply the secret and GitRepository
kubectl apply -f gitrepository-private-submodules.yaml
```

## Step 6: Reference Submodule Content in Kustomizations

Once the GitRepository includes submodule content, you can reference paths inside submodules from your Kustomization resources.

```yaml
# kustomization-using-submodule.yaml
# Deploy resources from a submodule path
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: shared-configs
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: my-app
  # Path points into the submodule directory
  path: ./shared-charts/base
  prune: true
  targetNamespace: default
```

## Troubleshooting

If the GitRepository fails to reconcile after enabling submodules, check these common issues.

```bash
# Check events for errors related to submodule cloning
kubectl get events -n flux-system --field-selector involvedObject.name=my-app

# View source controller logs for detailed error messages
kubectl logs -n flux-system deployment/source-controller | grep my-app
```

Common problems include:

- **Authentication failures for submodule URLs**: The credentials in `secretRef` must have access to all submodule repositories, not just the main repository.
- **Submodule URL uses SSH but credentials are HTTPS**: Ensure the submodule URLs in `.gitmodules` match the authentication method you provide. You may need to use a `.gitconfig` override or update `.gitmodules` to use HTTPS URLs.
- **Nested submodules**: The `recurseSubmodules` field handles nested submodules (submodules within submodules) automatically.

## Performance Considerations

Enabling `recurseSubmodules` increases the time it takes to clone the repository because Flux must fetch additional repositories. If your submodules are large or numerous, consider:

- Increasing the `spec.timeout` field to allow more time for cloning
- Using a longer `spec.interval` to reduce the frequency of full clones
- Evaluating whether all submodules are truly needed for your deployment

```yaml
# GitRepository with extended timeout for large submodules
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 10m
  url: https://github.com/your-org/my-app.git
  ref:
    branch: main
  recurseSubmodules: true
  # Extend timeout for repositories with many or large submodules
  timeout: 3m
```

## Summary

Configuring `recurseSubmodules: true` on a Flux GitRepository resource tells the source controller to clone all Git submodules alongside the main repository. This is essential for projects that split shared code across multiple repositories. Remember to ensure your authentication credentials cover all submodule URLs, and adjust timeouts if your submodules are large.
