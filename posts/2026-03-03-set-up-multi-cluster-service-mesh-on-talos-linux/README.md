# How to Set Up Multi-Cluster Service Mesh on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Multi-Cluster, Service Mesh, Kubernetes, Federation

Description: Learn how to connect multiple Talos Linux clusters with a service mesh for cross-cluster service discovery, traffic management, and failover.

---

As your infrastructure grows, you may find yourself running multiple Kubernetes clusters for reasons like geographic distribution, environment isolation, or disaster recovery. A multi-cluster service mesh connects these clusters so that services can discover and communicate with each other across cluster boundaries. On Talos Linux, setting up a multi-cluster service mesh follows the same patterns as on other Kubernetes distributions, with the added benefit of Talos's consistent, reproducible cluster configuration.

This guide covers connecting multiple Talos Linux clusters using both Linkerd and Istio multi-cluster features, including cross-cluster service discovery and traffic failover.

## Why Multi-Cluster Service Mesh?

There are several common reasons for running multiple clusters:

- **Geographic distribution**: Place clusters close to users in different regions
- **Blast radius reduction**: Limit the impact of cluster-level failures
- **Compliance**: Keep sensitive workloads in specific geographic locations
- **Environment separation**: Separate production, staging, and development
- **Scaling**: Individual clusters have limits on nodes and pods

A multi-cluster service mesh solves the networking challenges that come with this setup. Services in one cluster can seamlessly call services in another cluster, with the mesh handling service discovery, load balancing, mTLS, and failover.

## Architecture Options

There are two main approaches to multi-cluster service mesh:

**Flat network**: All clusters share the same network (or have routable pod IPs). Services communicate directly across clusters. This is simpler but requires network connectivity between clusters.

**Gateway-based**: Clusters communicate through dedicated gateway pods. This works across any network topology, including clusters in different cloud providers or regions.

## Prerequisites

For this guide, you need:

- Two or more Talos Linux clusters
- `kubectl` access to all clusters (with separate kubeconfig contexts)
- Network connectivity between clusters (between Linkerd gateways, or pod-to-pod for the Istio single-network example below)
- Linkerd CLI, Istio CLI (`istioctl`), `step`, `openssl`, and `make` installed
- Gateway API CRDs installed before installing Linkerd

```bash
# Set up kubeconfig contexts

export CTX_CLUSTER1=cluster1
export CTX_CLUSTER2=cluster2

# Verify both clusters
kubectl --context=$CTX_CLUSTER1 get nodes
kubectl --context=$CTX_CLUSTER2 get nodes
```

## Multi-Cluster Linkerd

Linkerd supports multi-cluster through its multicluster extension. The architecture uses gateway pods to bridge traffic between clusters.

### Install Linkerd on Both Clusters

First, generate a shared trust anchor (both clusters must trust the same root CA):

```bash
# Generate shared trust anchor
step certificate create root.linkerd.cluster.local ca.crt ca.key \
  --profile root-ca --no-password --insecure --not-after 87600h
```

Install Linkerd on each cluster with the shared trust anchor:

```bash
# Install on cluster 1
linkerd --context=$CTX_CLUSTER1 install --crds | kubectl --context=$CTX_CLUSTER1 apply -f -

# Generate cluster-specific issuer certificates
step certificate create identity.linkerd.cluster.local issuer1.crt issuer1.key \
  --profile intermediate-ca --not-after 8760h --no-password --insecure \
  --ca ca.crt --ca-key ca.key

linkerd --context=$CTX_CLUSTER1 install \
  --identity-trust-anchors-file ca.crt \
  --identity-issuer-certificate-file issuer1.crt \
  --identity-issuer-key-file issuer1.key \
  | kubectl --context=$CTX_CLUSTER1 apply -f -

# Repeat for cluster 2 with its own issuer certificate
step certificate create identity.linkerd.cluster.local issuer2.crt issuer2.key \
  --profile intermediate-ca --not-after 8760h --no-password --insecure \
  --ca ca.crt --ca-key ca.key

linkerd --context=$CTX_CLUSTER2 install --crds | kubectl --context=$CTX_CLUSTER2 apply -f -
linkerd --context=$CTX_CLUSTER2 install \
  --identity-trust-anchors-file ca.crt \
  --identity-issuer-certificate-file issuer2.crt \
  --identity-issuer-key-file issuer2.key \
  | kubectl --context=$CTX_CLUSTER2 apply -f -
```

