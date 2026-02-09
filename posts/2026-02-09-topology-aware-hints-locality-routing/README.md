# How to Configure Topology-Aware Hints for Locality-Based Traffic Routing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Networking, Performance

Description: Enable topology-aware hints in Kubernetes to automatically route service traffic to endpoints in the same zone or region, reducing cross-zone bandwidth costs and latency while maintaining high availability across failure domains.

---

Topology-aware hints allow Kubernetes to route service traffic based on network topology, preferring endpoints in the same zone, region, or other topology domain as the client. This reduces cross-zone network traffic costs and latency without sacrificing availability. When local endpoints are unhealthy or unavailable, traffic automatically falls back to other zones.

## Understanding Topology Aware Routing

Cloud providers charge for data transfer between availability zones. In AWS, cross-zone traffic costs $0.01-0.02 per GB. For high-traffic services, this adds up quickly. A service handling 10TB of monthly cross-zone traffic pays $100-200 just for network transfer.

Topology-aware hints solve this by adding zone preference information to EndpointSlices. When kube-proxy or your CNI selects an endpoint for a connection, it prefers endpoints in the same zone as the client pod.

The system maintains the following behavior:

1. Route to same-zone endpoints when available
2. Fall back to other zones if same-zone endpoints are unhealthy
3. Distribute load evenly within the preferred zone
4. Automatically rebalance when topology changes

This differs from internalTrafficPolicy Local, which strictly enforces node-local routing and fails if no local endpoints exist.

## Enabling Topology Aware Hints

Enable topology-aware hints by adding an annotation to your service:

```yaml
# topology-aware-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: api-service
  namespace: production
  annotations:
    service.kubernetes.io/topology-mode: Auto
spec:
  selector:
    app: api-server
  ports:
  - protocol: TCP
    port: 8080
    targetPort: 8080
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
  namespace: production
spec:
  replicas: 12  # Spread across 3 zones = 4 per zone
  selector:
    matchLabels:
      app: api-server
  template:
    metadata:
      labels:
        app: api-server
    spec:
      # Spread pods across zones
      topologySpreadConstraints:
      - maxSkew: 1
        topologyKey: topology.kubernetes.io/zone
        whenUnsatisfiable: DoNotSchedule
        labelSelector:
          matchLabels:
            app: api-server
      containers:
      - name: api
        image: mycompany/api-server:v2.1
        ports:
        - containerPort: 8080
        resources:
          requests:
            cpu: 200m
            memory: 256Mi
```

Apply the service:

```bash
kubectl apply -f topology-aware-service.yaml
```

## Verifying Topology Hints

Check the EndpointSlices for topology hints:

```bash
kubectl get endpointslices -l kubernetes.io/service-name=api-service -o yaml
```

Look for the hints section in each endpoint:

```yaml
apiVersion: discovery.k8s.io/v1
kind: EndpointSlice
metadata:
  name: api-service-abc123
  labels:
    kubernetes.io/service-name: api-service
endpoints:
- addresses:
  - "10.244.2.5"
  conditions:
    ready: true
  hints:
    forZones:
    - name: "us-east-1a"  # This endpoint prefers zone us-east-1a
  nodeName: worker-node-3
  zone: "us-east-1a"
- addresses:
  - "10.244.3.8"
  conditions:
    ready: true
  hints:
    forZones:
    - name: "us-east-1b"  # This endpoint prefers zone us-east-1b
  nodeName: worker-node-5
  zone: "us-east-1b"
```

## Testing Zone Affinity

Deploy test clients in different zones and verify they connect to local endpoints:

```yaml
# test-client-zone-a.yaml
apiVersion: v1
kind: Pod
metadata:
  name: client-zone-a
spec:
  nodeSelector:
    topology.kubernetes.io/zone: us-east-1a
  containers:
  - name: curl
    image: curlimages/curl
    command: ['sh', '-c', 'sleep 3600']
---
# test-client-zone-b.yaml
apiVersion: v1
kind: Pod
metadata:
  name: client-zone-b
spec:
  nodeSelector:
    topology.kubernetes.io/zone: us-east-1b
  containers:
  - name: curl
    image: curlimages/curl
    command: ['sh', '-c', 'sleep 3600']
```

Deploy the clients:

```bash
kubectl apply -f test-client-zone-a.yaml
kubectl apply -f test-client-zone-b.yaml
```

Make requests and check which endpoints respond:

```bash
# From zone A client
for i in {1..20}; do
  kubectl exec client-zone-a -- curl -s http://api-service:8080/hostname
done | sort | uniq -c

# From zone B client
for i in {1..20}; do
  kubectl exec client-zone-b -- curl -s http://api-service:8080/hostname
done | sort | uniq -c
```

You should see clients predominantly hitting endpoints in their own zone.

## Requirements for Auto Mode

Topology-aware hints with `Auto` mode have specific requirements:

1. **Balanced endpoint distribution**: Each zone should have similar endpoint counts
2. **Sufficient CPU resources**: Endpoint slice controller needs CPU headroom
3. **Even traffic distribution**: Service should see traffic from all zones
4. **Minimum endpoints per zone**: At least 2 endpoints per zone recommended

The controller automatically disables hints if these conditions aren't met. Check the EndpointSlice events:

```bash
kubectl describe endpointslice api-service-abc123
```

Look for messages like:

```
Normal  TopologyAwareHintsEnabled  Topology aware hints have been added
Warning TopologyAwareHintsDisabled Unable to allocate minimum required endpoints to each zone
```

## Handling Unbalanced Zones

When zones have different node counts or pod distributions, hints may not be allocated:

