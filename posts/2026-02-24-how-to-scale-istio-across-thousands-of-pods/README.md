# How to Scale Istio Across Thousands of Pods

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Scaling, Kubernetes, Performance, Large Scale

Description: Proven techniques for scaling Istio across thousands of pods including control plane optimization, sidecar memory reduction, endpoint management, and monitoring at scale.

---

Running Istio at small scale is one thing. Running it across 5000, 10000, or more pods is a different challenge entirely. At that scale, the default Istio configuration falls apart: the control plane runs out of memory, sidecars consume more resources than the applications they serve, and configuration pushes take so long that endpoints are stale by the time they arrive.

This guide is for teams operating Istio at scale and covers the specific optimizations that make the difference between a mesh that works and one that collapses under its own weight.

## Understanding the Scale Bottlenecks

At thousands of pods, three things become bottlenecks:

1. **Control plane memory and CPU**: istiod maintains the full state of the mesh in memory. Every service, endpoint, VirtualService, DestinationRule, and other resource adds to the memory footprint. istiod also processes and pushes configuration to every connected sidecar.

2. **Per-sidecar configuration size**: By default, each sidecar receives configuration for every service in the mesh. With 500 services and 10 endpoints each, that is 5000 endpoints per sidecar. The configuration grows linearly with the number of services.

3. **Endpoint update storms**: When pods scale up or down, istiod pushes endpoint updates to all relevant sidecars. At scale, a deployment rolling out 100 pods generates 100 endpoint change events, each triggering a push to potentially thousands of sidecars.

## Optimization 1: Sidecar Scoping (The Most Important One)

If you do only one optimization, do this one. The Sidecar resource limits which services each sidecar knows about:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Sidecar
metadata:
  name: default
  namespace: team-payments
spec:
  egress:
    - hosts:
        - "./*"
        - "istio-system/*"
        - "team-payments/*"
        - "shared-infra/redis.shared-infra.svc.cluster.local"
        - "shared-infra/kafka.shared-infra.svc.cluster.local"
```

Without this, a sidecar in the payments namespace loads configuration for every service in every namespace. With this, it only loads services in its own namespace, istio-system, and two specific services from shared-infra.

For large organizations, create a Sidecar resource in every namespace:

```bash
# Generate Sidecar resources for all application namespaces
for ns in $(kubectl get namespaces -l type=application -o jsonpath='{.items[*].metadata.name}'); do
  cat <<EOF | kubectl apply -f -
apiVersion: networking.istio.io/v1beta1
kind: Sidecar
metadata:
  name: default
  namespace: $ns
spec:
  egress:
    - hosts:
        - "./*"
        - "istio-system/*"
EOF
done
```

The memory savings are dramatic. In a mesh with 500 services, a sidecar that only needs 20 services uses roughly 25x less memory for configuration data.

## Optimization 2: Discovery Selectors

Discovery selectors tell istiod to ignore namespaces that do not need mesh services. If you have 100 namespaces but only 30 are in the mesh, istiod is wasting resources watching the other 70:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    discoverySelectors:
      - matchLabels:
          istio-mesh: enabled
```

Label the namespaces that should be in the mesh:

```bash
kubectl label namespace team-payments istio-mesh=enabled
kubectl label namespace team-orders istio-mesh=enabled
# ... only label namespaces that actually use the mesh
```

This reduces the number of Kubernetes API watches, the amount of data istiod processes, and the memory required for the service registry.

## Optimization 3: Control Plane Scaling

At thousands of pods, you need a seriously beefed-up control plane:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    pilot:
      k8s:
        replicaCount: 5
        resources:
          requests:
            cpu: 4000m
            memory: 8Gi
          limits:
            memory: 16Gi
        hpaSpec:
          minReplicas: 5
          maxReplicas: 15
          metrics:
            - type: Resource
              resource:
                name: cpu
                target:
                  type: Utilization
                  averageUtilization: 60
```

At 10000 pods, istiod can easily need 8-16 GB of memory per replica. Start with 5 replicas and let the HPA scale up. Set the CPU target to 60% (not 80%) because you want headroom for push storms.

## Optimization 4: Push Throttling and Debouncing

Endpoint changes trigger configuration pushes. At scale, you need aggressive debouncing to batch changes:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  values:
    pilot:
      env:
        PILOT_DEBOUNCE_AFTER: "300ms"
        PILOT_DEBOUNCE_MAX: "3s"
        PILOT_PUSH_THROTTLE: "200"
        PILOT_ENABLE_EDS_DEBOUNCE: "true"
        PILOT_STATUS_UPDATE_THRESHOLD: "0.1"
```

- **PILOT_DEBOUNCE_AFTER: 300ms**: Wait 300ms after the last change before pushing. This batches rapid changes from deployments scaling.
- **PILOT_DEBOUNCE_MAX: 3s**: Maximum wait time. Even if changes keep coming, push after 3 seconds.
- **PILOT_PUSH_THROTTLE: 200**: Limit concurrent pushes to 200. This prevents istiod from getting overwhelmed.
- **PILOT_ENABLE_EDS_DEBOUNCE**: Enables debouncing specifically for endpoint updates, which are the most frequent at scale.

