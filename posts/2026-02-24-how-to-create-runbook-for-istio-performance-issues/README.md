# How to Create Runbook for Istio Performance Issues

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Kubernetes, Runbook, Performance, Latency

Description: A runbook for diagnosing and resolving Istio performance issues including latency spikes, CPU throttling, and configuration push delays.

---

Performance issues in Istio can be tricky because the service mesh touches every request in your system. When latency goes up, it is not always obvious whether the problem is in the application, the sidecar proxy, the control plane, or the network. This runbook gives your team a systematic approach to finding and fixing performance bottlenecks in the Istio mesh.

## Runbook: Istio Performance Issues

### Purpose
Diagnose and resolve performance degradation in the Istio service mesh, including increased latency, reduced throughput, and resource contention.

### Symptom Categories

| Category | Indicators |
|---|---|
| Latency increase | P99 latency higher than baseline, slow API responses |
| Throughput drop | Lower RPS than expected, request queuing |
| Control plane slow | Config push delays, stale proxy configurations |
| Resource exhaustion | CPU throttling, OOM kills, connection limits |

### Step 1: Quick Health Assessment

Run these commands to get an overview:

```bash
# Check sidecar CPU and memory usage
kubectl top pods --containers --all-namespaces | grep istio-proxy | sort -k4 -rn | head -20

# Check istiod resource usage
kubectl top pods -n istio-system -l app=istiod

# Check for CPU throttling on sidecars
kubectl get pods --all-namespaces -o jsonpath='{range .items[*]}{.metadata.namespace}/{.metadata.name}{"\n"}{end}' | head -10 | while read pod; do
  ns=$(echo $pod | cut -d/ -f1)
  name=$(echo $pod | cut -d/ -f2)
  echo "=== $pod ==="
  kubectl exec $name -n $ns -c istio-proxy -- curl -s localhost:15000/stats | grep "cfs_throttled" 2>/dev/null
done

# Check config push status
istioctl proxy-status | grep -v "SYNCED"
```

### Step 2: Diagnose Sidecar Latency

#### Check the Envoy Stats

```bash
POD_NAME=<affected-pod>
NAMESPACE=<namespace>

# Request duration stats
kubectl exec $POD_NAME -n $NAMESPACE -c istio-proxy -- \
  curl -s localhost:15000/stats | grep "downstream_rq_time\|upstream_rq_time"

# Connection pool stats
kubectl exec $POD_NAME -n $NAMESPACE -c istio-proxy -- \
  curl -s localhost:15000/stats | grep "upstream_cx_active\|upstream_cx_overflow\|upstream_rq_pending"

# Check for connection timeouts
kubectl exec $POD_NAME -n $NAMESPACE -c istio-proxy -- \
  curl -s localhost:15000/stats | grep "upstream_cx_connect_timeout\|upstream_rq_timeout"
```

#### Check for CPU Throttling

CPU throttling is the most common cause of sidecar-induced latency:

```promql
# Throttling percentage per sidecar
rate(container_cpu_cfs_throttled_seconds_total{container="istio-proxy"}[5m])
/ rate(container_cpu_usage_seconds_total{container="istio-proxy"}[5m])

# Pods with high throttling
topk(10,
  rate(container_cpu_cfs_throttled_periods_total{container="istio-proxy"}[5m])
  / rate(container_cpu_cfs_periods_total{container="istio-proxy"}[5m])
)
```

Fix CPU throttling:

```bash
# Increase CPU limit for specific deployment
kubectl patch deployment $DEPLOYMENT -n $NAMESPACE --type=json \
  -p='[{"op": "add", "path": "/spec/template/metadata/annotations/sidecar.istio.io~1proxyCPULimit", "value": "2000m"}]'

kubectl rollout restart deployment $DEPLOYMENT -n $NAMESPACE
```

Or increase globally:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  values:
    global:
      proxy:
        resources:
          limits:
            cpu: "2000m"
```

### Step 3: Diagnose Control Plane Performance

#### Check Push Latency

```bash
# xDS push time from istiod metrics
kubectl exec -n istio-system deploy/istiod -- \
  curl -s localhost:15014/metrics | grep "pilot_xds_push_time"

# Config distribution latency
kubectl exec -n istio-system deploy/istiod -- \
  curl -s localhost:15014/metrics | grep "pilot_proxy_convergence_time"

# Push queue depth
kubectl exec -n istio-system deploy/istiod -- \
  curl -s localhost:15014/metrics | grep "pilot_push_triggers\|pilot_xds_pushes"
```

```promql
# Push P99 latency
histogram_quantile(0.99, sum(rate(pilot_xds_push_time_bucket[5m])) by (le))

