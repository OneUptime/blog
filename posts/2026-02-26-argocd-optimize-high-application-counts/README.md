# How to Optimize ArgoCD for High Application Counts

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Performance, Optimization

Description: Practical optimization techniques for ArgoCD when managing hundreds of applications, including cache tuning, diff optimization, resource exclusion, and reconciliation strategies.

---

As your ArgoCD deployment grows beyond a few dozen applications, performance degrades without optimization. Reconciliation times increase, the UI becomes sluggish, and sync operations take longer. Most of these problems come from ArgoCD doing too much work too often. This guide covers specific, actionable optimizations that reduce the load on every ArgoCD component.

## Identify What is Slow

Before optimizing, measure. Find out exactly where time is being spent:

```bash
# Check reconciliation times per application

kubectl exec -n argocd statefulset/argocd-application-controller -- \
  curl -s localhost:8082/metrics | grep argocd_app_reconcile

# Inspect reconciliation histogram buckets
kubectl exec -n argocd statefulset/argocd-application-controller -- \
  curl -s localhost:8082/metrics | \
  grep 'argocd_app_reconcile_bucket{.*le="30"' | \
  sort -t= -k2 -rn | head -20

# Check Git operation times
kubectl exec -n argocd deployment/argocd-repo-server -- \
  curl -s localhost:8084/metrics | grep argocd_git_request_duration_seconds
```

## Optimization 1: Reduce Reconciliation Frequency

ArgoCD reconciles every application every 3 minutes by default, even if nothing changed. For 500 applications, that is 167 reconciliations per minute:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  # Increase from default 180s to 300s
  timeout.reconciliation: "300s"

  # Disable hard reconciliation of application data and target manifest cache
  # Only do this if you use webhooks
  timeout.hard.reconciliation: "0s"
```

Combined with webhooks, this dramatically reduces unnecessary work:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: argocd-secret
  namespace: argocd
type: Opaque
stringData:
  webhook.github.secret: "your-webhook-secret"
  webhook.gitlab.secret: "your-webhook-secret"
  webhook.bitbucket.uuid: "your-bitbucket-uuid"
```

## Optimization 2: Ignore Non-Critical Differences

Many Kubernetes resources have fields that change without representing real drift. Ignoring these fields reduces diff computation time:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  # Ignore managed fields from controllers (major performance gain)
  resource.customizations.ignoreDifferences.all: |
    managedFieldsManagers:
      - kube-controller-manager
      - kube-scheduler
      - cluster-autoscaler
    jsonPointers:
      - /status
      - /metadata/resourceVersion
      - /metadata/generation
      - /metadata/managedFields

  # Ignore HPA-managed replicas
  resource.customizations.ignoreDifferences.apps_Deployment: |
    jsonPointers:
      - /spec/replicas
    jqPathExpressions:
      - .spec.template.metadata.annotations."kubectl.kubernetes.io/restartedAt"

  # Ignore auto-populated fields in Services
  resource.customizations.ignoreDifferences._Service: |
    jsonPointers:
      - /spec/clusterIP
      - /spec/clusterIPs

  # Ignore generated fields in ServiceAccounts
  resource.customizations.ignoreDifferences._ServiceAccount: |
    jsonPointers:
      - /secrets
```

## Optimization 3: Exclude Resources from Tracking

Some resource types generate massive amounts of events and state changes. Exclude resources ArgoCD does not need to track:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  # Exclude resource types that create noise
  resource.exclusions: |
    - apiGroups:
        - "events.k8s.io"
      kinds:
        - Event
      clusters:
        - "*"
    - apiGroups:
        - "metrics.k8s.io"
      kinds:
        - "*"
      clusters:
        - "*"
    - apiGroups:
        - "cilium.io"
      kinds:
        - CiliumIdentity
        - CiliumEndpoint
      clusters:
        - "*"
```

## Optimization 4: Use Server-Side Diff

Server-side diff asks the Kubernetes API server to calculate the predicted live object with a dry-run server-side apply, then caches the result between relevant changes:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cmd-params-cm
  namespace: argocd
data:
  controller.diff.server.side: "true"