```yaml
# BAD: Unbalanced distribution
# Zone A: 8 pods
# Zone B: 3 pods
# Zone C: 1 pod

# GOOD: Balanced distribution
# Zone A: 4 pods
# Zone B: 4 pods
# Zone C: 4 pods
```

Force balanced distribution with topology spread constraints:

```yaml
spec:
  replicas: 12
  template:
    spec:
      topologySpreadConstraints:
      - maxSkew: 1  # Allow max difference of 1 pod between zones
        topologyKey: topology.kubernetes.io/zone
        whenUnsatisfiable: DoNotSchedule
        labelSelector:
          matchLabels:
            app: api-server
```

This ensures each zone has 4 pods (12 total / 3 zones = 4 per zone, with maxSkew 1).

## Monitoring Cross-Zone Traffic

Track cross-zone traffic to verify topology hints are working. Use service mesh metrics if available:

```bash
# Istio example
kubectl exec -n istio-system deploy/istiod -- curl -s http://localhost:15014/metrics | \
  grep istio_request_bytes | grep zone
```

For clusters without a service mesh, monitor at the application level:

```go
// Go application example with Prometheus metrics
package main

import (
    "net/http"
    "os"

    "github.com/prometheus/client_golang/prometheus"
    "github.com/prometheus/client_golang/prometheus/promhttp"
)

var (
    requestsTotal = prometheus.NewCounterVec(
        prometheus.CounterOpts{
            Name: "api_requests_total",
            Help: "Total API requests",
        },
        []string{"client_zone", "server_zone"},
    )
)

func init() {
    prometheus.MustRegister(requestsTotal)
}

func handler(w http.ResponseWriter, r *http.Request) {
    clientZone := r.Header.Get("X-Client-Zone")
    serverZone := os.Getenv("AVAILABILITY_ZONE")

    requestsTotal.WithLabelValues(clientZone, serverZone).Inc()

    w.Write([]byte("Hello from " + serverZone))
}

func main() {
    http.HandleFunc("/", handler)
    http.Handle("/metrics", promhttp.Handler())
    http.ListenAndServe(":8080", nil)
}
```

Query these metrics to see traffic patterns:

```promql
# Same-zone traffic percentage
sum(rate(api_requests_total{client_zone=server_zone}[5m])) /
sum(rate(api_requests_total[5m])) * 100
```

## Cost Savings Calculation

Calculate potential savings from zone-aware routing. Assume:

- 100 pods across 3 zones
- 1TB per day of service-to-service traffic
- $0.01 per GB cross-zone transfer

**Without topology hints:**
- Random distribution = ~67% cross-zone traffic
- 670GB/day cross-zone × $0.01 = $6.70/day
- Monthly cost: $201

**With topology hints:**
- Assume 90% same-zone routing
- 100GB/day cross-zone × $0.01 = $1.00/day
- Monthly cost: $30
- **Savings: $171/month per service**

For a large cluster with 50 services, that's $8,550/month saved.

## Fallback Behavior

When same-zone endpoints become unhealthy, traffic automatically routes to other zones:

```bash
# Simulate zone failure by cordoning all nodes in zone A
kubectl cordon -l topology.kubernetes.io/zone=us-east-1a

# Delete pods in zone A to force rescheduling elsewhere
kubectl delete pods -l app=api-server --field-selector spec.nodeName=node-in-zone-a
```

Watch traffic shift to other zones:

```bash
# Monitor which zones serve requests
kubectl exec client-zone-a -- sh -c 'for i in $(seq 1 100); do curl -s http://api-service:8080/zone; done' | sort | uniq -c
```

You'll see requests now going to zones B and C.

## Multi-Region Topology

Extend topology awareness to regions using custom topology keys:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: global-service
  annotations:
    service.kubernetes.io/topology-mode: Auto
spec:
  selector:
    app: global-app
  ports:
  - port: 8080
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: global-app
spec:
  replicas: 30
  template:
    spec:
      topologySpreadConstraints:
      # Spread across regions first
      - maxSkew: 2
        topologyKey: topology.kubernetes.io/region
        whenUnsatisfiable: DoNotSchedule
        labelSelector:
          matchLabels:
            app: global-app
      # Then spread across zones within regions
      - maxSkew: 1
        topologyKey: topology.kubernetes.io/zone
        whenUnsatisfiable: DoNotSchedule
        labelSelector:
          matchLabels:
            app: global-app
```

This creates a hierarchy: prefer same-zone, fall back to same-region, finally use any available endpoint.

## Disabling Topology Hints

To disable topology hints and return to cluster-wide load balancing:

```bash
kubectl annotate service api-service service.kubernetes.io/topology-mode-
```

Or set to `Disabled`:

```yaml
metadata:
  annotations:
    service.kubernetes.io/topology-mode: Disabled
```

The endpoint slice controller removes hints from all EndpointSlices.

## Best Practices

Follow these practices for effective topology-aware routing:

1. **Balance pod distribution**: Use topology spread constraints
2. **Monitor hint allocation**: Check for disabled hints in events
3. **Start with Auto mode**: Let Kubernetes manage hint allocation
4. **Measure before and after**: Track cross-zone traffic and costs
5. **Consider failure modes**: Ensure enough cross-zone capacity for zone failures
6. **Use with headless services**: Topology hints work with both ClusterIP and headless services

Topology-aware hints provide automatic, intelligent traffic routing that reduces costs and latency. The Auto mode handles most scenarios effectively, but you need balanced pod distribution for the feature to activate. Monitor EndpointSlice events and cross-zone traffic metrics to verify the feature is working as expected and delivering the expected cost savings.