# Config convergence time
histogram_quantile(0.99, sum(rate(pilot_proxy_convergence_time_bucket[5m])) by (le))
```

If push times are high (> 5 seconds), istiod is overloaded:

```bash
# Scale up istiod
kubectl scale deployment istiod -n istio-system --replicas=3

# Or increase resources
kubectl patch deployment istiod -n istio-system --type=json \
  -p='[{"op": "replace", "path": "/spec/template/spec/containers/0/resources/requests/cpu", "value": "2000m"}]'
```

#### Check Configuration Size

Large configurations slow down pushes:

```bash
# Check total config size per proxy
istioctl proxy-config all <pod-name> -o json | wc -c

# Count endpoints per proxy
istioctl proxy-config endpoint <pod-name> | wc -l

# If endpoints are too many, apply Sidecar resources
```

### Step 4: Diagnose Connection Issues

#### Connection Pool Exhaustion

```bash
# Check connection overflow (indicates connection limit reached)
kubectl exec $POD_NAME -n $NAMESPACE -c istio-proxy -- \
  curl -s localhost:15000/stats | grep upstream_cx_overflow

# Check pending requests
kubectl exec $POD_NAME -n $NAMESPACE -c istio-proxy -- \
  curl -s localhost:15000/stats | grep upstream_rq_pending_overflow
```

Fix by adjusting DestinationRule:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: performance-fix
  namespace: <namespace>
spec:
  host: <service>
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 1000
        connectTimeout: 10s
      http:
        h2UpgradePolicy: DEFAULT
        maxRequestsPerConnection: 0
        maxRetries: 3
```

#### Outlier Detection Ejection

Check if endpoints are being ejected too aggressively:

```bash
# Check for ejected endpoints
kubectl exec $POD_NAME -n $NAMESPACE -c istio-proxy -- \
  curl -s localhost:15000/clusters | grep "health_flags\|outlier"
```

Adjust outlier detection if needed:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: outlier-adjustment
  namespace: <namespace>
spec:
  host: <service>
  trafficPolicy:
    outlierDetection:
      consecutive5xxErrors: 10
      interval: 30s
      baseEjectionTime: 30s
      maxEjectionPercent: 10
```

### Step 5: Diagnose Telemetry Overhead

Telemetry can add significant CPU overhead:

```bash
# Check how many stats Envoy is tracking
kubectl exec $POD_NAME -n $NAMESPACE -c istio-proxy -- \
  curl -s localhost:15000/stats | wc -l

# Check metrics endpoint response time
time kubectl exec $POD_NAME -n $NAMESPACE -c istio-proxy -- \
  curl -s localhost:15090/stats/prometheus > /dev/null
```

Reduce telemetry overhead:

```yaml
apiVersion: networking.istio.io/v1
kind: Telemetry
metadata:
  name: reduce-overhead
  namespace: istio-system
spec:
  metrics:
    - providers:
        - name: prometheus
      overrides:
        - match:
            metric: ALL_METRICS
          tagOverrides:
            source_canonical_revision:
              operation: REMOVE
            destination_canonical_revision:
              operation: REMOVE
            request_protocol:
              operation: REMOVE
  accessLogging:
    - providers:
        - name: envoy
      disabled: true
```

### Step 6: Reduce Configuration Scope

Apply Sidecar resources to limit what each proxy receives:

```yaml
# Mesh-wide default: only see your own namespace
apiVersion: networking.istio.io/v1
kind: Sidecar
metadata:
  name: default
  namespace: istio-system
spec:
  egress:
    - hosts:
        - "./*"
        - "istio-system/*"
```

Verify the config size reduction:

```bash
# Before Sidecar resource
istioctl proxy-config endpoint <pod> | wc -l

# After applying Sidecar resource (restart pod first)
kubectl delete pod <pod> -n <namespace>
# Wait for new pod
istioctl proxy-config endpoint <new-pod> | wc -l
```

### Performance Optimization Checklist

- [ ] Sidecar CPU limits are sufficient (no throttling)
- [ ] Sidecar memory limits are sufficient (no OOM kills)
- [ ] istiod has enough CPU and memory
- [ ] Sidecar resources are applied to limit config scope
- [ ] Unnecessary telemetry labels are removed
- [ ] Access logging is disabled or limited to errors
- [ ] Connection pool settings match traffic patterns
- [ ] Outlier detection is not too aggressive

### Escalation Criteria

Escalate if:
- Performance degradation persists after all steps above
- istiod is consistently using > 90% of resources
- Proxy configuration is not converging (permanent STALE entries)
- The issue is reproducible in a minimal test case (potential Istio bug)

For suspected Istio bugs, collect a bug report:

```bash
istioctl bug-report --full-secrets=false
```

This generates a tarball with all the diagnostics information needed to file an issue with the Istio project.
