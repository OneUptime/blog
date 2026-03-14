# How to Migrate from FluxCD v2 to ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Fluxcd, Migration

Description: A practical step-by-step guide for migrating your GitOps workflows from FluxCD v2 to ArgoCD, covering concept mapping, resource conversion, and zero-downtime strategies.

---

If you have been running FluxCD v2 for a while and are considering a move to ArgoCD, you are not alone. Many teams switch for ArgoCD's visual dashboard, richer RBAC model, or its ApplicationSet controller for multi-cluster management. The migration is absolutely doable, but it requires careful planning to avoid deployment gaps.

This guide walks you through the entire process - from mapping Flux concepts to ArgoCD equivalents, converting your manifests, and running both systems in parallel until the cutover is complete.

## Why Teams Move from Flux v2 to ArgoCD

FluxCD v2 is a solid GitOps tool, but ArgoCD offers a few things that pull teams over:

- A built-in web UI that shows sync status, diffs, and resource trees at a glance
- An ApplicationSet controller that simplifies multi-cluster and multi-tenant setups
- A more granular RBAC system with project-level access controls
- Broader community adoption and a larger ecosystem of plugins

That said, this is not about one tool being "better." It is about picking the right tool for your team's workflow.

## Mapping Flux v2 Concepts to ArgoCD

Before converting any manifests, understand how core concepts map across:

| FluxCD v2 Concept | ArgoCD Equivalent |
|---|---|
| Kustomization | Application |
| HelmRelease | Application (Helm source) |
| GitRepository | Repository (in ArgoCD settings) |
| HelmRepository | Repository (Helm type) |
| Bucket | Repository (not direct - use Git) |
| Namespace Tenancy | AppProject |
| Alerts/Providers | Notifications (argocd-notifications) |
| ImageUpdateAutomation | ArgoCD Image Updater |

The most important mapping: Flux's `Kustomization` resource becomes an ArgoCD `Application`. Flux's `HelmRelease` also becomes an ArgoCD `Application`, but with a Helm source type.

## Step 1: Inventory Your Flux Resources

Start by cataloging everything Flux manages:

```bash
# List all Flux Kustomizations
kubectl get kustomizations.kustomize.toolkit.fluxcd.io -A -o wide

# List all HelmReleases
kubectl get helmreleases.helm.toolkit.fluxcd.io -A -o wide

# List all source objects
kubectl get gitrepositories.source.toolkit.fluxcd.io -A
kubectl get helmrepositories.source.toolkit.fluxcd.io -A

# Export to a file for reference
flux export kustomization --all > flux-kustomizations.yaml
flux export helmrelease --all > flux-helmreleases.yaml
```

Create a spreadsheet or document listing every Flux resource, its namespace, the Git repo it points to, and the path within that repo.

## Step 2: Install ArgoCD Alongside Flux

You can run both systems simultaneously. Install ArgoCD in its own namespace:

```bash
# Create the ArgoCD namespace
kubectl create namespace argocd

# Install ArgoCD
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# Wait for pods to be ready
kubectl wait --for=condition=ready pod -l app.kubernetes.io/part-of=argocd -n argocd --timeout=300s
```

At this point ArgoCD is running but not managing anything. Both systems coexist peacefully because they only act on resources they are told to manage.

## Step 3: Register Git Repositories in ArgoCD

For each `GitRepository` in Flux, register the equivalent in ArgoCD:

```bash
# If using HTTPS with a token
argocd repo add https://github.com/your-org/your-repo.git \
  --username git \
  --password $GITHUB_TOKEN

# If using SSH
argocd repo add git@github.com:your-org/your-repo.git \
  --ssh-private-key-path ~/.ssh/id_rsa
```

For Helm repositories:

```bash
argocd repo add https://charts.example.com \
  --type helm \
  --name my-helm-repo
```

## Step 4: Convert Flux Kustomizations to ArgoCD Applications

Here is a typical Flux Kustomization:

```yaml
# Flux Kustomization
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 5m
  path: ./deploy/production
  prune: true
  sourceRef:
    kind: GitRepository
    name: my-repo
  targetNamespace: production
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: my-app
      namespace: production
```

