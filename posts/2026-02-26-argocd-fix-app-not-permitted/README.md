# How to Fix 'app is not permitted' Error in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Troubleshooting, RBAC

Description: Fix the ArgoCD 'application is not permitted' error by configuring project source repositories, destination clusters, namespaces, and resource whitelists correctly.

---

When you try to create or sync an ArgoCD application and get the error "app is not permitted," it means the application violates one or more restrictions defined in its ArgoCD Project. This is one of the most common errors for teams that are setting up multi-tenant ArgoCD environments, and the fix is always about aligning your application's configuration with what the project allows.

The full error message usually looks something like:

```text
application 'my-app' in project 'my-project' is not permitted:
application destination {https://kubernetes.default.svc production} is not permitted in project 'my-project'
```

Or:

```text
application repo https://github.com/org/repo is not permitted in project 'my-project'
```

Let us walk through every variation of this error and how to fix each one.

## Understanding ArgoCD Projects

ArgoCD Projects are the primary mechanism for restricting what applications can do. Every application belongs to a project, and the project defines:

- **Source repositories**: Which Git repos can be used as sources
- **Destinations**: Which clusters and namespaces the app can deploy to
- **Cluster resources**: Which cluster-scoped resources (like ClusterRoles) can be created
- **Namespace resources**: Which namespace-scoped resources can be created

If any of these restrictions do not match your application's configuration, you get the "not permitted" error.

## Fix 1: Source Repository Not Permitted

**Error:**

```text
application repo https://github.com/org/my-repo is not permitted in project 'team-a'
```

This means the Git repository URL in your application spec is not in the project's allowed source list.

**Check the current project sources:**

```bash
argocd proj get team-a
```

**Add the repository to the project:**

```bash
# Add a specific repo
argocd proj add-source team-a https://github.com/org/my-repo

# Or add a wildcard to allow all repos under an org
argocd proj add-source team-a 'https://github.com/org/*'
```

**Declaratively in the AppProject YAML:**

```yaml
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: team-a
  namespace: argocd
spec:
  sourceRepos:
    # Allow specific repos
    - https://github.com/org/my-repo
    - https://github.com/org/another-repo
    # Or allow all repos (use with caution)
    - '*'
```

**Common gotchas with source repos:**

- The URL must match exactly, including the `.git` suffix (or lack thereof)
- HTTPS vs SSH URLs are treated as different sources
- Trailing slashes matter

```yaml
# These are all considered different sources:
sourceRepos:
  - https://github.com/org/repo
  - https://github.com/org/repo.git
  - git@github.com:org/repo.git
```

## Fix 2: Destination Cluster Not Permitted

**Error:**

```text
application destination {https://remote-cluster:6443 default} is not permitted in project 'team-a'
```

The application is targeting a cluster that the project does not allow.

**Add the destination cluster:**

```bash
# Add a specific cluster and namespace
argocd proj add-destination team-a https://remote-cluster:6443 default

# Add a cluster with all namespaces
argocd proj add-destination team-a https://remote-cluster:6443 '*'
```

**Declaratively:**

```yaml
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: team-a
  namespace: argocd
spec:
  destinations:
    # Allow the in-cluster destination
    - server: https://kubernetes.default.svc
      namespace: team-a-dev
    - server: https://kubernetes.default.svc
      namespace: team-a-staging
    # Allow a remote cluster
    - server: https://remote-cluster:6443
      namespace: '*'
    # Or use name-based cluster reference
    - name: production-cluster
      namespace: team-a-prod
```

**Note on the in-cluster server URL:**

The local cluster is always referenced as `https://kubernetes.default.svc`. If you are using a different URL or IP, it will not match:

```yaml
# These refer to the same cluster but ArgoCD treats them differently
destinations:
  - server: https://kubernetes.default.svc  # Standard in-cluster URL
  - server: https://10.96.0.1:443           # IP-based - different!
```

Always use `https://kubernetes.default.svc` for the local cluster unless you have added it with a different URL.

