# How to Install ArgoCD Using Kustomize

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Kustomize

Description: Learn how to install and customize ArgoCD using Kustomize overlays for reproducible, version-controlled, and environment-specific ArgoCD deployments.

---

The standard way to install ArgoCD is with a raw `kubectl apply` against the official YAML manifests. That works fine for a quick start, but in production you want your ArgoCD installation itself to be version-controlled, customizable per environment, and reproducible. Kustomize solves this perfectly - you reference the upstream ArgoCD manifests as a remote base and layer your customizations on top.

This approach means ArgoCD manages itself through GitOps. You store the Kustomize overlay in Git, and ArgoCD syncs its own configuration. It is a clean, self-referential pattern that many production teams use.

## Why Use Kustomize for ArgoCD Installation

- **Version pinning**: Lock to a specific ArgoCD version with a Git tag
- **Customization without forking**: Add patches, ConfigMaps, and secrets on top of upstream manifests
- **Environment-specific configs**: Different settings for dev, staging, and production ArgoCD instances
- **GitOps for ArgoCD itself**: ArgoCD can manage its own installation
- **No Helm dependency**: Pure Kubernetes-native approach

## Project Structure

Here is a typical directory structure for managing ArgoCD with Kustomize.

```
argocd-install/
  base/
    kustomization.yaml
  overlays/
    dev/
      kustomization.yaml
      patches/
        argocd-cm.yaml
        argocd-cmd-params-cm.yaml
    production/
      kustomization.yaml
      patches/
        argocd-cm.yaml
        argocd-cmd-params-cm.yaml
        resource-limits.yaml
```

## Step 1: Create the Base

The base references the upstream ArgoCD manifests directly.

```yaml
# argocd-install/base/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: argocd

resources:
  # Pin to a specific version
  - https://raw.githubusercontent.com/argoproj/argo-cd/v2.13.3/manifests/install.yaml
```

This pulls the official ArgoCD manifests for version v2.13.3. To upgrade, change the version tag.

## Step 2: Create a Dev Overlay

The dev overlay adds customizations for a development environment.

```yaml
# argocd-install/overlays/dev/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: argocd

resources:
  - ../../base

patches:
  # Run in insecure mode for local development
  - path: patches/argocd-cmd-params-cm.yaml
  # Custom ArgoCD configuration
  - path: patches/argocd-cm.yaml
```

Run ArgoCD in insecure mode so you do not need TLS for local dev.

```yaml
# argocd-install/overlays/dev/patches/argocd-cmd-params-cm.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cmd-params-cm
  namespace: argocd
data:
  # Run the server without TLS
  server.insecure: "true"
  # Reduce log level for less noise in dev
  server.log.level: "warn"
  # Lower repo server parallelism for dev
  reposerver.parallelism.limit: "2"
```

Configure ArgoCD settings.

```yaml
# argocd-install/overlays/dev/patches/argocd-cm.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  # Allow local repositories
  url: http://localhost:8080
  # Skip TLS verification for dev repos
  repositories: |
    - url: https://github.com/your-org/dev-manifests.git
      insecure: "true"
```

## Step 3: Create a Production Overlay

The production overlay adds stricter settings and resource limits.

```yaml
# argocd-install/overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: argocd

resources:
  - ../../base

patches:
  - path: patches/argocd-cm.yaml
  - path: patches/argocd-cmd-params-cm.yaml
  - path: patches/resource-limits.yaml
```

Production ArgoCD configuration.

```yaml
# argocd-install/overlays/production/patches/argocd-cm.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  url: https://argocd.yourdomain.com
  # Enable status badge
  statusbadge.enabled: "true"
  # Configure OIDC
  oidc.config: |
    name: Okta
    issuer: https://your-org.okta.com
    clientID: xxxxxxxxxx
    clientSecret: $oidc.okta.clientSecret
    requestedScopes:
      - openid
      - profile
      - email
      - groups
```

Set resource limits for production stability.

```yaml
# argocd-install/overlays/production/patches/resource-limits.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: argocd-server
  namespace: argocd
spec:
  template:
    spec:
      containers:
      - name: argocd-server
        resources:
          requests:
            cpu: 100m
            memory: 256Mi
          limits:
            cpu: 500m
            memory: 512Mi
---
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
        resources:
          requests:
            cpu: 100m
            memory: 256Mi
          limits:
            cpu: 1000m
            memory: 1Gi
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: argocd-application-controller
  namespace: argocd
spec:
  template:
    spec:
      containers:
      - name: argocd-application-controller
        resources:
          requests:
            cpu: 250m
            memory: 512Mi
          limits:
            cpu: 1000m
            memory: 2Gi
```

Production command parameters.

