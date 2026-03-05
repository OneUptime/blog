# How to Use Remote Kustomize Bases with Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Kustomize, Remote Bases, GitRepository, OCIRepository

Description: Learn how to reference remote Kustomize bases from external Git repositories or OCI registries in your Flux CD deployments using multiple source strategies.

---

## Introduction

As organizations grow, teams often want to share Kubernetes configurations across repositories. A platform team might maintain base manifests for common services, while application teams customize those bases for their specific needs. Kustomize supports referencing remote bases via URLs, but Flux CD offers more robust approaches through its source controller.

This guide covers three strategies for using remote Kustomize bases with Flux: native Kustomize remote resources, Flux GitRepository sources, and Flux OCIRepository sources.

## Strategy 1: Kustomize Remote Resources

Kustomize natively supports referencing remote Git repositories in the `resources` field using URL syntax.

```yaml
# apps/myapp/overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  # Reference a remote base from a Git repository
  # Format: https://github.com/{org}/{repo}/{path}?ref={tag-or-branch}
  - https://github.com/myorg/platform-bases//microservice/base?ref=v1.2.0

# Apply local customizations on top of the remote base
replicas:
  - name: myapp
    count: 3

images:
  - name: myorg/microservice
    newName: myorg/myapp
    newTag: "v2.0.0"
```

Note the double slash `//` before the path within the repository. This separates the repository URL from the path inside it.

### Limitations of This Approach

- Flux must be able to reach the remote Git URL at reconciliation time
- Authentication for private repositories requires additional configuration
- No caching -- the remote base is fetched on every reconciliation
- Version pinning depends on the `?ref=` parameter

This approach works for public repositories or quick prototyping, but the following strategies are better suited for production use.

## Strategy 2: Flux GitRepository Sources

The recommended approach is to use Flux's `GitRepository` source to fetch the remote repository, then reference it from a Flux Kustomization. This gives you authentication, caching, version control, and status monitoring.

### Step 1: Define the Remote GitRepository Source

Create a GitRepository resource pointing to the repository that contains the shared bases.

```yaml
# clusters/my-cluster/sources/platform-bases.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: platform-bases
  namespace: flux-system
spec:
  interval: 30m
  url: https://github.com/myorg/platform-bases
  ref:
    # Pin to a specific tag for stability
    tag: v1.2.0
  # For private repos, provide credentials
  secretRef:
    name: platform-bases-auth
```

If the remote repository is private, create a Secret with authentication credentials.

```bash
# Create a secret with a GitHub personal access token
flux create secret git platform-bases-auth \
  --url=https://github.com/myorg/platform-bases \
  --username=git \
  --password=$GITHUB_TOKEN
```

### Step 2: Create the Local Overlay

In your application repository, create an overlay that expects the remote base to be available at a known path. The overlay only needs to contain the customizations.

```yaml
# apps/myapp/overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  # This path will be resolved relative to the Flux Kustomization's path
  # Flux handles mounting the remote source
  - deployment.yaml
  - service.yaml

replicas:
  - name: myapp
    count: 5

images:
  - name: myorg/myapp
    newTag: "v2.0.0"
```

### Step 3: Use Flux Kustomization with Cross-Reference

There are two approaches to combine the remote base with local overlays.

**Approach A: Use the remote source directly**

If the remote repository already contains a complete, ready-to-deploy Kustomize structure, point the Flux Kustomization directly at it and use `patches` or `postBuild` for customization.

```yaml
# clusters/my-cluster/myapp-production.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: myapp-production
  namespace: flux-system
spec:
  interval: 10m
  # Point to the path within the remote repository
  path: ./microservice/base
  prune: true
  sourceRef:
    kind: GitRepository
    name: platform-bases    # references the remote GitRepository
  targetNamespace: production
  # Use Flux's built-in patches to customize
  patches:
    - patch: |
        apiVersion: apps/v1
        kind: Deployment
        metadata:
          name: microservice
        spec:
          replicas: 5
      target:
        kind: Deployment
        name: microservice
```

