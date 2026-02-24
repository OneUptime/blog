# How to Fix CPU Issues with Istio Sidecar Proxy

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, CPU, Sidecar Proxy, Performance Tuning, Envoy

Description: Diagnose and fix high CPU usage in Istio Envoy sidecar proxies by tuning concurrency, reducing configuration scope, and optimizing traffic handling.

---

Adding an Istio sidecar to every pod means adding CPU overhead to every pod. For most workloads this overhead is small - a few percent of request latency and a small amount of CPU. But when the sidecar starts consuming excessive CPU, it steals resources from your application, causes throttling, and can even lead to increased latency for your entire service.

This guide covers how to diagnose high CPU usage in the Istio sidecar and what you can do about it.

## Measuring CPU Usage

Start by measuring how much CPU the sidecar is actually using:

```bash
# Current CPU usage per container
kubectl top pod <pod-name> -n production --containers

# CPU usage across all sidecars in a namespace
kubectl top pods -n production --containers | grep istio-proxy | sort -k3 -rn | head -20
```

Use Prometheus for historical data:

```bash
# Average CPU usage per sidecar
rate(container_cpu_usage_seconds_total{container="istio-proxy"}[5m])

# Top CPU-consuming sidecars
topk(10, rate(container_cpu_usage_seconds_total{container="istio-proxy"}[5m]))

# CPU throttling
rate(container_cpu_cfs_throttled_seconds_total{container="istio-proxy"}[5m])
```

If the CPU throttling metric is non-zero, the proxy is being limited by its CPU quota and performance is degraded.

## Understanding What Drives CPU Usage

The Envoy proxy uses CPU for:

1. **TLS handshakes and encryption**: mTLS encrypts all traffic, and crypto operations use CPU
2. **Request processing**: Parsing headers, matching routes, applying policies
3. **Configuration updates**: Processing config pushes from istiod
4. **Access logging**: Formatting and writing access log entries
5. **Statistics collection**: Maintaining metrics about traffic
6. **Health checking**: Active health checks against upstream endpoints

The amount of CPU used scales with traffic volume, the complexity of routing rules, and the number of active connections.

## Setting CPU Resource Limits

Set appropriate CPU requests and limits:

```yaml
spec:
  template:
    metadata:
      annotations:
        sidecar.istio.io/proxyCPU: "100m"
        sidecar.istio.io/proxyCPULimit: "1000m"
```

For the global default:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  values:
    global:
      proxy:
        resources:
          requests:
            cpu: 100m
          limits:
            cpu: 1000m
```

Important: Setting CPU limits too low causes throttling. Setting them too high wastes resources. Start with a generous limit, measure actual usage, then tighten.

## Tuning Concurrency

Envoy's concurrency setting controls the number of worker threads. By default, it matches the number of CPU cores available to the container:

```bash
# Check current concurrency
kubectl exec <pod-name> -c istio-proxy -n production -- pilot-agent request GET /server_info | jq '.command_line_options.concurrency'
```

If a pod has 4 CPU cores available, Envoy creates 4 worker threads. For most services this is excessive. Reduce it:

```yaml
metadata:
  annotations:
    proxy.istio.io/config: |
      concurrency: 2
```

Guidelines for setting concurrency:

- **Low traffic services** (less than 100 req/s): `concurrency: 1`
- **Medium traffic services** (100-1000 req/s): `concurrency: 2`
- **High traffic services** (1000+ req/s): `concurrency: 2-4`

Reducing concurrency directly reduces CPU usage because fewer threads are running. The tradeoff is that each thread handles more connections, which can increase latency under very high load.

## Reducing mTLS Overhead

mTLS encryption is a significant source of CPU usage. For services where mTLS is not needed (communication within the same node, for example), you can disable it:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: same-node-service
spec:
  host: same-node-service
  trafficPolicy:
    tls:
      mode: DISABLE
```

However, disabling mTLS reduces security. A better approach is to optimize TLS by using ECDSA certificates instead of RSA (ECDSA is faster for TLS operations):

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      proxyMetadata:
        ISTIO_META_CERT_SIGNER: ""
  values:
    pilot:
      env:
        PILOT_CERT_PROVIDER: "istiod"
