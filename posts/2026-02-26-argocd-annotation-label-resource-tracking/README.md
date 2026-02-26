# How to Use Annotation+Label Resource Tracking in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Resource Management

Description: Learn how to configure and use ArgoCD annotation+label resource tracking for the best combination of precise tracking through annotations and easy querying through labels.

---

Annotation+label tracking is the recommended resource tracking method for most ArgoCD deployments. It combines the precision of annotation-based tracking with the convenience of label-based querying. ArgoCD uses the annotation for actual ownership decisions while also setting the standard `app.kubernetes.io/instance` label for easy kubectl queries and compatibility with other tools.

This guide covers how annotation+label tracking works, how to configure it, and why it is the best default choice for production environments.

## How Annotation+Label Tracking Works

When you enable annotation+label tracking, ArgoCD adds both a tracking annotation and the standard instance label to every managed resource:

```yaml
metadata:
  labels:
    app.kubernetes.io/instance: my-argocd-app
  annotations:
    argocd.argoproj.io/tracking-id: "my-argocd-app:apps/Deployment:production/api-server"
```

The key distinction is that ArgoCD uses the **annotation** for all tracking decisions:

- Building the resource tree
- Determining ownership
- Identifying resources for pruning
- Detecting orphaned resources

The **label** is added as a convenience but is not used for critical tracking decisions. This means even if the label is overwritten by Helm or another tool, ArgoCD's tracking remains intact.

## Configuring Annotation+Label Tracking

Set the tracking method in the `argocd-cm` ConfigMap:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  application.resourceTrackingMethod: annotation+label
```

With Helm:

```yaml
# values.yaml for argo-cd chart
server:
  config:
    application.resourceTrackingMethod: "annotation+label"
```

Apply and restart:

```bash
kubectl apply -f argocd-cm.yaml
kubectl rollout restart deployment argocd-application-controller -n argocd

# Wait for the restart to complete
kubectl rollout status deployment argocd-application-controller -n argocd
```

After configuration, sync your applications to apply the new tracking metadata:

```bash
# Sync a single app
argocd app sync my-app

# Sync all apps
argocd app list -o name | xargs -I {} argocd app sync {}
```

## Why Annotation+Label Is Recommended

### Precise Tracking via Annotations

The annotation stores the full resource identity:

```
my-app:apps/Deployment:production/api-server
```

This means:
- No ambiguity about which application owns a resource
- Resources with the same name in different namespaces are correctly tracked
- Resources in different API groups are correctly distinguished

### Easy Querying via Labels

The label enables standard kubectl queries:

```bash
# List all resources managed by an ArgoCD application
kubectl get all -l app.kubernetes.io/instance=my-app -n production

# Count resources per application
kubectl get all --all-namespaces -l app.kubernetes.io/instance \
  -o jsonpath='{range .items[*]}{.metadata.labels.app\.kubernetes\.io/instance}{"\n"}{end}' | sort | uniq -c

# Find all deployments for an app
kubectl get deployments -l app.kubernetes.io/instance=my-app --all-namespaces
```

### Resilience to Label Conflicts

Since the annotation is the primary tracking mechanism, even if Helm or another tool overwrites the label, ArgoCD still correctly tracks the resource through its annotation. The label might show the wrong value, but ArgoCD's internal behavior is unaffected.

```yaml
# Even if Helm overwrites the label...
metadata:
  labels:
    app.kubernetes.io/instance: helm-release-name  # Wrong from ArgoCD's perspective
  annotations:
    argocd.argoproj.io/tracking-id: "my-argocd-app:apps/Deployment:production/api-server"  # ArgoCD uses this
```

## Practical Examples

### Verifying Tracking Metadata

After syncing with annotation+label tracking enabled:

```bash
# Check both label and annotation
kubectl get deployment api-server -n production -o jsonpath='{
  "label": "{.metadata.labels.app\.kubernetes\.io/instance}",
  "annotation": "{.metadata.annotations.argocd\.argoproj\.io/tracking-id}"
}'

# Expected output:
# label: my-app
# annotation: my-app:apps/Deployment:production/api-server
```

### Finding Orphaned Resources

Resources that have the label but not the annotation might be orphaned (previously tracked by label-only method):

```bash
# Find resources with the label
kubectl get all -l app.kubernetes.io/instance=my-app -n production -o name