**Approach B: Use dependsOn with two Kustomizations**

Deploy the remote base first, then apply local customizations.

```yaml
# Deploy the base from the remote repository
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: myapp-base
  namespace: flux-system
spec:
  interval: 10m
  path: ./microservice/base
  prune: true
  sourceRef:
    kind: GitRepository
    name: platform-bases
  targetNamespace: production
---
# Apply local customizations that depend on the base
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: myapp-overrides
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps/myapp/overlays/production
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system     # local repository
  targetNamespace: production
  dependsOn:
    - name: myapp-base
```

## Strategy 3: OCI Repository Sources

Flux can also fetch Kustomize bases packaged as OCI artifacts. This is useful when you want to version and distribute bases like software packages.

### Step 1: Package and Push the Base as an OCI Artifact

Use the Flux CLI to package a Kustomize directory and push it to an OCI registry.

```bash
# Package the base directory as an OCI artifact
flux push artifact oci://ghcr.io/myorg/platform-bases/microservice:v1.2.0 \
  --path=./microservice/base \
  --source="https://github.com/myorg/platform-bases" \
  --revision="v1.2.0"
```

### Step 2: Define an OCIRepository Source

```yaml
# clusters/my-cluster/sources/microservice-base.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: OCIRepository
metadata:
  name: microservice-base
  namespace: flux-system
spec:
  interval: 30m
  url: oci://ghcr.io/myorg/platform-bases/microservice
  ref:
    tag: v1.2.0
  # For private registries
  secretRef:
    name: ghcr-auth
```

### Step 3: Reference the OCI Source in a Flux Kustomization

```yaml
# clusters/my-cluster/myapp-production.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: myapp-production
  namespace: flux-system
spec:
  interval: 10m
  path: ./
  prune: true
  sourceRef:
    kind: OCIRepository
    name: microservice-base
  targetNamespace: production
  patches:
    - patch: |
        apiVersion: apps/v1
        kind: Deployment
        metadata:
          name: microservice
        spec:
          replicas: 5
      target:
        kind: Deployment
```

## Version Management

Regardless of which strategy you use, pinning to specific versions is critical for production stability.

```yaml
# GitRepository: pin to a semver range
spec:
  ref:
    semver: ">=1.0.0 <2.0.0"

# GitRepository: pin to an exact tag
spec:
  ref:
    tag: v1.2.0

# GitRepository: pin to a specific commit
spec:
  ref:
    commit: abc123def456

# OCIRepository: pin to a tag
spec:
  ref:
    tag: v1.2.0

# OCIRepository: pin to a digest
spec:
  ref:
    digest: sha256:abc123...
```

## Comparing the Three Strategies

| Feature | Kustomize Remote | GitRepository | OCIRepository |
|---------|-----------------|---------------|---------------|
| Authentication | Complex | Built-in | Built-in |
| Caching | None | Yes | Yes |
| Version pinning | URL param | tag/semver/commit | tag/digest |
| Status monitoring | No | Yes | Yes |
| Private repos | Difficult | Easy | Easy |
| Offline support | No | Cached locally | Cached locally |

## Reconciliation and Verification

```bash
# Check the status of the remote source
flux get sources git platform-bases

# Check the Kustomization status
flux get kustomizations myapp-production

# Force a refresh of the remote source
flux reconcile source git platform-bases

# Reconcile the Kustomization
flux reconcile kustomization myapp-production --with-source
```

## Conclusion

Remote Kustomize bases enable configuration sharing across teams and repositories. For production use, Flux's GitRepository and OCIRepository sources are strongly preferred over native Kustomize remote resources because they provide authentication, caching, version management, and status monitoring. Use GitRepository for Git-based workflows and OCIRepository when you want to distribute bases as versioned packages. Pin to specific versions in production to avoid unexpected changes.