```

## Reducing Statistics Overhead

Envoy collects a lot of statistics by default. Reducing the stats scope saves CPU:

```yaml
metadata:
  annotations:
    proxy.istio.io/config: |
      proxyStatsMatcher:
        inclusionPrefixes:
          - "cluster.outbound"
          - "cluster_manager"
          - "listener_manager"
          - "server"
          - "cluster.xds-grpc"
```

Or globally:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      proxyStatsMatcher:
        inclusionPrefixes:
          - "cluster.outbound"
          - "listener"
          - "server"
```

This limits stats collection to only the prefixes you actually need for monitoring.

## Optimizing Access Logging

Access logging to stdout adds CPU overhead, especially at high traffic volumes. If you do not need per-request access logs:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    accessLogFile: ""  # Disable access logging
```

Or reduce logging to only error cases:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: reduce-logging
  namespace: production
spec:
  accessLogging:
    - providers:
        - name: envoy
      filter:
        expression: "response.code >= 400"
```

This logs only requests that returned an error status code, dramatically reducing CPU spent on logging.

## Reducing Configuration Push Impact

When istiod pushes new configuration to the proxies (because a service was added, an endpoint changed, etc.), the proxy uses CPU to process the update. In large meshes with frequent changes, this can be significant.

Reduce the configuration scope with Sidecar resources:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Sidecar
metadata:
  name: default
  namespace: production
spec:
  egress:
    - hosts:
        - "./*"
        - "istio-system/*"
```

This means the proxy only processes configuration updates for services in its namespace and istio-system, ignoring changes in other namespaces.

## Monitoring CPU Throttling

CPU throttling is often invisible but causes latency increases. Monitor it:

```bash
# Prometheus query for throttling
rate(container_cpu_cfs_throttled_periods_total{container="istio-proxy"}[5m])
/ rate(container_cpu_cfs_periods_total{container="istio-proxy"}[5m])
```

If more than 5% of CPU periods are throttled, increase the CPU limit:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: istio-proxy-cpu
spec:
  groups:
    - name: istio-proxy-cpu
      rules:
        - alert: IstioProxyCPUThrottled
          expr: |
            rate(container_cpu_cfs_throttled_periods_total{container="istio-proxy"}[5m])
            / rate(container_cpu_cfs_periods_total{container="istio-proxy"}[5m]) > 0.05
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "Istio proxy is being CPU throttled"
```

## Profiling the Proxy

For deep CPU analysis, you can get a CPU profile from Envoy:

```bash
# Enable admin interface access
kubectl port-forward <pod-name> -n production 15000:15000 &

# Get CPU profile (if profiling is enabled)
curl -s localhost:15000/cpuprofiler?enable=y
# Wait for a period of traffic
curl -s localhost:15000/cpuprofiler?enable=n

# Check hot restart info
curl -s localhost:15000/hot_restart_version
```

## Quick Optimization Checklist

From highest to lowest impact:

1. **Set concurrency** to match actual needs (not CPU core count)
2. **Limit service visibility** with Sidecar resources
3. **Set appropriate CPU limits** (high enough to avoid throttling)
4. **Reduce stats collection** to needed prefixes only
5. **Optimize access logging** (disable or filter to errors only)
6. **Monitor throttling** and adjust limits proactively

```bash
# Check current state
kubectl top pods -n production --containers | grep istio-proxy | sort -k3 -rn

# Look for throttled containers
kubectl get pods -n production -o json | jq '.items[].status.containerStatuses[] | select(.name == "istio-proxy") | {pod: .name, restartCount: .restartCount}'
```

## Summary

CPU overhead from Istio sidecars is manageable with the right tuning. The key levers are concurrency (number of worker threads), configuration scope (how much of the mesh each sidecar knows about), and feature settings (access logging, stats, tracing). Start by measuring actual CPU usage and throttling, then apply optimizations starting with the highest-impact ones. For most workloads, setting `concurrency: 2` and adding Sidecar resources to limit visibility gets you most of the way there.
