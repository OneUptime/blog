# How to Assign Git Repositories to Tenants in Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Multi-Tenancy, Git Repositories, Source Controller

Description: Learn how to assign and manage dedicated Git repositories for each tenant in a multi-tenant Flux CD environment with proper access controls.

---

In a multi-tenant Flux CD setup, each tenant typically has their own Git repository where they manage application manifests. The platform admin assigns these repositories to tenants by creating GitRepository resources within the tenant's namespace. This guide covers how to configure and manage per-tenant Git repository assignments.

## How Git Repository Assignment Works

Flux CD's source-controller manages GitRepository resources. In a multi-tenant setup, each tenant's GitRepository is created in the tenant's namespace. The tenant's Kustomization references this GitRepository and uses the tenant's service account for reconciliation, ensuring that the tenant can only deploy resources within their allowed namespaces.

## Step 1: Create a GitRepository for the Tenant

Define a GitRepository resource in the tenant's namespace that points to their application repository.

```yaml
# tenants/team-alpha/git-repo.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: team-alpha-apps
  namespace: team-alpha
spec:
  interval: 1m
  url: https://github.com/org/team-alpha-apps
  ref:
    branch: main
```

## Step 2: Configure Authentication for Private Repositories

Most tenant repositories are private. Create a Secret with the credentials and reference it in the GitRepository.

```bash
# Create a deploy key or token secret for the tenant repo
flux create secret git team-alpha-auth \
  --url=https://github.com/org/team-alpha-apps \
  --username=git \
  --password=${GITHUB_TOKEN} \
  --namespace=team-alpha \
  --export > team-alpha-auth-secret.yaml
```

For SSH-based authentication, use a deploy key instead.

```bash
# Create an SSH key secret for the tenant repo
flux create secret git team-alpha-ssh \
  --url=ssh://git@github.com/org/team-alpha-apps \
  --private-key-file=./deploy-key \
  --namespace=team-alpha \
  --export > team-alpha-ssh-secret.yaml
```

Reference the secret in the GitRepository.

```yaml
# tenants/team-alpha/git-repo.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: team-alpha-apps
  namespace: team-alpha
spec:
  interval: 1m
  url: https://github.com/org/team-alpha-apps
  ref:
    branch: main
  secretRef:
    name: team-alpha-auth
```

## Step 3: Assign Multiple Repositories to a Tenant

A tenant may have multiple repositories for different applications or environments.

```yaml
# tenants/team-alpha/git-repo-frontend.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: team-alpha-frontend
  namespace: team-alpha
spec:
  interval: 1m
  url: https://github.com/org/team-alpha-frontend
  ref:
    branch: main
  secretRef:
    name: team-alpha-auth
---
# tenants/team-alpha/git-repo-backend.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: team-alpha-backend
  namespace: team-alpha
spec:
  interval: 1m
  url: https://github.com/org/team-alpha-backend
  ref:
    branch: main
  secretRef:
    name: team-alpha-auth
```

## Step 4: Create Kustomizations That Reference Tenant Repos

Each GitRepository needs a corresponding Kustomization that tells Flux what to deploy and where.

```yaml
# tenants/team-alpha/sync-frontend.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: team-alpha-frontend
  namespace: team-alpha
spec:
  interval: 5m
  sourceRef:
    kind: GitRepository
    name: team-alpha-frontend
  path: ./deploy
  prune: true
  serviceAccountName: team-alpha
  targetNamespace: team-alpha
---
# tenants/team-alpha/sync-backend.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: team-alpha-backend
  namespace: team-alpha
spec:
  interval: 5m
  sourceRef:
    kind: GitRepository
    name: team-alpha-backend
  path: ./deploy
  prune: true
  serviceAccountName: team-alpha
  targetNamespace: team-alpha
```

## Step 5: Use a Shared Repository with Path-Based Isolation

An alternative to per-tenant repositories is a single monorepo where each tenant gets a specific path. The platform admin controls the repository, and tenants submit changes via pull requests.

```yaml
# tenants/team-alpha/git-repo-shared.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: shared-apps
  namespace: team-alpha
spec:
  interval: 1m
  url: https://github.com/org/shared-platform-apps
  ref:
    branch: main
  secretRef:
    name: platform-auth
```

Use the `path` field in the Kustomization to restrict the tenant to their directory.

```yaml
# tenants/team-alpha/sync-shared.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: team-alpha-apps
  namespace: team-alpha
spec:
  interval: 5m
  sourceRef:
    kind: GitRepository
    name: shared-apps
  # Restrict to only the team-alpha directory in the shared repo
  path: ./tenants/team-alpha
  prune: true
  serviceAccountName: team-alpha
  targetNamespace: team-alpha
```

## Step 6: Pin Repository References

For production tenants, consider pinning to a specific tag or commit rather than tracking a branch.

```yaml
# tenants/team-alpha/git-repo-pinned.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: team-alpha-apps
  namespace: team-alpha
spec:
  interval: 1m
  url: https://github.com/org/team-alpha-apps
  ref:
    # Pin to a specific semver tag
    semver: ">=1.0.0 <2.0.0"
```

## Step 7: Verify Repository Assignment

Check that the GitRepository is properly configured and syncing.

```bash
# Check the status of all git repositories in the tenant namespace
flux get sources git -n team-alpha

# Force a reconciliation
flux reconcile source git team-alpha-apps -n team-alpha

# Check for errors in the source controller logs
kubectl logs -n flux-system deployment/source-controller | grep team-alpha
```

## Security Considerations

When assigning repositories to tenants:

- Each tenant should have their own authentication credentials, stored as Secrets in their namespace
- Avoid sharing credentials between tenants
- Use read-only deploy keys when possible to prevent tenants from pushing changes through Flux
- The platform admin should create GitRepository resources, not the tenants, to prevent tenants from pointing to unauthorized repositories
- Use the `serviceAccountName` field on Kustomizations to ensure RBAC enforcement

## Summary

Assigning Git repositories to tenants in Flux CD involves creating GitRepository resources in tenant namespaces with proper authentication. Each repository is paired with a Kustomization that specifies the deployment path and enforces RBAC through the tenant's service account. Whether using per-tenant repositories or a shared monorepo with path isolation, the platform admin controls which repositories a tenant can access and what namespaces they can deploy to.
