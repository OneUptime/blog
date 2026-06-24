# How to Configure Ambient Mode for Multi-Cluster Deployments

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Ambient Mesh, Multi-Cluster, Kubernetes, Federation

Description: A practical guide to setting up Istio ambient mode across multiple Kubernetes clusters with shared or separate control planes.

---

Running Istio ambient mode across multiple clusters lets you extend your service mesh beyond a single Kubernetes cluster. Services in one cluster can securely communicate with services in another cluster, with mTLS handled by ztunnel and L7 features available through waypoint proxies. Setting this up requires some careful configuration of trust domains, network connectivity, and service discovery.

## Multi-Cluster Models

Istio supports multiple multi-cluster models for sidecar mode, but ambient multi-cluster currently supports multi-primary, multi-network deployments:

**Primary-Remote:** One cluster runs istiod (the control plane), and the other cluster connects to it as a remote cluster. This topology is supported for sidecar mode, but it is not currently supported for ambient multi-cluster.

**Multi-Primary:** Each cluster runs its own istiod instance, and they share configuration. This provides better availability since each cluster has its own control plane.

For ambient mode, the setup process is similar to sidecar mode, but you need to make sure ztunnel and waypoint components are properly deployed in each cluster.

## Prerequisites

Before setting up multi-cluster ambient mode:

1. Both clusters need to be on separate Istio networks and have reachable east-west gateways
2. You need a shared root CA or a way to establish trust between clusters
3. The Kubernetes Gateway API CRDs must be installed in each cluster

```bash
# Set up kubeconfig contexts for both clusters

export CTX_CLUSTER1=cluster1
export CTX_CLUSTER2=cluster2

# Verify connectivity to both clusters
kubectl --context=$CTX_CLUSTER1 get nodes
kubectl --context=$CTX_CLUSTER2 get nodes
```

## Setting Up a Shared Root CA

For mTLS to work across clusters, the clusters need to trust each other's certificates. The simplest way is to use a shared root CA:

```bash
# Create a root CA (do this once)
mkdir -p certs
cd certs

# Generate root CA key and certificate
openssl req -new -x509 -nodes -days 3650 \
  -keyout root-key.pem \
  -out root-cert.pem \
  -subj "/O=Istio/CN=Root CA" \
  -addext "basicConstraints=critical,CA:TRUE,pathlen:1" \
  -addext "keyUsage=critical,keyCertSign,cRLSign"

# Generate intermediate CA for cluster 1
openssl req -new -nodes \
  -keyout cluster1-ca-key.pem \
  -out cluster1-ca-cert.csr \
  -subj "/O=Istio/CN=Intermediate CA Cluster1"

openssl x509 -req -days 3650 \
  -CA root-cert.pem -CAkey root-key.pem -CAcreateserial \
  -in cluster1-ca-cert.csr \
  -out cluster1-ca-cert.pem \
  -extfile <(printf "basicConstraints=critical,CA:TRUE,pathlen:0\nkeyUsage=critical,keyCertSign,cRLSign\nsubjectKeyIdentifier=hash\nauthorityKeyIdentifier=keyid,issuer\n")

# Generate intermediate CA for cluster 2
openssl req -new -nodes \
  -keyout cluster2-ca-key.pem \
  -out cluster2-ca-cert.csr \
  -subj "/O=Istio/CN=Intermediate CA Cluster2"

openssl x509 -req -days 3650 \
  -CA root-cert.pem -CAkey root-key.pem -CAcreateserial \
  -in cluster2-ca-cert.csr \
  -out cluster2-ca-cert.pem \
  -extfile <(printf "basicConstraints=critical,CA:TRUE,pathlen:0\nkeyUsage=critical,keyCertSign,cRLSign\nsubjectKeyIdentifier=hash\nauthorityKeyIdentifier=keyid,issuer\n")
```

Create the `cacerts` secret in both clusters:

