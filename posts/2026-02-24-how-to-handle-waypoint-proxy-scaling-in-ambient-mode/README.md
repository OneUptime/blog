# How to Handle Waypoint Proxy Scaling in Ambient Mode

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Ambient Mesh, Waypoint Proxy, Scaling, Kubernetes

Description: Learn how to deploy, scale, and manage waypoint proxies in Istio ambient mode for L7 traffic processing with proper resource allocation and autoscaling.

---

In Istio ambient mode, the ztunnel handles L4 traffic processing (encryption, identity, basic authorization). But when you need L7 features like HTTP routing, header-based authorization, retries, or traffic splitting, you need a waypoint proxy. Waypoint proxies are full Envoy instances that process L7 traffic for specific workloads or namespaces.

Unlike ztunnels which run as a DaemonSet on every node, waypoint proxies are deployments that you create and scale based on your traffic needs. Getting the scaling right is important because an under-scaled waypoint creates a bottleneck, while over-scaling wastes resources.

## Understanding Waypoint Proxy Architecture

A waypoint proxy sits in the traffic path between ztunnels when L7 processing is needed:

```text
ztunnel (source) --HBONE--> Waypoint Proxy --HBONE--> ztunnel (destination)
```

Waypoint proxies can be scoped to:
- **A namespace**: Handles L7 traffic for all services in that namespace
- **A specific service account**: Handles L7 traffic only for workloads using that service account

## Creating a Waypoint Proxy

Use `istioctl` to create a waypoint proxy for a namespace:

```bash
istioctl waypoint apply --namespace default
```

This creates a Kubernetes Gateway resource and the corresponding Envoy deployment:

```bash
kubectl get gateways -n default
kubectl get pods -n default -l istio.io/gateway-name=waypoint
```

You can also create a waypoint for a specific service account:

```bash
istioctl waypoint apply --namespace default --service-account my-service
```

To see the generated Gateway resource:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: waypoint
  namespace: default
spec:
  gatewayClassName: istio-waypoint
  listeners:
  - name: mesh
    port: 15008
    protocol: HBONE
```

## Scaling Waypoint Proxies

By default, a waypoint proxy creates a single replica. For production, you want multiple replicas for high availability and throughput.

### Manual Scaling

Scale the waypoint deployment directly:

```bash
kubectl scale deployment waypoint -n default --replicas=3
```

Or edit the Gateway resource to set the number of replicas using an annotation:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: waypoint
  namespace: default
  annotations:
    istio.io/gateway-replicas: "3"
spec:
  gatewayClassName: istio-waypoint
  listeners:
  - name: mesh
    port: 15008
    protocol: HBONE
```

### Horizontal Pod Autoscaler

Set up HPA for waypoint proxies to scale based on CPU or custom metrics:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: waypoint-hpa
  namespace: default
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: waypoint
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

This scales the waypoint between 2 and 10 replicas based on CPU and memory usage. A minimum of 2 replicas ensures high availability.

### Pod Disruption Budget

Protect waypoint proxies during cluster maintenance:

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: waypoint-pdb
  namespace: default
spec:
  minAvailable: 1
  selector:
    matchLabels:
      istio.io/gateway-name: waypoint
```

This ensures at least one waypoint pod is always running, even during node drains or upgrades.

## Resource Configuration

Waypoint proxies are Envoy instances, so they need appropriate resources. Set requests and limits based on your traffic profile:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: waypoint
  namespace: default
  annotations:
    proxy.istio.io/config: |
      resources:
        requests:
          cpu: 500m
          memory: 256Mi
        limits:
          cpu: "2"
          memory: 1Gi
spec:
  gatewayClassName: istio-waypoint
  listeners:
  - name: mesh
    port: 15008
    protocol: HBONE
```

**Sizing guidelines**:
- **Low traffic (< 100 rps)**: 100m CPU, 128Mi memory
- **Medium traffic (100-1000 rps)**: 500m CPU, 256Mi memory
- **High traffic (1000+ rps)**: 1-2 CPU, 512Mi-1Gi memory

