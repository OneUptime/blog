# How to Handle Intermittent Connectivity with ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Edge Computing, Network Resilience

Description: Practical strategies for handling unreliable network connections between ArgoCD and remote Kubernetes clusters, including retry policies, timeouts, and offline resilience.

---

When you manage Kubernetes clusters in remote locations - factory floors, retail stores, oil rigs, or branch offices - network connectivity is never guaranteed. Links go down, VPN tunnels flap, and satellite connections have high latency with frequent packet loss. ArgoCD needs to handle all of this gracefully without flooding your alert system with false positives or giving up on syncing remote clusters.

This post covers practical strategies for configuring ArgoCD to work reliably with intermittent connectivity to remote clusters.

## Understanding the Problem

ArgoCD's application controller runs a continuous reconciliation loop. Every few minutes (default is 3 minutes), it checks each application's live state against the desired state in Git. When it cannot reach a remote cluster's API server, several things happen: the application health status becomes "Unknown", sync operations fail with connection timeouts, and the repo server might queue up redundant manifest generation requests.

The default behavior is designed for low-latency, reliable connections. For edge scenarios, you need to tune almost everything.

```mermaid
sequenceDiagram
    participant AC as App Controller
    participant K8s as Edge Cluster API
    participant Git as Git Repository

    AC->>Git: Fetch desired state
    Git-->>AC: Return manifests
    AC->>K8s: Get live state
    Note over AC,K8s: Connection timeout!
    AC->>K8s: Retry 1
    Note over AC,K8s: Connection timeout!
    AC->>K8s: Retry 2
    K8s-->>AC: Live state returned
    AC->>AC: Compare states
    AC->>K8s: Apply sync
    Note over AC,K8s: Partial failure
    AC->>K8s: Retry sync
    K8s-->>AC: Sync complete
```

## Tuning Reconciliation Intervals

The first thing to adjust is how often ArgoCD checks each application. For edge clusters on unreliable links, the default 3-minute interval is too aggressive.

```yaml
# argocd-cm ConfigMap - increase reconciliation timeout

apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  # Increase default reconciliation to 10 minutes
  # This reduces API calls to remote clusters
  timeout.reconciliation: "10m"
  timeout.reconciliation.jitter: "60s"
```

ArgoCD does not support per-application polling intervals through annotations. The `argocd.argoproj.io/refresh` annotation only accepts `normal` or `hard` and triggers a one-time refresh, so use separate ArgoCD instances or webhook-driven refreshes if edge clusters need a different polling profile from local clusters.

```yaml
# Application-level manual refresh trigger
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: pos-edge-site-42
  namespace: argocd
  annotations:
    # Request a one-time hard refresh of manifests and cluster state
    argocd.argoproj.io/refresh: "hard"
spec:
  # ... app spec
```

## Configuring Connection Timeouts

By default, ArgoCD uses fairly aggressive timeouts when connecting to cluster API servers. For high-latency or unreliable links, you need to increase these.

```yaml
# argocd-cmd-params-cm - adjust timeout settings
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cmd-params-cm
  namespace: argocd
data:
  # Increase Kubernetes API transport timeouts for satellite/LTE links
  controller.k8s.tcp.timeout: "60s"
  controller.k8s.tls.handshake.timeout: "30s"
  controller.k8s.tcp.keepalive: "60s"
  controller.k8s.tcp.idle.timeout: "10m"
  # Retry transient Kubernetes API request failures
  controller.k8sclient.retry.max: "5"
  controller.k8sclient.retry.base.backoff: "500"
  # Repo server RPC timeout used by the application controller
  controller.repo.server.timeout.seconds: "300"
```

For the cluster connection itself, the cluster secret stores credentials, TLS settings, and optional proxy settings. It does not define per-cluster transport timeouts; keep those in `argocd-cmd-params-cm`.

```yaml
# Cluster secret with credentials and optional proxy settings
apiVersion: v1
kind: Secret
metadata:
  name: edge-site-42
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: cluster
type: Opaque
stringData:
  name: edge-site-42
  server: https://edge-42.vpn.internal:6443
  config: |
    {
      "bearerToken": "<token>",
      "tlsClientConfig": {
        "insecure": false,
        "caData": "<ca-data>"
      },
      "proxyUrl": "http://edge-proxy.internal:8080",
      "execProviderConfig": null
    }
```

## Retry Policies for Sync Operations

When a sync operation fails due to a network interruption, ArgoCD should retry automatically with exponential backoff. Configure this in the Application's sync policy.

```yaml
# Application with aggressive retry for intermittent connections
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: inventory-agent-edge-42
  namespace: argocd
spec:
  project: edge-fleet
  source:
    repoURL: https://github.com/company/edge-configs
    targetRevision: main
    path: apps/inventory-agent
  destination:
    server: https://edge-42.vpn.internal:6443
    namespace: inventory
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    retry:
      # Retry up to 20 times for unreliable connections
      limit: 20
      backoff:
        # Start with 30 second delay
        duration: 30s
        # Double the delay each retry
        factor: 2
        # Cap at 30 minutes between retries
        maxDuration: 30m
    syncOptions:
      - CreateNamespace=true
      # Apply only changed resources to minimize API calls
      - ApplyOutOfSyncOnly=true
      # Use server-side apply for better conflict handling
      - ServerSideApply=true
```

