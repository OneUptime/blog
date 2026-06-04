# Use Istio Locality-Weighted Load Balancing Across Kubernetes Availability Zones

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Istio, Kubernetes, Load Balancing, High Availability, Multi-AZ

Description: Learn how to configure Istio locality-weighted load balancing to optimize traffic distribution across Kubernetes availability zones, reduce latency.

---

When running Kubernetes across multiple availability zones, sending traffic to the nearest endpoints reduces latency and cross-zone data transfer costs. Istio's locality-aware load balancing can prefer endpoints in the same zone, and locality-weighted distribution lets you tune how much traffic goes to each zone. This guide shows you how to set it up.

## Understanding Locality-Aware Routing

Locality-aware routing prioritizes endpoints based on their location relative to the client. In Kubernetes, locality typically means the availability zone where a pod runs. Istio uses topology information from node labels to make routing decisions.

When a service in zone A calls another service, Istio tries to route to pods in zone A first. If no healthy pods exist in zone A, Istio routes to other healthy zones. You can also configure explicit distribution weights when you want some steady-state traffic to use other zones. This keeps most traffic within the same zone when possible, reducing latency and costs.

## Prerequisites

You need a Kubernetes cluster spanning multiple availability zones with Istio installed. Your nodes must have the standard topology labels that cloud providers set automatically. Verify your node labels:

```bash
kubectl get nodes -o json | jq '.items[].metadata.labels | {name: .["kubernetes.io/hostname"], region: .["topology.kubernetes.io/region"], zone: .["topology.kubernetes.io/zone"]}'
```

You should see output showing different zones like us-east-1a, us-east-1b, us-east-1c.

## Deploying Multi-Zone Application

Deploy your application across multiple zones. Use pod topology spread constraints to ensure even distribution.

```yaml
# deployment-multi-zone.yaml

apiVersion: apps/v1
kind: Deployment
metadata:
  name: product-service
  namespace: default
spec:
  replicas: 9
  selector:
    matchLabels:
      app: product-service
  template:
    metadata:
      labels:
        app: product-service
    spec:
      topologySpreadConstraints:
      - maxSkew: 1
        topologyKey: topology.kubernetes.io/zone
        whenUnsatisfiable: DoNotSchedule
        labelSelector:
          matchLabels:
            app: product-service
      containers:
      - name: product-service
        image: your-registry/product-service:latest
        ports:
        - containerPort: 8080
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "200m"
```

This ensures pods spread evenly across zones. With 9 replicas and 3 zones, you get 3 pods per zone.

```bash
kubectl apply -f deployment-multi-zone.yaml
```

Create the service:

```yaml
# service.yaml
apiVersion: v1
kind: Service
metadata:
  name: product-service
  namespace: default
spec:
  selector:
    app: product-service
  ports:
  - port: 8080
    targetPort: 8080
```

```bash
kubectl apply -f service.yaml
```

## Configuring Locality Load Balancing in DestinationRule

The DestinationRule configures how Istio routes traffic to service endpoints. Enable locality load balancing with the outlierDetection and loadBalancer settings.

```yaml
# destinationrule-locality.yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: product-service
  namespace: default
spec:
  host: product-service
  trafficPolicy:
    # Enable connection pool limits
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        http1MaxPendingRequests: 50
        http2MaxRequests: 100
    # Configure outlier detection for failover
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 30s
      baseEjectionTime: 30s
      maxEjectionPercent: 50
      minHealthPercent: 40
    # Enable locality-weighted load balancing
    loadBalancer:
      localityLbSetting:
        enabled: true
        distribute:
        # Prefer same-zone endpoints while allowing some cross-zone traffic
        - from: "us-east-1/us-east-1a/*"
          to:
            "us-east-1/us-east-1a/*": 80
            "us-east-1/us-east-1b/*": 10
            "us-east-1/us-east-1c/*": 10
        - from: "us-east-1/us-east-1b/*"
          to:
            "us-east-1/us-east-1a/*": 10
            "us-east-1/us-east-1b/*": 80
            "us-east-1/us-east-1c/*": 10
        - from: "us-east-1/us-east-1c/*"
          to:
            "us-east-1/us-east-1a/*": 10
            "us-east-1/us-east-1b/*": 10
            "us-east-1/us-east-1c/*": 80
```

```bash
kubectl apply -f destinationrule-locality.yaml
```

The locality format is `region/zone/subzone`. The distribute section defines steady-state locality weights. Any locality not listed in the `to` map receives no traffic for that rule.

## Understanding Locality Failover Behavior

Without an explicit `distribute` policy, Istio uses locality-aware failover priorities:

1. **Same zone**: Traffic goes to endpoints in the same zone when they're healthy
2. **Same region**: When the local zone has no healthy endpoints, traffic fails over to other zones in the same region
3. **Global fallback**: If local-region endpoints are unavailable and no regional failover policy restricts traffic, Istio falls back to any available endpoint

The outlierDetection settings determine when Istio considers an endpoint unhealthy. Consecutive 5xx responses trigger ejection from the load balancing pool for the baseEjectionTime duration.

## Testing Locality-Aware Routing

Deploy a client application in a specific zone to test routing behavior. Use pod affinity to pin the client to zone A:

