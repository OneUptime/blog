# How to Deploy Istio Across Multiple Kubernetes Clusters

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Multicluster, Kubernetes, Service Mesh, Federation

Description: A practical guide to deploying Istio across multiple Kubernetes clusters with shared trust and cross-cluster service discovery.

---

Running Istio across multiple Kubernetes clusters lets you build a unified service mesh where services in one cluster can seamlessly communicate with services in another. This is useful for high availability across regions, regulatory requirements that mandate data locality, and gradually migrating workloads between clusters. The setup is more involved than a single-cluster mesh, but the core concepts are straightforward once you understand them.

## Multicluster Topologies

Istio supports two main multicluster topologies:

**Primary-Remote** - One cluster hosts the Istio control plane (primary), and other clusters (remotes) connect to it. Simpler to manage but creates a single point of failure for the control plane.

**Primary-Primary** - Each cluster has its own Istio control plane, and they share configuration. More resilient but more complex to set up.

Both topologies can work across network boundaries (different VPCs, different cloud providers) or within the same network.

## Prerequisites

Before setting up multicluster, you need:

1. **Two or more Kubernetes clusters** with network connectivity between them
2. **A shared root CA** so services in both clusters can verify each other's certificates
3. **DNS resolution** or some way for services to discover each other across clusters
4. **kubectl contexts** configured for each cluster

Set up your contexts:

```bash
# Verify contexts
kubectl config get-contexts

# Set variables for convenience
export CTX_CLUSTER1=cluster1
export CTX_CLUSTER2=cluster2
```

## Step 1: Create a Shared Root CA

All clusters in the mesh need to trust each other's certificates. The simplest way is to create a root CA and use it for all clusters:

```bash
# Create a directory for certificates
mkdir -p certs && cd certs

# Generate a root CA
openssl req -new -newkey rsa:4096 -x509 -sha256 \
  -days 3650 -nodes \
  -out root-cert.pem \
  -keyout root-key.pem \
  -subj "/O=my-org/CN=root-ca"

# Generate intermediate CA for cluster 1
openssl req -new -newkey rsa:4096 -nodes \
  -out cluster1-ca.csr \
  -keyout cluster1-ca-key.pem \
  -subj "/O=my-org/CN=cluster1-ca"

openssl x509 -req -days 730 -CA root-cert.pem -CAkey root-key.pem \
  -set_serial 01 -in cluster1-ca.csr \
  -out cluster1-ca-cert.pem

# Generate intermediate CA for cluster 2
openssl req -new -newkey rsa:4096 -nodes \
  -out cluster2-ca.csr \
  -keyout cluster2-ca-key.pem \
  -subj "/O=my-org/CN=cluster2-ca"

openssl x509 -req -days 730 -CA root-cert.pem -CAkey root-key.pem \
  -set_serial 02 -in cluster2-ca.csr \
  -out cluster2-ca-cert.pem
```

Create secrets in each cluster:

```bash
# Cluster 1
kubectl create namespace istio-system --context=$CTX_CLUSTER1
kubectl create secret generic cacerts -n istio-system \
  --context=$CTX_CLUSTER1 \
  --from-file=ca-cert.pem=cluster1-ca-cert.pem \
  --from-file=ca-key.pem=cluster1-ca-key.pem \
  --from-file=root-cert.pem=root-cert.pem \
  --from-file=cert-chain.pem=cluster1-ca-cert.pem

# Cluster 2
kubectl create namespace istio-system --context=$CTX_CLUSTER2
kubectl create secret generic cacerts -n istio-system \
  --context=$CTX_CLUSTER2 \
  --from-file=ca-cert.pem=cluster2-ca-cert.pem \
  --from-file=ca-key.pem=cluster2-ca-key.pem \
  --from-file=root-cert.pem=root-cert.pem \
  --from-file=cert-chain.pem=cluster2-ca-cert.pem
```

## Step 2: Install Istio on Both Clusters

For a primary-primary setup, install Istio on both clusters with multicluster configuration:

Cluster 1:

```yaml
# cluster1.yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  values:
    global:
      meshID: my-mesh
      multiCluster:
        clusterName: cluster1
      network: network1
  meshConfig:
    defaultConfig:
      proxyMetadata:
        ISTIO_META_DNS_CAPTURE: "true"
        ISTIO_META_DNS_AUTO_ALLOCATE: "true"
```

```bash
istioctl install --context=$CTX_CLUSTER1 -f cluster1.yaml
```

Cluster 2:

```yaml
# cluster2.yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  values:
    global:
      meshID: my-mesh
      multiCluster:
        clusterName: cluster2
      network: network2
  meshConfig:
    defaultConfig:
      proxyMetadata:
        ISTIO_META_DNS_CAPTURE: "true"
        ISTIO_META_DNS_AUTO_ALLOCATE: "true"
```

