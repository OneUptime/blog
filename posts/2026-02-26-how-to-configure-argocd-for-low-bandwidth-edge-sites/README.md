# How to Configure ArgoCD for Low-Bandwidth Edge Sites

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Edge Computing, Performance Optimization

Description: Optimize ArgoCD configuration for edge sites with limited bandwidth by tuning reconciliation, caching, resource tracking, and manifest generation.

---

Edge sites connected over cellular, satellite, or constrained WAN links present a unique challenge for ArgoCD. Every byte matters when your link to a remote Kubernetes cluster runs over a 4G modem with a 5 Mbps cap and a monthly data budget. The default ArgoCD configuration was designed for data center networks where bandwidth is essentially free. This post shows you how to reconfigure ArgoCD to be a good citizen on bandwidth-constrained links.

## Measuring Your Baseline

Before optimizing, measure how much bandwidth ArgoCD currently uses. The application controller makes repeated calls to each cluster's API server for reconciliation. You can estimate the traffic by checking the controller metrics.

```bash
# Check how many API requests ArgoCD makes to each cluster
kubectl exec -n argocd deploy/argocd-application-controller -- \
  curl -s localhost:8082/metrics | grep argocd_cluster_api

# Look at the resource version cache hit rate
kubectl exec -n argocd deploy/argocd-application-controller -- \
  curl -s localhost:8082/metrics | grep argocd_cluster_cache
```

A typical ArgoCD installation managing 10 applications on a remote cluster generates roughly 500 to 2000 API requests per hour at the default reconciliation interval. Each request carries JSON payloads that can range from a few kilobytes for a simple ConfigMap to hundreds of kilobytes for complex CRDs.

## Extending Reconciliation Intervals

The most impactful change is reducing how often ArgoCD polls the edge cluster. The default is every 3 minutes. For a low-bandwidth site, 15 to 30 minutes is more appropriate.

```yaml
# argocd-cm ConfigMap - global reconciliation interval
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  # Set global reconciliation to 15 minutes (900 seconds)
  timeout.reconciliation: "900"
```

For edge-specific applications, override on a per-app basis.

```yaml
# Per-application override via annotation
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: sensor-collector-site-17
  namespace: argocd
  annotations:
    # Reconcile every 30 minutes for this bandwidth-constrained site
    argocd.argoproj.io/refresh: "1800"
spec:
  project: edge-sensors
  source:
    repoURL: https://github.com/company/edge-configs
    targetRevision: main
    path: sites/site-17/sensor-collector
  destination:
    server: https://site-17.edge.internal:6443
    namespace: sensors
```

## Optimizing Resource Tracking

ArgoCD tracks which Kubernetes resources belong to which Application. The default tracking method uses labels, which requires listing all resources of each type across the cluster to find the ones with matching labels. This generates significant API traffic.

Switch to annotation-based tracking, which is more targeted.

```yaml
# argocd-cm - switch to annotation tracking
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  # Annotation tracking reduces list operations
  application.resourceTrackingMethod: annotation
```

With annotation tracking, ArgoCD only needs to check resources it already knows about rather than listing entire resource types.

## Limiting Watched Resources

By default, ArgoCD watches all resource types in the cluster. For an edge site that only runs a few specific workloads, you can exclude resource types that are not relevant.

```yaml
# argocd-cm - exclude resource types you do not manage
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  # Exclude resource types that generate noise on edge clusters
  resource.exclusions: |
    - apiGroups:
        - "events.k8s.io"
      kinds:
        - "Event"
      clusters:
        - "https://site-*.edge.internal:*"
    - apiGroups:
        - "coordination.k8s.io"
      kinds:
        - "Lease"
      clusters:
        - "https://site-*.edge.internal:*"
    - apiGroups:
        - "discovery.k8s.io"
      kinds:
        - "EndpointSlice"
      clusters:
        - "https://site-*.edge.internal:*"
```

## Using Server-Side Diff

ArgoCD's default diff strategy downloads the full live manifests from the cluster and compares them locally. Server-side diff uses the Kubernetes API server's built-in dry-run capability instead, which can reduce the amount of data transferred.

```yaml
# Enable server-side diff globally
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cmd-params-cm
  namespace: argocd
data:
  controller.diff.server.side: "true"
```

Or enable it per application.

```yaml
# Per-application server-side diff
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: sensor-collector-site-17
spec:
  # ... other fields
  syncPolicy:
    syncOptions:
      - ServerSideApply=true
      - ApplyOutOfSyncOnly=true
```

