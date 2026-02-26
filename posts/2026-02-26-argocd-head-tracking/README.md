# How to Configure HEAD Tracking in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Git, Continuous Delivery

Description: Learn how to configure ArgoCD to track HEAD, the default branch reference, for automatic synchronization with your repository's main branch.

---

HEAD tracking is the default behavior in ArgoCD. When you create an application without specifying a `targetRevision`, or when you explicitly set it to `HEAD`, ArgoCD follows whatever the default branch of the repository is. This is a convenient shortcut, but there are nuances you should understand to use it effectively.

In this guide, we will explain how HEAD tracking works, when to use it, and the subtle differences between tracking HEAD and tracking a named branch.

## What HEAD Means in ArgoCD

In Git, `HEAD` is a symbolic reference that typically points to the default branch of a repository (usually `main` or `master`). When ArgoCD resolves `HEAD`, it queries the remote repository for the default branch and then resolves that to the latest commit.

This means:

- If your repo's default branch is `main`, tracking `HEAD` is equivalent to tracking `main`
- If someone changes the default branch from `main` to `develop`, your HEAD-tracked application will automatically switch to following `develop`

## Configuring HEAD Tracking

HEAD tracking is configured by setting `targetRevision` to `HEAD` or by omitting it entirely:

```yaml
# Explicit HEAD tracking
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/myorg/my-manifests.git
    targetRevision: HEAD
    path: k8s/manifests
  destination:
    server: https://kubernetes.default.svc
    namespace: default
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

Using the CLI, both of these are equivalent:

```bash
# Explicitly set HEAD
argocd app create my-app \
  --repo https://github.com/myorg/my-manifests.git \
  --path k8s/manifests \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace default \
  --revision HEAD

# Omit revision (defaults to HEAD)
argocd app create my-app \
  --repo https://github.com/myorg/my-manifests.git \
  --path k8s/manifests \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace default
```

## HEAD vs Named Branch Tracking

On the surface, tracking `HEAD` and tracking `main` seem identical if `main` is the default branch. But there are important differences:

| Aspect | HEAD | Named Branch (e.g., main) |
|--------|------|---------------------------|
| Resolves to | Default branch (whatever it is) | Always the specified branch |
| Survives branch rename | Yes - follows the new default | No - becomes broken |
| Explicit intent | Ambiguous | Clear |
| ArgoCD UI display | Shows "HEAD" | Shows "main" |

Here is a practical example of when this matters:

```bash
# Your app tracks HEAD, and your default branch is 'main'
# Someone renames the default branch to 'trunk'

# HEAD tracking: App continues working, now follows 'trunk'
# Named branch tracking ('main'): App breaks because 'main' no longer exists
```

## When to Use HEAD Tracking

HEAD tracking is a good fit for:

- **Simple setups** where you have one main branch and want minimal configuration
- **Template-based applications** where you do not want to hardcode branch names
- **ApplicationSets** that generate applications across multiple repos with different default branches

```yaml
# ApplicationSet that works regardless of each repo's default branch
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: team-apps
  namespace: argocd
spec:
  generators:
    - list:
        elements:
          - repo: https://github.com/myorg/service-a.git
            name: service-a
          - repo: https://github.com/myorg/service-b.git
            name: service-b
          - repo: https://github.com/myorg/service-c.git
            name: service-c
  template:
    metadata:
      name: '{{name}}'
    spec:
      source:
        repoURL: '{{repo}}'
        # HEAD works for all repos regardless of their default branch name
        targetRevision: HEAD
        path: k8s
      destination:
        server: https://kubernetes.default.svc
        namespace: '{{name}}'
      syncPolicy:
        automated:
          prune: true
```

## When NOT to Use HEAD Tracking

HEAD tracking is not ideal for:

- **Production environments**: The implicit nature of HEAD makes it too easy for unexpected changes. Use an explicit tag or commit instead. See our guide on [tracking Git tags](https://oneuptime.com/blog/post/2026-02-26-argocd-track-git-tag/view).
- **Multi-environment setups**: If you use different branches for different environments, you need explicit branch names.
- **Compliance-sensitive deployments**: Auditors prefer explicit references over symbolic ones.

## Verifying HEAD Resolution

To check what HEAD resolves to for your application:

```bash
# See the configured target revision
argocd app get my-app -o json | jq '.spec.source.targetRevision'
# Output: "HEAD"

# See the actual commit SHA that HEAD resolved to
argocd app get my-app -o json | jq '.status.sync.revision'
# Output: "a1b2c3d4e5f6..."

# See the sync status
argocd app get my-app -o json | jq '.status.sync.status'
# Output: "Synced" or "OutOfSync"
```

## HEAD Tracking with Webhooks

When using webhooks for faster sync detection, HEAD tracking works seamlessly. ArgoCD's webhook handler knows how to resolve HEAD to the appropriate branch when processing push events:

```bash
# GitHub webhook payload includes the ref (e.g., refs/heads/main)
# ArgoCD matches this against applications tracking HEAD by checking
# if the pushed branch matches the repository's default branch
```

No special webhook configuration is needed for HEAD tracking.

## Switching Away from HEAD

If you started with HEAD tracking and want to switch to a more explicit strategy:

```bash
# Switch to tracking a specific branch
argocd app set my-app --revision main

# Switch to tracking a tag
argocd app set my-app --revision v1.5.0

# Switch to a specific commit
argocd app set my-app --revision a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2
```

For the declarative approach, update your Application manifest:

```yaml
spec:
  source:
    # Change from HEAD to an explicit reference
    targetRevision: main  # or v1.5.0, or a commit SHA
```

## HEAD Behavior with Multiple Sources

If your application uses multiple sources (introduced in ArgoCD 2.6+), each source can have its own `targetRevision`. You can mix HEAD with explicit references:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
  namespace: argocd
spec:
  sources:
    - repoURL: https://github.com/myorg/helm-charts.git
      targetRevision: v1.5.0  # Explicit tag for the chart
      path: charts/my-app
      helm:
        valueFiles:
          - values.yaml
    - repoURL: https://github.com/myorg/config.git
      targetRevision: HEAD  # Track HEAD for environment config
      ref: configRepo
  destination:
    server: https://kubernetes.default.svc
    namespace: default
```

## Summary

HEAD tracking in ArgoCD is the simplest way to follow a repository's default branch. It requires no branch name configuration and survives default branch renames. Use it for development environments, simple setups, and ApplicationSets that span multiple repositories. For production and compliance-sensitive environments, prefer explicit branch names, tags, or commit SHAs to make your deployment intent clear and auditable. Read more about [switching between tracking strategies](https://oneuptime.com/blog/post/2026-02-26-argocd-switch-tracking-strategies/view) to find the right approach for each environment.