```

Server-side diff is especially useful for:
- Applications with many resources (50+)
- Resources with complex specifications
- CRDs with large schemas

## Optimization 5: Optimize Repo Server Caching

Reduce Git operations by extending cache duration and using shallow clones for large-history repositories:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cmd-params-cm
  namespace: argocd
data:
  # Cache repo state and manifest generation data for 24 hours
  reposerver.repo.cache.expiration: "24h0m0s"

  # Limit concurrent git ls-remote requests to prevent Git server overload
  reposerver.git.lsremote.parallelism.limit: "15"
```

Configure shallow clones per repository:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: gitops-config-repo
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
stringData:
  type: git
  url: https://github.com/myorg/gitops-config.git
  depth: "1"
```

## Optimization 6: Use Resource Tracking with Annotations

ArgoCD supports three resource tracking methods. The annotation-based method is more reliable for large deployments:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  # Use annotation-based tracking while keeping the instance label for tool compatibility
  application.resourceTrackingMethod: "annotation+label"
```

Annotation-based tracking avoids label size limitations and is more accurate for resources that may be shared across applications.

## Optimization 7: Disable Unnecessary Features

Turn off features you do not use:

```bash
# Remove orphaned resource monitoring from projects where you do not need it
kubectl patch appproject default -n argocd --type=json \
  -p='[{"op":"remove","path":"/spec/orphanedResources"}]'
```

For applications that do not need real-time drift detection, disable auto-sync and self-heal:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: low-priority-app
  namespace: argocd
spec:
  syncPolicy:
    # No automated sync - manual only
    automated: null
```

## Optimization 8: Batch Operations with ApplicationSets

Instead of hand-writing individual Application resources, use ApplicationSets to generate them from a smaller template:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: all-microservices
  namespace: argocd
spec:
  generators:
    - git:
        repoURL: https://github.com/myorg/gitops-config
        revision: main
        directories:
          - path: "services/*"
  template:
    metadata:
      name: '{{path.basename}}'
    spec:
      project: default
      source:
        repoURL: https://github.com/myorg/gitops-config
        targetRevision: main
        path: '{{path}}'
      destination:
        server: https://kubernetes.default.svc
        namespace: '{{path.basename}}'
```

## Optimization 9: Repo Structure for Performance

How you organize your Git repository directly impacts ArgoCD performance:

**Bad**: One massive repository with all applications

```text
monorepo/
  app1/
  app2/
  ...
  app500/
```

Every Git fetch downloads the entire repository history.

**Better**: Split into per-team or per-domain repositories

```text
team-frontend/     # 50 apps
team-backend/      # 80 apps
team-platform/     # 30 apps
team-data/         # 40 apps
```

**Best**: Use a GitOps config repository pattern with shallow references

```text
gitops-config/        # Small config repo
  applications/       # Application manifests only
  overlays/           # Environment-specific config
```

Actual application Helm charts and Kustomize bases live in separate repositories.

## Optimization 10: Tune Kubernetes API Client

Increase the controller's Kubernetes API client throughput:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cmd-params-cm
  namespace: argocd
data:
  # Queries per second to the K8s API
  controller.k8s.client.qps: "100"

  # Burst above QPS limit
  controller.k8s.client.burst: "200"

  # Number of status processors (parallel reconciliation)
  controller.status.processors: "100"

  # Number of operation processors (parallel syncs)
  controller.operation.processors: "50"
```

## Measuring Optimization Impact

After applying optimizations, measure the improvement:

```bash
# Before and after: reconciliation time
kubectl exec -n argocd statefulset/argocd-application-controller -- \
  curl -s localhost:8082/metrics | \
  grep "argocd_app_reconcile_bucket"

# Before and after: Git request duration
kubectl exec -n argocd deployment/argocd-repo-server -- \
  curl -s localhost:8084/metrics | \
  grep "argocd_git_request_duration_seconds"

# Before and after: memory usage
kubectl top pods -n argocd

# Before and after: API server response time
time argocd app list --output name | wc -l
```

Document your baseline metrics before optimizing so you can quantify the improvement.

## Optimization Priority Order

If you can only do a few things, do them in this order:

1. Enable webhooks and increase reconciliation interval
2. Ignore non-critical differences
3. Enable server-side diff
4. Scale the controller horizontally with sharding
5. Optimize repo server caching and shallow clones
6. Exclude unnecessary resource types

Each of these optimizations compounds with the others. For monitoring the impact of your optimizations, see our guide on [monitoring ArgoCD component health](https://oneuptime.com/blog/post/2026-02-26-argocd-monitor-component-health/view).
