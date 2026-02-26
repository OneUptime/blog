# How to Migrate from Manual Kubernetes Deployments to ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, DevOps, Migration

Description: Learn how to transition from manual kubectl-based Kubernetes deployments to automated GitOps with ArgoCD, including extracting live manifests and structuring your Git repository.

---

If your team is still deploying to Kubernetes by running `kubectl apply` from laptops, CI scripts, or shared shell scripts, you are not alone. Many teams start this way and it works until it does not. Missing deployments, config drift, "who changed what" mysteries, and the inability to roll back cleanly all push teams toward GitOps.

This guide covers the practical steps to move from manual kubectl deployments to ArgoCD-managed GitOps.

## The Problems with Manual Deployments

Before diving in, let us be honest about what goes wrong with manual deployments:

- **No audit trail** - Who deployed what, when? Check Slack, maybe?
- **Config drift** - Someone ran `kubectl edit` to fix something urgent, and now your manifests in Git do not match reality
- **No rollback** - Rolling back means finding the old YAML and re-applying, hoping nothing else changed
- **Tribal knowledge** - Only certain people know how to deploy certain services
- **Environment inconsistency** - Dev looks different from staging which looks different from production

ArgoCD solves all of these by making Git the single source of truth and continuously reconciling your cluster to match.

## Step 1: Extract Your Current Manifests

The first step is getting your live cluster state into Git. This is the most important and often most tedious step.

```bash
# Export all deployments in a namespace
kubectl get deployments -n production -o yaml > deployments.yaml

# Export services
kubectl get services -n production -o yaml > services.yaml

# Export configmaps (be careful - some are system-managed)
kubectl get configmaps -n production -o yaml > configmaps.yaml

# Export ingresses
kubectl get ingresses -n production -o yaml > ingresses.yaml
```

However, exported YAML contains a lot of cluster-generated noise. Clean it up:

```bash
# Use kubectl neat to strip cluster-managed fields
# Install: kubectl krew install neat
kubectl get deployment my-app -n production -o yaml | kubectl neat > my-app-deployment.yaml
```

`kubectl neat` removes fields like `status`, `metadata.managedFields`, `metadata.resourceVersion`, `metadata.uid`, and other cluster-generated metadata that should not be in Git.

If you do not have `kubectl neat`, manually remove these fields:

- `metadata.resourceVersion`
- `metadata.uid`
- `metadata.creationTimestamp`
- `metadata.generation`
- `metadata.managedFields`
- `status` (entire section)
- `metadata.annotations` with `kubectl.kubernetes.io/last-applied-configuration`

## Step 2: Organize Manifests in Git

Create a clean repository structure:

```
k8s-manifests/
  apps/
    my-api/
      base/
        deployment.yaml
        service.yaml
        configmap.yaml
        hpa.yaml
        kustomization.yaml
      overlays/
        dev/
          kustomization.yaml
        staging/
          kustomization.yaml
        production/
          kustomization.yaml
    my-frontend/
      base/
        deployment.yaml
        service.yaml
        kustomization.yaml
      overlays/
        dev/
          kustomization.yaml
        production/
          kustomization.yaml
  infrastructure/
    ingress-nginx/
      kustomization.yaml
    cert-manager/
      kustomization.yaml
```

A base `kustomization.yaml`:

```yaml
apiVersion: kustomize.io/v1beta1
kind: Kustomization
resources:
  - deployment.yaml
  - service.yaml
  - configmap.yaml
  - hpa.yaml
```

A production overlay:

```yaml
apiVersion: kustomize.io/v1beta1
kind: Kustomization
resources:
  - ../../base
namespace: production
patches:
  - target:
      kind: Deployment
      name: my-api
    patch: |
      - op: replace
        path: /spec/replicas
        value: 5
  - target:
      kind: Deployment
      name: my-api
    patch: |
      - op: replace
        path: /spec/template/spec/containers/0/resources/requests/memory
        value: "512Mi"
```

## Step 3: Validate Manifests Match the Live Cluster

Before letting ArgoCD manage anything, verify that applying your Git manifests would not change anything unexpected:

```bash
# Dry-run apply and diff
kubectl diff -f overlays/production/

# If using Kustomize
kubectl diff -k overlays/production/
```

If `kubectl diff` shows changes, fix your manifests until the diff is clean. This is critical - you do not want ArgoCD's first sync to change your running applications.

## Step 4: Install ArgoCD

```bash
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# Wait for everything to start
kubectl wait --for=condition=ready pod -l app.kubernetes.io/part-of=argocd -n argocd --timeout=300s

# Get the initial admin password
argocd admin initial-password -n argocd

# Port forward to access the UI
kubectl port-forward svc/argocd-server -n argocd 8080:443
```

