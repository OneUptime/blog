# How to Use Git Submodules with ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Git, Submodules

Description: Learn how to configure ArgoCD to work with Git submodules for shared configurations, library charts, and multi-repository dependency management.

---

Git submodules allow you to include one Git repository inside another. They are commonly used to share Kubernetes base configurations, Helm library charts, or common policy definitions across multiple application repositories. ArgoCD supports Git submodules, but it requires explicit configuration since submodule checkout is disabled by default.

## Why Use Git Submodules with ArgoCD

The most common use cases for submodules in a GitOps context include:

- Sharing base Kustomize configurations across multiple applications
- Including Helm library charts from a central repository
- Referencing shared OPA/Gatekeeper policy definitions
- Keeping environment-specific configurations separate from application manifests

```mermaid
graph TD
    A[App Repo] --> B[shared-base submodule]
    A --> C[app-specific manifests]
    B --> D[Base Kustomize overlays]
    B --> E[Shared ConfigMaps]
    B --> F[Common RBAC policies]
```

## Enabling Git Submodule Support

By default, ArgoCD does not recurse into submodules when cloning a repository. You need to enable this in the ArgoCD ConfigMap:

```yaml
# argocd-cm.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  # Enable Git submodule support globally
  resource.customizations.ignoreDifferences.all: |
    managedFieldsManagers:
      - ""
```

Wait, that is a different setting. The actual setting for enabling submodules is done at the repository level or via environment variables in the repo-server:

```yaml
# Patch the argocd-repo-server deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: argocd-repo-server
  namespace: argocd
spec:
  template:
    spec:
      containers:
        - name: argocd-repo-server
          env:
            # Enable recursive submodule fetch
            - name: ARGOCD_GIT_MODULES_ENABLED
              value: "true"
```

Apply the patch:

```bash
kubectl patch deployment argocd-repo-server -n argocd --type json -p '[
  {
    "op": "add",
    "path": "/spec/template/spec/containers/0/env/-",
    "value": {
      "name": "ARGOCD_GIT_MODULES_ENABLED",
      "value": "true"
    }
  }
]'
```

Alternatively, you can enable submodules on a per-repository basis by adding the `enableSubmodules` field to the repository Secret:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: repo-with-submodules
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
stringData:
  type: git
  url: https://github.com/my-org/app-repo.git
  username: argocd
  password: ghp_token
  enableSubmodules: "true"
```

## Setting Up the Repository Structure

Here is a typical repository structure using submodules:

```
app-repo/
  .gitmodules
  kustomization.yaml
  overlays/
    production/
      kustomization.yaml
    staging/
      kustomization.yaml
  shared-base/          # <-- This is a submodule
    base/
      kustomization.yaml
      deployment.yaml
      service.yaml
```

The `.gitmodules` file defines the submodule:

```
[submodule "shared-base"]
    path = shared-base
    url = https://github.com/my-org/shared-k8s-base.git
    branch = main
```

## Handling Submodule Authentication

The tricky part is that the submodule repository might require its own credentials. If the submodule URL points to a different repository or organization, ArgoCD needs credentials for both the parent and the submodule repository.

### Same Organization (Credential Templates Handle This)

If both repositories are in the same organization, a credential template covers both:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: org-creds
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repo-creds
stringData:
  type: git
  url: https://github.com/my-org
  username: argocd
  password: ghp_token
```

### Different Organizations or Providers

If the submodule points to a different organization or Git provider, register credentials for both:

```yaml
# Credentials for the parent repo's org
apiVersion: v1
kind: Secret
metadata:
  name: app-org-creds
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repo-creds
stringData:
  type: git
  url: https://github.com/app-org
  username: argocd
  password: ghp_app_org_token
---
# Credentials for the submodule's org
apiVersion: v1
kind: Secret
metadata:
  name: shared-org-creds
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repo-creds
stringData:
  type: git
  url: https://github.com/shared-org
  username: argocd
  password: ghp_shared_org_token
```

### SSH Submodules

If your `.gitmodules` uses SSH URLs:

```
[submodule "shared-base"]
    path = shared-base
    url = git@github.com:shared-org/shared-k8s-base.git
```

You need SSH credentials registered for the submodule's URL prefix:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: shared-ssh-creds
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repo-creds
stringData:
  type: git
  url: git@github.com:shared-org
  sshPrivateKey: |
    -----BEGIN OPENSSH PRIVATE KEY-----
    ...
    -----END OPENSSH PRIVATE KEY-----
```

## Practical Example: Kustomize with Submodules

Here is a complete example of using submodules with Kustomize:

The shared base repository (`shared-k8s-base`) contains:

```yaml
# shared-k8s-base/base/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - deployment.yaml
  - service.yaml
  - hpa.yaml
```

The application repository references it as a submodule:

```yaml
# app-repo/overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../shared-base/base
patches:
  - target:
      kind: Deployment
    patch: |
      - op: replace
        path: /spec/replicas
        value: 5
images:
  - name: app-image
    newName: registry.company.com/my-app
    newTag: v1.2.3
```

The ArgoCD Application:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app-production
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/my-org/app-repo.git
    targetRevision: main
    path: overlays/production
  destination:
    server: https://kubernetes.default.svc
    namespace: my-app
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

## Submodule Update Behavior

When the parent repository pins a submodule to a specific commit, ArgoCD will only detect changes when the parent repository updates its submodule reference. The workflow looks like this:

1. Someone pushes changes to the shared-base repository
2. ArgoCD does NOT automatically pick up these changes
3. Someone must update the submodule reference in the parent repository
4. ArgoCD detects the parent repository change and syncs

```bash
# In the parent repository, update the submodule to latest
cd app-repo
git submodule update --remote shared-base
git add shared-base
git commit -m "Update shared-base to latest"
git push
```

This is actually a feature, not a bug. It gives you explicit control over when shared base changes propagate to each application.

## Troubleshooting

### Submodule Not Being Cloned

```bash
# Check if submodule support is enabled
kubectl get deployment argocd-repo-server -n argocd -o yaml | grep ARGOCD_GIT_MODULES

# Check repo-server logs
kubectl logs -n argocd deployment/argocd-repo-server --tail=100 | grep -i "submodule"
```

### Authentication Failures for Submodules

```bash
# Verify credentials exist for the submodule URL
argocd repocreds list

# Check the .gitmodules file URL matches your credential template
kubectl exec -n argocd deployment/argocd-repo-server -- cat /tmp/some-repo/.gitmodules
```

### Submodule Points to Wrong Commit

ArgoCD checks out whatever commit the parent repository's submodule reference points to. Verify the reference:

```bash
# In your parent repo, check the submodule commit
git submodule status
```

## Alternatives to Submodules

If submodules feel too complex, consider these alternatives:

- **Kustomize remote bases**: Reference remote URLs directly in kustomization.yaml
- **Helm dependencies**: Use Helm chart dependencies instead
- **ArgoCD Multiple Sources**: Use ArgoCD's multi-source feature to combine manifests from different repos

Each has trade-offs. Submodules give you explicit version pinning. Remote bases are simpler but harder to pin. Multiple sources are the most ArgoCD-native solution.

For more on combining multiple sources in ArgoCD, see the [ArgoCD documentation on multi-source applications](https://oneuptime.com/blog/post/2026-01-25-deploy-helm-charts-argocd/view).
