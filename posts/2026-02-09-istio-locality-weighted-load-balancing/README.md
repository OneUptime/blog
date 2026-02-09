# How to Implement Istio Locality-Weighted Load Balancing Across Kubernetes Availability Zones

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Istio, Kubernetes, Load Balancing, High Availability, Multi-AZ

Description: Learn how to configure Istio locality-weighted load balancing to optimize traffic distribution across Kubernetes availability zones, reduce latency, and improve fault tolerance in multi-zone deployments.

---

When running Kubernetes across multiple availability zones, sending traffic to the nearest endpoints reduces latency and cross-zone data transfer costs. Istio's locality-weighted load balancing automatically routes requests to endpoints in the same zone first, falling back to other zones only when necessary. This guide shows you how to set it up.

## Understanding Locality-Aware Routing

Locality-aware routing prioritizes endpoints based on their location relative to the client. In Kubernetes, locality typically means the availability zone where a pod runs. Istio uses topology information from node labels to make routing decisions.

When a service in zone A calls another service, Istio tries to route to pods in zone A first. If no healthy pods exist in zone A, Istio routes to zone B or C based on the weights you configure. This keeps traffic within the same zone when possible, reducing latency and costs.

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
apiVersion: networking.istio.io/v1beta1
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
      consecutiveErrors: 3
      interval: 30s
      baseEjectionTime: 30s
      maxEjectionPercent: 50
      minHealthPercent: 40
    # Enable locality-weighted load balancing
    loadBalancer:
      localityLbSetting:
        enabled: true
        distribute:
        # When zone A has no healthy endpoints, distribute to other zones
        - from: "us-east-1/us-east-1a/*"
          to:
            "us-east-1/us-east-1b/*": 50
            "us-east-1/us-east-1c/*": 50
        - from: "us-east-1/us-east-1b/*"
          to:
            "us-east-1/us-east-1a/*": 50
            "us-east-1/us-east-1c/*": 50
        - from: "us-east-1/us-east-1c/*"
          to:
            "us-east-1/us-east-1a/*": 50
            "us-east-1/us-east-1b/*": 50
```

```bash
kubectl apply -f destinationrule-locality.yaml
```

The locality format is `region/zone/subzone`. The distribute section defines failover behavior. When endpoints in the source zone are unhealthy, traffic distributes to other zones according to the specified weights.

## Understanding Locality Failover Behavior

Istio uses a three-tier failover approach:

1. **Same zone**: All traffic goes to endpoints in the same zone when they're healthy
2. **Distributed failover**: When the local zone has no healthy endpoints, traffic distributes according to your weights
3. **Global fallback**: If specified zones are unavailable, Istio falls back to any available endpoint

The outlierDetection settings determine when Istio considers an endpoint unhealthy. Consecutive errors trigger ejection from the load balancing pool for the baseEjectionTime duration.

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

Test failover by scaling down pods in zone A to zero. Cordon nodes in zone A first:

```bash
# Find nodes in zone A
kubectl get nodes -l topology.kubernetes.io/zone=us-east-1a

# Cordon those nodes
kubectl cordon <node-name-1>
kubectl cordon <node-name-2>

# Scale down replicas to force rescheduling
kubectl scale deployment product-service --replicas=6
```

Pods will reschedule to zones B and C. Make requests again from your zone A client:

```bash
kubectl exec -it client-zone-a -- sh

for i in $(seq 1 100); do
  curl -s http://product-service:8080/health | grep hostname
done | sort | uniq -c
```

Traffic now distributes across zones B and C according to your failover weights (50/50 in this example).

## Advanced Locality Configuration with Failover Priority

For more control, define explicit failover priorities. This tells Istio to prefer certain zones over others during failover.

```yaml
# destinationrule-locality-priority.yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: product-service-priority
  namespace: default
spec:
  host: product-service
  trafficPolicy:
    outlierDetection:
      consecutiveErrors: 3
      interval: 30s
      baseEjectionTime: 30s
    loadBalancer:
      localityLbSetting:
        enabled: true
        failover:
        # Define failover priority for zone A
        - from: us-east-1a
          to: us-east-1b
        # Define failover priority for zone B
        - from: us-east-1b
          to: us-east-1c
        # Define failover priority for zone C
        - from: us-east-1c
          to: us-east-1a
```

With failover priorities, zone A traffic goes to zone B first, only using zone C if zone B is also unavailable. This creates a circular failover chain.

## Configuring Locality Weights at the Mesh Level

You can set default locality behavior for the entire mesh in the Istio configuration. This applies to all services unless overridden by individual DestinationRules.

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
      failover:
      - from: us-east-1a
        to: us-east-1b
      - from: us-east-1b
        to: us-east-1c
      - from: us-east-1c
        to: us-east-1a
```

Apply this during Istio installation or update:

```bash
istioctl install -f istio-config-locality.yaml
```

## Monitoring Locality-Based Routing

Use Prometheus metrics to verify locality routing works correctly. Query for requests grouped by source and destination zones:

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
apiVersion: networking.istio.io/v1beta1
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
