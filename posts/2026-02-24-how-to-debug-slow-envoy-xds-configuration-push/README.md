# How to Debug Slow Envoy xDS Configuration Push

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, xDS, Configuration, Istiod, Performance, Debugging

Description: How to diagnose and fix slow xDS configuration pushes from Istiod to Envoy proxies in your Istio service mesh.

---

When xDS configuration pushes are slow, it means changes to your Istio configuration take a long time to reach your Envoy proxies. This is more than just an inconvenience. Slow pushes mean that routing changes, security policies, and endpoint updates are delayed, which can cause traffic to be routed incorrectly during deployments or leave stale endpoints in the load balancing pool.

## Understanding the xDS Push Pipeline

When you make a configuration change, here is what happens:

1. The change triggers a push event in Istiod
2. Istiod debounces the event (waits for other changes to batch them together)
3. Istiod computes the new Envoy configuration for each affected proxy
4. Istiod serializes and sends the config over gRPC to each proxy
5. Each proxy acknowledges receipt

Slowness at any stage increases total push time.

## Measuring Push Performance

Start by looking at the push timing metrics:

```promql
# P50 push convergence time
histogram_quantile(0.50, sum(rate(pilot_proxy_convergence_time_bucket[5m])) by (le))

# P99 push convergence time
histogram_quantile(0.99, sum(rate(pilot_proxy_convergence_time_bucket[5m])) by (le))

# Push rate by type (CDS, EDS, LDS, RDS)
sum(rate(pilot_xds_pushes[5m])) by (type)

# Number of pushes in the queue
pilot_push_triggers
```

Normal P99 convergence time should be under 5 seconds. If it is consistently above 10 seconds, you have a problem.

## Checking Istiod Debug Endpoints

Istiod has built-in debug endpoints that show push status:

```bash
# Port-forward to Istiod
kubectl port-forward deploy/istiod -n istio-system 15014:15014

# Check push status
curl -s localhost:15014/debug/push_status

# Check connected endpoints and their sync status
curl -s localhost:15014/debug/syncz

# Check the configuration distribution status
curl -s localhost:15014/debug/config_distribution
```

The `syncz` endpoint shows each connected proxy, when it was last updated, and whether it has acknowledged the latest config.

## Common Causes and Fixes

### 1. Too Many Proxies

Each push requires computing and sending config to every connected proxy. More proxies means more work:

```promql
# Number of connected proxies
pilot_xds_connected_endpoints
```

**Fix**: Scale Istiod horizontally:

```bash
kubectl scale deployment istiod -n istio-system --replicas=3
```

Proxies will be distributed across replicas, reducing the per-replica workload.

### 2. Large Configuration

If each proxy has a large configuration (many clusters, routes, listeners), serializing and transmitting it is slow:

```bash
# Check config size for a specific proxy
istioctl proxy-config all deploy/my-service -n my-namespace -o json | wc -c
```

If the config is megabytes in size, limit each proxy's scope:

```yaml
apiVersion: networking.istio.io/v1
kind: Sidecar
metadata:
  name: default
  namespace: my-namespace
spec:
  egress:
  - hosts:
    - "./*"
    - "istio-system/*"
```

This dramatically reduces config size because each proxy only gets configuration for services it can actually reach.

### 3. Frequent Changes Causing Push Storms

If endpoints are changing rapidly (e.g., aggressive pod autoscaling), Istiod is constantly recomputing and pushing config:

```promql
# EDS push rate (endpoint changes)
sum(rate(pilot_xds_pushes{type="eds"}[5m]))
```

If EDS pushes are very frequent, tune the debounce settings to batch more changes together:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  values:
    pilot:
      env:
        PILOT_DEBOUNCE_AFTER: "200ms"
        PILOT_DEBOUNCE_MAX: "2s"
```

The default is 100ms after the first event and 1s max wait. Increasing these values reduces the number of pushes at the cost of slightly higher propagation delay.

### 4. Istiod Resource Constraints

If Istiod is CPU-throttled or memory-constrained, push processing slows down:

```bash
# Check Istiod resource usage
kubectl top pod -n istio-system -l app=istiod

# Check for CPU throttling
kubectl get pod -n istio-system -l app=istiod -o json | \
  jq '.items[0].spec.containers[0].resources'
```

Increase resources if needed:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: istiod
  namespace: istio-system
spec:
  template:
    spec:
      containers:
      - name: discovery
        resources:
          requests:
            cpu: "1000m"
            memory: "2Gi"
          limits:
            cpu: "4000m"
            memory: "4Gi"
```

### 5. Push Throttling

Istiod throttles pushes to prevent overwhelming proxies. If the throttle is too aggressive, pushes queue up:

```yaml
# Adjust push throttle
PILOT_PUSH_THROTTLE: "200"  # Max concurrent pushes (default: 100)
```

### 6. Slow Proxy ACKs

Proxies must acknowledge (ACK) each push before the next one is sent. If proxies are slow to ACK (due to high CPU or complex config validation), the pipeline backs up:

```bash
# Check proxy-side push timing
kubectl exec deploy/my-service -c istio-proxy -- \
  pilot-agent request GET stats | grep "update_success\|update_rejected\|update_time"
```

If `update_rejected` is non-zero, the proxy is rejecting config, which causes Istiod to retry.

## Monitoring the Push Queue

Track the push queue depth to detect backpressure:

```promql
# Push queue size
pilot_push_triggers

# Pushes that timed out
pilot_total_xds_rejects

# Internal push errors
pilot_total_xds_internal_errors
```

Set up alerts for push performance:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: istio-push-performance
  namespace: istio-system
spec:
  groups:
  - name: xds-push
    rules:
    - alert: SlowXdsPush
      expr: |
        histogram_quantile(0.99, sum(rate(pilot_proxy_convergence_time_bucket[5m])) by (le)) > 10
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "xDS push P99 latency is {{ $value }}s"
    - alert: HighPushRate
      expr: |
        sum(rate(pilot_xds_pushes[5m])) > 50
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "xDS push rate is abnormally high at {{ $value }}/sec"
    - alert: PushErrors
      expr: |
        rate(pilot_total_xds_internal_errors[5m]) > 0
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "xDS push errors detected"
```

## Analyzing Push Timing with Logs

Istiod logs push timing information:

```bash
kubectl logs deploy/istiod -n istio-system | grep "Push debounce"
```

You will see entries like:

```text
Push debounce stable 112 for config ServiceEntry/default/external-api: 102.345ms since last change, 502.123ms since last push
```

This tells you:
- How many changes were batched (112)
- What triggered the push
- Time since the last change and last push

Look for pushes with large batch sizes or long debounce times.

## Optimizing Push Performance

Here is a summary of all the levers you can pull:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    discoverySelectors:
    - matchLabels:
        istio-discovery: enabled    # Limit watched namespaces
  values:
    pilot:
      env:
        PILOT_DEBOUNCE_AFTER: "200ms"     # Batch more changes
        PILOT_DEBOUNCE_MAX: "2s"          # Max debounce wait
        PILOT_PUSH_THROTTLE: "200"        # Max concurrent pushes
        PILOT_ENABLE_EDS_DEBOUNCE: "true" # Debounce endpoint updates
```

Combined with:
- Sidecar resources to limit per-proxy config size
- Horizontal scaling of Istiod
- Adequate CPU and memory resources

These changes should bring your P99 push time well under 5 seconds even in large meshes. The key insight is that push performance is a function of three things: the number of proxies, the size of the configuration, and the frequency of changes. Optimize any of these three and push performance improves.
