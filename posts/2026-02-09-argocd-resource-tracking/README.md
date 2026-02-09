# How to configure ArgoCD resource tracking methods for improved performance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ArgoCD, Kubernetes, GitOps, Performance, Resource Management

Description: Discover how to configure and optimize ArgoCD resource tracking methods including label-based, annotation-based, and hybrid approaches to improve sync performance and reduce cluster load.

---

ArgoCD needs to track which Kubernetes resources belong to which applications to perform accurate synchronization and health checks. The method ArgoCD uses for resource tracking has a significant impact on sync performance, cluster load, and compatibility with other tools. Understanding and configuring the right tracking method can dramatically improve your ArgoCD deployment's efficiency.

This guide explores the different resource tracking methods available in ArgoCD, their performance characteristics, and how to choose and configure the optimal tracking strategy for your environment.

## Understanding ArgoCD resource tracking

Resource tracking is how ArgoCD identifies which resources in the cluster belong to which Application. This identification is critical for:

- Determining sync status by comparing desired state with live state
- Identifying resources that need to be pruned
- Calculating application health
- Managing resource lifecycle during sync operations

ArgoCD supports three main tracking methods:

1. Label-based tracking (default)
2. Annotation-based tracking
3. Annotation and label tracking (hybrid)

Each method has different performance implications and compatibility considerations.

## Label-based resource tracking

Label-based tracking is the default method in ArgoCD. It adds tracking labels to every resource:

```yaml
# Example resource with ArgoCD tracking labels
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-server
  namespace: production
  labels:
    app.kubernetes.io/instance: web-app
    app.kubernetes.io/name: web-server
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web-server
  template:
    metadata:
      labels:
        app: web-server
        app.kubernetes.io/instance: web-app  # Tracking label
    spec:
      containers:
        - name: nginx
          image: nginx:1.21
```

The tracking labels include:
- `app.kubernetes.io/instance`: The Application name
- `app.kubernetes.io/name`: Optional resource name

**Advantages:**
- Fast resource discovery using label selectors
- Compatible with most Kubernetes tools
- Good for large applications with many resources

**Disadvantages:**
- Modifies resource labels, which may conflict with immutable label selectors
- Can cause issues with pod label selectors in Deployments
- May interfere with tools that depend on specific labels

## Annotation-based resource tracking

Annotation-based tracking uses annotations instead of labels to track resources:

```yaml
# argocd-cm configmap configuration
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  application.resourceTrackingMethod: annotation
```

With this configuration, resources are tracked using annotations:

```yaml
# Example resource with annotation tracking
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-server
  namespace: production
  annotations:
    argocd.argoproj.io/tracking-id: web-app:apps/Deployment:production/web-server
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web-server
  template:
    metadata:
      labels:
        app: web-server
    spec:
      containers:
        - name: nginx
          image: nginx:1.21
```

The tracking annotation format is: `{app-name}:{group}/{kind}:{namespace}/{name}`

**Advantages:**
- Does not modify resource labels
- Avoids conflicts with immutable label selectors
- Works well with external tools that manage labels
- Recommended for new installations

**Disadvantages:**
- Slower resource discovery (cannot use label selectors)
- ArgoCD must list and filter all resources in the namespace
- Higher API server load for large applications

## Hybrid tracking with annotation and label

The hybrid method uses both annotations and a lightweight label:

```yaml
# argocd-cm configmap configuration
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  application.resourceTrackingMethod: annotation+label
```

Resources get both the tracking annotation and a single label:

```yaml
# Example resource with hybrid tracking
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-server
  namespace: production
  labels:
    app.kubernetes.io/instance: web-app
  annotations:
    argocd.argoproj.io/tracking-id: web-app:apps/Deployment:production/web-server
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web-server
  template:
    metadata:
      labels:
        app: web-server
    spec:
      containers:
        - name: nginx
          image: nginx:1.21
```

**Advantages:**
- Fast resource discovery using the label
- Accurate tracking using the annotation
- Best performance for most scenarios

**Disadvantages:**
- Still adds a label (though only one)
- Slightly more metadata than annotation-only

## Configuring resource tracking methods

To change the tracking method, update the argocd-cm ConfigMap:

```bash
# Edit the ArgoCD configuration
kubectl edit configmap argocd-cm -n argocd
```

Add or modify the tracking method:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  # Choose one of these options:
  # application.resourceTrackingMethod: label  # Default
  # application.resourceTrackingMethod: annotation
  application.resourceTrackingMethod: annotation+label  # Recommended
```

After changing the tracking method, restart ArgoCD components:

```bash
# Restart application controller
kubectl rollout restart deployment argocd-application-controller -n argocd

