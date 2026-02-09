# How to Set Up Linkerd Multi-Cluster Gateway for Cross-Cluster Service Communication

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linkerd, Kubernetes, Multi-Cluster, Service Mesh, High Availability

Description: Learn how to configure Linkerd multi-cluster gateways to enable secure cross-cluster service communication with automatic failover, load balancing, and unified observability across clusters.

---

Running services across multiple Kubernetes clusters improves availability and enables geographic distribution. Linkerd's multi-cluster functionality lets services in different clusters communicate as if they're in the same cluster, with automatic service discovery, mTLS encryption, and transparent failover.

## Understanding Linkerd Multi-Cluster Architecture

Linkerd multi-cluster uses gateway components to bridge clusters. Each cluster runs a gateway that exposes local services to remote clusters. Services access remote services using standard Kubernetes DNS names, and Linkerd handles routing through gateways.

The architecture preserves zero-trust security. Traffic between clusters uses mTLS with identity verification. Service discovery works automatically as services are added or removed. Failover happens transparently when remote services become unavailable.

This differs from other multi-cluster approaches like cluster federation. Linkerd keeps clusters independent while providing seamless connectivity.

## Prerequisites

You need two Kubernetes clusters with Linkerd installed on each. We'll call them cluster-east and cluster-west. Install Linkerd on both:

```bash
# On cluster-east
linkerd install --cluster-domain=cluster.local | kubectl apply -f -
linkerd check

# On cluster-west
linkerd install --cluster-domain=cluster.local | kubectl apply -f -
linkerd check
```

Ensure kubectl contexts are configured for both clusters:

```bash
kubectl config get-contexts
```

You should see contexts for both clusters.

## Installing Linkerd Multi-Cluster Components

Install the multi-cluster components on both clusters:

```bash
# On cluster-east
linkerd multicluster install | kubectl apply -f -

# On cluster-west
linkerd multicluster install | kubectl apply -f -
```

This installs the gateway and service mirror components. Verify installation:

```bash
# On cluster-east
linkerd multicluster check

# On cluster-west
linkerd multicluster check
```

## Linking Clusters Together

Link cluster-west to cluster-east. Run this command on cluster-west while connected to cluster-east:

```bash
# Switch to cluster-east context
kubectl config use-context cluster-east

# Generate link credentials
linkerd multicluster link --cluster-name cluster-east > link-east.yaml

# Switch to cluster-west context
kubectl config use-context cluster-west

# Apply the link
kubectl apply -f link-east.yaml
```

This creates a Link resource in cluster-west that contains credentials to access cluster-east's gateway.

Link cluster-east to cluster-west:

```bash
# Switch to cluster-west context
kubectl config use-context cluster-west

# Generate link credentials
linkerd multicluster link --cluster-name cluster-west > link-west.yaml

# Switch to cluster-east context
kubectl config use-context cluster-east

# Apply the link
kubectl apply -f link-west.yaml
```

Verify the links:

```bash
# On cluster-east
kubectl get link -A

# On cluster-west
kubectl get link -A
```

## Exporting Services Across Clusters

Services don't automatically expose across clusters. You must explicitly export them. Deploy a service in cluster-east:

```yaml
# backend-service.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
      annotations:
        linkerd.io/inject: enabled
    spec:
      containers:
      - name: backend
        image: your-registry/backend:latest
        ports:
        - containerPort: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: backend
  namespace: default
  annotations:
    # Export this service to remote clusters
    mirror.linkerd.io/exported: "true"
spec:
  selector:
    app: backend
  ports:
  - port: 8080
```

```bash
kubectl config use-context cluster-east
kubectl apply -f backend-service.yaml
```

The `mirror.linkerd.io/exported: "true"` annotation marks this service for export.

## Accessing Exported Services from Remote Clusters

In cluster-west, the exported service appears automatically with a special DNS name:

```bash
kubectl config use-context cluster-west

# List mirrored services
kubectl get svc -A | grep cluster-east
```

You'll see a service named `backend-cluster-east` in the default namespace. This is a mirror of the backend service from cluster-east.

Deploy a client in cluster-west:

```yaml
# client-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
  namespace: default
spec:
  replicas: 2
  selector:
    matchLabels:
      app: frontend
  template:
    metadata:
      labels:
        app: frontend
      annotations:
        linkerd.io/inject: enabled
    spec:
      containers:
      - name: frontend
        image: your-registry/frontend:latest
        ports:
        - containerPort: 8080
        env:
        # Access remote service using mirrored DNS name
        - name: BACKEND_URL
          value: "http://backend-cluster-east:8080"
```

```bash
kubectl config use-context cluster-west
kubectl apply -f client-deployment.yaml
```

The frontend in cluster-west can now call the backend in cluster-east using the mirrored service name.

## Verifying Cross-Cluster Communication

Test connectivity from cluster-west to cluster-east:

```bash
kubectl config use-context cluster-west

# Get a frontend pod
kubectl exec -it deploy/frontend -- sh

# Make a request to the remote backend
curl http://backend-cluster-east:8080/health
```