The ArgoCD equivalent:

```yaml
# ArgoCD Application
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/your-org/your-repo.git
    targetRevision: main
    path: deploy/production
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  syncPolicy:
    automated:
      prune: true        # Maps to Flux's prune: true
      selfHeal: true      # Keeps resources in sync continuously
    syncOptions:
      - CreateNamespace=true
```

Key differences to note:

- Flux's `interval` becomes ArgoCD's reconciliation loop (default 3 minutes, configurable)
- Flux's `prune: true` maps to `automated.prune: true`
- ArgoCD adds `selfHeal` which reverts manual changes - something Flux does by default
- Flux references a `GitRepository` source object; ArgoCD references the repo URL directly

## Step 5: Convert Flux HelmReleases to ArgoCD Applications

A Flux HelmRelease:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: nginx-ingress
  namespace: flux-system
spec:
  interval: 10m
  chart:
    spec:
      chart: ingress-nginx
      version: "4.x"
      sourceRef:
        kind: HelmRepository
        name: ingress-nginx
  values:
    controller:
      replicaCount: 2
```

Becomes this ArgoCD Application:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: nginx-ingress
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://kubernetes.github.io/ingress-nginx
    chart: ingress-nginx
    targetRevision: "4.*"
    helm:
      values: |
        controller:
          replicaCount: 2
  destination:
    server: https://kubernetes.default.svc
    namespace: ingress-nginx
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

## Step 6: Migrate One Application at a Time

Do not try to migrate everything at once. Follow this process for each application:

1. **Suspend the Flux Kustomization** so Flux stops managing the resource:

```bash
flux suspend kustomization my-app
```

2. **Create the ArgoCD Application** pointing to the same Git path:

```bash
kubectl apply -f argocd-apps/my-app.yaml
```

3. **Verify in the ArgoCD UI** that the application shows as "Synced" and "Healthy" without actually changing any running resources.

4. **Test a change** by pushing a small update through Git and confirming ArgoCD picks it up.

5. **Delete the Flux Kustomization** once you are confident:

```bash
flux delete kustomization my-app
```

## Step 7: Migrate Notifications

If you use Flux Alerts and Providers for Slack/Teams notifications, switch to argocd-notifications:

```yaml
# argocd-notifications ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-notifications-cm
  namespace: argocd
data:
  service.slack: |
    token: $slack-token
  trigger.on-sync-succeeded: |
    - when: app.status.operationState.phase in ['Succeeded']
      send: [app-sync-succeeded]
  template.app-sync-succeeded: |
    message: |
      Application {{.app.metadata.name}} sync succeeded.
```

## Step 8: Clean Up Flux

Once all applications are migrated and stable:

```bash
# Uninstall Flux completely
flux uninstall

# Verify no Flux CRDs remain
kubectl get crds | grep fluxcd
```

## Common Pitfalls

**Namespace handling**: Flux uses `targetNamespace` at the Kustomization level. ArgoCD uses `destination.namespace`. Make sure these match.

**Health checks**: Flux lets you define custom health checks per Kustomization. ArgoCD has built-in health checks for standard Kubernetes resources and supports custom health checks via Lua scripts in the `argocd-cm` ConfigMap.

**Decryption (SOPS)**: If you use Flux's built-in SOPS decryption, you will need to set up an ArgoCD plugin like `argocd-vault-plugin` or `ksops` to handle encrypted secrets.

**Depends-on ordering**: Flux Kustomizations support `dependsOn`. In ArgoCD, use sync waves and sync phases to control ordering.

## Conclusion

Migrating from FluxCD v2 to ArgoCD is a methodical process. The key is running both systems in parallel, migrating one application at a time, and only removing Flux resources once you have verified ArgoCD is managing them correctly. Take your time with the migration - there is no need to rush it. A phased approach over several weeks is far safer than a big-bang cutover.

For monitoring your ArgoCD deployment health after migration, check out [OneUptime](https://oneuptime.com) for observability and alerting across your Kubernetes clusters.
