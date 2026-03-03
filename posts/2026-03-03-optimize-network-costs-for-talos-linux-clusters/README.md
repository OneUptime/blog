# How to Optimize Network Costs for Talos Linux Clusters

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Network Costs, Kubernetes, Networking, Cost Optimization, Cloud Infrastructure

Description: Strategies for identifying and reducing network-related costs in Talos Linux Kubernetes clusters running on cloud infrastructure.

---

Network costs in Kubernetes are notoriously hard to track and often catch teams off guard. While compute and storage costs are visible in your cloud bill, networking charges tend to be buried in line items like "data transfer" and "NAT gateway processing." In multi-availability-zone deployments, cross-zone traffic alone can add hundreds or even thousands of dollars to your monthly bill. On Talos Linux clusters, the networking stack is standard Kubernetes CNI-based, so the same optimization strategies apply, but with some Talos-specific configuration options.

This guide breaks down where network costs come from and how to reduce them.

## Where Network Costs Come From

In a typical cloud-hosted Talos Linux cluster, network costs fall into these categories:

- **Cross-zone traffic**: Communication between pods in different availability zones
- **Egress traffic**: Data leaving the cluster to the internet
- **Load balancer charges**: Per-hour fees plus per-GB data processing
- **NAT gateway costs**: Outbound internet access from private subnets
- **DNS queries**: Route 53 or equivalent DNS charges

Cross-zone traffic is usually the biggest surprise. On AWS, cross-zone traffic costs $0.01/GB in each direction, which sounds small until you multiply it by the volume of inter-service communication in a microservices architecture.

## Measuring Network Costs

Before optimizing, measure what you are actually spending. Deploy a network monitoring solution:

```bash
# Install Kubecost with network cost monitoring
helm install kubecost kubecost/cost-analyzer \
  --namespace kubecost \
  --create-namespace \
  --set networkCosts.enabled=true
```

Or use Prometheus with node-exporter to track network bytes:

```yaml
# network-cost-recording-rules.yaml
# Track network traffic volumes for cost analysis
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: network-cost-rules
  namespace: monitoring
spec:
  groups:
    - name: network.costs
      interval: 5m
      rules:
        # Total bytes transmitted per node per hour
        - record: node:network_transmit_bytes:rate1h
          expr: >
            sum by (instance) (
              rate(node_network_transmit_bytes_total{
                device!~"lo|cni.*|flannel.*|veth.*"
              }[1h])
            ) * 3600

        # Total bytes received per node per hour
        - record: node:network_receive_bytes:rate1h
          expr: >
            sum by (instance) (
              rate(node_network_receive_bytes_total{
                device!~"lo|cni.*|flannel.*|veth.*"
              }[1h])
            ) * 3600

        # Cross-zone traffic estimate (GB per day)
        - record: cluster:cross_zone_traffic_gb:rate1d
          expr: >
            sum(
              rate(container_network_transmit_bytes_total[1d])
            ) * 86400 / 1024 / 1024 / 1024
```

## Strategy 1: Topology-Aware Routing

Kubernetes supports topology-aware routing that prefers sending traffic to endpoints in the same zone:

```yaml
# Enable topology-aware routing on services
apiVersion: v1
kind: Service
metadata:
  name: backend-service
  namespace: production
  annotations:
    # Prefer same-zone endpoints when available
    service.kubernetes.io/topology-mode: Auto
spec:
  selector:
    app: backend
  ports:
    - port: 8080
      targetPort: 8080
```

This works best when you have enough replicas in each zone. If a zone has no healthy endpoints, traffic automatically falls back to other zones.

For Talos Linux, make sure your nodes are labeled with zone information:

```yaml
# Talos machine config with zone labels
machine:
  nodeLabels:
    topology.kubernetes.io/zone: "us-east-1a"
    topology.kubernetes.io/region: "us-east-1"
```

## Strategy 2: Co-locate Communicating Services

Services that talk to each other frequently should run in the same zone:

```yaml
# co-locate-services.yaml
# Schedule the API server and its database in the same zone
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
  namespace: production
spec:
  template:
    spec:
      affinity:
        # Prefer nodes in the same zone as the database
        podAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              podAffinityTerm:
                labelSelector:
                  matchExpressions:
                    - key: app
                      operator: In
                      values: ["postgres-primary"]
                topologyKey: topology.kubernetes.io/zone
```

For services that must be in the same zone:

```yaml
# Require same-zone scheduling with the cache
affinity:
  podAffinity:
    requiredDuringSchedulingIgnoredDuringExecution:
      - labelSelector:
          matchExpressions:
            - key: app
              operator: In
              values: ["redis-cache"]
        topologyKey: topology.kubernetes.io/zone
```

