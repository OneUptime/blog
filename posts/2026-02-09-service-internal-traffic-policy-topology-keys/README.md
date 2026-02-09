# How to Use Kubernetes Service Internal Traffic Policy with Topology Keys

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Service, Topology, Traffic Policy, Networking

Description: Configure Kubernetes service internal traffic policy and topology-aware routing to optimize traffic flow based on node location, reducing latency and cross-zone network costs.

---

Kubernetes services distribute traffic randomly across all healthy endpoints by default. This works fine in small clusters but becomes inefficient in large, multi-zone deployments where cross-zone traffic incurs latency and costs. Internal traffic policy and topology-aware routing solve this by preferring endpoints closer to the client.

## Understanding Internal Traffic Policy

InternalTrafficPolicy controls how traffic from pods within the cluster routes to service endpoints. The two modes are:

- `Cluster` (default): Traffic distributes across all endpoints regardless of location
- `Local`: Traffic only goes to endpoints on the same node as the client pod

This differs from ExternalTrafficPolicy which controls traffic from outside the cluster.

## Configuring Internal Traffic Policy

Enable local routing for a service:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: api-server
  namespace: production
spec:
  internalTrafficPolicy: Local  # Route to node-local endpoints only
  selector:
    app: api-server
  ports:
  - port: 8080
    targetPort: 8080
```

Apply this configuration:

```bash
kubectl apply -f api-server-service.yaml
```

Now pods calling api-server only hit api-server pods on their same node.

## When to Use Local Traffic Policy

Local traffic policy makes sense when:

- You have high pod density (multiple replicas per node)
- Cross-node traffic creates latency issues
- You want to minimize network utilization
- Pods are scheduled with pod anti-affinity to spread across nodes
- You're running latency-sensitive applications

It doesn't work well when:

- Pod density is low (one pod per node or less)
- Pods are unevenly distributed across nodes
- You need true load balancing across all replicas

## Testing Local Traffic Policy

Deploy a test application:

```yaml
# test-local-policy.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
spec:
  replicas: 6
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
    spec:
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchExpressions:
                - key: app
                  operator: In
                  values:
                  - backend
              topologyKey: kubernetes.io/hostname
      containers:
      - name: backend
        image: hashicorp/http-echo
        args:
        - "-text=Pod: $(POD_NAME) Node: $(NODE_NAME)"
        env:
        - name: POD_NAME
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        - name: NODE_NAME
          valueFrom:
            fieldRef:
              fieldPath: spec.nodeName
        ports:
        - containerPort: 5678
---
apiVersion: v1
kind: Service
metadata:
  name: backend
spec:
  internalTrafficPolicy: Local
  selector:
    app: backend
  ports:
  - port: 80
    targetPort: 5678
```

Deploy and test:

```bash
kubectl apply -f test-local-policy.yaml

# Create a client pod
kubectl run client --image=curlimages/curl -it --rm -- sh

# Inside the pod, make multiple requests
for i in {1..20}; do
  curl http://backend
done
```

You should only see responses from backend pods on the same node as the client pod.

## Topology-Aware Routing with Topology Keys

Topology keys provide more granular control than just node-local routing. They let you prefer endpoints based on topology labels like zone, region, or custom labels.

As of Kubernetes 1.27, topology keys are deprecated in favor of the newer TopologyAwareHints feature, but understanding them is still valuable.

### Service Topology (Deprecated)

The old service topology feature used `topologyKeys`:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: api-server
spec:
  selector:
    app: api-server
  ports:
  - port: 8080
  topologyKeys:
  - "kubernetes.io/hostname"        # Prefer same node
  - "topology.kubernetes.io/zone"   # Then same zone
  - "*"                              # Finally, any endpoint
```

This configuration creates a preference order: same node first, then same zone, then any node.

## Topology Aware Hints (Current Approach)

The modern approach uses topology-aware hints, enabled by the `service.kubernetes.io/topology-aware-hints` annotation:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: api-server
  annotations:
    service.kubernetes.io/topology-aware-hints: auto
spec:
  selector:
    app: api-server
  ports:
  - port: 8080
    targetPort: 8080
```

With this annotation, kube-proxy and the endpoint controller work together to route traffic to endpoints in the same zone when possible.

Check if hints are being allocated:

```bash
kubectl get endpointslices -l kubernetes.io/service-name=api-server -o yaml
```

Look for the `hints` field in the endpoints:

```yaml
endpoints:
- addresses:
  - "10.244.1.5"
  hints:
    forZones:
    - name: us-east-1a
  nodeName: node-1
  zone: us-east-1a
