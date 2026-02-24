# How to Plan Istio Capacity for Large-Scale Deployments

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Performance, Kubernetes, Capacity Planning, Service Mesh

Description: A practical guide to planning Istio capacity for large-scale deployments covering control plane sizing, sidecar resources, and performance optimization.

---

Running Istio at scale is a different beast than running it with a handful of services. When you have hundreds of services, thousands of pods, and millions of requests per second, the defaults stop working. The control plane needs more resources, sidecars consume more memory, and configuration push times can stretch into minutes if you are not careful.

This guide covers the capacity planning decisions you need to make before hitting scale problems in production.

## Control Plane Sizing

Istiod is the heart of your mesh, and its resource needs grow with your mesh size. The main factors that affect Istiod resource consumption are:

- **Number of sidecars**: Each connected sidecar maintains a gRPC stream to Istiod
- **Number of services and endpoints**: More services means more configuration to distribute
- **Rate of change**: Frequent deployments, scaling events, and config changes increase load
- **Number of Istio resources**: VirtualServices, DestinationRules, etc.

Here are rough sizing guidelines based on mesh size:

```yaml
# Small mesh: <100 sidecars, <50 services
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    pilot:
      k8s:
        resources:
          requests:
            cpu: 500m
            memory: 1Gi
          limits:
            cpu: "1"
            memory: 2Gi
        replicaCount: 1

# Medium mesh: 100-1000 sidecars, 50-500 services
---
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    pilot:
      k8s:
        resources:
          requests:
            cpu: "1"
            memory: 2Gi
          limits:
            cpu: "2"
            memory: 4Gi
        replicaCount: 2
        hpaSpec:
          minReplicas: 2
          maxReplicas: 5
          metrics:
            - type: Resource
              resource:
                name: cpu
                target:
                  type: Utilization
                  averageUtilization: 80

# Large mesh: 1000+ sidecars, 500+ services
---
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    pilot:
      k8s:
        resources:
          requests:
            cpu: "2"
            memory: 4Gi
          limits:
            cpu: "4"
            memory: 8Gi
        replicaCount: 3
        hpaSpec:
          minReplicas: 3
          maxReplicas: 10
          metrics:
            - type: Resource
              resource:
                name: cpu
                target:
                  type: Utilization
                  averageUtilization: 70
```

## Sidecar Proxy Resource Planning

Every pod in the mesh gets a sidecar, and each sidecar consumes CPU and memory. The default resource requests are quite low (100m CPU, 128Mi memory), and at scale, you will likely need to adjust them.

Sidecar memory usage depends on:

- Number of services visible to the sidecar (controlled by Sidecar resources)
- Number of routes and clusters in the Envoy configuration
- Volume of active connections
- Access log buffering

```yaml
# Default sidecar resources (suitable for small meshes)
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  values:
    global:
      proxy:
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: "2"
            memory: 1Gi

# For large meshes with many services
---
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  values:
    global:
      proxy:
        resources:
          requests:
            cpu: 200m
            memory: 256Mi
          limits:
            cpu: "2"
            memory: 1Gi
```

## Reducing Configuration Size with Sidecar Resources

The single most impactful optimization for large meshes is using Sidecar resources to limit what each proxy sees. Without Sidecar resources, every proxy gets the full mesh configuration, which at scale can be hundreds of megabytes.

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Sidecar
metadata:
  name: default
  namespace: my-namespace
spec:
  egress:
    - hosts:
        - "./*"
        - "istio-system/*"
        - "shared-services/database.shared-services.svc.cluster.local"
```

In a mesh with 1000 services, a sidecar without scope sees all 1000 services. With proper scoping, it might only see 20. That is a massive reduction in memory usage and configuration push time.

## Discovery Selectors

Another way to reduce control plane load is discovery selectors. By default, Istiod watches all namespaces. In a large cluster with hundreds of namespaces, many of which are not part of the mesh, this wastes resources:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    discoverySelectors:
      - matchLabels:
          istio-managed: "true"
```

This tells Istiod to only process namespaces labeled with `istio-managed: "true"`, significantly reducing its CPU and memory usage.

## Proxy Concurrency

By default, the Envoy sidecar uses 2 worker threads. For high-throughput services, you might need more:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      concurrency: 0  # 0 means use all available cores
```

Or per workload:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: high-throughput-service
spec:
  template:
    metadata:
      annotations:
        proxy.istio.io/config: |
          concurrency: 4
```

Be aware that more threads means more CPU usage. Profile your workloads to find the right balance.

## Gateway Sizing

Ingress and east-west gateways are the entry points to your mesh and need careful sizing. They handle all incoming traffic, so they often need more resources than individual sidecars:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    ingressGateways:
      - name: istio-ingressgateway
        enabled: true
        k8s:
          resources:
            requests:
              cpu: "1"
              memory: 1Gi
            limits:
              cpu: "4"
              memory: 4Gi
          hpaSpec:
            minReplicas: 3
            maxReplicas: 20
            metrics:
              - type: Resource
                resource:
                  name: cpu
                  target:
                    type: Utilization
                    averageUtilization: 60
```

## Key Metrics to Monitor

Set up monitoring for these metrics to catch capacity issues before they become outages:

```bash
# Control plane push latency
pilot_proxy_convergence_time

# Number of connected proxies
pilot_xds_connected_clients

# Configuration push errors
pilot_xds_push_errors

# Sidecar memory usage
container_memory_working_set_bytes{container="istio-proxy"}

# Sidecar CPU usage
container_cpu_usage_seconds_total{container="istio-proxy"}
```

Create alerts for:

- Push latency exceeding 30 seconds (indicates control plane overload)
- More than 5% push errors (indicates configuration issues)
- Sidecar memory approaching limits (OOM risk)
- Istiod CPU consistently above 80% (needs more replicas or resources)

## Load Testing Your Mesh

Before going to production at scale, load test your mesh to find the breaking points:

```bash
# Use fortio (Istio's recommended load testing tool)
kubectl apply -f samples/httpbin/httpbin.yaml
kubectl apply -f samples/sleep/sleep.yaml

# Run a load test
kubectl exec deploy/sleep -c sleep -- \
  fortio load -c 100 -qps 1000 -t 60s http://httpbin:8000/get
```

Monitor control plane metrics during the test. If push times increase or you see errors, scale up the control plane.

## Summary of Capacity Planning Checklist

1. Size Istiod based on the number of sidecars and services
2. Use Sidecar resources to limit proxy configuration scope
3. Enable discovery selectors to reduce control plane load
4. Adjust proxy concurrency for high-throughput services
5. Size gateways based on expected traffic volume
6. Set up monitoring and alerting on key metrics
7. Load test before production deployment

Capacity planning for Istio is not a one-time exercise. As your mesh grows, revisit these settings regularly. The good news is that Istio scales well when configured properly - production meshes with tens of thousands of sidecars are not unusual.