```bash
# Cluster 1
kubectl --context=$CTX_CLUSTER1 create namespace istio-system
kubectl --context=$CTX_CLUSTER1 create secret generic cacerts -n istio-system \
  --from-file=ca-cert.pem=cluster1-ca-cert.pem \
  --from-file=ca-key.pem=cluster1-ca-key.pem \
  --from-file=root-cert.pem=root-cert.pem \
  --from-file=cert-chain.pem=cluster1-ca-cert.pem

# Cluster 2
kubectl --context=$CTX_CLUSTER2 create namespace istio-system
kubectl --context=$CTX_CLUSTER2 create secret generic cacerts -n istio-system \
  --from-file=ca-cert.pem=cluster2-ca-cert.pem \
  --from-file=ca-key.pem=cluster2-ca-key.pem \
  --from-file=root-cert.pem=root-cert.pem \
  --from-file=cert-chain.pem=cluster2-ca-cert.pem
```

## Installing Istio Ambient on Both Clusters

Install Istio with the ambient profile on both clusters. For a multi-primary setup:

```bash
cat <<EOF > cluster1.yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  profile: ambient
  components:
    pilot:
      k8s:
        env:
        - name: AMBIENT_ENABLE_MULTI_NETWORK
          value: "true"
        - name: AMBIENT_ENABLE_BAGGAGE
          value: "true"
  values:
    global:
      meshID: mesh1
      multiCluster:
        clusterName: cluster1
      network: network1
EOF

cat <<EOF > cluster2.yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  profile: ambient
  components:
    pilot:
      k8s:
        env:
        - name: AMBIENT_ENABLE_MULTI_NETWORK
          value: "true"
        - name: AMBIENT_ENABLE_BAGGAGE
          value: "true"
  values:
    global:
      meshID: mesh1
      multiCluster:
        clusterName: cluster2
      network: network2
EOF

kubectl --context=$CTX_CLUSTER1 label namespace istio-system topology.istio.io/network=network1
kubectl --context=$CTX_CLUSTER2 label namespace istio-system topology.istio.io/network=network2

istioctl install --context=$CTX_CLUSTER1 -f cluster1.yaml
istioctl install --context=$CTX_CLUSTER2 -f cluster2.yaml
```

Note that `meshID` must be the same for both clusters, while `clusterName` and `network` should be unique per cluster. The `AMBIENT_ENABLE_MULTI_NETWORK` setting enables ambient traffic across networks; `AMBIENT_ENABLE_BAGGAGE` enables the peer metadata exchange used for improved multi-network telemetry.

## Enabling Cross-Cluster Service Discovery

For services in cluster 1 to discover services in cluster 2, you need to create remote secrets:

```bash
# Create a remote secret for cluster 2 and apply it to cluster 1
istioctl create-remote-secret --context=$CTX_CLUSTER2 --name=cluster2 | kubectl apply --context=$CTX_CLUSTER1 -f -

# Create a remote secret for cluster 1 and apply it to cluster 2
istioctl create-remote-secret --context=$CTX_CLUSTER1 --name=cluster1 | kubectl apply --context=$CTX_CLUSTER2 -f -
```

This gives each cluster's istiod the ability to watch services in the other cluster.

## Deploying East-West Gateways

If the clusters are on different networks (which is common), you need east-west gateways to route traffic between them:

```bash
# Install east-west gateway on cluster 1
kubectl --context=$CTX_CLUSTER1 apply -f - <<EOF
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: istio-eastwestgateway
  namespace: istio-system
  labels:
    topology.istio.io/network: "network1"
spec:
  gatewayClassName: istio-east-west
  listeners:
  - name: mesh
    port: 15008
    protocol: HBONE
    tls:
      mode: Terminate
      options:
        gateway.istio.io/tls-terminate-mode: ISTIO_MUTUAL
EOF

# Install east-west gateway on cluster 2
kubectl --context=$CTX_CLUSTER2 apply -f - <<EOF
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: istio-eastwestgateway
  namespace: istio-system
  labels:
    topology.istio.io/network: "network2"
spec:
  gatewayClassName: istio-east-west
  listeners:
  - name: mesh
    port: 15008
    protocol: HBONE
    tls:
      mode: Terminate
      options:
        gateway.istio.io/tls-terminate-mode: ISTIO_MUTUAL
EOF
```