The combination of `ServerSideApply` and `ApplyOutOfSyncOnly` means ArgoCD only sends data to the edge cluster when something actually needs to change.

## Optimizing Manifest Generation

ArgoCD's repo server generates manifests by rendering Helm charts or Kustomize overlays. For edge sites, you want to minimize how often this happens and cache results aggressively.

```yaml
# argocd-cmd-params-cm - tune repo server caching
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cmd-params-cm
  namespace: argocd
data:
  # Increase repo server parallelism limit to prevent queueing
  reposerver.parallelism.limit: "5"
  # Cache manifests longer to reduce regeneration
  reposerver.repo.cache.expiration: "24h"
```

## Compressing API Traffic

If your edge clusters are accessed through an HTTP proxy or API gateway, enable gzip compression. The Kubernetes API server supports this natively.

```yaml
# Cluster secret with compression-aware configuration
apiVersion: v1
kind: Secret
metadata:
  name: edge-site-17
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: cluster
type: Opaque
stringData:
  name: edge-site-17
  server: https://site-17.edge.internal:6443
  config: |
    {
      "bearerToken": "<token>",
      "tlsClientConfig": {
        "insecure": false,
        "caData": "<ca-cert>"
      }
    }
```

The Go HTTP client that ArgoCD uses already sends `Accept-Encoding: gzip` headers. Make sure your edge cluster's API server (or any reverse proxy in front of it) honors this header.

## Selective Sync with Resource Hooks

Instead of syncing everything at once, use sync waves to prioritize critical resources. This way, if the connection drops mid-sync, the most important resources are already applied.

```yaml
# Critical ConfigMaps sync first (wave -1)
apiVersion: v1
kind: ConfigMap
metadata:
  name: sensor-config
  annotations:
    argocd.argoproj.io/sync-wave: "-1"
data:
  collection-interval: "30s"
  upload-batch-size: "100"
---
# Application deployment syncs second (wave 0)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: sensor-collector
  annotations:
    argocd.argoproj.io/sync-wave: "0"
spec:
  replicas: 1
  selector:
    matchLabels:
      app: sensor-collector
  template:
    metadata:
      labels:
        app: sensor-collector
    spec:
      containers:
        - name: collector
          image: company/sensor-collector:v2.1.0
          resources:
            requests:
              cpu: 50m
              memory: 64Mi
            limits:
              cpu: 200m
              memory: 128Mi
```

## Webhook-Driven Sync Instead of Polling

Instead of having ArgoCD poll the Git repository on a schedule, configure a Git webhook to trigger syncs only when there are actual changes. This eliminates unnecessary Git fetch operations.

```yaml
# argocd-cm - configure webhook secret
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  # Disable automatic polling for edge applications
  timeout.reconciliation: "0"  # Disable periodic reconciliation
```

Then configure your Git provider to send webhooks to ArgoCD's webhook endpoint.

```bash
# GitHub webhook URL
https://argocd.company.com/api/webhook

# The webhook triggers a refresh only for applications that
# reference the changed repository and branch
```

Note that setting reconciliation to 0 disables periodic polling entirely. This saves bandwidth but means ArgoCD will not detect drift caused by manual changes on the edge cluster. A balanced approach is to use webhooks for Git changes and keep a very long reconciliation interval (like 1 hour) as a safety net.

```yaml
# Balanced approach: webhooks plus hourly drift detection
data:
  timeout.reconciliation: "3600"  # 1 hour safety net
```

## Monitoring Bandwidth Impact

Track the bandwidth impact of your ArgoCD configuration using the controller's built-in metrics.

```yaml
# Grafana dashboard query for API request rate per cluster
# This shows how many requests ArgoCD makes to each edge cluster
rate(argocd_cluster_api_server_requests_total{server=~".*edge.*"}[1h])
```

Compare the before and after metrics when you apply these optimizations. In practice, the combination of extended reconciliation intervals, annotation tracking, and selective syncing can reduce ArgoCD's bandwidth usage by 80 to 90 percent compared to the default configuration.

## Wrapping Up

Configuring ArgoCD for low-bandwidth edge sites is about reducing unnecessary traffic at every layer. Extend reconciliation intervals, use annotation-based resource tracking, exclude irrelevant resource types, enable server-side diff and apply-out-of-sync-only, and consider webhook-driven syncs. These changes let ArgoCD manage edge clusters effectively even over the most constrained network links, keeping your GitOps workflow intact without burning through your data budget.