# Restart server
kubectl rollout restart deployment argocd-server -n argocd

# Restart repo server
kubectl rollout restart deployment argocd-repo-server -n argocd
```

## Migrating between tracking methods

When migrating from one tracking method to another, ArgoCD needs to re-track all resources. Here's the migration process:

```bash
# Step 1: Update the tracking method in argocd-cm
kubectl patch configmap argocd-cm -n argocd \
  --patch '{"data": {"application.resourceTrackingMethod": "annotation+label"}}'

# Step 2: Restart ArgoCD components
kubectl rollout restart -n argocd \
  deployment/argocd-application-controller \
  deployment/argocd-server \
  deployment/argocd-repo-server

# Step 3: Force a hard refresh of all applications
argocd app list -o name | xargs -n 1 argocd app get --hard-refresh

# Step 4: Trigger a sync to apply new tracking metadata
argocd app list -o name | xargs -n 1 argocd app sync --force
```

The `--force` flag ensures resources are updated even if they appear in sync, which is necessary to apply the new tracking metadata.

## Performance optimization with resource tracking

Different tracking methods have different performance characteristics:

**For small to medium applications (< 100 resources):**
- All tracking methods perform similarly
- Choose based on compatibility requirements

**For large applications (100-1000 resources):**
- Annotation-only tracking may cause slow syncs
- Use annotation+label or label-based tracking
- Consider splitting into multiple Applications

**For very large applications (> 1000 resources):**
- Use label-based or annotation+label tracking
- Implement resource filtering to reduce tracked resources
- Use Application of Applications pattern

Configure resource exclusions to improve performance:

```yaml
# argocd-cm configmap
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  application.resourceTrackingMethod: annotation+label
  resource.exclusions: |
    - apiGroups:
      - "*"
      kinds:
      - Event
      - ConfigMap
      clusters:
      - "*"
  resource.compareoptions: |
    ignoreAggregatedRoles: true
```

This configuration excludes Events and ConfigMaps from tracking, reducing the number of resources ArgoCD monitors.

## Tracking method selection guide

Choose your tracking method based on these criteria:

**Use annotation-only tracking when:**
- You have strict immutable label requirements
- Other tools heavily manage resource labels
- You have small to medium-sized applications
- You prioritize compatibility over performance

**Use label-based tracking when:**
- You have very large applications
- Performance is critical
- You control all label management
- You're upgrading from older ArgoCD versions

**Use annotation+label tracking when:**
- You want the best balance of performance and compatibility
- You have mixed application sizes
- You're setting up a new ArgoCD installation
- You want future-proof configuration

## Monitoring tracking performance

Monitor the impact of your tracking method:

```bash
# Check application sync duration
argocd app get myapp --show-operation

# View controller metrics
kubectl port-forward -n argocd svc/argocd-metrics 8082:8082

# Query Prometheus metrics (if configured)
# argocd_app_reconcile_duration_seconds
# argocd_app_reconcile_count
```

Key metrics to watch:
- Reconciliation duration
- API server request rate
- Resource count per application
- Sync operation duration

## Troubleshooting tracking issues

Common issues and solutions:

**Resources not detected after migration:**

```bash
# Force application refresh
argocd app get myapp --hard-refresh

# Manually sync with force
argocd app sync myapp --force
```

**Orphaned resources with old tracking metadata:**

```bash
# List application resources
argocd app resources myapp

# Manually cleanup orphaned resources
kubectl delete <resource-type> <resource-name> -n <namespace>
```

**Performance degradation after switching to annotation tracking:**

Switch to hybrid tracking for better performance:

```bash
kubectl patch configmap argocd-cm -n argocd \
  --patch '{"data": {"application.resourceTrackingMethod": "annotation+label"}}'

kubectl rollout restart -n argocd deployment/argocd-application-controller
```

## Advanced tracking configurations

Fine-tune tracking behavior with additional settings:

```yaml
# argocd-cm configmap
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  application.resourceTrackingMethod: annotation+label

  # Ignore differences in tracking metadata
  resource.compareoptions: |
    ignoreResourceStatusField: all

  # Control which resources are tracked
  resource.inclusions: |
    - apiGroups:
      - "*"
      kinds:
      - Deployment
      - Service
      - ConfigMap
      - Secret
      clusters:
      - "*"
```

## Conclusion

Choosing the right resource tracking method in ArgoCD is essential for optimal performance and compatibility. For most modern deployments, the hybrid annotation+label method provides the best balance of speed and flexibility. Understanding the trade-offs between tracking methods allows you to make informed decisions based on your application size, performance requirements, and integration needs. Regular monitoring and performance testing help ensure your chosen tracking method continues to meet your needs as your deployment scales.