## Enrolling Namespaces in Ambient Mode

On both clusters, label the namespaces that should participate in the ambient mesh:

```bash
# Cluster 1
kubectl --context=$CTX_CLUSTER1 label namespace my-app istio.io/dataplane-mode=ambient

# Cluster 2
kubectl --context=$CTX_CLUSTER2 label namespace my-app istio.io/dataplane-mode=ambient
```

## Verifying Cross-Cluster Communication

Deploy a test service in both clusters so DNS resolves locally, run the workload in cluster 2, and call it from cluster 1:

```bash
# Create the service in both clusters
kubectl --context=$CTX_CLUSTER2 apply -n my-app -f - <<EOF
apiVersion: v1
kind: Service
metadata:
  name: echo-server
  labels:
    istio.io/global: "true"
spec:
  selector:
    app: echo-server
  ports:
  - port: 5678
EOF
kubectl --context=$CTX_CLUSTER1 apply -n my-app -f - <<EOF
apiVersion: v1
kind: Service
metadata:
  name: echo-server
  labels:
    istio.io/global: "true"
spec:
  selector:
    app: echo-server
  ports:
  - port: 5678
EOF

# Deploy the workload in cluster 2
kubectl --context=$CTX_CLUSTER2 apply -n my-app -f - <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: echo-server
spec:
  replicas: 1
  selector:
    matchLabels:
      app: echo-server
  template:
    metadata:
      labels:
        app: echo-server
    spec:
      containers:
      - name: echo
        image: hashicorp/http-echo
        args: ["-text=hello from cluster2"]
        ports:
        - containerPort: 5678
EOF

# Call it from cluster 1
kubectl --context=$CTX_CLUSTER1 run test-curl -n my-app --image=curlimages/curl --rm -it -- curl http://echo-server.my-app.svc.cluster.local:5678
```

## Cross-Cluster Traffic Flow

When a pod in cluster 1 calls a service in cluster 2, the traffic flow in ambient mode is:

```text
Pod (cluster1) -> ztunnel (cluster1) -> East-West Gateway (cluster2)
    -> ztunnel (cluster2) -> Pod (cluster2)
```

If waypoint proxies are configured, they are inserted in the appropriate position in this chain. The ztunnel in cluster 1 knows to route through the east-west gateway because istiod provides network topology information.

## Waypoint Proxies in Multi-Cluster

Waypoint proxies work per-cluster, and ambient multi-cluster assumes consistent waypoint deployment names and configuration across clusters. A waypoint in cluster 1 only processes traffic for services in cluster 1. If you want L7 processing for a service in cluster 2, you need a matching waypoint in cluster 2:

```bash
# Create waypoints in each cluster
istioctl waypoint apply --context=$CTX_CLUSTER1 -n my-app --enroll-namespace
istioctl waypoint apply --context=$CTX_CLUSTER2 -n my-app --enroll-namespace
```

## Troubleshooting Multi-Cluster Ambient

```bash
# Check remote secrets are in place
kubectl --context=$CTX_CLUSTER1 get secrets -n istio-system -l "istio/multiCluster=true"

# Check istiod is synced with the remote cluster
istioctl remote-clusters --context=$CTX_CLUSTER1

# Check ztunnel knows about the global service
istioctl ztunnel-config services --context=$CTX_CLUSTER1 | grep echo-server

# Check east-west gateway status
kubectl --context=$CTX_CLUSTER1 get gateway -n istio-system istio-eastwestgateway
kubectl --context=$CTX_CLUSTER1 get service -n istio-system istio-eastwestgateway
```

## Summary

Multi-cluster ambient mode extends Istio's sidecar-free architecture across cluster boundaries. The key components are shared trust (via a common root CA), cross-cluster service discovery (via remote secrets), and network connectivity (via east-west gateways). Once configured, ztunnel handles cross-cluster mTLS transparently, and waypoint proxies provide L7 features on a per-cluster basis.
