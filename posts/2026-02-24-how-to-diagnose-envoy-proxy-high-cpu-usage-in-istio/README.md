# How to Diagnose Envoy Proxy High CPU Usage in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Envoy, CPU, Performance, Troubleshooting, Sidecar

Description: Step-by-step guide to diagnosing and resolving high CPU consumption in Envoy sidecar proxies running in an Istio service mesh.

---

When your Envoy sidecar proxy starts eating up CPU, it affects everything. Request latency increases, throughput drops, and in extreme cases the proxy starts rejecting traffic. The challenge is that Envoy does a lot of things - TLS termination, routing, load balancing, telemetry, access logging - and any of these could be the culprit.

## Confirming the Problem

First, verify that the CPU usage is actually abnormal:

```bash
# Check current CPU usage
kubectl top pod my-service-pod -n my-namespace --containers

# Compare with other instances of the same service
kubectl top pods -n my-namespace -l app=my-service --containers

# Check CPU limits
kubectl get pod my-service-pod -n my-namespace -o jsonpath='{.spec.containers[?(@.name=="istio-proxy")].resources}'
```

If the sidecar is using close to or exceeding its CPU limit, you have a problem. Normal sidecar CPU usage should be a small fraction of the application container's usage.

## Common Causes of High CPU

### 1. High Request Volume

The most common cause is simply too much traffic. Each request requires proxy processing for routing, load balancing, telemetry recording, and access logging:

```bash
# Check request rate through this proxy
kubectl exec deploy/my-service -c istio-proxy -- \
  pilot-agent request GET stats | grep "downstream_rq_total"
```

Compare the request rate with what you expect. If the traffic is legitimate, you may need to increase the CPU limit:

```yaml
metadata:
  annotations:
    sidecar.istio.io/proxyCPU: "200m"
    sidecar.istio.io/proxyCPULimit: "2000m"
```

### 2. TLS Overhead

mTLS adds CPU overhead for every connection. This is usually small, but under high connection churn (many short-lived connections), it adds up:

```bash
# Check TLS handshake rate
kubectl exec deploy/my-service -c istio-proxy -- \
  pilot-agent request GET stats | grep "ssl.handshake"

# Check connection creation rate
kubectl exec deploy/my-service -c istio-proxy -- \
  pilot-agent request GET stats | grep "downstream_cx_total"
```

If you see thousands of handshakes per second, connection reuse is poor. Fix this with connection pooling:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: reuse-connections
spec:
  host: my-service
  trafficPolicy:
    connectionPool:
      http:
        maxRequestsPerConnection: 0
        h2UpgradePolicy: UPGRADE
```

HTTP/2 dramatically reduces connection count because it multiplexes many requests over a single connection.

### 3. Large Envoy Configuration

When your mesh has hundreds of services, each proxy gets a large configuration. Route matching across a large config is CPU-intensive:

```bash
# Check config size
kubectl exec deploy/my-service -c istio-proxy -- \
  pilot-agent request GET config_dump | wc -c

# Check the number of clusters (upstream services)
istioctl proxy-config cluster deploy/my-service -n my-namespace | wc -l

# Check the number of routes
istioctl proxy-config route deploy/my-service -n my-namespace | wc -l

# Check the number of endpoints
istioctl proxy-config endpoint deploy/my-service -n my-namespace | wc -l
```

If there are thousands of clusters or endpoints, limit the proxy's scope with a Sidecar resource:

```yaml
apiVersion: networking.istio.io/v1
kind: Sidecar
metadata:
  name: limited-scope
  namespace: my-namespace
spec:
  egress:
  - hosts:
    - "./*"
    - "istio-system/*"
    - "database-namespace/postgres.database-namespace.svc.cluster.local"
```

This tells the proxy to only maintain configuration for services in its own namespace, istio-system, and specific services it needs.

### 4. Access Logging

Detailed access logging, especially with custom format strings that include many fields, consumes CPU:

```bash
# Check if access logging is enabled
kubectl exec deploy/my-service -c istio-proxy -- \
  pilot-agent request GET config_dump | grep "access_log" | head -5
```

If you do not need detailed access logs on every service, disable them selectively:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: disable-logging
  namespace: my-namespace
spec:
  accessLogging:
  - providers:
    - name: envoy
    disabled: true
```

### 5. Telemetry and Metrics Collection

Envoy generates a lot of metrics. The more labels and histograms, the more CPU it takes:

```bash
# Check how many stats Envoy is tracking
kubectl exec deploy/my-service -c istio-proxy -- \
  pilot-agent request GET stats | wc -l
```

If there are tens of thousands of stats, reduce the metrics overhead:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: reduce-metrics
  namespace: my-namespace
spec:
  metrics:
  - providers:
    - name: prometheus
    overrides:
    - match:
        metric: ALL_METRICS
      tagOverrides:
        request_protocol:
          operation: REMOVE
        destination_canonical_revision:
          operation: REMOVE
        source_canonical_revision:
          operation: REMOVE
```

### 6. Frequent Configuration Updates

If Istiod is pushing configuration updates too frequently, the proxy spends CPU processing those updates:

```bash
# Check xDS update frequency
kubectl exec deploy/my-service -c istio-proxy -- \
  pilot-agent request GET stats | grep "update_success\|update_rejected"
```

A high update rate often means something is causing rapid changes in the mesh config. Check for flapping endpoints or frequent deployment changes.

## Profiling Envoy CPU Usage

Envoy supports CPU profiling to identify exactly which operations are consuming CPU:

```bash
# Get the Envoy server info, including uptime and version
kubectl exec deploy/my-service -c istio-proxy -- \
  pilot-agent request GET server_info
```

Check the hot restart epoch and uptime. If the proxy has been restarted recently, it might be doing initial configuration processing which is CPU-intensive.

## Adjusting Worker Threads

By default, Envoy uses 2 worker threads. For services that genuinely need more throughput, increase this:

```yaml
annotations:
  sidecar.istio.io/concurrency: "4"
```

For low-traffic services where you want to save CPU, reduce to 1:

```yaml
annotations:
  sidecar.istio.io/concurrency: "1"
```

## Monitoring CPU Over Time

Set up Prometheus queries to track sidecar CPU trends:

```promql
# CPU usage over time
rate(container_cpu_usage_seconds_total{container="istio-proxy",pod="my-service-pod"}[5m])

# CPU throttling (indicates the proxy needs more CPU)
rate(container_cpu_cfs_throttled_seconds_total{container="istio-proxy",pod="my-service-pod"}[5m])

# Correlation with request rate
rate(container_cpu_usage_seconds_total{container="istio-proxy",pod="my-service-pod"}[5m])
/
rate(istio_requests_total{destination_workload="my-service",reporter="destination"}[5m])
```

The last query gives you CPU cost per request. If this ratio is increasing over time, something is making requests more expensive to process.

## Quick Diagnostic Checklist

1. Check CPU usage and limits (`kubectl top`, resource specs)
2. Check request rate (is the traffic volume the cause?)
3. Check config size (too many clusters/routes/endpoints?)
4. Check connection churn (TLS handshake rate)
5. Check access logging settings
6. Check metrics cardinality
7. Check xDS update frequency
8. Apply Sidecar resource to limit scope
9. Adjust concurrency if needed
10. Increase CPU limits if the usage is justified

High CPU in Envoy is rarely a bug in Envoy itself. It is almost always a result of the workload the proxy is handling or the configuration it is managing. The fix is usually one of: reduce the workload, simplify the configuration, or give the proxy more resources.
