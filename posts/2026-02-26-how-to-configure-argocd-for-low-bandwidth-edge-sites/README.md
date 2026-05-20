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
  curl -s localhost:8082/metrics | grep argocd_kubectl_requests_total

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
  timeout.reconciliation: "15m"
```

ArgoCD does not support a per-Application reconciliation interval annotation. The `argocd.argoproj.io/refresh` annotation triggers a one-time refresh with the values `normal` or `hard`; it does not accept an interval. If different edge sites need very different polling intervals, use separate ArgoCD instances or keep the global interval conservative and rely on webhooks for faster Git-change detection.

## Optimizing Resource Tracking

ArgoCD tracks which Kubernetes resources belong to which Application. Older installations commonly use label-based tracking, while current ArgoCD versions can use annotation-based tracking. Annotation tracking avoids conflicts with other tools that also write the `app.kubernetes.io/instance` label and can make ownership more precise.

Use annotation-based tracking where possible.

```yaml
# argocd-cm - switch to annotation tracking
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  # Annotation tracking avoids app.kubernetes.io/instance label conflicts
  application.resourceTrackingMethod: annotation
```

After changing the tracking method, sync your applications again so ArgoCD applies the new tracking metadata to managed resources.

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

ArgoCD's default diff strategy compares desired manifests with live state and the last-applied configuration. Server-side diff uses Kubernetes server-side apply dry-run to calculate the predicted live state. It still makes API calls to the cluster, but it can produce more accurate diffs for resources managed with server-side apply.

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
  annotations:
    argocd.argoproj.io/compare-options: ServerSideDiff=true
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

For sync operations, use server-side apply and selective sync when they fit your workload.

```yaml
# Per-application sync options
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: sensor-collector-site-17
spec:
  project: edge-sensors
  source:
    repoURL: https://github.com/company/edge-configs
    targetRevision: main
    path: sites/site-17/sensor-collector
  destination:
    server: https://site-17.edge.internal:6443
    namespace: sensors
  syncPolicy:
    syncOptions:
      - ServerSideApply=true
      - ApplyOutOfSyncOnly=true
```

`ServerSideApply` makes ArgoCD apply changes with Kubernetes server-side apply, and `ApplyOutOfSyncOnly` tells ArgoCD to sync only out-of-sync resources during auto sync.

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
  # Keep manifest/revision cache entries for 24 hours
  reposerver.repo.cache.expiration: "24h0m0s"
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
        "caData": "<base64-ca-cert>"
      }
    }
```

The Go HTTP client that ArgoCD uses already sends `Accept-Encoding: gzip` headers. Make sure your edge cluster's API server (or any reverse proxy in front of it) honors this header.

## Selective Sync with Sync Waves

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
# argocd-cm - disable periodic repository polling
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  # Disable automatic polling for edge applications
  timeout.reconciliation: "0"  # Disable periodic reconciliation by timeout
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
  timeout.reconciliation: "1h"  # 1 hour safety net
```

## Monitoring Bandwidth Impact

Track the bandwidth impact of your ArgoCD configuration using the controller's built-in metrics.

```yaml
# Grafana dashboard query for API request rate per cluster
# This shows how many requests ArgoCD makes to each edge cluster
rate(argocd_kubectl_requests_total{server=~".*edge.*"}[1h])
```

Compare the before and after metrics when you apply these optimizations. In practice, the combination of extended reconciliation intervals, resource exclusions, webhooks, and selective syncing can significantly reduce ArgoCD's bandwidth usage compared to the default configuration.

## Wrapping Up

Configuring ArgoCD for low-bandwidth edge sites is about reducing unnecessary traffic at every layer. Extend reconciliation intervals, use annotation-based resource tracking, exclude irrelevant resource types, enable server-side diff and apply-out-of-sync-only, and consider webhook-driven syncs. These changes let ArgoCD manage edge clusters effectively even over the most constrained network links, keeping your GitOps workflow intact without burning through your data budget.
