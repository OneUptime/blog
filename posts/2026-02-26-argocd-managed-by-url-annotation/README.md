# How to Use the 'Managed By' URL Annotation in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Annotations, UI

Description: Learn how to use the ArgoCD managed-by URL annotation to link Kubernetes resources to external management tools and documentation for better traceability.

---

When you look at a Kubernetes resource in the ArgoCD UI, it is not always clear who or what manages it. Is it part of a Helm chart? Managed by Terraform? Controlled by another team's operator? The "managed-by" URL annotation in ArgoCD solves this problem by adding a clickable link on resources that points to whichever external tool or document manages them. This simple annotation dramatically improves traceability and cross-team collaboration.

## What Is the Managed-By Annotation?

The `argocd.argoproj.io/managed-by` annotation lets you attach a URL to any Kubernetes resource managed by ArgoCD. When this annotation is present, the ArgoCD UI displays a link icon next to the resource, and clicking it opens the specified URL.

This annotation is different from the standard Kubernetes `app.kubernetes.io/managed-by` label. The ArgoCD managed-by annotation is specifically about providing a URL link in the ArgoCD UI, while the Kubernetes label is a plain string indicating which tool manages the resource.

## Basic Usage

Add the annotation to any Kubernetes resource in your manifests:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
  namespace: production
  annotations:
    # Link to the source code repository
    argocd.argoproj.io/managed-by: "https://github.com/myorg/api-server"
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api-server
  template:
    metadata:
      labels:
        app: api-server
    spec:
      containers:
        - name: api-server
          image: myorg/api-server:v2.3.1
```

When viewing this deployment in the ArgoCD UI, you will see a link that opens the GitHub repository.

## Common Use Cases

### Link to Source Repository

```yaml
metadata:
  annotations:
    argocd.argoproj.io/managed-by: "https://github.com/myorg/api-server"
```

### Link to a Specific Config File

```yaml
metadata:
  annotations:
    argocd.argoproj.io/managed-by: "https://github.com/myorg/gitops-config/blob/main/apps/api-server/deployment.yaml"
```

### Link to Terraform State

For resources originally provisioned by Terraform:

```yaml
metadata:
  annotations:
    argocd.argoproj.io/managed-by: "https://app.terraform.io/app/myorg/workspaces/production-infra"
```

### Link to Internal Documentation

```yaml
metadata:
  annotations:
    argocd.argoproj.io/managed-by: "https://wiki.internal.company/services/api-server"
```

### Link to Runbook

```yaml
metadata:
  annotations:
    argocd.argoproj.io/managed-by: "https://runbooks.internal.company/api-server/operations"
```

### Link to CI/CD Pipeline

```yaml
metadata:
  annotations:
    argocd.argoproj.io/managed-by: "https://github.com/myorg/api-server/actions"
```

## Adding Managed-By to Helm Charts

When using Helm, add the annotation in your chart templates:

```yaml
# templates/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "mychart.fullname" . }}
  annotations:
    argocd.argoproj.io/managed-by: {{ .Values.managedByUrl | default "https://github.com/myorg/charts" | quote }}
spec:
  # ... deployment spec
```

Set the URL in your values file:

```yaml
# values.yaml
managedByUrl: "https://github.com/myorg/api-server"
```

Or override it per environment:

```yaml
# values-production.yaml
managedByUrl: "https://github.com/myorg/gitops-config/tree/main/production/api-server"
```

## Adding Managed-By to Kustomize

Use Kustomize's commonAnnotations to add the annotation across all resources:

```yaml
# kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

commonAnnotations:
  argocd.argoproj.io/managed-by: "https://github.com/myorg/platform-config"

resources:
  - deployment.yaml
  - service.yaml
  - configmap.yaml
```

Or use patches to add it to specific resources:

```yaml
# kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - deployment.yaml
  - service.yaml

patches:
  - target:
      kind: Deployment
      name: api-server
    patch: |
      - op: add
        path: /metadata/annotations/argocd.argoproj.io~1managed-by
        value: "https://github.com/myorg/api-server"
```

Note the `~1` in the patch path - this is the JSON Pointer encoding for `/` in annotation keys.

## Environment-Specific URLs

Different environments often have different management URLs:

```yaml
# base/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

commonAnnotations:
  argocd.argoproj.io/managed-by: "https://github.com/myorg/platform-config"

resources:
  - deployment.yaml
  - service.yaml
```

```yaml
# overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - ../../base

commonAnnotations:
  argocd.argoproj.io/managed-by: "https://github.com/myorg/platform-config/tree/main/production"
```

```yaml
# overlays/staging/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - ../../base

commonAnnotations:
  argocd.argoproj.io/managed-by: "https://github.com/myorg/platform-config/tree/main/staging"
```

## Combining with Other ArgoCD Annotations

The managed-by annotation works alongside other ArgoCD annotations:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
  annotations:
    # Link to management tool
    argocd.argoproj.io/managed-by: "https://github.com/myorg/api-server"
    # Sync wave for ordering
    argocd.argoproj.io/sync-wave: "2"
    # Notification subscription
    notifications.argoproj.io/subscribe.on-sync-succeeded.slack: "deployments"
```

## Using Managed-By for Multi-Team Visibility

In organizations where multiple teams share a cluster, the managed-by annotation helps answer "who owns this resource?":

```yaml
# Team A's resources
apiVersion: apps/v1
kind: Deployment
metadata:
  name: checkout-service
  labels:
    team: checkout
  annotations:
    argocd.argoproj.io/managed-by: "https://github.com/myorg/checkout-team/wiki"
---
# Team B's resources
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payment-service
  labels:
    team: payments
  annotations:
    argocd.argoproj.io/managed-by: "https://github.com/myorg/payments-team/wiki"
```

## Automation: Adding Managed-By with Scripts

Add the annotation to existing resources automatically:

```bash
#!/bin/bash
# add-managed-by.sh - Add managed-by annotation to all deployments

NAMESPACE="${1:-default}"
BASE_URL="https://github.com/myorg/platform-config/tree/main"

for DEPLOY in $(kubectl get deployments -n "$NAMESPACE" -o name); do
  NAME=$(basename "$DEPLOY")
  URL="$BASE_URL/$NAMESPACE/$NAME"

  echo "Adding managed-by to $NAME: $URL"
  kubectl annotate "$DEPLOY" -n "$NAMESPACE" \
    "argocd.argoproj.io/managed-by=$URL" --overwrite
done
```

## Verifying the Annotation

Check that your annotations are set correctly:

```bash
# Check a specific resource
kubectl get deployment api-server -n production \
  -o jsonpath='{.metadata.annotations.argocd\.argoproj\.io/managed-by}'

# List all resources with managed-by annotation
kubectl get all -n production \
  -o custom-columns="NAME:.metadata.name,MANAGED_BY:.metadata.annotations.argocd\.argoproj\.io/managed-by"
```

## Best Practices

1. **Be consistent** - Use the same URL pattern across all resources in a project
2. **Link to specifics** - Link to the exact file or directory, not just the repo root
3. **Keep URLs stable** - Avoid linking to branches that may be deleted
4. **Use for all resource types** - Not just Deployments, but Services, ConfigMaps, CRDs, etc.
5. **Document the convention** - Let teams know they should add managed-by annotations

The managed-by URL annotation is a small addition that makes a big difference in traceability. By linking every resource to its source of management, you create a navigable web of ownership and documentation. When something goes wrong at 3 AM, knowing exactly where to look is invaluable.