The `ApplyOutOfSyncOnly=true` option is particularly important for intermittent connections. Without it, ArgoCD applies all resources on every sync, even those that have not changed. With it, ArgoCD only applies resources that differ from the desired state, cutting down the number of API calls significantly.

## Handling the "Unknown" Health State

When ArgoCD cannot reach a cluster, applications show as "Unknown" health status. You need to distinguish between "temporarily unreachable" and "actually broken". The key is setting appropriate alert thresholds.

```yaml
# PrometheusRule that accounts for intermittent connectivity
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: edge-connectivity-alerts
spec:
  groups:
    - name: edge-health
      rules:
        # Only alert if an edge app has been Unknown for over 2 hours
        - alert: EdgeClusterUnreachable
          expr: |
            argocd_app_info{
              health_status="Unknown",
              name=~".*edge.*"
            } == 1
          for: 2h
          labels:
            severity: warning
          annotations:
            summary: "Edge cluster {{ $labels.name }} unreachable for 2+ hours"

        # Critical alert at 8 hours - likely a real outage
        - alert: EdgeClusterDown
          expr: |
            argocd_app_info{
              health_status="Unknown",
              name=~".*edge.*"
            } == 1
          for: 8h
          labels:
            severity: critical
          annotations:
            summary: "Edge cluster {{ $labels.name }} down for 8+ hours"
```

## Resource Caching for Offline Resilience

ArgoCD caches application and repository state in Redis. When a connection drops, cached application state can remain available to the API server and UI for a while, but the controller still cannot refresh live Kubernetes state until the remote API server is reachable again.

Increase the application state cache TTL so that cached UI/API data persists longer during outages.

```yaml
# argocd-cmd-params-cm - extend cache for edge resilience
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cmd-params-cm
  namespace: argocd
data:
  # Increase application state cache expiration from the default 1 hour
  controller.app.state.cache.expiration: "4h"
  server.app.state.cache.expiration: "4h"
```

## Reducing Bandwidth Usage

On low-bandwidth links, every API call counts. Here are techniques to minimize the data ArgoCD transfers.

First, use resource tracking by annotation instead of label. This does not remove the need for ArgoCD to list and watch resources, but it avoids ownership conflicts with tools that also use the `app.kubernetes.io/instance` label and avoids the label value length limit.

```yaml
# argocd-cm - use annotation tracking to avoid label conflicts
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  # Annotation-based tracking avoids conflicts with common instance labels
  application.resourceTrackingMethod: annotation
```

Second, limit the resource kinds that ArgoCD watches on edge clusters. If your edge applications only use Deployments, Services, and ConfigMaps, there is no need to watch CRDs, Jobs, or other resource types.

```yaml
# argocd-cm - include only selected resource kinds on an edge cluster
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  resource.inclusions: |
    - apiGroups:
        - "apps"
      kinds:
        - Deployment
      clusters:
        - https://edge-42.vpn.internal:6443
    - apiGroups:
        - ""
      kinds:
        - Service
        - ConfigMap
      clusters:
        - https://edge-42.vpn.internal:6443
```

## Connection Pooling and Keep-Alive

For VPN or tunnel-based connections to edge clusters, configure HTTP keep-alive to maintain persistent connections instead of establishing new TLS handshakes for every API call.

Use the `controller.k8s.tcp.keepalive`, `controller.k8s.tcp.idle.timeout`, and `controller.k8s.client.max.idle.connections` settings in `argocd-cmd-params-cm` for these transport-level settings. The `argocd cluster add` command registers cluster credentials, but it does not expose per-cluster keep-alive flags.

## Testing Your Configuration

Before rolling these settings to production, test with a simulated unreliable connection. You can use `tc` (traffic control) on Linux to add latency and packet loss to your test edge cluster.

```bash
# On the edge cluster node - simulate 200ms latency with 10% packet loss
sudo tc qdisc add dev eth0 root netem delay 200ms 50ms loss 10%

# Remove the simulation when done
sudo tc qdisc del dev eth0 root netem
```

Then watch how ArgoCD behaves - check the application controller logs for retry patterns and verify that applications eventually converge to the desired state.

```bash
# Watch the app controller logs for connection issues
kubectl logs -n argocd -l app.kubernetes.io/name=argocd-application-controller \
  --follow | grep -i "edge-site-42"
```

## Wrapping Up

Handling intermittent connectivity with ArgoCD comes down to four principles: increase timeouts and reconciliation intervals for edge clusters, configure generous retry policies with exponential backoff, set appropriate alert thresholds that account for expected outages, and minimize API calls through efficient resource tracking and selective syncing. With these settings in place, ArgoCD becomes a reliable GitOps engine even for the most challenging network environments.
