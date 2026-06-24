# How to Use the 'Managed By' URL Annotation in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Annotation, UI

Description: Learn how to use the ArgoCD managed-by URL annotation to link Kubernetes resources to external management tools and documentation for better traceability.

---

When you look at an Argo CD Application in the UI, it is not always clear which Argo CD instance should manage it. This is especially common in app-of-apps setups, hub-and-spoke platforms, and multi-tenant clusters where one Argo CD instance creates Application resources that are reconciled by another Argo CD instance. The `managed-by-url` annotation in Argo CD solves this problem by making Application links point to the Argo CD instance that actually manages them.

## What Is the Managed-By Annotation?

The `argocd.argoproj.io/managed-by-url` annotation lets you attach the base URL of the managing Argo CD instance to an Argo CD `Application` resource. When this annotation is present, Argo CD uses that URL when it builds links to that Application in the UI.

This annotation is different from the standard Kubernetes `app.kubernetes.io/managed-by` label. The Argo CD managed-by URL annotation is specifically about linking Applications to the correct Argo CD instance, while the Kubernetes label is a plain string indicating which tool manages the resource.

## Basic Usage

Add the annotation to an Argo CD Application manifest:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: api-server
  namespace: production
  annotations:
    # Base URL of the Argo CD instance that manages this Application
    argocd.argoproj.io/managed-by-url: "https://argocd-production.example.com"
spec:
  project: default
  source:
    repoURL: https://github.com/myorg/gitops-config.git
    targetRevision: main
    path: apps/api-server
  destination:
    server: https://kubernetes.default.svc
    namespace: production
```

When viewing a parent Application or resource tree in another Argo CD instance, links to this Application will open through the URL in the annotation.

## Common Use Cases

### Link to a Production Argo CD Instance

```yaml
metadata:
  annotations:
    argocd.argoproj.io/managed-by-url: "https://argocd-production.example.com"
```

### Link to a Staging Argo CD Instance

```yaml
metadata:
  annotations:
    argocd.argoproj.io/managed-by-url: "https://argocd-staging.example.com"
```

### Link to a Team-Specific Argo CD Instance

For Applications managed by a team's own Argo CD instance:

```yaml
metadata:
  annotations:
    argocd.argoproj.io/managed-by-url: "https://argocd-checkout.example.com"
```

### Link to a Local Development Argo CD Instance

```yaml
metadata:
  annotations:
    argocd.argoproj.io/managed-by-url: "http://localhost:8081"
```

### Link to a Secondary Cluster Argo CD Instance

```yaml
metadata:
  annotations:
    argocd.argoproj.io/managed-by-url: "https://argocd-us-east.example.com"
```

### Link to a Tenant Argo CD Instance

```yaml
metadata:
  annotations:
    argocd.argoproj.io/managed-by-url: "https://tenant-a-argocd.example.com"
```

## Adding Managed-By to Helm Charts

When using Helm to template Argo CD Applications, add the annotation in your chart templates:

```yaml
# templates/application.yaml

apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: {{ include "mychart.fullname" . }}
  namespace: {{ .Values.argocdNamespace | default "argocd" | quote }}
  annotations:
    argocd.argoproj.io/managed-by-url: {{ .Values.managedByUrl | default "https://argocd.example.com" | quote }}
spec:
  project: default
  source:
    repoURL: {{ .Values.repoURL | quote }}
    targetRevision: {{ .Values.targetRevision | default "main" | quote }}
    path: {{ .Values.path | quote }}
  destination:
    server: https://kubernetes.default.svc
    namespace: {{ .Values.destinationNamespace | quote }}
```

Set the URL in your values file:

```yaml
# values.yaml
managedByUrl: "https://argocd-production.example.com"
```

Or override it per environment:

```yaml
# values-production.yaml
managedByUrl: "https://argocd-production.example.com"
```

## Adding Managed-By to Kustomize

Use Kustomize's `commonAnnotations` when a kustomization contains only Application resources that should share the same managing Argo CD URL:

```yaml
# kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

commonAnnotations:
  argocd.argoproj.io/managed-by-url: "https://argocd-production.example.com"

resources:
  - application.yaml
```

Or use patches to add it to specific Applications:

```yaml
# kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - application.yaml