# Compare with ArgoCD's tracked resources
argocd app resources my-app
```

If there are resources in the kubectl output that are not in the ArgoCD output, they may be orphaned or tracked by a different method.

### Multi-Namespace Applications

For applications that span multiple namespaces, annotation+label tracking works seamlessly:

```yaml
# Resource in namespace A
metadata:
  namespace: frontend
  labels:
    app.kubernetes.io/instance: my-full-stack-app
  annotations:
    argocd.argoproj.io/tracking-id: "my-full-stack-app:apps/Deployment:frontend/web-ui"

# Resource in namespace B
metadata:
  namespace: backend
  labels:
    app.kubernetes.io/instance: my-full-stack-app
  annotations:
    argocd.argoproj.io/tracking-id: "my-full-stack-app:apps/Deployment:backend/api-server"
```

## Handling Edge Cases

### Helm Charts That Set the Instance Label

When a Helm chart explicitly sets `app.kubernetes.io/instance`, ArgoCD will overwrite it with the ArgoCD application name during sync. To preserve the Helm value, use `ignoreDifferences`:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
spec:
  ignoreDifferences:
    - group: apps
      kind: Deployment
      jsonPointers:
        - /metadata/labels/app.kubernetes.io~1instance
```

With annotation+label tracking, this only affects the label display. Tracking still works correctly via the annotation.

### CRDs with Non-Standard Metadata

Some CRDs have restricted metadata handling. If a CRD does not allow custom annotations, annotation tracking will fail for that resource. In this rare case, the resource will not appear in ArgoCD's resource tree.

Check if an annotation was applied:

```bash
kubectl get <crd-resource> <name> -o jsonpath='{.metadata.annotations}'
```

### Shared Resources Between Applications

If two applications reference the same resource:

```yaml
# App A's tracking annotation
argocd.argoproj.io/tracking-id: "app-a:v1/ConfigMap:shared/common-config"

# When App B syncs, it overwrites with:
argocd.argoproj.io/tracking-id: "app-b:v1/ConfigMap:shared/common-config"
```

The last application to sync "wins" the ownership. Use the `FailOnSharedResource` sync option to prevent this.

## Setting Up from Scratch

Here is a complete example of setting up annotation+label tracking on a new ArgoCD installation:

```yaml
# 1. ArgoCD ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  application.resourceTrackingMethod: annotation+label

---
# 2. Sample Application
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/myorg/myrepo.git
    targetRevision: main
    path: k8s/production
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  syncPolicy:
    automated:
      selfHeal: true
      prune: true
    syncOptions:
      - CreateNamespace=true
```

After deployment, all resources managed by `my-app` will have both the label and annotation.

## Monitoring Tracking Health

Create a simple check to verify tracking is consistent:

```bash
#!/bin/bash
# verify-tracking.sh - Check that annotation+label tracking is consistent

APP_NAME=$1
NS=$2

echo "Checking tracking consistency for $APP_NAME in $NS"

# Resources tracked by annotation (what ArgoCD sees)
ARGOCD_RESOURCES=$(argocd app resources "$APP_NAME" -o json | jq -r '.[] | "\(.kind)/\(.name)"' | sort)

# Resources tracked by label (what kubectl sees)
LABEL_RESOURCES=$(kubectl get all -n "$NS" -l app.kubernetes.io/instance="$APP_NAME" -o json | jq -r '.items[] | "\(.kind)/\(.metadata.name)"' | sort)

echo "ArgoCD tracked: $(echo "$ARGOCD_RESOURCES" | wc -l | tr -d ' ')"
echo "Label tracked: $(echo "$LABEL_RESOURCES" | wc -l | tr -d ' ')"

# Find differences
DIFF=$(diff <(echo "$ARGOCD_RESOURCES") <(echo "$LABEL_RESOURCES"))
if [ -z "$DIFF" ]; then
  echo "Tracking is consistent"
else
  echo "Tracking inconsistencies found:"
  echo "$DIFF"
fi
```

For configuring the tracking method, see [how to configure resource tracking method in ArgoCD](https://oneuptime.com/blog/post/2026-02-26-argocd-resource-tracking-method/view). For migration from other methods, check out [how to migrate between resource tracking methods](https://oneuptime.com/blog/post/2026-02-26-argocd-migrate-resource-tracking/view).
