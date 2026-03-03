# How to Use Annotation-Based Resource Tracking in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Resource Management

Description: Learn how ArgoCD annotation-based resource tracking works using the tracking-id annotation, its advantages over label tracking, configuration steps, and how it handles shared resources and CRDs.

---

Annotation-based resource tracking is an alternative to the default label-based tracking in ArgoCD. Instead of using the `app.kubernetes.io/instance` label to associate resources with applications, it uses the `argocd.argoproj.io/tracking-id` annotation. This method was introduced to solve the label conflict problems that plague label-based tracking, and it provides more precise resource identification.

This guide covers how annotation tracking works, why it is better for most production environments, and how to configure it.

## How Annotation-Based Tracking Works

When annotation tracking is enabled, ArgoCD adds a tracking annotation to every managed resource:

```yaml
metadata:
  annotations:
    argocd.argoproj.io/tracking-id: "my-app:apps/Deployment:production/api-server"
```

The tracking ID format is:

```text
<application-name>:<group>/<kind>:<namespace>/<resource-name>
```

For cluster-scoped resources (no namespace):

```text
<application-name>:<group>/<kind>:<resource-name>
```

This annotation uniquely identifies which ArgoCD application owns the resource, including the full API group and kind. This is much more precise than the label method, which only stores the application name.

## Configuring Annotation-Based Tracking

Set the tracking method in `argocd-cm`:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  application.resourceTrackingMethod: annotation
```

With Helm:

```yaml
# values.yaml for argo-cd chart
server:
  config:
    application.resourceTrackingMethod: "annotation"
```

After applying the change:

```bash
kubectl apply -f argocd-cm.yaml

# Restart the application controller to pick up the change
kubectl rollout restart deployment argocd-application-controller -n argocd
```

## Advantages of Annotation Tracking

### No Label Conflicts

The primary advantage is eliminating conflicts with the `app.kubernetes.io/instance` label. Since annotation tracking uses a custom ArgoCD-specific annotation, it does not interfere with:

- Helm chart labels
- Kustomize common labels
- Operator-managed labels
- Standard Kubernetes recommended labels

```yaml
# With annotation tracking, Helm labels are preserved
metadata:
  labels:
    app.kubernetes.io/instance: my-helm-release  # Set by Helm, NOT overwritten
    app.kubernetes.io/name: my-app               # Set by Helm
  annotations:
    argocd.argoproj.io/tracking-id: "my-argocd-app:apps/Deployment:production/api-server"
```

### Precise Resource Identification

Label tracking only stores the application name. Annotation tracking stores the full resource identity:

```text
# Label tracking
app.kubernetes.io/instance: my-app

# Annotation tracking
argocd.argoproj.io/tracking-id: "my-app:apps/Deployment:production/api-server"
```

This precision helps ArgoCD correctly handle:

- Resources with the same name in different API groups
- Resources with the same name in different namespaces
- Resources from different applications that happen to have similar names

### Better Shared Resource Handling

When a resource is referenced by multiple ArgoCD applications, annotation tracking handles it more gracefully because the tracking ID includes the full resource path.

### No Impact on Label Selectors

Labels are frequently used in label selectors for Services, NetworkPolicies, and PodDisruptionBudgets. Modifying labels can break these selectors. Annotations are never used in selectors, so annotation tracking has no impact on Kubernetes resource relationships.

## Limitations of Annotation Tracking

### No kubectl Label Queries

Unlike label tracking, you cannot use kubectl label selectors to find tracked resources:

```bash
# This does NOT work with annotation-only tracking
kubectl get all -l app.kubernetes.io/instance=my-app

# Instead, you need to use ArgoCD CLI
argocd app resources my-app
```

If you need kubectl-based queries, use `annotation+label` tracking instead.

### Annotation Size Limits

Kubernetes annotations have a total size limit (typically 256KB for all annotations combined). In practice, the tracking ID annotation is small (under 200 bytes), so this is rarely an issue. But if your resources already have many large annotations, keep this in mind.

## Verifying Annotation Tracking

After enabling annotation tracking and syncing your applications, verify resources are properly tracked:

```bash
# Check the tracking annotation on a resource
kubectl get deployment api-server -n production \
  -o jsonpath='{.metadata.annotations.argocd\.argoproj\.io/tracking-id}'

# Expected output: my-app:apps/Deployment:production/api-server
```

Compare with what ArgoCD sees:

```bash
# List resources ArgoCD tracks for this application
argocd app resources my-app
```

If a resource does not have the annotation, it may not appear in the ArgoCD resource tree. Force a sync to add the annotation:

```bash
argocd app sync my-app
```

## How Annotation Tracking Handles Different Resource Types

### Namespaced Resources

```yaml
# Deployment in the production namespace
metadata:
  annotations:
    argocd.argoproj.io/tracking-id: "my-app:apps/Deployment:production/api-server"
```

### Cluster-Scoped Resources

```yaml
# ClusterRole (no namespace)
metadata:
  annotations:
    argocd.argoproj.io/tracking-id: "my-app:rbac.authorization.k8s.io/ClusterRole:api-reader"
```

### Core API Group Resources

```yaml
# ConfigMap (core API group, represented as empty string)
metadata:
  annotations:
    argocd.argoproj.io/tracking-id: "my-app:/ConfigMap:production/app-config"
```

### CRDs

```yaml
# Custom resource
metadata:
  annotations:
    argocd.argoproj.io/tracking-id: "my-app:cert-manager.io/Certificate:production/my-cert"
```

## Annotation Tracking with Sync Operations

Annotation tracking changes how some sync operations work:

### Pruning

When ArgoCD prunes resources (removes resources no longer in Git), it uses the tracking annotation to find resources to prune. Only resources with the tracking annotation matching the application are candidates for pruning.

### Orphaned Resource Detection

With annotation tracking, orphaned resource detection looks for resources in the application's namespaces that do NOT have a tracking annotation. This is more precise than label-based detection.

### Resource Tree Building

The resource tree in the UI is built by querying for resources with the tracking annotation. Resources without the annotation are not shown in the tree even if they are in the application's namespace.

## Comparing Tracking Annotation Values

You can compare what ArgoCD expects with what is actually on the resource:

```bash
# What ArgoCD expects (from the manifest)
argocd app manifests my-app --source live -o json | jq -r '.metadata.annotations["argocd.argoproj.io/tracking-id"] // empty'

# What is actually on the resource
kubectl get deployment api-server -n production -o jsonpath='{.metadata.annotations.argocd\.argoproj\.io/tracking-id}'
```

If these differ, the resource may show as OutOfSync.

## Transitioning from Label to Annotation Tracking

If you are currently using label tracking and want to switch to annotation tracking:

1. Set the tracking method to `annotation` in `argocd-cm`
2. Restart the application controller
3. Sync all applications (this adds the tracking annotation)
4. Old label-based tracking metadata remains but is no longer used
5. Resources may briefly show as OutOfSync during the transition

For a detailed migration guide, see [how to migrate between resource tracking methods](https://oneuptime.com/blog/post/2026-02-26-argocd-migrate-resource-tracking/view).

## When to Use Pure Annotation Tracking

Choose annotation tracking when:

- You do not need `kubectl -l` queries for ArgoCD-managed resources
- Your Helm charts or operators set `app.kubernetes.io/instance`
- You want the cleanest separation between ArgoCD tracking and Kubernetes conventions
- You run multiple ArgoCD instances on the same cluster

For environments where you need both precise tracking and kubectl queryability, use `annotation+label` instead. See [how to use annotation+label resource tracking](https://oneuptime.com/blog/post/2026-02-26-argocd-annotation-label-resource-tracking/view).