```bash
istioctl install --context=$CTX_CLUSTER2 -f cluster2.yaml
```

Note: If both clusters are on the same network (can reach each other's pod IPs directly), use the same network name for both.

## Step 3: Configure Cross-Cluster Discovery

Each cluster's istiod needs to be able to discover services in the other cluster. This is done by creating a remote secret that gives one cluster access to the other's Kubernetes API:

```bash
# Create a secret in cluster1 that allows it to access cluster2
istioctl create-remote-secret \
  --context=$CTX_CLUSTER2 \
  --name=cluster2 | \
  kubectl apply -f - --context=$CTX_CLUSTER1

# Create a secret in cluster2 that allows it to access cluster1
istioctl create-remote-secret \
  --context=$CTX_CLUSTER1 \
  --name=cluster1 | \
  kubectl apply -f - --context=$CTX_CLUSTER2
```

Verify the secrets were created:

```bash
kubectl get secrets -n istio-system --context=$CTX_CLUSTER1 | grep istio-remote
kubectl get secrets -n istio-system --context=$CTX_CLUSTER2 | grep istio-remote
```

## Step 4: Set Up East-West Gateway (for Different Networks)

If the clusters are on different networks and pods cannot directly reach each other, you need an east-west gateway to bridge the networks:

```bash
# Install east-west gateway on cluster1
samples/multicluster/gen-eastwest-gateway.sh \
  --mesh my-mesh --cluster cluster1 --network network1 | \
  istioctl install --context=$CTX_CLUSTER1 -f -

# Install east-west gateway on cluster2
samples/multicluster/gen-eastwest-gateway.sh \
  --mesh my-mesh --cluster cluster2 --network network2 | \
  istioctl install --context=$CTX_CLUSTER2 -f -
```

Expose services through the east-west gateway:

```bash
# On cluster1
kubectl apply --context=$CTX_CLUSTER1 -f samples/multicluster/expose-services.yaml -n istio-system

# On cluster2
kubectl apply --context=$CTX_CLUSTER2 -f samples/multicluster/expose-services.yaml -n istio-system
```

The expose-services Gateway looks like:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: cross-network-gateway
  namespace: istio-system
spec:
  selector:
    istio: eastwestgateway
  servers:
  - port:
      number: 15443
      name: tls
      protocol: TLS
    tls:
      mode: AUTO_PASSTHROUGH
    hosts:
    - "*.local"
```

## Step 5: Verify Cross-Cluster Communication

Deploy a test service on cluster2 and call it from cluster1:

```bash
# Deploy on cluster2
kubectl create deployment hello --image=nginx --context=$CTX_CLUSTER2 -n default
kubectl expose deployment hello --port=80 --context=$CTX_CLUSTER2 -n default

# Deploy a client on cluster1
kubectl run client --image=curlimages/curl --context=$CTX_CLUSTER1 -n default -- sleep infinity

# Test cross-cluster call
kubectl exec client --context=$CTX_CLUSTER1 -n default -- \
  curl -s hello.default.svc.cluster.local
```

If everything is configured correctly, the request from cluster1 will reach the service in cluster2.

## Locality-Aware Routing

With multicluster, you can configure locality-aware routing so traffic prefers local endpoints:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: hello
spec:
  host: hello.default.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 30s
      baseEjectionTime: 30s
    loadBalancer:
      localityLbSetting:
        enabled: true
        failover:
        - from: us-east-1
          to: us-west-2
```

This routes traffic to local endpoints first and fails over to the other cluster only when local endpoints are unhealthy.

## Monitoring Multicluster Traffic

Track cross-cluster traffic with Prometheus:

```promql
# Cross-cluster request rate
sum(rate(istio_requests_total{
  source_cluster="cluster1",
  destination_cluster="cluster2"
}[5m]))

# Cross-cluster latency
histogram_quantile(0.99,
  sum(rate(istio_request_duration_milliseconds_bucket{
    source_cluster="cluster1",
    destination_cluster="cluster2"
  }[5m])) by (le)
)
```

## Troubleshooting

Common issues and how to fix them:

```bash
# Check if remote secrets are working
istioctl remote-clusters --context=$CTX_CLUSTER1

# Check if cross-cluster endpoints are discovered
istioctl proxy-config endpoints client-pod --context=$CTX_CLUSTER1 | grep hello

# Check east-west gateway logs
kubectl logs -l istio=eastwestgateway -n istio-system --context=$CTX_CLUSTER1
```

## Summary

Deploying Istio across multiple Kubernetes clusters requires a shared root CA for mutual trust, cross-cluster API access for service discovery, and optionally east-west gateways for bridging different networks. Once set up, services can transparently communicate across clusters with full mTLS, load balancing, and observability. Use locality-aware routing to prefer local endpoints and fail over to remote clusters when needed. Monitor cross-cluster traffic to understand latency and catch connectivity issues early.