These vary significantly based on the complexity of your L7 policies (number of routes, authorization rules, etc.).

## Multiple Waypoint Proxies

You can run different waypoint proxies for different purposes. For example, one for the general namespace and specific ones for high-traffic services:

```bash
# Namespace-level waypoint
istioctl waypoint apply --namespace default --name general-waypoint

# Service-specific waypoint for a high-traffic service
istioctl waypoint apply --namespace default --service-account payment-service --name payment-waypoint
```

This lets you scale the payment service waypoint independently from the general one.

Check which waypoint a workload uses:

```bash
istioctl x describe pod payment-service-pod
```

## Monitoring Waypoint Performance

Track waypoint proxy performance with these metrics:

**Request rate:**

```promql
sum(rate(istio_requests_total{
  app="waypoint"
}[5m])) by (destination_workload)
```

**Latency added by the waypoint:**

```promql
histogram_quantile(0.99,
  sum(rate(istio_request_duration_milliseconds_bucket{
    app="waypoint"
  }[5m])) by (le)
)
```

**Connection count:**

```promql
envoy_server_total_connections{pod=~"waypoint.*"}
```

**Resource usage:**

```promql
rate(container_cpu_usage_seconds_total{pod=~"waypoint.*"}[5m])
container_memory_working_set_bytes{pod=~"waypoint.*"}
```

## Topology Spread for Waypoint Proxies

Spread waypoint replicas across nodes and zones for resilience:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: waypoint
  namespace: default
spec:
  template:
    spec:
      topologySpreadConstraints:
      - maxSkew: 1
        topologyKey: kubernetes.io/hostname
        whenUnsatisfiable: DoNotSchedule
        labelSelector:
          matchLabels:
            istio.io/gateway-name: waypoint
      - maxSkew: 1
        topologyKey: topology.kubernetes.io/zone
        whenUnsatisfiable: ScheduleAnyway
        labelSelector:
          matchLabels:
            istio.io/gateway-name: waypoint
```

This distributes waypoint pods evenly across nodes (strictly) and across zones (best effort).

## When to Use Waypoint Proxies

Not every service needs a waypoint. Remember that ztunnel provides:
- mTLS encryption and authentication
- L4 authorization (source/destination identity)
- Telemetry at the connection level

You only need a waypoint proxy when you need:
- HTTP routing (VirtualService with HTTP match rules)
- Header-based authorization (AuthorizationPolicy with operation.methods, paths, etc.)
- Retries and timeouts at the HTTP level
- Traffic splitting (canary deployments)
- Request-level telemetry (HTTP status codes, latency)

If your service only needs mTLS and basic L4 authorization, skip the waypoint to reduce overhead.

## Graceful Scaling Down

When scaling down waypoint proxies, you need to handle in-flight requests. Configure the termination grace period:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: waypoint
spec:
  template:
    spec:
      terminationGracePeriodSeconds: 30
```

This gives Envoy 30 seconds to drain active connections before shutting down. Combine this with the drain duration in Envoy configuration for smooth scaling.

## Troubleshooting Scaling Issues

**Traffic not reaching the waypoint**: Verify the waypoint is correctly associated with the target service or namespace:

```bash
kubectl get gateways -n default -o yaml
```

**Uneven load across replicas**: If some waypoint pods are getting more traffic than others, check if the ztunnels are load balancing correctly. The ztunnel should distribute HBONE connections across available waypoint pods.

**Out of memory**: If waypoint pods are being OOMKilled, increase memory limits and check for large configurations (many routes or authorization rules increase memory usage).

```bash
kubectl describe pod waypoint-xxx -n default | grep -A3 "OOMKilled"
```

Waypoint proxy scaling is a balancing act between performance, availability, and resource cost. Start with manual scaling to understand your traffic patterns, then move to HPA for automated scaling as you gain confidence in the resource requirements.
