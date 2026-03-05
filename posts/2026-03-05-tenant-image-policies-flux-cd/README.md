# How to Configure Tenant-Specific Image Policies in Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Multi-Tenancy, Image Automation, Image Policies

Description: Learn how to set up tenant-specific image policies in Flux CD to control which container image tags each tenant can deploy and enable automated image updates.

---

Flux CD's image automation controllers allow automatic deployment of new container images when they are pushed to a registry. In a multi-tenant setup, each tenant needs their own image policies to control which images and tags they can use. This guide covers how to configure per-tenant image automation.

## How Image Automation Works in Flux CD

Flux's image automation consists of three components:

1. **ImageRepository** - Scans a container registry for available tags
2. **ImagePolicy** - Selects which tag to use based on a policy (semver, alphabetical, numerical)
3. **ImageUpdateAutomation** - Commits the selected tag back to the Git repository

Each of these resources is namespace-scoped, making them suitable for multi-tenant configurations.

## Step 1: Create an ImageRepository for the Tenant

Define which container registry and repository the tenant uses.

```yaml
# tenants/team-alpha/image-repo.yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageRepository
metadata:
  name: frontend
  namespace: team-alpha
spec:
  image: registry.example.com/team-alpha/frontend
  interval: 1m
  # Optional: credentials for private registries
  secretRef:
    name: team-alpha-registry-auth
```

## Step 2: Create an Image Policy

Define a policy that selects which image tag to use. This example uses semver to always deploy the latest stable version.

```yaml
# tenants/team-alpha/image-policy-frontend.yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: frontend
  namespace: team-alpha
spec:
  imageRepositoryRef:
    name: frontend
  policy:
    semver:
      # Select the latest patch version in the 1.x range
      range: "1.x"
```

For tenants that use timestamp-based tags.

```yaml
# tenants/team-alpha/image-policy-backend.yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: backend
  namespace: team-alpha
spec:
  imageRepositoryRef:
    name: backend
  policy:
    alphabetical:
      # Select the latest tag sorted alphabetically (works for timestamp tags)
      order: asc
  filterTags:
    # Only consider tags matching this pattern
    pattern: "^main-[a-f0-9]+-(?P<ts>[0-9]+)"
    extract: "$ts"
```

## Step 3: Configure Image Update Automation

Set up automatic commits that update the image tags in the tenant's Git repository.

```yaml
# tenants/team-alpha/image-update-automation.yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageUpdateAutomation
metadata:
  name: team-alpha-auto-update
  namespace: team-alpha
spec:
  interval: 1m
  sourceRef:
    kind: GitRepository
    name: team-alpha-apps
  git:
    checkout:
      ref:
        branch: main
    commit:
      author:
        name: flux-bot
        email: flux@example.com
      messageTemplate: |
        Automated image update for team-alpha

        Automation name: {{ .AutomationObject }}

        Files:
        {{ range $filename, $_ := .Changed.FileChanges -}}
        - {{ $filename }}
        {{ end -}}

        Objects:
        {{ range $resource, $changes := .Changed.Objects -}}
        - {{ $resource.Kind }}/{{ $resource.Name }}
        {{ end -}}
    push:
      branch: main
  update:
    path: ./deploy
    strategy: Setters
```

## Step 4: Add Image Policy Markers to Tenant Manifests

The tenant adds markers in their deployment manifests that tell Flux where to update the image tag.

```yaml
# In the tenant's repository: deploy/frontend/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
  namespace: team-alpha
spec:
  replicas: 3
  selector:
    matchLabels:
      app: frontend
  template:
    metadata:
      labels:
        app: frontend
    spec:
      containers:
        - name: frontend
          image: registry.example.com/team-alpha/frontend:1.2.3 # {"$imagepolicy": "team-alpha:frontend"}
          ports:
            - containerPort: 8080
```

The comment `{"$imagepolicy": "team-alpha:frontend"}` tells Flux to update this line with the image selected by the `frontend` ImagePolicy in the `team-alpha` namespace.

## Step 5: Restrict Image Sources per Tenant

Use the ImageRepository to control which registries a tenant can pull from. Only create ImageRepository resources for approved registries.

```yaml
# tenants/team-alpha/approved-image-repos.yaml
# Only these registries are scanned for team-alpha
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageRepository
metadata:
  name: frontend
  namespace: team-alpha
spec:
  image: registry.example.com/team-alpha/frontend
  interval: 1m
---
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageRepository
metadata:
  name: backend
  namespace: team-alpha
spec:
  image: registry.example.com/team-alpha/backend
  interval: 1m
```

To prevent tenants from creating their own ImageRepository resources pointing to unauthorized registries, remove image.toolkit.fluxcd.io permissions from the tenant's RBAC role.

```yaml
# Tenant RBAC should NOT include these permissions:
# - apiGroups: ["image.toolkit.fluxcd.io"]
#   resources: ["imagerepositories", "imagepolicies", "imageupdateautomations"]
#   verbs: ["create", "update", "patch", "delete"]
```

## Step 6: Configure Different Policies per Environment

Tenants may want different image policies for staging versus production.

```yaml
# tenants/team-alpha/staging/image-policy.yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: frontend-staging
  namespace: team-alpha-staging
spec:
  imageRepositoryRef:
    name: frontend
    namespace: team-alpha
  policy:
    semver:
      # Staging gets all pre-release versions
      range: ">=1.0.0-0"
---
# tenants/team-alpha/production/image-policy.yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: frontend-production
  namespace: team-alpha-production
spec:
  imageRepositoryRef:
    name: frontend
    namespace: team-alpha
  policy:
    semver:
      # Production only gets stable releases
      range: ">=1.0.0 <2.0.0"
```

## Step 7: Verify Image Policies

Check that image scanning and policy evaluation are working.

```bash
# Check image repository scan status
flux get image repository -n team-alpha

# Check image policy evaluation
flux get image policy -n team-alpha

# Check the latest selected image
kubectl get imagepolicy frontend -n team-alpha -o yaml | grep latestImage

# Check image update automation status
flux get image update -n team-alpha

# View the last automated commit
flux get image update -n team-alpha -o wide
```

## Summary

Tenant-specific image policies in Flux CD enable automated image updates within the boundaries of each tenant's namespace. By creating ImageRepository, ImagePolicy, and ImageUpdateAutomation resources in tenant namespaces, each tenant gets independent control over their image deployment strategy. Platform administrators should restrict RBAC to prevent tenants from creating unauthorized ImageRepository resources, ensuring that only approved container registries are used.
