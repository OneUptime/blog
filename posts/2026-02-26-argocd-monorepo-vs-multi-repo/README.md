# How to Organize Monorepo vs Multi-Repo for ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Repository Strategy, DevOps

Description: Compare monorepo and multi-repo strategies for ArgoCD GitOps deployments, including trade-offs, practical examples, and guidance on choosing the right approach for your team.

---

One of the first decisions teams face when adopting ArgoCD is whether to keep all their Kubernetes manifests in a single monorepo or spread them across multiple repositories. Both approaches work, but each comes with distinct trade-offs that affect team productivity, security, and operational complexity.

This guide breaks down both patterns with real examples so you can make the right choice for your organization.

## Understanding the Two Approaches

**Monorepo** means all Kubernetes manifests for all applications and environments live in a single Git repository. One repo, one source of truth.

**Multi-repo** means each application (or team) has its own Git repository for Kubernetes manifests. Multiple repos, distributed ownership.

## The Monorepo Approach

In a monorepo, your structure looks something like this:

```
platform-manifests/
  apps/
    frontend/
      base/
        deployment.yaml
        service.yaml
        kustomization.yaml
      overlays/
        dev/
        staging/
        production/
    backend-api/
      base/
      overlays/
        dev/
        staging/
        production/
    payment-service/
      base/
      overlays/
        dev/
        staging/
        production/
  infrastructure/
    cert-manager/
    ingress-nginx/
    monitoring/
```

Every team commits their manifest changes to this single repository. ArgoCD Applications point to different paths within the same repo.

### Monorepo Advantages

**Atomic cross-application changes.** When you need to update a shared ConfigMap and the applications that depend on it, you do it in a single commit. No coordination across repos needed.

**Simpler ApplicationSet configuration.** A single Git directory generator can discover all applications:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: all-apps
  namespace: argocd
spec:
  generators:
    - git:
        repoURL: https://github.com/myorg/platform-manifests.git
        revision: main
        directories:
          - path: apps/*/overlays/dev
  template:
    metadata:
      name: '{{path[1]}}-dev'
    spec:
      project: default
      source:
        repoURL: https://github.com/myorg/platform-manifests.git
        targetRevision: main
        path: '{{path}}'
      destination:
        server: https://kubernetes.default.svc
        namespace: '{{path[1]}}-dev'
```

**Easier dependency management.** When service A depends on service B's configuration, both are visible in the same repo. Pull requests can show the full picture.

**Single webhook configuration.** One Git webhook triggers ArgoCD reconciliation for all applications.

### Monorepo Disadvantages

**Access control is coarser.** GitHub and GitLab do not support per-directory permissions well. Every contributor with write access can modify any application's manifests. You need CODEOWNERS files and branch protection rules to compensate.

**Noisy commit history.** Every team's changes show up in the same log. Finding who changed what for a specific application requires filtering.

**Repo size growth.** As you add more applications, the repo grows. ArgoCD clones the entire repo even when it only needs one path. For very large repos, this impacts reconciliation performance.

**Blast radius.** A broken commit to the repo can affect all applications if you are not careful with your ArgoCD sync configuration.

## The Multi-Repo Approach

With multi-repo, each application or team gets its own manifest repository:

```
# Repo: myorg/frontend-manifests
frontend/
  base/
    deployment.yaml
    service.yaml
    kustomization.yaml
  overlays/
    dev/
    staging/
    production/

# Repo: myorg/backend-api-manifests
backend-api/
  base/
    deployment.yaml
    service.yaml
    kustomization.yaml
  overlays/
    dev/
    staging/
    production/

# Repo: myorg/infrastructure-manifests
infrastructure/
  cert-manager/
  ingress-nginx/
  monitoring/
```

Each ArgoCD Application points to a different repository:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: frontend-dev
  namespace: argocd
spec:
  project: frontend-team
  source:
    repoURL: https://github.com/myorg/frontend-manifests.git
    targetRevision: main
    path: frontend/overlays/dev
  destination:
    server: https://kubernetes.default.svc
    namespace: frontend-dev
```

### Multi-Repo Advantages

**Fine-grained access control.** Each team manages permissions on their own repo. The frontend team cannot accidentally modify the payment service manifests.

**Smaller clone sizes.** ArgoCD only clones the repo it needs for each application. Reconciliation is faster per application.

**Independent release cycles.** Teams can merge and deploy without waiting for other teams. No merge conflicts from unrelated changes.

**Clear ownership.** It is obvious who owns what. Each repo has its own CODEOWNERS, branch rules, and CI pipelines.

### Multi-Repo Disadvantages

**Cross-application changes require coordination.** If you need to update a shared resource and multiple applications simultaneously, you need multiple PRs across multiple repos.

**More repository credentials to manage.** ArgoCD needs credentials for each repo. You need to register each repo in ArgoCD:

```bash
# Register each repository
argocd repo add https://github.com/myorg/frontend-manifests.git \
  --username git --password $TOKEN

argocd repo add https://github.com/myorg/backend-api-manifests.git \
  --username git --password $TOKEN
```

Or use credential templates to simplify:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: repo-creds-template
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repo-creds
stringData:
  type: git
  url: https://github.com/myorg
  password: <token>
  username: git
```

**More webhook configurations.** Each repo needs its own webhook to notify ArgoCD of changes.

**ApplicationSet complexity.** You cannot use a single Git directory generator. Instead, you need the SCM provider generator or a list generator:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: all-team-apps
  namespace: argocd
spec:
  generators:
    - scmProvider:
        github:
          organization: myorg
          allBranches: false
        filters:
          - repositoryMatch: ".*-manifests$"
  template:
    metadata:
      name: '{{repository}}-dev'
    spec:
      project: default
      source:
        repoURL: '{{url}}'
        targetRevision: main
        path: overlays/dev
      destination:
        server: https://kubernetes.default.svc
        namespace: '{{repository}}-dev'
```

## The Hybrid Approach

Many teams land on a hybrid pattern. Group related applications in shared repos while keeping distinct teams or domains separate:

```
# Repo: myorg/frontend-platform (frontend team)
  web-app/
  mobile-bff/
  cdn-config/

# Repo: myorg/payment-platform (payment team)
  payment-api/
  billing-worker/
  invoice-service/

# Repo: myorg/infrastructure (platform team)
  cert-manager/
  ingress-nginx/
  monitoring/
  argocd/
```

This gives you the best of both worlds: atomic changes within a team's domain, and isolation between teams.

## Decision Framework

Choose **monorepo** when:
- You have a small team (under 10 engineers)
- Applications are tightly coupled
- You want simplicity in ArgoCD configuration
- Cross-application changes are frequent

Choose **multi-repo** when:
- You have multiple independent teams
- Strict access control is required
- Applications have independent release cycles
- Compliance requires per-team audit trails

Choose **hybrid** when:
- You have both coupled and independent applications
- Teams are growing but not fully isolated
- You want team-level autonomy with some shared infrastructure

## Summary

There is no universally correct answer to the monorepo versus multi-repo question. The right choice depends on your team size, organizational structure, security requirements, and how tightly coupled your applications are. Start with the simplest approach that meets your needs and evolve as your organization grows. ArgoCD supports all three patterns well, so you can migrate between them as requirements change.