Log in at `https://localhost:8080` with username `admin` and the password from above.

## Step 5: Add Your Repository

```bash
# For HTTPS repos
argocd repo add https://github.com/your-org/k8s-manifests.git \
  --username git \
  --password $GITHUB_TOKEN

# For SSH repos
argocd repo add git@github.com:your-org/k8s-manifests.git \
  --ssh-private-key-path ~/.ssh/id_rsa
```

## Step 6: Create ArgoCD Applications - Start with Non-Critical Services

Do not start with your most important production service. Pick something low-risk:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-api-dev
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/your-org/k8s-manifests.git
    targetRevision: main
    path: apps/my-api/overlays/dev
  destination:
    server: https://kubernetes.default.svc
    namespace: dev
  syncPolicy:
    # Start with manual sync - do NOT enable automated sync yet
    syncOptions:
      - CreateNamespace=true
```

Apply it:

```bash
kubectl apply -f argocd-apps/my-api-dev.yaml
```

Check the ArgoCD UI. The application should show as "Synced" (or "OutOfSync" if your manifests differ from the live cluster). If it shows OutOfSync, look at the diff carefully.

## Step 7: Gradually Enable Automation

Once you are confident the manifests match, enable automated sync:

```yaml
spec:
  syncPolicy:
    automated:
      prune: false      # Start with prune disabled for safety
      selfHeal: true    # ArgoCD reverts manual kubectl changes
    syncOptions:
      - CreateNamespace=true
```

After a few days of smooth operation, enable pruning:

```yaml
spec:
  syncPolicy:
    automated:
      prune: true       # Now ArgoCD will delete resources removed from Git
      selfHeal: true
```

## Step 8: Set Up the Deployment Workflow

With manual deployments, someone ran `kubectl apply`. Now the workflow becomes:

1. Developer creates a branch and modifies YAML
2. Opens a pull request
3. Team reviews the changes (you can see exactly what will change)
4. PR is merged to main
5. ArgoCD detects the change and syncs

For image updates, your CI pipeline pushes the new image and updates the manifest:

```bash
# In your CI pipeline (GitHub Actions, Jenkins, etc.)
# After building and pushing the Docker image:

# Clone the config repo
git clone https://github.com/your-org/k8s-manifests.git
cd k8s-manifests

# Update the image tag
cd apps/my-api/overlays/production
kustomize edit set image my-api=my-registry/my-api:${NEW_TAG}

# Commit and push
git add .
git commit -m "Deploy my-api ${NEW_TAG} to production"
git push
```

## Step 9: Handle the "Quick Fix" Problem

The biggest cultural challenge is stopping people from running `kubectl edit` or `kubectl apply` directly. With `selfHeal: true`, ArgoCD will revert manual changes within its reconciliation interval (default 3 minutes).

This is a feature, not a bug. But you need to communicate it to the team:

- All changes go through Git, no exceptions
- If something is urgent, make a Git commit - it deploys in minutes
- If you absolutely must make a temporary change, do it through Git and open a PR to revert it later

## Step 10: Migrate Remaining Services

Follow the same pattern for each service:

1. Extract and clean up manifests
2. Put them in the Git repo
3. Verify with `kubectl diff`
4. Create an ArgoCD Application with manual sync
5. Verify it looks correct
6. Enable automated sync
7. Stop running manual `kubectl apply` for that service

A reasonable timeline:

- Week 1: Migrate dev environment
- Week 2 to 3: Migrate staging
- Week 3 to 4: Migrate production (one service at a time)
- Week 5+: Clean up, optimize, add notifications

## Setting Up Notifications

Replace your "I deployed X" Slack messages with automated notifications:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-notifications-cm
  namespace: argocd
data:
  service.slack: |
    token: $slack-token
  trigger.on-deployed: |
    - when: app.status.operationState.phase in ['Succeeded']
      send: [app-deployed]
  template.app-deployed: |
    message: |
      *{{.app.metadata.name}}* has been deployed.
      Revision: {{.app.status.sync.revision}}
      <{{.context.argocdUrl}}/applications/{{.app.metadata.name}}|View in ArgoCD>
```

## Conclusion

Migrating from manual `kubectl apply` to ArgoCD is one of the highest-value improvements you can make to your Kubernetes workflow. The initial effort of extracting and organizing your manifests pays off immediately in visibility, auditability, and reliability. Start small, migrate incrementally, and within a few weeks your entire team will wonder how they ever deployed any other way.

For monitoring your applications and cluster health alongside ArgoCD, check out [OneUptime](https://oneuptime.com) for observability, alerting, and status pages.
