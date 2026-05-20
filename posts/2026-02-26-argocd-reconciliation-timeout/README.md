# How to Configure Reconciliation Timeout in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Performance, Configuration

Description: Learn how to configure and tune the reconciliation timeout in ArgoCD to balance responsiveness with cluster performance for your GitOps deployments.

---

ArgoCD's reconciliation loop is the heartbeat of your GitOps workflow. It periodically compares the desired state in Git with the live state in your cluster and triggers syncs when differences are found. By default, ArgoCD polls Git repositories every 120 seconds with up to 60 seconds of jitter, for a maximum interval of about 3 minutes. For many environments, this default needs tuning. This guide walks you through configuring the reconciliation timeout, understanding its impact, and choosing the right value for your setup.

## Understanding the Reconciliation Loop

The ArgoCD application controller runs a continuous reconciliation loop. For each application, it performs these steps:

```mermaid
flowchart TD
    A[Reconciliation Timer Fires] --> B[Fetch Manifests from Git/Helm/Kustomize]
    B --> C[Compare with Live Cluster State]
    C --> D{Differences Found?}
    D -->|Yes| E[Mark as OutOfSync]
    D -->|No| F[Mark as Synced]
    E --> G{Auto-Sync Enabled?}
    G -->|Yes| H[Trigger Sync Operation]
    G -->|No| I[Wait for Manual Sync]
    F --> J[Wait for Next Reconciliation]
    H --> J
    I --> J
```

The reconciliation timeout controls how often this loop runs for each application. It is not a sync timeout - it is the interval between checks.

## Configuring the Reconciliation Timeout

The primary setting is `timeout.reconciliation` in the `argocd-cm` ConfigMap:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  # Default is 120s plus up to 60s of jitter.
  timeout.reconciliation: "5m"
  timeout.reconciliation.jitter: "60s"
```

Apply the change and restart the application controller:

```bash
# Apply the updated ConfigMap

kubectl apply -f argocd-cm.yaml

# Restart the controller for the new interval to take effect
kubectl rollout restart statefulset argocd-application-controller -n argocd
```

## Choosing the Right Timeout Value

The optimal timeout depends on your environment:

**Small clusters (under 50 applications)**

```yaml
# Faster reconciliation is fine with few applications
timeout.reconciliation: "2m"
```

With fewer applications, the controller can handle frequent reconciliation without performance issues.

**Medium clusters (50 to 200 applications)**

```yaml
# Default is usually appropriate
timeout.reconciliation: "120s"
timeout.reconciliation.jitter: "60s"
```

**Large clusters (200 to 1000 applications)**

```yaml
# Increase to reduce controller load
timeout.reconciliation: "5m"
```

**Very large clusters (1000+ applications)**

```yaml
# Significantly increase and rely on webhooks for fast detection
timeout.reconciliation: "10m"
```

At this scale, you should combine longer reconciliation intervals with Git webhooks for immediate detection of changes. See our guide on [using Git webhooks to speed up reconciliation](https://oneuptime.com/blog/post/2026-02-26-argocd-git-webhooks-speed-reconciliation/view).

## Per-Application Reconciliation Control

ArgoCD does not provide a per-application polling interval that overrides `timeout.reconciliation`. The `argocd.argoproj.io/refresh` annotation requests a one-time refresh for an application:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: critical-app
  namespace: argocd
  annotations:
    # Request a one-time normal refresh
    argocd.argoproj.io/refresh: "normal"
spec:
  project: default
  source:
    repoURL: https://github.com/org/critical-app
    targetRevision: main
    path: manifests/
  destination:
    server: https://kubernetes.default.svc
    namespace: production
```

This is useful when you need to trigger a normal or hard refresh without changing the global polling interval:

```yaml
# Critical payment service - request a normal refresh
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: payment-service
  annotations:
    argocd.argoproj.io/refresh: "normal"
---
# Internal documentation site - request a hard refresh
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: docs-site
  annotations:
    argocd.argoproj.io/refresh: "hard"
```

## Disabling Reconciliation Entirely

In some cases, you may want to disable automatic polling globally and rely entirely on manual refreshes or webhook-triggered refreshes.

```yaml
# Set timeout to 0 to disable periodic reconciliation
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  timeout.reconciliation: "0"
```

Setting the timeout to `0` disables the periodic reconciliation entirely. Applications will only reconcile when:

- A Git webhook triggers a refresh
- You manually refresh from the CLI or UI
- A normal or hard refresh is requested via the API

