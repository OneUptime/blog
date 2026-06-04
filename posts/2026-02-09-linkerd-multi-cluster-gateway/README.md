# Set Up Linkerd Multi-Cluster Gateway for Cross-Cluster Service Communication

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linkerd, Kubernetes, Multi-Cluster, Service Mesh, High Availability

Description: Learn how to configure Linkerd multi-cluster gateways to enable secure cross-cluster service communication with automatic failover, load balancing, and unified observability across clusters.

---

Running services across multiple Kubernetes clusters improves availability and enables geographic distribution. Linkerd's multi-cluster functionality lets services in different clusters communicate as if they're in the same cluster, with service discovery, mTLS encryption, and support for failover patterns.

## Understanding Linkerd Multi-Cluster Architecture

Linkerd multi-cluster uses gateway components to bridge clusters. Each cluster runs a gateway that exposes local services to remote clusters. Services access remote services using standard Kubernetes DNS names, and Linkerd handles routing through gateways.

The architecture preserves zero-trust security. Traffic between clusters uses mTLS with identity verification when the clusters share a trust anchor. Service discovery works automatically as exported services are added or removed. Failover can be configured with traffic splitting or the failover controller.

This differs from other multi-cluster approaches like cluster federation. Linkerd keeps clusters independent while providing seamless connectivity.

## Prerequisites

You need two Kubernetes clusters with Linkerd installed on each using a shared trust anchor. We'll call them cluster-east and cluster-west. Install the CRDs and control plane on both clusters with the same trust anchor:

```bash
# On cluster-east
linkerd install --crds | kubectl apply -f -
linkerd install \
  --identity-trust-anchors-file root.crt \
  --identity-issuer-certificate-file issuer.crt \
  --identity-issuer-key-file issuer.key \
  --cluster-domain=cluster.local | kubectl apply -f -
linkerd check

# On cluster-west
linkerd install --crds | kubectl apply -f -
linkerd install \
  --identity-trust-anchors-file root.crt \
  --identity-issuer-certificate-file issuer.crt \
  --identity-issuer-key-file issuer.key \
  --cluster-domain=cluster.local | kubectl apply -f -
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

This installs the gateway, multicluster CRDs, and credentials that other clusters use for service mirroring. Verify installation:

```bash
# On cluster-east
linkerd multicluster check

# On cluster-west
linkerd multicluster check
```

## Linking Clusters Together

Link cluster-west to cluster-east by generating credentials from cluster-east and applying them on cluster-west:

```bash
# Switch to cluster-east context
kubectl config use-context cluster-east

# Generate link credentials
linkerd multicluster link-gen --cluster-name cluster-east > link-east.yaml

# Switch to cluster-west context
kubectl config use-context cluster-west

# Configure the service mirror controller
linkerd multicluster install \
  --set controllers[0].link.ref.name=cluster-east | kubectl apply -f -

# Apply the link
kubectl apply -f link-east.yaml
```

This creates a Link resource in cluster-west that contains credentials to access cluster-east's gateway.

Link cluster-east to cluster-west by generating credentials from cluster-west and applying them on cluster-east:

```bash
# Switch to cluster-west context
kubectl config use-context cluster-west

# Generate link credentials
linkerd multicluster link-gen --cluster-name cluster-west > link-west.yaml

# Switch to cluster-east context
kubectl config use-context cluster-east

# Configure the service mirror controller
linkerd multicluster install \
  --set controllers[0].link.ref.name=cluster-west | kubectl apply -f -

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
  labels:
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

The `mirror.linkerd.io/exported: "true"` label marks this service for export.

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

The request routes through cluster-east's gateway, then to the backend pods. Check the traffic:

```bash
linkerd viz stat deploy/frontend --to svc/backend-cluster-east
```

You'll see success rates and latencies for cross-cluster requests.

## Configuring Multi-Cluster Gateway Service Type

By default, gateways use LoadBalancer service type. Change this based on your infrastructure when installing the multicluster components:

```bash
linkerd multicluster install --gateway-service-type=NodePort | kubectl apply -f -
```

For clusters without LoadBalancer support, use NodePort and specify the node's external IP when linking:

```bash
linkerd multicluster link-gen \
  --cluster-name cluster-east \
  --gateway-addresses=<node-ip> \
  --gateway-port=30443
```

## Implementing Cross-Cluster Failover

Deploy the same service in both clusters for automatic failover:

```bash
# Deploy backend in cluster-west
kubectl config use-context cluster-west
kubectl apply -f backend-service.yaml

# Export the service
kubectl label svc backend mirror.linkerd.io/exported=true -n default
```

Now both clusters have the backend service. Install the Linkerd SMI and failover extensions in cluster-east, then create a TrafficSplit to use local and remote backends:

```yaml
# trafficsplit-failover.yaml
apiVersion: split.smi-spec.io/v1alpha2
kind: TrafficSplit
metadata:
  name: backend-split
  namespace: default
  labels:
    failover.linkerd.io/controlled-by: linkerd-failover
  annotations:
    failover.linkerd.io/primary-service: backend
spec:
  service: backend
  backends:
  - service: backend
    weight: 1
  - service: backend-cluster-west
    weight: 0
```

```bash
kubectl config use-context cluster-east
kubectl apply -f trafficsplit-failover.yaml
```

This sends all traffic to the local backend by default. When the local backend fails, the failover controller updates the TrafficSplit to route to the remote backend. The failover extension is deprecated in current Linkerd releases, so federated services are the preferred long-term approach when your clusters support pod-to-pod connectivity.

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
sum by (dst_service) (
  rate(request_total{dst_service=~".*-cluster-.+"}[5m])
)

# Cross-cluster latency
histogram_quantile(0.95,
  sum by (dst_service, le) (
    rate(response_latency_ms_bucket{dst_service=~".*-cluster-.+"}[5m])
  )
)
```

## Configuring Gateway High Availability

Run the multicluster extension in high availability mode for redundancy:

```bash
linkerd multicluster install --ha | kubectl apply -f -
```

With multiple replicas, the gateway LoadBalancer distributes traffic across instances.

## Securing Gateway Communication

Gateway communication uses mTLS automatically. Verify the security:

```bash
# Watch traffic and confirm tls=true
linkerd viz tap deploy/frontend | grep tls=true
```

The `tls=true` field confirms that Linkerd is encrypting the traffic. The gateway uses a Linkerd workload identity and accepts cross-cluster traffic from clients that share the same trust anchor.

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
kubectl get endpoints backend-cluster-east -n default
```

If no endpoints exist, the service mirror isn't working properly.

## Removing Cluster Links

To unlink clusters:

```bash
# On cluster-west, remove the link to cluster-east
kubectl delete link cluster-east -n linkerd-multicluster
```

Mirrored services disappear automatically. Local services continue running normally.

## Conclusion

Linkerd multi-cluster enables secure cross-cluster service communication with failover patterns and unified observability. Install the multi-cluster components, link clusters together, and export services to make them available remotely.

Services access remote services using mirrored DNS names. Linkerd handles routing through gateways with mTLS encryption. Deploy services in multiple clusters with traffic splitting, failover, or federated services for improved availability.

Monitor cross-cluster traffic using Linkerd metrics and dashboards. Scale gateways horizontally for high availability. This gives you a unified service mesh spanning multiple Kubernetes clusters with transparent connectivity and security.
