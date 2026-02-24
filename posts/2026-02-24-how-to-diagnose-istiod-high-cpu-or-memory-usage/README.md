# How to Diagnose Istiod High CPU or Memory Usage

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Istiod, Control Plane, Performance, Troubleshooting

Description: Practical guide to diagnosing and resolving high CPU and memory usage in Istiod, the Istio control plane component.

---

Istiod is the brain of your service mesh. It watches Kubernetes resources, translates Istio configuration into Envoy config, pushes that config to all proxies, handles certificate issuance, and manages service discovery. When Istiod is struggling with high CPU or memory, the entire mesh feels it - configuration updates slow down, new proxies cannot bootstrap, and certificate rotation may stall.

## Checking Istiod Resource Usage

Start with the basics:

```bash
# Current resource usage
kubectl top pod -n istio-system -l app=istiod

# Resource limits
kubectl get deploy istiod -n istio-system \
  -o jsonpath='{.spec.template.spec.containers[0].resources}'

# How long has Istiod been running?
kubectl get pod -n istio-system -l app=istiod -o jsonpath='{.items[0].status.startTime}'
```

Compare current usage to the limits. If CPU is near the limit, Istiod is getting throttled. If memory is climbing toward the limit, an OOM kill is approaching.

## Istiod Performance Metrics

Istiod exposes detailed metrics on port 15014:

```bash
# Port-forward to access metrics
kubectl port-forward deploy/istiod -n istio-system 15014:15014

# Or query from inside the cluster
kubectl exec deploy/istiod -n istio-system -- curl -s localhost:15014/metrics
```

Key metrics to check:

```promql
# Number of connected proxies
pilot_xds_connected_endpoints

# Configuration push rate
rate(pilot_xds_pushes[5m])

# Push queue size (should be near 0)
pilot_push_triggers

# Time to push configuration
histogram_quantile(0.99, sum(rate(pilot_proxy_convergence_time_bucket[5m])) by (le))

# Number of Kubernetes resources being watched
pilot_k8s_reg_events

# Webhook call count (validation webhook)
sum(rate(galley_validation_http_error[5m]))
```

## Common Causes of High CPU

### 1. Too Many Proxies

Each connected proxy requires CPU for maintaining the gRPC connection and pushing configuration updates:

```promql
pilot_xds_connected_endpoints
```

With hundreds or thousands of proxies, even routine configuration updates become expensive because Istiod must compute and push config for each proxy.

**Solution**: Run multiple Istiod replicas:

```bash
kubectl scale deployment istiod -n istio-system --replicas=3
```

Istiod supports horizontal scaling. Proxies will be distributed across replicas automatically.

### 2. Frequent Configuration Changes

Every change to a Kubernetes Service, Deployment, ConfigMap (for Istio config), or Istio CRD triggers a configuration recomputation and push:

```promql
# Push trigger rate
rate(pilot_xds_pushes[5m])
```

If the push rate is very high, something is changing frequently. Check what is triggering pushes:

```bash
kubectl logs deploy/istiod -n istio-system | grep "Push debounce"
```

Common culprits:
- Frequent pod autoscaling (endpoints changing constantly)
- Config maps being updated in a loop
- Flapping health checks causing endpoint churn

### 3. Large Number of Services

Istiod must maintain configuration for every service in every namespace. In large clusters with thousands of services, the configuration computation itself becomes expensive:

```bash
# Count services
kubectl get svc --all-namespaces --no-headers | wc -l

# Count Istio resources
kubectl get virtualservices,destinationrules,serviceentries,gateways --all-namespaces --no-headers | wc -l
```

**Solution**: Use discovery selectors to limit what Istiod watches:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    discoverySelectors:
    - matchLabels:
        istio-discovery: enabled
