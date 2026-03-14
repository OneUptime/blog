# How to Deploy KEDA with Prometheus Trigger with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, KEDA, Prometheus, Autoscaling, Metrics, Observability

Description: Deploy KEDA with Prometheus metrics-based autoscaling trigger using Flux CD to scale workloads based on any custom application or infrastructure metric.

---

## Introduction

Prometheus is the de facto monitoring standard for Kubernetes. KEDA's Prometheus scaler opens up an entirely new dimension of autoscaling — scale any workload based on any metric that Prometheus can collect, whether it's HTTP request rate, database connection count, error rate, queue depth exposed via a custom exporter, or GPU utilization.

By managing KEDA Prometheus scalers through Flux CD, your metric-based autoscaling policies are version-controlled alongside your application code. When you tune a scaling threshold, that change is a pull request with a clear audit trail.

This guide covers configuring KEDA with Prometheus triggers using Flux CD for request-rate and custom metric-based scaling.

## Prerequisites

- KEDA deployed on your Kubernetes cluster
- Prometheus (or Prometheus-compatible endpoint like Thanos) accessible from KEDA
- Flux CD v2 bootstrapped to your Git repository
- A deployment to scale with Prometheus metrics available

## Step 1: Ensure Prometheus is Accessible

KEDA's Prometheus scaler queries Prometheus directly. Verify the endpoint:

```bash
# Get Prometheus service
kubectl get svc -n monitoring prometheus-operated

# Test the query
kubectl exec -n keda deployment/keda-operator -- \
  wget -qO- 'http://prometheus-operated.monitoring.svc.cluster.local:9090/api/v1/query?query=up' \
  | python3 -m json.tool
```

## Step 2: Create the ScaledObject with Prometheus Trigger

Scale based on HTTP request rate per pod:

```yaml
# clusters/my-cluster/keda-prometheus/http-rate-scaler.yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: http-rate-scaler
  namespace: app
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-server
  minReplicaCount: 2
  maxReplicaCount: 50
  pollingInterval: 30
  cooldownPeriod: 120
  advanced:
    # Horizontal scaling behavior
    horizontalPodAutoscalerConfig:
      behavior:
        scaleUp:
          stabilizationWindowSeconds: 30
          policies:
            - type: Pods
              value: 5
              periodSeconds: 60
        scaleDown:
          stabilizationWindowSeconds: 120
          policies:
            - type: Pods
              value: 2
              periodSeconds: 60
  triggers:
    - type: prometheus
      metadata:
        serverAddress: http://prometheus-operated.monitoring.svc.cluster.local:9090
        # PromQL query - returns requests/second per pod
        query: |
          sum(rate(http_requests_total{namespace="app",service="api-server"}[2m]))
          / count(kube_pod_info{namespace="app", pod=~"api-server-.*"})
        # Target value per replica (requests/second)
        threshold: "100"
        # Namespace for metric context
        namespace: app
```

## Step 3: Create a Custom Business Metric Scaler

Scale a report generator based on pending report count from a database exporter:

```yaml
# clusters/my-cluster/keda-prometheus/report-generator-scaler.yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: report-generator-scaler
  namespace: app
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: report-generator
  minReplicaCount: 0
  maxReplicaCount: 10
  pollingInterval: 60
  cooldownPeriod: 300
  triggers:
    - type: prometheus
      metadata:
        serverAddress: http://prometheus-operated.monitoring.svc.cluster.local:9090
        # Custom metric exported by postgres-exporter
        query: |
          pg_stat_user_tables_n_live_tup{
            namespace="app",
            relname="pending_reports",
            schemaname="public"
          }
        # Spawn 1 worker per 50 pending reports
        threshold: "50"
        namespace: app
        # Activate scaling only when metric exceeds this value
        activationThreshold: "10"
```

## Step 4: Create a TriggerAuthentication for Secured Prometheus

```yaml
# clusters/my-cluster/keda-prometheus/trigger-auth-prometheus.yaml
apiVersion: v1
kind: Secret
metadata:
  name: prometheus-bearer-token
  namespace: app
type: Opaque
stringData:
  token: "eyJhbGciOiJSUzI1NiIs..."   # Bearer token for Thanos/secured Prometheus
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: prometheus-trigger-auth
  namespace: app
spec:
  secretTargetRef:
    - parameter: bearerToken
      name: prometheus-bearer-token
      key: token
```

Then reference the auth in ScaledObject triggers:

```yaml
      authenticationRef:
        name: prometheus-trigger-auth
```

## Step 5: Create the Flux Kustomization

```yaml
# clusters/my-cluster/keda-prometheus/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - http-rate-scaler.yaml
  - report-generator-scaler.yaml
---
# clusters/my-cluster/flux-kustomization-keda-prometheus.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: keda-prometheus
  namespace: flux-system
spec:
  interval: 5m
  dependsOn:
    - name: keda
  path: ./clusters/my-cluster/keda-prometheus
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
```

## Step 6: Verify Metric-Based Scaling

```bash
# Check ScaledObject status
kubectl get scaledobject -n app

# View the current metric value KEDA is seeing
kubectl get hpa -n app -o yaml | grep -A5 "current:"

# Trigger scaling by generating load
kubectl run load-gen --image=busybox \
  --rm -it --restart=Never -- \
  sh -c "while true; do wget -qO- http://api-server.app.svc.cluster.local/api/work; done"

# Watch pods scale
kubectl get pods -n app -l app=api-server -w
```

## Best Practices

- Write PromQL queries that return a single scalar value — the threshold comparison is `metric_value / target_value = desired_replicas`. Test your query in the Prometheus UI first.
- Use `activationThreshold` to prevent KEDA from waking a deployment from zero before the metric has meaningfully crossed baseline noise.
- Set `stabilizationWindowSeconds` on scale-down to prevent thrashing when metrics oscillate around the threshold.
- Use per-replica normalization in your PromQL (e.g., divide by pod count) for request-rate metrics so the threshold represents a per-pod target, not a total.
- Combine Prometheus triggers with CPU triggers using KEDA's multi-trigger support to cover both metric-based and resource-based scaling signals.

## Conclusion

KEDA with the Prometheus trigger managed by Flux CD unlocks autoscaling based on any observable metric in your cluster. By expressing scaling policies as PromQL queries in Git, your team gains a flexible, auditable, and infrastructure-as-code approach to demand-driven scaling that goes far beyond what standard Kubernetes HPA can offer.