This is an aggressive optimization that should only be used when you have reliable webhook delivery.

## Reconciliation Timeout vs Sync Timeout

These are two different settings that are often confused:

| Setting | Controls | Default |
|---------|----------|---------|
| `timeout.reconciliation` | How often ArgoCD polls repositories for changes | 120s plus up to 60s jitter |
| `controller.sync.timeout.seconds` | How long a sync operation can run | 0, which means no timeout |

The sync timeout is configured differently:

```yaml
# argocd-cmd-params-cm ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cmd-params-cm
  namespace: argocd
data:
  controller.sync.timeout.seconds: "600"  # 10 minutes
```

Retry options control retry behavior after sync failures; they do not set the overall sync timeout:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
spec:
  syncPolicy:
    retry:
      limit: 5
      backoff:
        duration: 5s
        factor: 2
        maxDuration: 3m
```

## Monitoring Reconciliation Performance

Track how long reconciliation takes and whether your timeout is appropriate:

```bash
# Check ArgoCD controller metrics for reconciliation duration
kubectl port-forward svc/argocd-application-controller-metrics -n argocd 8082:8082

# Then query the Prometheus endpoint
curl -s http://localhost:8082/metrics | grep '^argocd_app_reconcile'
```

Key metrics to watch:

```text
# Time spent on reconciliation per application
argocd_app_reconcile_bucket
argocd_app_reconcile_sum
argocd_app_reconcile_count

# Number of reconciliation operations
argocd_app_reconcile_count
```

Set up Prometheus alerts for slow reconciliation:

```yaml
groups:
  - name: argocd-reconciliation
    rules:
      - alert: ArgocdSlowReconciliation
        expr: |
          histogram_quantile(0.99,
            rate(argocd_app_reconcile_bucket[5m])
          ) > 120
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "ArgoCD reconciliation taking too long"
          description: "The 99th percentile reconciliation duration exceeds 2 minutes"
```

## Reconciliation and Resource Consumption

Shorter reconciliation intervals increase resource consumption on three components:

**Application Controller** - Runs the reconciliation loop. More frequent reconciliation means more CPU and memory usage.

**Repo Server** - Generates manifests for each reconciliation. More frequent checks mean more Git clones, Helm template renders, and Kustomize builds.

**Target Clusters** - Each reconciliation queries the cluster API for live state. More frequent checks mean more API calls.

```bash
# If you shorten the interval, consider increasing controller resources
kubectl -n argocd patch statefulset argocd-application-controller \
  --type='strategic' \
  -p='{"spec":{"template":{"spec":{"containers":[{"name":"argocd-application-controller","resources":{"requests":{"cpu":"1","memory":"1Gi"},"limits":{"cpu":"2","memory":"2Gi"}}}]}}}}'
```

## Forcing Immediate Reconciliation

Regardless of the timeout setting, you can always force an immediate reconciliation:

```bash
# Soft refresh - uses cached manifests if available
argocd app get my-app --refresh

# Hard refresh - forces re-cloning Git and regenerating manifests
argocd app get my-app --hard-refresh

# Trigger reconciliation via the API
curl -X GET "https://argocd.example.com/api/v1/applications/my-app?refresh=hard" \
  -H "Authorization: Bearer $ARGOCD_TOKEN"
```

## Best Practices for Reconciliation Timeout

1. **Start with the default (120s plus up to 60s jitter)** and only adjust if you have a specific reason
2. **Use webhooks for fast detection** instead of lowering the timeout aggressively
3. **Monitor reconciliation duration** to ensure your timeout is longer than actual reconciliation time
4. **Use manual refreshes or webhooks** for critical applications instead of lowering the global timeout
5. **Increase the timeout for large clusters** to reduce controller and API server load
6. **Never set to 0** unless you have reliable webhook infrastructure

For monitoring your ArgoCD reconciliation performance and alerting on drift, [OneUptime](https://oneuptime.com) provides end-to-end observability for your GitOps pipeline.

## Key Takeaways

- The reconciliation timeout controls how often ArgoCD checks for Git drift, not how long syncs can run
- Default polling is 120 seconds plus up to 60 seconds of jitter, which works for most small to medium deployments
- Increase the timeout for large clusters (300s to 600s) and use webhooks for fast detection
- Use refresh annotations to request one-time normal or hard refreshes for critical applications
- Monitor reconciliation duration metrics to ensure your timeout is appropriate
- Shorter intervals increase load on the controller, repo server, and target cluster APIs