patches:
  - target:
      group: argoproj.io
      version: v1alpha1
      kind: Application
      name: api-server
    patch: |
      apiVersion: argoproj.io/v1alpha1
      kind: Application
      metadata:
        name: api-server
        annotations:
          argocd.argoproj.io/managed-by-url: "https://argocd-production.example.com"
```

## Environment-Specific URLs

Different environments often have different Argo CD instance URLs:

```yaml
# base/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - application.yaml
```

```yaml
# overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - ../../base

commonAnnotations:
  argocd.argoproj.io/managed-by-url: "https://argocd-production.example.com"
```

```yaml
# overlays/staging/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - ../../base

commonAnnotations:
  argocd.argoproj.io/managed-by-url: "https://argocd-staging.example.com"
```

## Combining with Other ArgoCD Annotations

The managed-by URL annotation works alongside other Argo CD annotations:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: api-server
  namespace: production
  annotations:
    # Link to managing Argo CD instance
    argocd.argoproj.io/managed-by-url: "https://argocd-production.example.com"
    # Force a refresh
    argocd.argoproj.io/refresh: "normal"
    # Notification subscription
    notifications.argoproj.io/subscribe.on-sync-succeeded.slack: "deployments"
spec:
  project: default
  source:
    repoURL: https://github.com/myorg/gitops-config.git
    targetRevision: main
    path: apps/api-server
  destination:
    server: https://kubernetes.default.svc
    namespace: production
```

## Using Managed-By for Multi-Team Visibility

In organizations where multiple teams have their own Argo CD instances, the managed-by URL annotation helps links point to the correct team instance:

```yaml
# Team A's Application
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: checkout-service
  namespace: argocd
  annotations:
    argocd.argoproj.io/managed-by-url: "https://argocd-checkout.example.com"
spec:
  project: checkout
  source:
    repoURL: https://github.com/myorg/checkout-team.git
    targetRevision: main
    path: apps/checkout-service
  destination:
    server: https://kubernetes.default.svc
    namespace: checkout
---
# Team B's Application
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: payment-service
  namespace: argocd
  annotations:
    argocd.argoproj.io/managed-by-url: "https://argocd-payments.example.com"
spec:
  project: payments
  source:
    repoURL: https://github.com/myorg/payments-team.git
    targetRevision: main
    path: apps/payment-service
  destination:
    server: https://kubernetes.default.svc
    namespace: payments
```

## Automation: Adding Managed-By with Scripts

Add the annotation to existing Applications automatically:

```bash
#!/bin/bash
# add-managed-by-url.sh - Add managed-by-url annotation to all Applications

NAMESPACE="${1:-argocd}"
ARGOCD_URL="${2:-https://argocd-production.example.com}"

for APP in $(kubectl get applications.argoproj.io -n "$NAMESPACE" -o name); do
  NAME=$(basename "$APP")

  echo "Adding managed-by-url to $NAME: $ARGOCD_URL"
  kubectl annotate "$APP" -n "$NAMESPACE" \
    "argocd.argoproj.io/managed-by-url=$ARGOCD_URL" --overwrite
done
```

## Verifying the Annotation

Check that your annotations are set correctly:

```bash
# Check a specific Application
kubectl get application api-server -n production \
  -o jsonpath='{.metadata.annotations.argocd\.argoproj\.io/managed-by-url}'

# List all Applications with managed-by-url annotation
kubectl get applications.argoproj.io -n production \
  -o custom-columns="NAME:.metadata.name,MANAGED_BY_URL:.metadata.annotations.argocd\.argoproj\.io/managed-by-url"
```

## Best Practices

1. **Use a valid URL** - Include the `http://` or `https://` scheme
2. **Point to the Argo CD base URL** - Use the managing Argo CD instance URL, not a repository or documentation URL
3. **Keep URLs stable** - Avoid temporary hostnames that users cannot access from their browsers
4. **Use for Application resources** - This annotation is documented for Argo CD `Application` resources
5. **Document the convention** - Let teams know they should add managed-by URL annotations when Applications are managed by another Argo CD instance

The managed-by URL annotation is a small addition that makes a big difference in traceability for multi-instance Argo CD setups. By linking each Application to the Argo CD instance that manages it, you help users navigate to the right place when they need to inspect or operate an application.
