# How to Use Git Submodules with ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Git Submodules, Repository Management

Description: Learn how to configure ArgoCD to work with Git submodules for sharing common manifests across multiple deployment repositories.

---

Git submodules let you embed one Git repository inside another. In ArgoCD workflows, this is useful when multiple service repos need to share common Kubernetes manifests - things like monitoring configs, network policies, or base Helm charts. But submodules have quirks that can trip up ArgoCD if you do not configure things correctly.

## Why Use Submodules with ArgoCD

The most common use case is sharing base manifests across services. Instead of copying the same monitoring configuration into every service repo, you maintain it once in a shared repo and reference it as a submodule:

```
backend-api-config/
├── base/
│   ├── kustomization.yaml
│   └── deployment.yaml
├── overlays/
│   └── production/
└── shared/                    # Git submodule pointing to shared-configs repo
    ├── monitoring/
    │   ├── service-monitor.yaml
    │   └── prometheus-rules.yaml
    └── network-policies/
        └── default-deny.yaml
```

When you update the shared repo, all services get the update by bumping their submodule reference.

## Enabling Submodule Support in ArgoCD

By default, ArgoCD does not recurse into submodules when cloning a repository. You need to enable it in the ArgoCD configuration.

There are two ways to enable submodule support:

### Option 1: Global Setting

Edit the argocd-cmd-params-cm ConfigMap:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cmd-params-cm
  namespace: argocd
data:
  # Enable submodule support for all repos
  reposerver.enable.git.submodule: "true"
```

After updating this ConfigMap, restart the repo-server:

```bash
kubectl rollout restart deployment argocd-repo-server -n argocd
```

### Option 2: Per-Repository Setting

If you only want submodules for specific repos, configure it in the repository definition:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: backend-api-config-repo
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
stringData:
  type: git
  url: https://github.com/myorg/backend-api-config
  password: ghp_xxxxxxxxxxxx
  username: argocd-bot
  enableOCI: "false"
  enableLfs: "false"
```

Note that per-repo submodule toggle is controlled by the global setting in most ArgoCD versions. Check your version's documentation for the exact configuration.

## Submodule Authentication

The tricky part is authentication. When ArgoCD clones your main repo and tries to recurse into submodules, the submodule repos need their own authentication. If your submodule URL uses SSH but ArgoCD is configured with HTTPS, the clone will fail.

Make sure your submodule URLs match how ArgoCD accesses repos. Check your .gitmodules file:

```ini
# .gitmodules
[submodule "shared"]
    path = shared
    url = https://github.com/myorg/shared-configs.git
```

If you use SSH URLs in .gitmodules:

```ini
[submodule "shared"]
    path = shared
    url = git@github.com:myorg/shared-configs.git
```

Then ArgoCD needs SSH credentials for that repo. The easiest approach is to use repository credential templates that match both repos:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: myorg-repo-creds
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repo-creds
stringData:
  type: git
  url: https://github.com/myorg
  password: ghp_xxxxxxxxxxxx
  username: argocd-bot
```

This template matches any repo under `https://github.com/myorg`, so both the main repo and the submodule repo can authenticate.

## Setting Up the Submodule

Add the shared repo as a submodule in your config repo:

```bash
cd backend-api-config
git submodule add https://github.com/myorg/shared-configs.git shared
git commit -m "add shared-configs submodule"
git push
```

Reference the submodule files in your Kustomize configuration:

```yaml
# base/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - deployment.yaml
  - service.yaml
  - ../shared/monitoring/service-monitor.yaml
  - ../shared/network-policies/default-deny.yaml
```

## Pinning Submodule Versions

Submodules are always pinned to a specific commit. This is actually a benefit for GitOps because you get reproducible deployments. The submodule reference in your repo points to an exact commit SHA, not a branch.

Update the submodule to the latest version of the shared repo:

```bash
cd backend-api-config
cd shared
git fetch
git checkout v1.3.0  # Or a specific commit
cd ..
git add shared
git commit -m "update shared-configs to v1.3.0"
git push
```

ArgoCD detects the submodule reference change and triggers a sync.

## Automating Submodule Updates

You can automate submodule bumps with a GitHub Action in your config repo:

```yaml
# .github/workflows/update-submodules.yaml
name: Update Submodules
on:
  repository_dispatch:
    types: [shared-configs-updated]
  schedule:
    - cron: "0 6 * * 1"  # Weekly on Monday

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          submodules: true
          token: ${{ secrets.PAT_TOKEN }}

      - name: Update submodules
        run: |
          git submodule update --remote
          if git diff --quiet; then
            echo "No submodule updates"
            exit 0
          fi

          git config user.name "CI Bot"
          git config user.email "ci@myorg.com"
          git add .
          git commit -m "chore: update shared-configs submodule"

      - name: Create PR
        uses: peter-evans/create-pull-request@v6
        with:
          title: "Update shared-configs submodule"
          body: "Automated update of the shared-configs submodule to latest version."
          branch: update-submodules
```

## ArgoCD Application Configuration

Your ArgoCD Application does not need any special configuration for submodules, as long as the global setting is enabled:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: backend-api
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/myorg/backend-api-config
    targetRevision: main
    path: overlays/production
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

ArgoCD clones the repo, initializes submodules, and then processes the manifests normally.

## Common Issues and Fixes

### Submodule Not Cloned

If ArgoCD shows errors about missing files in the submodule path, check:

```bash
# Verify submodule support is enabled
kubectl get configmap argocd-cmd-params-cm -n argocd -o yaml | grep submodule
```

If the setting is missing, add it and restart the repo-server.

### Authentication Failures

If the main repo clones but the submodule fails, the credentials do not match the submodule URL. Check your .gitmodules:

```bash
# In your repo
cat .gitmodules
```

Make sure the URL format (HTTPS vs SSH) matches your ArgoCD credential configuration. A common fix is to add insteadOf rules, but since ArgoCD manages its own Git client, you need to ensure credentials are configured for the exact URL pattern.

### Slow Sync Times

Submodules add clone time because ArgoCD must fetch additional repos. If you notice slow syncs:

1. Keep submodule repos small
2. Use shallow clones if your ArgoCD version supports it
3. The repo-server caches cloned repos, so subsequent syncs are faster

### Nested Submodules

ArgoCD supports recursive submodules (submodules within submodules), but this is rarely needed and adds complexity. Avoid nesting submodules more than one level deep.

## Alternatives to Submodules

Before committing to submodules, consider these alternatives:

1. **Kustomize remote bases** - Reference remote repos directly in kustomization.yaml:

```yaml
resources:
  - https://github.com/myorg/shared-configs//monitoring?ref=v1.3.0
```

This does not require submodule support but only works with Kustomize.

2. **Helm dependency charts** - If using Helm, reference shared charts as dependencies.

3. **ArgoCD multiple sources** - ArgoCD 2.6+ supports multiple sources per Application:

```yaml
spec:
  sources:
    - repoURL: https://github.com/myorg/backend-api-config
      targetRevision: main
      path: overlays/production
    - repoURL: https://github.com/myorg/shared-configs
      targetRevision: v1.3.0
      path: monitoring
```

## Summary

Git submodules work with ArgoCD when you enable submodule support in the repo-server configuration and ensure both the main repo and submodule repos have matching authentication credentials. Pin submodule versions for reproducible deployments and automate updates through CI pipelines. While submodules add some complexity, they provide a clean way to share common Kubernetes manifests across multiple service config repos without duplicating YAML files.