The request routes through cluster-west's gateway to cluster-east's gateway, then to the backend pods. Check the traffic:

```bash
linkerd viz stat deploy/frontend --to svc/backend-cluster-east
```

You'll see success rates and latencies for cross-cluster requests.

## Configuring Multi-Cluster Gateway Service Type

By default, gateways use LoadBalancer service type. Change this based on your infrastructure:

```yaml
# gateway-nodeport.yaml
apiVersion: v1
kind: Service
metadata:
  name: linkerd-gateway
  namespace: linkerd-multicluster
spec:
  type: NodePort
  ports:
  - name: mc-gateway
    port: 4143
    protocol: TCP
    nodePort: 30443
  selector:
    component: linkerd-gateway
```

```bash
kubectl apply -f gateway-nodeport.yaml
```

For clusters without LoadBalancer support, use NodePort and specify the node's external IP when linking:

```bash
linkerd multicluster link --cluster-name cluster-east --gateway-address=<node-ip>:30443
```

## Implementing Cross-Cluster Failover

Deploy the same service in both clusters for automatic failover:

```bash
# Deploy backend in cluster-west
kubectl config use-context cluster-west
kubectl apply -f backend-service.yaml

# Export the service
kubectl annotate svc backend mirror.linkerd.io/exported=true -n default
```

Now both clusters have the backend service. In cluster-east, create a TrafficSplit to use local and remote backends:

```yaml
# trafficsplit-failover.yaml
apiVersion: split.smi-spec.io/v1alpha4
kind: TrafficSplit
metadata:
  name: backend-split
  namespace: default
spec:
  service: backend
  backends:
  - service: backend
    weight: 100
  - service: backend-cluster-west
    weight: 0
```

```bash
kubectl config use-context cluster-east
kubectl apply -f trafficsplit-failover.yaml
```

This sends all traffic to the local backend by default. When the local backend fails, Linkerd automatically routes to the remote backend.

## Monitoring Multi-Cluster Traffic

View multi-cluster metrics:

```bash
kubectl config use-context cluster-west

# Check gateway metrics
linkerd viz stat deploy/linkerd-gateway -n linkerd-multicluster

# View traffic to remote services
linkerd viz stat deploy/frontend --to svc/backend-cluster-east
```

In Prometheus, query for multi-cluster traffic:

```promql
# Cross-cluster request rate
sum by (dst_cluster) (
  rate(request_total{dst_cluster!=""}[5m])
)

# Cross-cluster latency
histogram_quantile(0.95,
  sum by (dst_cluster, le) (
    rate(response_latency_ms_bucket{dst_cluster!=""}[5m])
  )
)
```

## Configuring Gateway High Availability

Run multiple gateway replicas for redundancy:

```yaml
# gateway-ha.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: linkerd-gateway
  namespace: linkerd-multicluster
spec:
  replicas: 3
  selector:
    matchLabels:
      component: linkerd-gateway
  template:
    metadata:
      labels:
        component: linkerd-gateway
      annotations:
        linkerd.io/inject: enabled
    spec:
      containers:
      - name: pause
        image: gcr.io/google_containers/pause:3.2
```

```bash
kubectl apply -f gateway-ha.yaml
```

With multiple replicas, the gateway LoadBalancer distributes traffic across instances.

## Securing Gateway Communication

Gateway communication uses mTLS automatically. Verify the security:

```bash
# Check gateway certificates
kubectl exec -n linkerd-multicluster deploy/linkerd-gateway -c linkerd-proxy -- \
  /linkerd-await --shutdown

# View gateway identity
kubectl exec -n linkerd-multicluster deploy/linkerd-gateway -c linkerd-proxy -- \
  linkerd-identity
```

The gateway has a SPIFFE identity and communicates using mTLS with remote clusters.

## Debugging Multi-Cluster Issues

If cross-cluster communication fails, check these areas:

Network connectivity between clusters:

```bash
# From cluster-west, check if you can reach cluster-east gateway
kubectl run test --image=curlimages/curl --rm -it -- sh
curl -v telnet://<cluster-east-gateway-ip>:4143
```

Gateway health:

```bash
kubectl config use-context cluster-east
linkerd multicluster check
```

Service mirror status:

```bash
kubectl config use-context cluster-west
kubectl get endpointslices -n default | grep cluster-east
```

If no endpoints exist, the service mirror isn't working properly.

## Removing Cluster Links

To unlink clusters:

```bash
# On cluster-west, remove the link to cluster-east
kubectl delete link linkerd-cluster-east -n linkerd-multicluster
```

Mirrored services disappear automatically. Local services continue running normally.

## Conclusion

Linkerd multi-cluster enables secure cross-cluster service communication with automatic failover and unified observability. Install the multi-cluster components, link clusters together, and export services to make them available remotely.

Services access remote services using mirrored DNS names. Linkerd handles routing through gateways with mTLS encryption. Deploy services in multiple clusters for automatic failover and improved availability.

Monitor cross-cluster traffic using Linkerd metrics and dashboards. Scale gateways horizontally for high availability. This gives you a unified service mesh spanning multiple Kubernetes clusters with transparent connectivity and security.