## Fix 3: Destination Namespace Not Permitted

**Error:**

```text
application destination {https://kubernetes.default.svc production} is not permitted in project 'team-a'
```

The cluster is allowed, but the specific namespace is not.

**Add the namespace to the project's destinations:**

```bash
argocd proj add-destination team-a https://kubernetes.default.svc production
```

**Or use a wildcard for all namespaces:**

```yaml
spec:
  destinations:
    - server: https://kubernetes.default.svc
      namespace: '*'
```

**For more granular control, use namespace patterns:**

```yaml
spec:
  destinations:
    # Allow all namespaces starting with team-a-
    - server: https://kubernetes.default.svc
      namespace: 'team-a-*'
```

## Fix 4: Cluster Resource Not Permitted

**Error:**

```text
cluster resource ClusterRole is not permitted in project 'team-a'
```

By default, projects deny cluster-scoped resources (like ClusterRoles, ClusterRoleBindings, Namespaces, etc.).

**Allow specific cluster resources:**

```yaml
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: team-a
  namespace: argocd
spec:
  clusterResourceWhitelist:
    # Allow ClusterRoles and bindings
    - group: 'rbac.authorization.k8s.io'
      kind: 'ClusterRole'
    - group: 'rbac.authorization.k8s.io'
      kind: 'ClusterRoleBinding'
    # Allow all cluster resources (use with caution)
    - group: '*'
      kind: '*'
```

**Or deny specific cluster resources:**

```yaml
spec:
  clusterResourceBlacklist:
    - group: ''
      kind: 'Namespace'
```

## Fix 5: Namespace Resource Not Permitted

If the project explicitly restricts namespace-scoped resources:

```yaml
spec:
  namespaceResourceWhitelist:
    # Only allow these resource types
    - group: ''
      kind: 'ConfigMap'
    - group: ''
      kind: 'Secret'
    - group: 'apps'
      kind: 'Deployment'
    - group: ''
      kind: 'Service'
```

If your application creates a resource type not in this list, it will fail. Either add the resource type to the whitelist or remove the `namespaceResourceWhitelist` (which defaults to allowing everything).

## Fix 6: Using the Default Project

If you are using the `default` project, it comes with permissive settings out of the box. But if someone has modified it:

```bash
# Check the default project settings
argocd proj get default
```

**Reset the default project to allow everything:**

```yaml
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: default
  namespace: argocd
spec:
  sourceRepos:
    - '*'
  destinations:
    - server: '*'
      namespace: '*'
  clusterResourceWhitelist:
    - group: '*'
      kind: '*'
```

## Debugging Tips

**Get the full project configuration:**

```bash
# CLI output shows all restrictions
argocd proj get my-project -o yaml
```

**Compare with the application spec:**

```bash
# Get the application's source and destination
argocd app get my-app -o yaml | grep -A10 "spec:"
```

**Check which project the app belongs to:**

```bash
argocd app get my-app | grep Project
```

**Common mistakes:**

1. Creating an app in the wrong project
2. Using SSH URL in the app but HTTPS URL in the project sources
3. Forgetting to add the namespace to destinations when the cluster is already allowed
4. Trying to create cluster-scoped resources without adding them to `clusterResourceWhitelist`

## Moving an App to a Different Project

If the app should be in a different project that has the right permissions:

```bash
# Update the application's project
argocd app set my-app --project correct-project
```

Or edit the application YAML:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
  namespace: argocd
spec:
  project: correct-project  # Change this
  source:
    repoURL: https://github.com/org/repo
    path: deploy/
  destination:
    server: https://kubernetes.default.svc
    namespace: production
```

## Summary

The "app is not permitted" error is always about a mismatch between what the application wants to do and what the ArgoCD Project allows. Check the source repos, destination clusters, destination namespaces, and resource whitelists in the project configuration. Make sure they align with the application's spec. When in doubt, use `argocd proj get <project> -o yaml` to see the full list of restrictions and compare with your application's source and destination settings.