### Install the Multi-Cluster Extension

```bash
# Install on both clusters
linkerd --context=$CTX_CLUSTER1 multicluster install | kubectl --context=$CTX_CLUSTER1 apply -f -
linkerd --context=$CTX_CLUSTER2 multicluster install | kubectl --context=$CTX_CLUSTER2 apply -f -

# Verify
linkerd --context=$CTX_CLUSTER1 multicluster check
linkerd --context=$CTX_CLUSTER2 multicluster check
```

### Link the Clusters

Create a link from cluster 1 to cluster 2:

```bash
# Generate a link from cluster 2 and apply it to cluster 1
linkerd --context=$CTX_CLUSTER2 multicluster link --cluster-name cluster2 \
  | kubectl --context=$CTX_CLUSTER1 apply -f -

# Generate a link from cluster 1 and apply it to cluster 2
linkerd --context=$CTX_CLUSTER1 multicluster link --cluster-name cluster1 \
  | kubectl --context=$CTX_CLUSTER2 apply -f -

# Check the links
linkerd --context=$CTX_CLUSTER1 multicluster check
```

### Export Services Across Clusters

To make a service available across clusters, label it:

```bash
# On cluster 2, export a service
kubectl --context=$CTX_CLUSTER2 label svc backend-api -n default \
  mirror.linkerd.io/exported=true
```

This creates a mirror service in cluster 1 named `backend-api-cluster2`. Services in cluster 1 can now call `backend-api-cluster2` to reach the service in cluster 2.

### Traffic Splitting Across Clusters

Use an HTTPRoute to distribute traffic between local and remote services:

```yaml
# cross-cluster-split.yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: backend-api-split
  namespace: default
spec:
  parentRefs:
  - group: ""
    kind: Service
    name: backend-api
    port: 8080
  rules:
  - backendRefs:
    - name: backend-api
      port: 8080
      weight: 80  # 80% local
    - name: backend-api-cluster2
      port: 8080
      weight: 20  # 20% remote
```

## Multi-Cluster Istio

Istio supports multi-cluster through several models. The most common is the multi-primary model where each cluster has its own Istio control plane. The example below uses a single-network multi-primary mesh; for clusters on different networks, install Istio east-west gateways and use separate network names.

### Configure Cluster Certificates

Both clusters need to trust the same root CA:

```bash
# From the top-level directory of the Istio release package
mkdir -p certs
pushd certs

# Generate the root CA and a per-cluster intermediate CA
make -f ../tools/certs/Makefile.selfsigned.mk root-ca
make -f ../tools/certs/Makefile.selfsigned.mk cluster1-cacerts
make -f ../tools/certs/Makefile.selfsigned.mk cluster2-cacerts

popd
```

### Install Istio on Both Clusters