```yaml
# client-zone-a.yaml
apiVersion: v1
kind: Pod
metadata:
  name: client-zone-a
  namespace: default
spec:
  affinity:
    nodeAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
        nodeSelectorTerms:
        - matchExpressions:
          - key: topology.kubernetes.io/zone
            operator: In
            values:
            - us-east-1a
  containers:
  - name: curl
    image: curlimages/curl:latest
    command: ["/bin/sh"]
    args: ["-c", "while true; do sleep 3600; done"]
```

```bash
kubectl apply -f client-zone-a.yaml
```

Make requests from the client and check which pods respond:

```bash
kubectl exec -it client-zone-a -- sh

# Make multiple requests and check the pod hostname
for i in $(seq 1 100); do
  curl -s http://product-service:8080/health | grep hostname
done | sort | uniq -c
```

You should see most requests going to pods in zone A. Verify the zone of responding pods:

```bash
kubectl get pods -o wide -l app=product-service
```

## Simulating Zone Failure

Test failover by removing the destination pods from zone A. Cordon nodes in zone A first so replacement pods schedule in other zones:

```bash
# Find nodes in zone A
kubectl get nodes -l topology.kubernetes.io/zone=us-east-1a

# Cordon those nodes
kubectl cordon <node-name-1>
kubectl cordon <node-name-2>

# Delete product-service pods from the cordoned nodes
kubectl delete pod -l app=product-service --field-selector spec.nodeName=<node-name-1>
kubectl delete pod -l app=product-service --field-selector spec.nodeName=<node-name-2>
```

Replacement pods will schedule to zones B and C. Make requests again from your zone A client:

```bash
kubectl exec -it client-zone-a -- sh

for i in $(seq 1 100); do
  curl -s http://product-service:8080/health | grep hostname
done | sort | uniq -c
```

Traffic now fails over to healthy endpoints in zones B and C.

## Advanced Locality Configuration with Failover Priority

For more control, define explicit failover priorities. This tells Istio to sort endpoint groups by the ordered labels you specify.

```yaml
# destinationrule-locality-priority.yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: product-service-priority
  namespace: default
spec:
  host: product-service
  trafficPolicy:
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 30s
      baseEjectionTime: 30s
    loadBalancer:
      localityLbSetting:
        enabled: true
        failoverPriority:
        - "topology.kubernetes.io/region"
        - "topology.kubernetes.io/zone"
```

With failover priorities, endpoints matching both the client's region and zone have the highest priority. Endpoints matching only the region have the next priority, and all other endpoints have the lowest priority.

## Configuring Locality Weights at the Mesh Level

You can set default locality behavior for the entire mesh in the Istio configuration. This applies to all services unless overridden by individual DestinationRules. Services still need outlier detection for health-based failover.

```yaml
# istio-config-locality.yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  name: istio-config
  namespace: istio-system
spec:
  meshConfig:
    localityLbSetting:
      enabled: true
      failoverPriority:
      - "topology.kubernetes.io/region"
      - "topology.kubernetes.io/zone"
```

Apply this during Istio installation or update:

```bash
istioctl install -f istio-config-locality.yaml
```

## Monitoring Locality-Based Routing

Istio's standard Prometheus metrics include workload and service labels, but they do not include source and destination zone labels by default. If you add custom zone dimensions with the Telemetry API, query for requests grouped by source and destination zones:

```promql
# Requests from zone A to each destination zone
sum by (destination_workload_namespace, destination_workload,
        source_zone, destination_zone) (
  rate(istio_requests_total{
    source_zone="us-east-1a",
    destination_service="product-service.default.svc.cluster.local"
  }[5m])
)
```

Check cross-zone traffic percentage:

```promql
# Percentage of cross-zone traffic
100 * (
  sum(rate(istio_requests_total{
    source_zone!="",
    destination_zone!="",
    source_zone!=destination_zone
  }[5m]))
  /
  sum(rate(istio_requests_total{
    source_zone!="",
    destination_zone!=""
  }[5m]))
)
```

Lower cross-zone traffic percentages indicate better locality routing.

## Combining Locality with Other Load Balancing Strategies

Locality load balancing works with other load balancing algorithms. You can specify the algorithm to use within a zone:

```yaml
# destinationrule-locality-lb-algo.yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: product-service-algo
  namespace: default
spec:
  host: product-service
  trafficPolicy:
    loadBalancer:
      simple: LEAST_REQUEST  # or ROUND_ROBIN, RANDOM, PASSTHROUGH
      localityLbSetting:
        enabled: true
```

The simple field sets the algorithm for distributing requests among endpoints within the selected locality.

## Conclusion

Istio's locality-weighted load balancing optimizes multi-zone Kubernetes deployments by keeping traffic within zones when possible and providing intelligent failover when zones fail. This reduces latency, cuts data transfer costs, and improves resilience.

Configure outlier detection to quickly remove unhealthy endpoints from the pool. Use distribute or failover settings to control cross-zone traffic patterns during failures. Monitor your locality routing with Prometheus to ensure traffic flows as expected.

Start with basic locality awareness using the default behavior, then add custom weights and failover priorities as your requirements grow. This gives you fine-grained control over how traffic moves across your multi-zone infrastructure.
