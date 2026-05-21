# How to Set Up Flat Network Multi-Cluster Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Multi-Cluster, Kubernetes, Networking, Service Mesh

Description: How to configure Istio across multiple Kubernetes clusters that share a flat network with direct pod-to-pod connectivity.

---

A flat network multi-cluster Istio setup is the simplest multi-cluster topology. It means pods in one cluster can directly reach pods in another cluster by IP address, without any gateway in between. Think of clusters in the same VPC, connected via VPC peering, or on the same physical network. If you can ping a pod in cluster B from cluster A, you have a flat network.

## When to Use Flat Network

Flat network multi-cluster works well when:

- Both clusters are in the same cloud VPC or connected via VPC peering
- Pod CIDR ranges don't overlap between clusters
- You want the lowest possible latency between clusters
- You're running in an on-premises environment with a shared network

The big requirement is non-overlapping pod CIDRs. If cluster A uses 10.0.0.0/16 for pods and cluster B also uses 10.0.0.0/16, you can't use flat networking. Plan your CIDR ranges before setting up the clusters.

## Prerequisites

- Two Kubernetes clusters (we'll call them cluster1 and cluster2)
- Direct pod-to-pod connectivity between clusters
- Non-overlapping pod CIDR ranges
- istioctl installed
- kubectl contexts configured for both clusters

Set up your kubectl contexts:

```bash
# Verify you can reach both clusters

kubectl --context=cluster1 get nodes
kubectl --context=cluster2 get nodes
```

## Step 1: Create a Shared Root CA

Both clusters need to trust each other's certificates. The easiest way is to use a shared root CA. Generate it:

```bash
mkdir -p certs
cd certs

cat > root-ca.cnf <<EOF
[req]
distinguished_name = dn
x509_extensions = v3_ca
prompt = no

[dn]
O = Istio
CN = Root CA

[v3_ca]
basicConstraints = critical,CA:TRUE,pathlen:1
keyUsage = critical,keyCertSign,cRLSign
subjectKeyIdentifier = hash
EOF

# Generate root CA
openssl req -new -newkey rsa:4096 -x509 -sha256 \
  -days 3650 -nodes \
  -config root-ca.cnf \
  -keyout root-key.pem \
  -out root-cert.pem
```

Generate intermediate CAs for each cluster:

```bash
cat > intermediate-ca.cnf <<EOF
[v3_ca]
basicConstraints = critical,CA:TRUE,pathlen:0
keyUsage = critical,keyCertSign,cRLSign
subjectKeyIdentifier = hash
authorityKeyIdentifier = keyid,issuer
EOF

# Cluster 1 intermediate CA
openssl req -new -newkey rsa:4096 -nodes \
  -subj "/O=Istio/CN=Intermediate CA cluster1" \
  -keyout cluster1-ca-key.pem \
  -out cluster1-ca-csr.pem

openssl x509 -req -sha256 -days 3650 \
  -CA root-cert.pem -CAkey root-key.pem -CAcreateserial \
  -extfile intermediate-ca.cnf -extensions v3_ca \
  -in cluster1-ca-csr.pem \
  -out cluster1-ca-cert.pem
cat cluster1-ca-cert.pem root-cert.pem > cluster1-cert-chain.pem

# Cluster 2 intermediate CA
openssl req -new -newkey rsa:4096 -nodes \
  -subj "/O=Istio/CN=Intermediate CA cluster2" \
  -keyout cluster2-ca-key.pem \
  -out cluster2-ca-csr.pem

openssl x509 -req -sha256 -days 3650 \
  -CA root-cert.pem -CAkey root-key.pem -CAcreateserial \
  -extfile intermediate-ca.cnf -extensions v3_ca \
  -in cluster2-ca-csr.pem \
  -out cluster2-ca-cert.pem
cat cluster2-ca-cert.pem root-cert.pem > cluster2-cert-chain.pem
```

Create the secret in both clusters:

```bash
# Cluster 1
kubectl --context=cluster1 create namespace istio-system
kubectl --context=cluster1 create secret generic cacerts -n istio-system \
  --from-file=ca-cert.pem=cluster1-ca-cert.pem \
  --from-file=ca-key.pem=cluster1-ca-key.pem \
  --from-file=root-cert.pem=root-cert.pem \
  --from-file=cert-chain.pem=cluster1-cert-chain.pem

# Cluster 2
kubectl --context=cluster2 create namespace istio-system
kubectl --context=cluster2 create secret generic cacerts -n istio-system \
  --from-file=ca-cert.pem=cluster2-ca-cert.pem \
  --from-file=ca-key.pem=cluster2-ca-key.pem \
  --from-file=root-cert.pem=root-cert.pem \
  --from-file=cert-chain.pem=cluster2-cert-chain.pem
```

## Step 2: Install Istio on Both Clusters

For flat networking, both clusters share the same mesh ID and network name. Create the configuration for cluster 1:

```yaml
# cluster1.yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  name: istio-cluster1
spec:
  profile: default
  meshConfig:
    defaultConfig:
      proxyMetadata:
        ISTIO_META_DNS_CAPTURE: "true"
        ISTIO_META_DNS_AUTO_ALLOCATE: "true"
  values:
    global:
      meshID: mesh1
      multiCluster:
        clusterName: cluster1
      network: network1
```

And for cluster 2:

```yaml
# cluster2.yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  name: istio-cluster2
spec:
  profile: default
  meshConfig:
    defaultConfig:
      proxyMetadata:
        ISTIO_META_DNS_CAPTURE: "true"
        ISTIO_META_DNS_AUTO_ALLOCATE: "true"
  values:
    global:
      meshID: mesh1
      multiCluster:
        clusterName: cluster2
      network: network1
```

Notice that `network` is set to the same value for both clusters. This tells Istio that both clusters are on the same network, so no gateway is needed for cross-cluster traffic.

Install on both clusters:

```bash
istioctl install --context=cluster1 -f cluster1.yaml -y
istioctl install --context=cluster2 -f cluster2.yaml -y
```

## Step 3: Enable Endpoint Discovery

Each cluster needs to know about services in the other cluster. Istio uses remote secrets for this. The remote secret gives the Istio control plane in one cluster access to the Kubernetes API server of the other cluster.

```bash
# Create a remote secret for cluster2 and apply it to cluster1
istioctl create-remote-secret --context=cluster2 --name=cluster2 | \
  kubectl apply --context=cluster1 -f -

# Create a remote secret for cluster1 and apply it to cluster2
istioctl create-remote-secret --context=cluster1 --name=cluster1 | \
  kubectl apply --context=cluster2 -f -
```

This is a bidirectional setup. Each cluster's istiod watches the other cluster's API server for service and endpoint changes.

## Step 4: Verify Cross-Cluster Connectivity

Deploy the service in both clusters and verify traffic flows:

```bash
# Create test namespace in both clusters
kubectl --context=cluster1 create namespace sample
kubectl --context=cluster1 label namespace sample istio-injection=enabled

kubectl --context=cluster2 create namespace sample
kubectl --context=cluster2 label namespace sample istio-injection=enabled
```

Create the service in both clusters so DNS lookup works from either cluster:

```bash
kubectl --context=cluster1 apply -n sample -f - <<EOF
apiVersion: v1
kind: Service
metadata:
  name: helloworld
spec:
  selector:
    app: helloworld
  ports:
    - port: 5000
      targetPort: 5000
EOF

kubectl --context=cluster2 apply -n sample -f - <<EOF
apiVersion: v1
kind: Service
metadata:
  name: helloworld
spec:
  selector:
    app: helloworld
  ports:
    - port: 5000
      targetPort: 5000
EOF
```

Deploy the v2 application in cluster2:

```bash
kubectl --context=cluster2 apply -n sample -f - <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: helloworld-v2
spec:
  replicas: 1
  selector:
    matchLabels:
      app: helloworld
      version: v2
  template:
    metadata:
      labels:
        app: helloworld
        version: v2
    spec:
      containers:
        - name: helloworld
          image: docker.io/istio/examples-helloworld-v2
          ports:
            - containerPort: 5000
EOF
```

Deploy a client in cluster1:

```bash
kubectl --context=cluster1 apply -n sample -f - <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: sleep
spec:
  replicas: 1
  selector:
    matchLabels:
      app: sleep
  template:
    metadata:
      labels:
        app: sleep
    spec:
      containers:
        - name: sleep
          image: curlimages/curl
          command: ["/bin/sleep", "3650d"]
EOF
```

Test cross-cluster connectivity:

```bash
kubectl --context=cluster1 exec -n sample deploy/sleep -c sleep -- \
  curl -s helloworld.sample:5000/hello
```

If you see a response from the v2 version, flat network multi-cluster is working.

## Step 5: Verify Load Balancing

If you deploy helloworld workloads in both clusters, Istio will load balance across endpoints in both clusters:

```bash
kubectl --context=cluster1 apply -n sample -f - <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: helloworld-v1
spec:
  replicas: 1
  selector:
    matchLabels:
      app: helloworld
      version: v1
  template:
    metadata:
      labels:
        app: helloworld
        version: v1
    spec:
      containers:
        - name: helloworld
          image: docker.io/istio/examples-helloworld-v1
          ports:
            - containerPort: 5000
EOF
```

```bash
# Run this multiple times
for i in $(seq 1 10); do
  kubectl --context=cluster1 exec -n sample deploy/sleep -c sleep -- \
    curl -s helloworld.sample:5000/hello
done
```

You should see responses from both clusters, roughly evenly distributed.

## Troubleshooting

**Can't reach services across clusters**: Verify pod-to-pod connectivity directly. SSH into a node in cluster1 and try to curl a pod IP in cluster2. If that doesn't work, the flat network isn't actually flat.

**Services discovered but connections time out**: Check firewall rules between clusters. In a flat network, workloads connect directly to remote pod IPs on the service's destination port, so the pod CIDRs and application ports need to be reachable across clusters. Port 15443 is used by Istio east-west gateways in different-network topologies, not by this flat-network path.

**Uneven load balancing**: Check that both clusters have healthy endpoints. Use `istioctl proxy-config endpoints` to see what endpoints the proxy knows about:

```bash
kubectl --context=cluster1 exec -n sample deploy/sleep -c istio-proxy -- \
  pilot-agent request GET /clusters | grep helloworld
```

Flat network multi-cluster Istio gives you the simplest possible multi-cluster service mesh. The key requirements are non-overlapping CIDRs and actual network connectivity between clusters. Once those are in place, the Istio configuration is minimal and the traffic flows naturally.
