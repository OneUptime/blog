# How to Set Resource Limits for Sidecar Containers in Multi-Container Pods

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Sidecars, Resource Management

Description: Learn how to properly size resource requests and limits for sidecar containers like service mesh proxies, log collectors, and monitoring agents to avoid over-provisioning and ensure pod stability.

---

Sidecar containers run alongside your application, but developers often forget to set their resource limits or copy limits from the main container. This wastes resources or causes instability. This guide shows you how to size sidecars correctly.

## Common Sidecar Patterns

Sidecars perform supporting tasks:

- Service mesh proxies (Envoy, Linkerd)
- Log shipping (Fluent Bit, Filebeat)
- Monitoring agents (Prometheus exporters)
- Security scanning
- Config reloaders

Each has different resource needs.

## Why Sidecar Resources Matter

Without proper limits:

- Sidecars can starve the main application
- Pods get rejected due to excessive total requests
- Resource waste from over-provisioning
- OOMKilled sidecars break functionality

Pods are scheduled based on the sum of all container requests.

## Basic Sidecar Resource Configuration

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-with-sidecar
spec:
  containers:
  - name: app
    image: myapp:latest
    resources:
      requests:
        cpu: "1"
        memory: "2Gi"
      limits:
        cpu: "2"
        memory: "4Gi"
  - name: log-shipper
    image: fluent-bit:latest
    resources:
      requests:
        cpu: "100m"
        memory: "128Mi"
      limits:
        cpu: "200m"
        memory: "256Mi"
```

Total pod request: 1.1 CPU, 2.13Gi memory

## Sizing Service Mesh Sidecars

Envoy and Linkerd proxies intercept all traffic, so size based on throughput:

```yaml
# Low traffic (< 100 RPS)
containers:
- name: envoy-proxy
  image: envoyproxy/envoy:v1.28
  resources:
    requests:
      cpu: "100m"
      memory: "128Mi"
    limits:
      cpu: "500m"
      memory: "512Mi"

# Medium traffic (100-1000 RPS)
containers:
- name: envoy-proxy
  image: envoyproxy/envoy:v1.28
  resources:
    requests:
      cpu: "250m"
      memory: "256Mi"
    limits:
      cpu: "1"
      memory: "1Gi"

# High traffic (> 1000 RPS)
containers:
- name: envoy-proxy
  image: envoyproxy/envoy:v1.28
  resources:
    requests:
      cpu: "500m"
      memory: "512Mi"
    limits:
      cpu: "2"
      memory: "2Gi"
```

Monitor actual usage and adjust.

## Sizing Log Shipping Sidecars

Log shippers like Fluent Bit need minimal resources:

```yaml
containers:
- name: fluent-bit
  image: fluent/fluent-bit:2.0
  volumeMounts:
  - name: varlog
    mountPath: /var/log
    readOnly: true
  resources:
    requests:
      cpu: "50m"
      memory: "64Mi"
    limits:
      cpu: "200m"
      memory: "256Mi"
```

Increase if shipping high-volume logs or doing parsing.

## Sizing Monitoring Exporters

Prometheus exporters are lightweight:

```yaml
containers:
- name: metrics-exporter
  image: prom/node-exporter:latest
  resources:
    requests:
      cpu: "25m"
      memory: "32Mi"
    limits:
      cpu: "100m"
      memory: "128Mi"
```

They scrape occasionally and buffer minimal data.

## Init Containers for Sidecars

Some sidecars need init containers:

```yaml
initContainers:
- name: sidecar-init
  image: sidecar-init:latest
  resources:
    requests:
      cpu: "100m"
      memory: "64Mi"
    limits:
      cpu: "200m"
      memory: "128Mi"
containers:
- name: app
  image: app:latest
  resources:
    requests:
      cpu: "1"
      memory: "2Gi"
- name: sidecar
  image: sidecar:latest
  resources:
    requests:
      cpu: "100m"
      memory: "128Mi"
```

Remember: effective pod request is max(init, sum of app containers).

## Burstable vs Guaranteed for Sidecars

Most sidecars should be Burstable (requests < limits) to allow bursts without wasting resources:

```yaml
# Burstable sidecar
containers:
- name: sidecar
  resources:
    requests:
      cpu: "100m"
      memory: "128Mi"
    limits:
      cpu: "500m"
      memory: "512Mi"
```

Critical sidecars (service mesh in high-traffic services) can be Guaranteed:

```yaml
# Guaranteed sidecar
containers:
- name: envoy
  resources:
    requests:
      cpu: "500m"
      memory: "512Mi"
    limits:
      cpu: "500m"
      memory: "512Mi"
