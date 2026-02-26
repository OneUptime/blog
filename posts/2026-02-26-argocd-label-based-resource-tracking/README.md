# How to Use Label-Based Resource Tracking in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Resource Management

Description: Learn how ArgoCD label-based resource tracking works, its advantages and limitations, how to configure it, and how to handle common issues like label conflicts with Helm charts and operators.

---

Label-based tracking is the original and default resource tracking method in ArgoCD. It uses the standard Kubernetes label `app.kubernetes.io/instance` to associate cluster resources with ArgoCD applications. While it is the simplest approach, it comes with significant limitations that you need to understand to avoid problems in production.

This guide covers how label-based tracking works, its practical implications, and how to deal with the issues it can cause.

## How Label-Based Tracking Works

When ArgoCD deploys resources to a cluster, it adds the `app.kubernetes.io/instance` label to every resource:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  labels:
    app.kubernetes.io/instance: my-argocd-application
spec:
  # ...
```

The label value is the name of the ArgoCD Application resource that manages it. ArgoCD uses this label to:

1. Build the resource tree in the UI
2. Determine which resources to include in health checks
3. Identify which resources to prune during sync
4. Track ownership for orphaned resource detection

## Configuring Label-Based Tracking

Label-based tracking is the default, so you may not need to configure anything. But if you want to explicitly set it:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  application.resourceTrackingMethod: label
```

Or leave the `application.resourceTrackingMethod` key unset, which defaults to `label`.

## Querying Tracked Resources

One of the biggest advantages of label-based tracking is easy querying with kubectl:

```bash
# Find all resources managed by a specific ArgoCD application
kubectl get all -l app.kubernetes.io/instance=my-app -n production

# Find all resources across all namespaces
kubectl get all --all-namespaces -l app.kubernetes.io/instance=my-app

# Count resources per application
kubectl get all --all-namespaces -l app.kubernetes.io/instance -o jsonpath='{range .items[*]}{.metadata.labels.app\.kubernetes\.io/instance}{"\n"}{end}' | sort | uniq -c | sort -rn

# Get specific resource types
kubectl get deployments -l app.kubernetes.io/instance=my-app
kubectl get services -l app.kubernetes.io/instance=my-app
kubectl get configmaps -l app.kubernetes.io/instance=my-app
```

This is particularly useful for debugging and operational visibility.

## The Label Conflict Problem

The biggest issue with label-based tracking is that `app.kubernetes.io/instance` is a well-known label defined in the Kubernetes recommended labels specification. Many tools use it:

- **Helm**: Sets this label to the release name by default
- **Kustomize**: Can set common labels including this one
- **Operators**: Many operators set this label on resources they create
- **Application generators**: Various tools use this label for their own tracking

When ArgoCD and another tool both try to set this label, conflicts occur.

### Example: Helm Chart Conflict

Consider a Helm chart that includes this in its templates:

```yaml
# Helm chart template
metadata:
  labels:
    app.kubernetes.io/instance: {{ .Release.Name }}
```

When ArgoCD deploys this chart, it:

1. Renders the Helm template (which sets `app.kubernetes.io/instance: my-release`)
2. Adds its own tracking label (`app.kubernetes.io/instance: my-argocd-app`)
3. The ArgoCD value overwrites the Helm value

This can cause:

- The Helm-generated label value is lost
- The resource may show as perpetually "OutOfSync" because Git has one value but live has another
- Other tools that depend on the Helm release name in this label break

### Diagnosing Label Conflicts

```bash
# Check the desired label value (from Git/Helm)
argocd app manifests my-app --source live -o json | jq '.metadata.labels["app.kubernetes.io/instance"]'

# Check the live label value
kubectl get deployment my-deployment -o jsonpath='{.metadata.labels.app\.kubernetes\.io/instance}'

# If they differ, you have a conflict
```

## Working Around Label Conflicts

### Option 1: Use ignoreDifferences

Tell ArgoCD to ignore the label difference:

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

This prevents the constant OutOfSync status but does not fix the underlying tracking issue.

### Option 2: Switch to Annotation Tracking

The cleanest solution is to switch to annotation-based or annotation+label tracking:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  application.resourceTrackingMethod: annotation+label
```

With annotation tracking, ArgoCD uses `argocd.argoproj.io/tracking-id` for actual ownership tracking. The `app.kubernetes.io/instance` label is still set (with annotation+label mode) but is not the primary tracking mechanism.

### Option 3: Modify Your Helm Charts

If you control the Helm charts, you can change them to not set `app.kubernetes.io/instance` or to use a different value:

```yaml
# In the Helm chart, conditionally set the label
metadata:
  labels:
    {{- if not .Values.argocd.managed }}
    app.kubernetes.io/instance: {{ .Release.Name }}
    {{- end }}
```

## Label Tracking with Multiple Applications

When two ArgoCD applications try to manage the same resource, label-based tracking creates a conflict because a resource can only have one value for the `app.kubernetes.io/instance` label.

```bash
# App A deploys ConfigMap with label: app.kubernetes.io/instance=app-a
# App B also references the same ConfigMap
# Only one label value can exist - whoever syncs last "wins"
```

This is a fundamental limitation of label-based tracking. Annotation tracking handles this better because the tracking ID includes the full resource path.

## Label Propagation to Sub-Resources

ArgoCD only sets the tracking label on resources it directly manages. It does not propagate labels to sub-resources created by controllers:

- ArgoCD creates a Deployment with `app.kubernetes.io/instance: my-app`
- Kubernetes creates a ReplicaSet from the Deployment
- The ReplicaSet inherits labels from the Deployment template, not from the Deployment metadata

This means you might see the Deployment tracked but not its ReplicaSets and Pods in some views.

## Verifying Label Tracking Is Working

Check that resources are properly tracked:

```bash
# List all tracked resources for an app
kubectl get all -l app.kubernetes.io/instance=my-app -n production

# Verify a specific resource
kubectl get deployment my-deployment -n production -o jsonpath='{.metadata.labels}'

# Compare with what ArgoCD sees
argocd app resources my-app
```

If the kubectl query returns fewer resources than ArgoCD shows, some resources might have lost their labels (perhaps through a manual edit or operator modification).

## Best Practices for Label-Based Tracking

1. **Use it only for simple setups**: If you have few applications and no Helm charts that set `app.kubernetes.io/instance`, label tracking works fine.

2. **Monitor for conflicts**: Regularly check that label values match expectations.

3. **Consider migrating**: If you start experiencing conflicts, plan a migration to annotation-based tracking.

4. **Do not manually edit tracking labels**: Let ArgoCD manage them. Manual edits can cause resources to "move" between applications.

5. **Audit shared resources**: If multiple applications reference the same resource, label tracking will cause problems.

For the recommended tracking method, see [how to use annotation+label resource tracking](https://oneuptime.com/blog/post/2026-02-26-argocd-annotation-label-resource-tracking/view). For migration guidance, check out [how to migrate between resource tracking methods](https://oneuptime.com/blog/post/2026-02-26-argocd-migrate-resource-tracking/view).