```

This indicates the endpoint should primarily serve traffic from zone us-east-1a.

## Requirements for Topology Aware Hints

For hints to work properly:

1. Endpoints must be evenly distributed across zones
2. Cluster must have sufficient endpoints (3+ per zone recommended)
3. Nodes must have zone labels (`topology.kubernetes.io/zone`)
4. The service cannot use `externalTrafficPolicy: Local`

If these conditions aren't met, hints won't be allocated and traffic routes randomly.

## Verifying Node Topology Labels

Check that nodes have proper zone labels:

```bash
kubectl get nodes --show-labels | grep topology
```

You should see labels like:

```
topology.kubernetes.io/zone=us-east-1a
topology.kubernetes.io/region=us-east-1
```

If missing, add them:

```bash
kubectl label node node-1 topology.kubernetes.io/zone=us-east-1a
kubectl label node node-1 topology.kubernetes.io/region=us-east-1
```

## Combining Internal Traffic Policy and Topology Hints

You can't use both simultaneously. Choose based on your needs:

- `internalTrafficPolicy: Local`: Strict node-local routing, no cross-node traffic
- Topology hints: Best-effort zone-local routing with cross-zone fallback

For multi-zone clusters where cross-zone traffic is expensive:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: cache-service
  annotations:
    service.kubernetes.io/topology-aware-hints: auto
spec:
  selector:
    app: cache
  ports:
  - port: 6379
    targetPort: 6379
```

For high-density single-zone clusters:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: cache-service
spec:
  internalTrafficPolicy: Local
  selector:
    app: cache
  ports:
  - port: 6379
    targetPort: 6379
```

## Monitoring Topology-Aware Routing

Track how traffic flows with these techniques:

### Add Request Tracing

Instrument your application to log which pod handled each request:

```python
# Python example
from flask import Flask, request
import os

app = Flask(__name__)
pod_name = os.environ.get('POD_NAME', 'unknown')
node_name = os.environ.get('NODE_NAME', 'unknown')
zone = os.environ.get('ZONE', 'unknown')

@app.route('/')
def handle_request():
    client_ip = request.remote_addr
    app.logger.info(f"Request from {client_ip} handled by pod {pod_name} on node {node_name} in zone {zone}")
    return f"Handled by {pod_name} in {zone}"
```

### Analyze Traffic Patterns

Query logs to see cross-zone traffic:

```bash
kubectl logs -l app=api-server | \
  grep "handled by" | \
  awk '{print $NF}' | \
  sort | uniq -c
```

This shows which zones handled requests, revealing if topology routing is working.

### Use Service Mesh Observability

If using Istio or Linkerd, visualize traffic patterns in Grafana:

```bash
# Port forward to Grafana
kubectl port-forward -n istio-system svc/grafana 3000:3000
```

Look for panels showing traffic by source/destination zone.

## Failure Modes and Troubleshooting

### No Hints Allocated

If `kubectl get endpointslices` shows no hints:

1. Check endpoint distribution across zones:

```bash
kubectl get pods -l app=api-server -o wide | awk '{print $7}' | sort | uniq -c
```

Uneven distribution prevents hint allocation.

2. Verify sufficient endpoints exist:

```bash
kubectl get endpoints api-server -o yaml
```

Need at least 2-3 endpoints per zone.

3. Check for conflicting configurations:

```bash
kubectl get svc api-server -o yaml | grep -E 'TrafficPolicy|topology'
```

Can't combine certain features.

### Traffic Still Goes Cross-Zone

If topology hints are allocated but traffic still crosses zones:

1. Verify kube-proxy supports topology hints (1.21+):

```bash
kubectl get pod -n kube-system kube-proxy-xxxxx -o yaml | grep image
```

2. Check kube-proxy logs for hint processing:

```bash
kubectl logs -n kube-system kube-proxy-xxxxx | grep -i topology
```

3. Ensure client pods run in labeled zones:

```bash
kubectl get pod client -o jsonpath='{.spec.nodeName}' | \
  xargs kubectl get node -o jsonpath='{.metadata.labels.topology\.kubernetes\.io/zone}'
```

## Cost Optimization

In cloud environments, cross-zone traffic incurs charges. Optimize costs:

```yaml
# High-traffic service - use topology hints
apiVersion: v1
kind: Service
metadata:
  name: high-traffic-api
  annotations:
    service.kubernetes.io/topology-aware-hints: auto
spec:
  selector:
    app: api
  ports:
  - port: 443
```

Monitor savings:

```bash
# Query cloud provider cost APIs
# AWS example (requires cost explorer API)
aws ce get-cost-and-usage \
  --time-period Start=2024-01-01,End=2024-02-01 \
  --granularity MONTHLY \
  --metrics UnblendedCost \
  --filter file://data-transfer-filter.json
```

Cross-zone data transfer costs should decrease after implementing topology-aware routing.

## Best Practices

When using internal traffic policy and topology routing:

- Use topology hints for multi-zone clusters with even pod distribution
- Use local traffic policy for high-density single-node routing
- Ensure pods spread evenly across zones with pod topology spread constraints
- Label nodes with accurate topology information
- Monitor endpoint distribution across zones
- Test failover behavior when zones have no healthy endpoints
- Document expected traffic patterns for oncall engineers
- Use anti-affinity rules to ensure even pod distribution
- Combine with HPA to maintain sufficient replicas per zone
- Regularly review cloud provider network charges

Internal traffic policy and topology-aware routing are powerful tools for optimizing Kubernetes networking. They reduce latency, lower costs, and improve reliability by keeping traffic close to where it originates.