## Strategy 3: Reduce Load Balancer Costs

Each Kubernetes Service of type LoadBalancer creates a cloud load balancer with hourly charges:

```bash
# Count how many load balancers you are running
kubectl get svc -A --field-selector spec.type=LoadBalancer --no-headers | wc -l
```

Consolidate multiple services behind a single ingress controller:

```yaml
# Use an Ingress to route multiple services through one load balancer
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: consolidated-ingress
  namespace: production
spec:
  ingressClassName: nginx
  rules:
    - host: api.example.com
      http:
        paths:
          - path: /users
            pathType: Prefix
            backend:
              service:
                name: users-service
                port:
                  number: 80
          - path: /orders
            pathType: Prefix
            backend:
              service:
                name: orders-service
                port:
                  number: 80
          - path: /products
            pathType: Prefix
            backend:
              service:
                name: products-service
                port:
                  number: 80
```

This turns three load balancers (roughly $50/month each) into one.

## Strategy 4: Optimize NAT Gateway Usage

NAT gateways charge per GB of data processed. Reduce usage by:

```yaml
# Use VPC endpoints for AWS services instead of going through NAT
# This saves both NAT gateway costs and data transfer costs

# Example: Create a VPC endpoint for S3
# (Done via Terraform/CloudFormation, not Kubernetes)
# This allows pods to reach S3 without NAT gateway

# For ECR image pulls, use VPC endpoints to avoid NAT costs:
# - com.amazonaws.region.ecr.api
# - com.amazonaws.region.ecr.dkr
# - com.amazonaws.region.s3 (for ECR image layers)
```

Cache container images locally to reduce repeated pulls through NAT:

```yaml
# Deploy a pull-through cache registry inside the cluster
apiVersion: apps/v1
kind: Deployment
metadata:
  name: registry-cache
  namespace: kube-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app: registry-cache
  template:
    metadata:
      labels:
        app: registry-cache
    spec:
      containers:
        - name: registry
          image: registry:2
          env:
            - name: REGISTRY_PROXY_REMOTEURL
              value: "https://registry-1.docker.io"
          ports:
            - containerPort: 5000
          volumeMounts:
            - name: cache-data
              mountPath: /var/lib/registry
      volumes:
        - name: cache-data
          persistentVolumeClaim:
            claimName: registry-cache-data
```

## Strategy 5: Compress Inter-Service Traffic

For services that exchange large payloads, enable compression:

```yaml
# Enable gzip compression on the ingress controller
apiVersion: v1
kind: ConfigMap
metadata:
  name: nginx-ingress-controller
  namespace: ingress-nginx
data:
  use-gzip: "true"
  gzip-level: "5"
  gzip-min-length: "1000"
  gzip-types: "application/json application/xml text/plain text/css"
```

For gRPC services, compression is built in:

```go
// Enable gzip compression for gRPC clients
import "google.golang.org/grpc/encoding/gzip"

conn, err := grpc.Dial(address,
    grpc.WithDefaultCallOptions(
        grpc.UseCompressor(gzip.Name),
    ),
)
```

## Strategy 6: Monitor and Alert on Network Spending

Set up alerts for unusual network traffic patterns:

```yaml
# network-cost-alerts.yaml
# Alert on unexpected network traffic spikes
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: network-cost-alerts
  namespace: monitoring
spec:
  groups:
    - name: network.costs
      rules:
        - alert: HighEgressTraffic
          expr: >
            sum(rate(node_network_transmit_bytes_total{
              device!~"lo|cni.*"
            }[1h])) * 3600 / 1024 / 1024 / 1024 > 100
          for: 30m
          labels:
            severity: warning
          annotations:
            summary: "Cluster egress exceeds 100 GB/hour"

        - alert: UnexpectedCrossZoneTraffic
          expr: >
            cluster:cross_zone_traffic_gb:rate1d > 500
          for: 1h
          labels:
            severity: warning
          annotations:
            summary: "Cross-zone traffic exceeds 500 GB/day"
```

## Summary

Network costs on Talos Linux clusters are driven primarily by cross-zone traffic, load balancers, NAT gateways, and internet egress. The most impactful optimizations are enabling topology-aware routing to keep traffic in-zone, consolidating load balancers behind a single ingress controller, and using VPC endpoints to bypass NAT gateways for cloud service access. These changes are relatively easy to implement and can reduce network costs by 30-50% in a typical multi-zone deployment. Monitor your network traffic continuously and set up alerts for unusual patterns, because network cost surprises almost always come from traffic patterns you did not expect.