```yaml
# argocd-install/overlays/production/patches/argocd-cmd-params-cm.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cmd-params-cm
  namespace: argocd
data:
  # Enable server-side diff for better performance
  controller.diff.server.side: "true"
  # Increase repo server timeout for large repos
  reposerver.default.timeout: "180"
  # Higher parallelism for production workloads
  reposerver.parallelism.limit: "10"
  # Enable gzip compression
  server.enable.gzip: "true"
```

## Step 4: Build and Apply

Preview what Kustomize will generate.

```bash
# Preview the dev overlay
kubectl kustomize argocd-install/overlays/dev/

# Preview the production overlay
kubectl kustomize argocd-install/overlays/production/
```

Apply to your cluster.

```bash
# Create the namespace first
kubectl create namespace argocd

# Apply the dev overlay
kubectl apply -k argocd-install/overlays/dev/

# Or apply the production overlay
kubectl apply -k argocd-install/overlays/production/
```

## Step 5: Make ArgoCD Manage Itself

The real power of this approach is having ArgoCD manage its own installation. Once ArgoCD is running, create an Application that points to this Kustomize overlay.

```yaml
# argocd-self-manage.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: argocd
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/your-org/argocd-install.git
    targetRevision: main
    path: overlays/production
  destination:
    server: https://kubernetes.default.svc
    namespace: argocd
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
    - CreateNamespace=true
```

```bash
kubectl apply -f argocd-self-manage.yaml
```

Now when you push changes to the Git repo (like updating the ArgoCD version in the base kustomization), ArgoCD will update itself.

## Advanced Kustomize Techniques

### Using Components for Optional Features

Kustomize components let you mix in optional features.

```yaml
# components/notifications/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1alpha1
kind: Component

resources:
  - https://raw.githubusercontent.com/argoproj/argo-cd/v2.13.3/manifests/notifications/install.yaml

patches:
  - path: notifications-cm.yaml
```

Reference components in your overlay.

```yaml
# overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: argocd

resources:
  - ../../base

components:
  - ../../components/notifications

patches:
  - path: patches/argocd-cm.yaml
```

### Image Overrides

Override images without modifying manifests, useful for private registries.

```yaml
# overlays/production/kustomization.yaml
images:
  - name: quay.io/argoproj/argocd
    newName: registry.internal.example.com/argoproj/argocd
    newTag: v2.13.3
  - name: ghcr.io/dexidp/dex
    newName: registry.internal.example.com/dexidp/dex
    newTag: v2.38.0
  - name: redis
    newName: registry.internal.example.com/library/redis
    newTag: 7.0.15-alpine
```

### Adding Custom RBAC

```yaml
# overlays/production/patches/argocd-rbac-cm.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-rbac-cm
  namespace: argocd
data:
  policy.csv: |
    g, devops-team, role:admin
    g, developers, role:readonly
    p, role:readonly, applications, get, */*, allow
    p, role:readonly, applications, sync, */*, deny
  policy.default: role:readonly
```

## Upgrading ArgoCD with Kustomize

To upgrade, simply update the version in the base kustomization.

```yaml
# Change from v2.13.3 to v2.14.0
resources:
  - https://raw.githubusercontent.com/argoproj/argo-cd/v2.14.0/manifests/install.yaml
```

Commit and push. If ArgoCD manages itself, it will detect the change and apply the upgrade.

## Troubleshooting

### Kustomize Build Fails

If the remote base URL fails, it might be a network issue or an incorrect version tag.

```bash
# Test that the URL is accessible
curl -I https://raw.githubusercontent.com/argoproj/argo-cd/v2.13.3/manifests/install.yaml
```

### Patch Conflicts

Strategic merge patches can conflict if the upstream manifest structure changes. Use JSON patches for more precise targeting.

```yaml
# JSON patch example
patches:
  - target:
      kind: Deployment
      name: argocd-server
    patch: |
      - op: replace
        path: /spec/template/spec/containers/0/resources/limits/memory
        value: 512Mi
```

## Further Reading

- Kustomize with ArgoCD applications: [ArgoCD Kustomize](https://oneuptime.com/blog/post/2026-01-27-argocd-kustomize/view)
- ArgoCD installation guide: [Install ArgoCD on Kubernetes](https://oneuptime.com/blog/post/2026-01-25-install-argocd-kubernetes/view)
- ArgoCD high availability: [ArgoCD HA](https://oneuptime.com/blog/post/2026-02-02-argocd-high-availability/view)

Using Kustomize to install ArgoCD is the most GitOps-native approach. Your ArgoCD configuration lives in Git, is reviewable through pull requests, and ArgoCD can even manage its own upgrades. It is the pattern most mature ArgoCD deployments converge on.