```

## Sidecar Injection and Resource Defaults

Service meshes auto-inject sidecars with default resources. Customize via annotations:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app
  annotations:
    sidecar.istio.io/proxyCPU: "200m"
    sidecar.istio.io/proxyMemory: "256Mi"
    sidecar.istio.io/proxyCPULimit: "1"
    sidecar.istio.io/proxyMemoryLimit: "1Gi"
spec:
  containers:
  - name: app
    image: app:latest
```

Istio applies these values to the injected Envoy sidecar.

## Monitoring Sidecar Resource Usage

Check sidecar usage separately:

```bash
kubectl top pods --containers -n production
```

Output:

```
POD          NAME         CPU    MEMORY
app-abc      app          450m   1.5Gi
app-abc      envoy        80m    200Mi
app-abc      fluent-bit   20m    64Mi
```

Right-size based on actual usage.

## Preventing Sidecar Resource Starvation

If the main app and sidecar compete for resources, the pod can thrash. Ensure total requests fit comfortably:

```yaml
# Bad: Requests sum to more than node capacity
containers:
- name: app
  resources:
    requests:
      cpu: "7"
      memory: "28Gi"
- name: sidecar
  resources:
    requests:
      cpu: "1"
      memory: "4Gi"
# Total: 8 CPU, 32Gi (won't fit on 8-CPU node with system reserved)

# Good: Leave headroom
containers:
- name: app
  resources:
    requests:
      cpu: "6"
      memory: "24Gi"
- name: sidecar
  resources:
    requests:
      cpu: "500m"
      memory: "2Gi"
# Total: 6.5 CPU, 26Gi
```

## Sidecar CPU Throttling

Sidecars with low CPU limits can throttle and add latency. Monitor throttling:

```bash
kubectl exec app-abc -- cat /sys/fs/cgroup/cpu/cpu.stat
```

Look for `nr_throttled` and `throttled_time`. If high, increase CPU limits.

Or use Prometheus:

```promql
rate(container_cpu_cfs_throttled_seconds_total{container="envoy"}[5m])
```

## Best Practices

- Set explicit requests and limits for all sidecars
- Size based on actual workload (traffic volume, log volume)
- Use Burstable QoS for sidecars (requests < limits)
- Monitor sidecar usage with kubectl top --containers
- Leave CPU limit headroom to avoid throttling
- Test sidecar sizing under load
- Document sidecar resource rationale
- Use VPA to recommend sidecar sizing

## Real-World Example: Multi-Sidecar Pod

A pod with app, service mesh, logging, and monitoring:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: production-app
  namespace: production
spec:
  containers:
  - name: app
    image: myapp:v2
    ports:
    - containerPort: 8080
    resources:
      requests:
        cpu: "2"
        memory: "4Gi"
      limits:
        cpu: "4"
        memory: "8Gi"
  - name: envoy-sidecar
    image: envoyproxy/envoy:v1.28
    resources:
      requests:
        cpu: "250m"
        memory: "256Mi"
      limits:
        cpu: "1"
        memory: "1Gi"
  - name: fluent-bit
    image: fluent/fluent-bit:2.0
    volumeMounts:
    - name: varlog
      mountPath: /var/log
    resources:
      requests:
        cpu: "50m"
        memory: "64Mi"
      limits:
        cpu: "200m"
        memory: "256Mi"
  - name: prometheus-exporter
    image: prom/jmx-exporter:latest
    ports:
    - containerPort: 9404
    resources:
      requests:
        cpu: "25m"
        memory: "32Mi"
      limits:
        cpu: "100m"
        memory: "128Mi"
  volumes:
  - name: varlog
    emptyDir: {}
```

Total pod requests: 2.325 CPU, 4.35Gi memory

## Sidecar Resource Policies

Use LimitRange to enforce sidecar sizing:

```yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: sidecar-limits
  namespace: production
spec:
  limits:
  - max:
      cpu: "1"
      memory: "2Gi"
    min:
      cpu: "10m"
      memory: "16Mi"
    type: Container
```

Prevents accidentally huge sidecars.

## Conclusion

Sidecars need explicit resource limits based on their function and workload. Service mesh proxies scale with traffic, log shippers with log volume, and exporters use minimal resources. Monitor actual sidecar usage, set Burstable QoS with reasonable limits, and avoid CPU throttling that adds latency. Account for sidecar resources in total pod sizing to prevent scheduling failures. Properly sized sidecars add minimal overhead while providing essential functionality.