```

Then label only the namespaces that need Istio:

```bash
kubectl label namespace my-namespace istio-discovery=enabled
```

This dramatically reduces the workload on Istiod because it ignores namespaces without the label.

### 4. Webhook Processing

Istiod runs validation and mutation webhooks that are called for every pod creation (sidecar injection) and Istio resource creation (config validation). In clusters with high pod churn, this adds up:

```bash
kubectl logs deploy/istiod -n istio-system | grep "webhook"
```

## Common Causes of High Memory

### 1. Configuration Cache

Istiod caches the computed Envoy configuration for each proxy. More proxies and more services mean a larger cache:

```promql
# Approximate config cache size
pilot_xds_cache_size
```

### 2. Kubernetes Watch Caches

Istiod maintains in-memory caches of all Kubernetes resources it watches (Services, Endpoints, Pods, Istio CRDs). In large clusters, these caches get big:

```bash
# Check how many resources are cached
kubectl exec deploy/istiod -n istio-system -- curl -s localhost:15014/metrics | grep "pilot_k8s_cfg_events"
```

### 3. Endpoint Discovery

Large clusters with thousands of pods generate a lot of endpoint data. Istiod must process and hold all of it:

```bash
kubectl get endpoints --all-namespaces --no-headers | wc -l
```

## Debugging Steps

### Check Istiod Logs

```bash
# Look for errors and warnings
kubectl logs deploy/istiod -n istio-system --tail=200 | grep -E "error|warn|panic"

# Check push performance
kubectl logs deploy/istiod -n istio-system --tail=200 | grep "Push Status"
```

### Check the Debug Endpoints

Istiod has built-in debug endpoints:

```bash
# Port-forward
kubectl port-forward deploy/istiod -n istio-system 15014:15014

# List all debug endpoints
curl -s localhost:15014/debug

# Push status
curl -s localhost:15014/debug/push_status

# Connected clients
curl -s localhost:15014/debug/connections

# Configuration distribution status
curl -s localhost:15014/debug/config_distribution

# Registry (all known services)
curl -s localhost:15014/debug/registryz | jq length

# Endpoints
curl -s localhost:15014/debug/endpointz | jq length
```

### Profile Istiod

If you need deeper analysis, Istiod supports Go pprof profiling:

```bash
# CPU profile (30 second sample)
kubectl exec deploy/istiod -n istio-system -- \
  curl -s "localhost:15014/debug/pprof/profile?seconds=30" > /tmp/cpu.prof

# Memory profile
kubectl exec deploy/istiod -n istio-system -- \
  curl -s localhost:15014/debug/pprof/heap > /tmp/heap.prof

# Goroutine dump
kubectl exec deploy/istiod -n istio-system -- \
  curl -s localhost:15014/debug/pprof/goroutine?debug=2
```

Analyze the profiles with `go tool pprof`.

## Scaling and Tuning Istiod

### Horizontal Scaling

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: istiod
  namespace: istio-system
spec:
  replicas: 3
```

### Vertical Scaling

```yaml
spec:
  template:
    spec:
      containers:
      - name: discovery
        resources:
          requests:
            cpu: "500m"
            memory: "2Gi"
          limits:
            cpu: "2000m"
            memory: "4Gi"
```

### Push Debounce Tuning

Control how aggressively Istiod batches configuration pushes:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      holdApplicationUntilProxyStarts: true
  values:
    pilot:
      env:
        PILOT_DEBOUNCE_AFTER: "100ms"
        PILOT_DEBOUNCE_MAX: "1s"
        PILOT_PUSH_THROTTLE: "100"
```

Increasing the debounce window reduces the number of pushes at the cost of slightly delayed configuration updates.

## Monitoring Istiod Health

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: istiod-health
  namespace: istio-system
spec:
  groups:
  - name: istiod
    rules:
    - alert: IstiodHighCPU
      expr: |
        rate(container_cpu_usage_seconds_total{container="discovery",namespace="istio-system"}[5m]) > 1.5
      for: 10m
      labels:
        severity: warning
    - alert: IstiodHighMemory
      expr: |
        container_memory_working_set_bytes{container="discovery",namespace="istio-system"} > 3e9
      for: 10m
      labels:
        severity: warning
    - alert: IstiodSlowPush
      expr: |
        histogram_quantile(0.99, sum(rate(pilot_proxy_convergence_time_bucket[5m])) by (le)) > 30
      for: 5m
      labels:
        severity: critical
```

A healthy Istiod is a healthy mesh. Monitor it closely, scale it appropriately, and use discovery selectors to limit its workload. The effort you put into keeping Istiod running well pays dividends across your entire service mesh.