## Optimization 5: Reduce Sidecar Resource Usage

At thousands of pods, per-sidecar overhead adds up fast. A 50MB difference per sidecar across 10000 pods is 500 GB of memory cluster-wide.

Set conservative sidecar resource limits:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      concurrency: 2
  values:
    global:
      proxy:
        resources:
          requests:
            cpu: 50m
            memory: 64Mi
          limits:
            cpu: 500m
            memory: 256Mi
```

`concurrency: 2` limits Envoy to 2 worker threads regardless of the number of CPU cores available. This significantly reduces per-sidecar memory usage.

Reduce the statistics Envoy generates:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      proxyStatsMatcher:
        inclusionPrefixes:
          - "cluster.outbound"
          - "upstream_cx"
          - "downstream_cx"
          - "http.inbound"
```

Only track the statistics you actually use. The default Envoy statistics are comprehensive but memory-hungry.

## Optimization 6: Consider Ambient Mode

At scale, the sidecar-per-pod model consumes enormous resources. Ambient mode moves the proxy infrastructure to per-node ztunnel instances:

```bash
kubectl label namespace team-payments istio.io/dataplane-mode=ambient
```

The math is compelling:
- 10000 pods across 200 nodes
- Sidecar mode: 10000 Envoy instances
- Ambient mode: 200 ztunnel instances + optional waypoint proxies

If each sidecar uses 100MB, that is 1 TB for sidecars alone in sidecar mode. In ambient mode, the ztunnel overhead is a fraction of that.

## Optimization 7: Efficient Telemetry

At scale, telemetry itself becomes a problem. Each sidecar generates metrics, traces, and access logs. With 10000 sidecars, the telemetry backend needs to ingest and store a massive amount of data.

Reduce telemetry overhead:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: mesh-telemetry
  namespace: istio-system
spec:
  accessLogging:
    - providers:
        - name: envoy
      filter:
        expression: "response.code >= 400"
  metrics:
    - providers:
        - name: prometheus
      overrides:
        - match:
            metric: ALL_METRICS
            mode: CLIENT_AND_SERVER
          tagOverrides:
            request_protocol:
              operation: REMOVE
            destination_canonical_revision:
              operation: REMOVE
```

This limits access logs to error responses only and removes unnecessary metric labels. Each removed label significantly reduces the cardinality of your metrics, which reduces storage and query costs in Prometheus.

## Optimization 8: Endpoint Slices

Kubernetes EndpointSlice is more efficient than Endpoints for large services. Make sure your cluster uses EndpointSlices (default in recent Kubernetes versions) and that Istio is configured to use them:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  values:
    pilot:
      env:
        PILOT_ENABLE_K8S_SELECT_WORKLOAD_ENTRIES: "false"
```

## Monitoring at Scale

At thousands of pods, you need targeted monitoring for scale-specific issues:

```yaml
# Prometheus alert rules for large-scale Istio
groups:
  - name: istio-scale
    rules:
      - alert: IstiodHighMemory
        expr: container_memory_usage_bytes{container="discovery",namespace="istio-system"} / container_spec_memory_limit_bytes > 0.9
        for: 5m
        labels:
          severity: critical

      - alert: SlowConfigPush
        expr: histogram_quantile(0.99, rate(pilot_proxy_convergence_time_bucket[5m])) > 60
        for: 10m
        labels:
          severity: warning

      - alert: HighPushRate
        expr: rate(pilot_xds_pushes[5m]) > 500
        for: 5m
        labels:
          severity: warning

      - alert: SidecarMemoryHigh
        expr: avg(container_memory_usage_bytes{container="istio-proxy"}) by (namespace) / avg(container_spec_memory_limit_bytes{container="istio-proxy"}) by (namespace) > 0.85
        for: 10m
        labels:
          severity: warning
```

Key metrics to dashboard:

```bash
# Control plane push time (should be under 30s at p99)
histogram_quantile(0.99, rate(pilot_proxy_convergence_time_bucket[5m]))

# Number of connected proxies
sum(pilot_xds_connected)

# Push errors (should be zero)
rate(pilot_xds_push_errors[5m])

# Average sidecar memory usage
avg(container_memory_usage_bytes{container="istio-proxy"})
```

## Summary

Scaling Istio across thousands of pods requires a systematic approach to optimization. The highest-impact changes are Sidecar scoping (limits per-proxy configuration), discovery selectors (limits what istiod watches), control plane scaling (more replicas, more memory), and push throttling (prevents push storms). For very large deployments, ambient mode eliminates the per-pod sidecar overhead entirely. Start with Sidecar scoping as it gives the biggest immediate improvement, then add optimizations based on the bottlenecks you observe in your monitoring data.
