# How to Calculate Sidecar Memory Requirements for Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Kubernetes, Sidecar Proxy, Memory, Capacity Planning

Description: Learn how to accurately calculate Envoy sidecar proxy memory requirements for Istio deployments based on endpoints, connections, and traffic patterns.

---

One of the most common mistakes when deploying Istio is underestimating how much memory the Envoy sidecar proxies will consume. The default resource limits might work for a small test cluster, but in production with hundreds of services and thousands of endpoints, those sidecars can eat through memory fast. Getting this calculation right means the difference between a stable mesh and pods getting OOMKilled at the worst possible time.

## What Consumes Memory in an Envoy Sidecar

The Envoy proxy sidecar that Istio injects into each pod uses memory for several things:

- **Configuration state**: The full set of clusters, routes, listeners, and endpoints pushed from istiod
- **Connection pools**: Active connections to upstream services
- **Buffers**: Request and response buffering during proxying
- **TLS session state**: Each mTLS connection requires memory for certificate chains and session keys
- **Statistics and metrics**: Envoy maintains in-memory counters for all its metrics
- **Access log buffers**: If access logging is enabled

The baseline memory footprint when a sidecar first starts with no traffic is typically between 30-50 MB. But this can grow significantly depending on your mesh configuration.

## The Biggest Factor: Number of Endpoints

The single biggest driver of sidecar memory is the number of endpoints that get pushed to each proxy. By default, Istio pushes the full set of service endpoints to every sidecar. If you have 500 services with an average of 3 endpoints each, every sidecar gets 1,500 endpoint entries.

You can check how many endpoints a particular sidecar knows about:

```bash
# Get the proxy config for a specific pod
istioctl proxy-config endpoints <pod-name> -n <namespace> | wc -l

# Get detailed cluster configuration
istioctl proxy-config cluster <pod-name> -n <namespace>
```

As a rough estimate, each endpoint entry consumes about 1-2 KB of memory. So for a mesh with 1,500 endpoints:

```text
1,500 endpoints x 2 KB = 3 MB just for endpoint data
```

That sounds small, but the configuration objects around those endpoints (clusters, routes, listeners) multiply the impact. A more realistic model is:

```text
Base memory: 40 MB
Per-endpoint overhead: 5-10 KB (including associated config)
Per-active-connection overhead: 10-50 KB
```

## Measuring Actual Memory Usage

Before you start calculating, measure what your sidecars are actually using today:

```bash
# Check memory usage across all sidecar containers
kubectl top pods --containers --all-namespaces | grep istio-proxy

# Get detailed memory stats from Envoy admin interface
kubectl exec <pod-name> -c istio-proxy -- curl -s localhost:15000/memory

# Check the allocated and heap size
kubectl exec <pod-name> -c istio-proxy -- curl -s localhost:15000/server_info | grep -i memory
```

You can also use Prometheus queries if you have metrics collection set up:

```promql
# Memory usage per sidecar
container_memory_working_set_bytes{container="istio-proxy"}

# Average sidecar memory across the mesh
avg(container_memory_working_set_bytes{container="istio-proxy"})

# P99 sidecar memory
quantile(0.99, container_memory_working_set_bytes{container="istio-proxy"})
```

## The Calculation Formula

Here is a practical formula for estimating sidecar memory:

```text
Memory = Base + (Endpoints x Per_Endpoint) + (Connections x Per_Connection) + (RPS x Buffer_Factor)

Where:
  Base = 40 MB
  Per_Endpoint = 10 KB (with full push)
  Per_Connection = 30 KB
  Buffer_Factor = 0.5 KB per request/sec (depends on payload size)
```

Example for a pod that talks to 10 services, in a mesh with 2,000 total endpoints, handling 100 RPS with an average of 50 concurrent connections:

```text
Memory = 40 MB + (2000 x 10 KB) + (50 x 30 KB) + (100 x 0.5 KB)
Memory = 40 MB + 20 MB + 1.5 MB + 0.05 MB
Memory = ~62 MB
```

For most workloads, a request of 64-128 Mi and a limit of 256-512 Mi will be appropriate.

## Reducing Sidecar Memory with Sidecar Resources

If your mesh is large but individual services only talk to a few other services, you can dramatically reduce memory by using the Sidecar resource to limit endpoint visibility:

```yaml
apiVersion: networking.istio.io/v1
kind: Sidecar
metadata:
  name: frontend
  namespace: frontend
spec:
  egress:
    - hosts:
        - "./api-service.backend.svc.cluster.local"
        - "./auth-service.auth.svc.cluster.local"
        - "istio-system/*"
```

This tells Istio to only push endpoints for the services that this workload actually needs. In a mesh with 2,000 endpoints where a service only needs 20, this can cut sidecar memory from 60+ MB down to 45 MB.

Apply a default mesh-wide Sidecar resource as a starting point:

```yaml
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

This restricts each sidecar to only see services in its own namespace plus istio-system, which is a good default for many deployments.

## Setting Resource Requests and Limits

Based on your calculations, configure sidecar resources globally:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  values:
    global:
      proxy:
        resources:
          requests:
            memory: "128Mi"
          limits:
            memory: "512Mi"
```

Or per-workload using annotations:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service
spec:
  template:
    metadata:
      annotations:
        sidecar.istio.io/proxyMemoryLimit: "512Mi"
        sidecar.istio.io/proxyMemory: "128Mi"
    spec:
      containers:
        - name: my-service
          image: my-service:latest
```

## Handling High-Traffic Services

Services that handle a lot of traffic or maintain many concurrent connections need more memory. For a service handling 10,000 RPS with 1,000 concurrent connections:

```text
Memory = 40 MB + (2000 x 10 KB) + (1000 x 30 KB) + (10000 x 0.5 KB)
Memory = 40 MB + 20 MB + 30 MB + 5 MB
Memory = ~95 MB
```

Set a higher limit for these workloads:

```yaml
metadata:
  annotations:
    sidecar.istio.io/proxyMemory: "128Mi"
    sidecar.istio.io/proxyMemoryLimit: "1Gi"
```

## Monitoring for OOMKills

Set up alerts to catch sidecars approaching their memory limits:

```yaml
# Prometheus alerting rule
groups:
  - name: istio-sidecar-memory
    rules:
      - alert: SidecarMemoryHigh
        expr: |
          container_memory_working_set_bytes{container="istio-proxy"}
          / container_spec_memory_limit_bytes{container="istio-proxy"}
          > 0.8
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Istio sidecar memory usage above 80%"
          description: "Pod {{ $labels.pod }} sidecar is using {{ $value | humanizePercentage }} of its memory limit"
```

Also watch for OOMKill events:

```bash
# Find recent OOMKilled sidecar containers
kubectl get events --all-namespaces --field-selector reason=OOMKilling | grep istio-proxy
```

## Iterative Tuning Process

Memory calculation is not a one-shot exercise. Follow this process:

1. Start with conservative estimates (128Mi request, 512Mi limit)
2. Deploy and monitor actual usage for a week
3. Check P95 and P99 memory consumption
4. Adjust requests to match P95 usage
5. Set limits to 2x the P99 usage
6. Re-evaluate when adding new services or increasing traffic

The goal is to have requests that are close to actual usage (for efficient scheduling) and limits that give enough headroom to handle spikes without OOMKills. Getting this balance right takes observation and iteration, not just math.