```bash
# Create secrets for the CA certificates
kubectl --context=$CTX_CLUSTER1 create namespace istio-system
kubectl --context=$CTX_CLUSTER1 create secret generic cacerts -n istio-system \
  --from-file=ca-cert.pem=certs/cluster1/ca-cert.pem \
  --from-file=ca-key.pem=certs/cluster1/ca-key.pem \
  --from-file=root-cert.pem=certs/cluster1/root-cert.pem \
  --from-file=cert-chain.pem=certs/cluster1/cert-chain.pem

kubectl --context=$CTX_CLUSTER2 create namespace istio-system
kubectl --context=$CTX_CLUSTER2 create secret generic cacerts -n istio-system \
  --from-file=ca-cert.pem=certs/cluster2/ca-cert.pem \
  --from-file=ca-key.pem=certs/cluster2/ca-key.pem \
  --from-file=root-cert.pem=certs/cluster2/root-cert.pem \
  --from-file=cert-chain.pem=certs/cluster2/cert-chain.pem

# Install Istio with multi-cluster settings on cluster 1
istioctl install --context=$CTX_CLUSTER1 -f - <<EOF
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  values:
    global:
      meshID: mesh1
      multiCluster:
        clusterName: cluster1
      network: network1
EOF

# Install Istio with multi-cluster settings on cluster 2
istioctl install --context=$CTX_CLUSTER2 -f - <<EOF
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  values:
    global:
      meshID: mesh1
      multiCluster:
        clusterName: cluster2
      network: network1
EOF
```

### Enable Cross-Cluster Discovery

```bash
# Create a remote secret for cluster 2 and apply to cluster 1
istioctl create-remote-secret --context=$CTX_CLUSTER2 --name=cluster2 \
  | kubectl --context=$CTX_CLUSTER1 apply -f -

# And the reverse
istioctl create-remote-secret --context=$CTX_CLUSTER1 --name=cluster1 \
  | kubectl --context=$CTX_CLUSTER2 apply -f -
```

Now services are automatically discoverable across both clusters.

### Cross-Cluster Load Balancing

With Istio multi-cluster, services with the same name and namespace are automatically load balanced across clusters:

```yaml
# Deploy the same service in both clusters
# Traffic is automatically distributed
apiVersion: v1
kind: Service
metadata:
  name: backend-api
  namespace: default
spec:
  selector:
    app: backend-api
  ports:
  - name: http
    port: 8080
    targetPort: 8080
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend-api
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: backend-api
  template:
    metadata:
      labels:
        app: backend-api
    spec:
      containers:
      - name: api
        image: my-api:v1
        ports:
        - containerPort: 8080
```

## Failover Configuration

Configure automatic failover so that if a service fails in one cluster, traffic shifts to the other:

```yaml
# failover-dr.yaml (Istio)
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: backend-api-failover
  namespace: default
spec:
  host: backend-api.default.svc.cluster.local
  trafficPolicy:
    connectionPool:
      http:
        maxRequestsPerConnection: 1
    loadBalancer:
      simple: ROUND_ROBIN
      localityLbSetting:
        enabled: true
        failover:
        - from: region1
          to: region2
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 10s
      baseEjectionTime: 30s
```

When pods in one cluster start failing, outlier detection ejects them and traffic flows to the healthy cluster.

## Monitoring Multi-Cluster Traffic

```bash
# Linkerd - check cross-cluster traffic
linkerd --context=$CTX_CLUSTER1 viz stat \
  --from deploy/frontend \
  --to svc/backend-api-cluster2 \
  -n default

# Istio - check traffic to remote endpoints
kubectl --context=$CTX_CLUSTER1 exec <ISTIO_POD> -c istio-proxy -- \
  curl localhost:15000/clusters | grep backend-api
```

## Talos Linux Multi-Cluster Tips

1. Use consistent Talos machine configurations across clusters for predictability
2. Ensure gateway pods have network connectivity between clusters (firewall rules, VPN, or direct peering)
3. Use the same CNI plugin across all clusters for consistent networking behavior
4. Store cluster configurations in Git for reproducibility

## Conclusion

A multi-cluster service mesh on Talos Linux lets you build resilient, geographically distributed systems where services communicate seamlessly across cluster boundaries. Linkerd's multi-cluster approach uses service mirroring and is simpler to set up, while Istio provides more advanced features like automatic cross-cluster load balancing. Both approaches secure cross-cluster communication with mTLS and provide observability into cross-cluster traffic. Combined with Talos Linux's reproducible, immutable infrastructure, you get a solid foundation for running services across multiple clusters with confidence.
