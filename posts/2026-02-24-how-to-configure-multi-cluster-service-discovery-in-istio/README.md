# How to Configure Multi-Cluster Service Discovery in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Multi-Cluster, Service Discovery, Kubernetes, Federation

Description: Set up service discovery across multiple Kubernetes clusters with Istio so services in different clusters can find and communicate with each other.

---

Running services across multiple Kubernetes clusters is common for high availability, geographic distribution, or organizational reasons. The challenge is making services in one cluster discoverable from another cluster. Istio supports multi-cluster service discovery, allowing your service mesh to span cluster boundaries transparently. A service in cluster A can call a service in cluster B using the same hostname it would use locally.

## Multi-Cluster Topologies

Istio supports several multi-cluster configurations. The two main models are:

**Primary-Remote**: One cluster runs the Istio control plane (primary), and remote clusters connect to it. The primary cluster's istiod handles configuration for all clusters.

**Multi-Primary**: Each cluster runs its own Istio control plane, and they share service discovery information with each other. This is better for availability since each cluster can operate independently if the connection between them is lost.

For most production setups, multi-primary on separate networks is the recommended topology.

## Prerequisites

Before setting up multi-cluster service discovery, you need:

- Two or more Kubernetes clusters with Istio installed
- Network connectivity between clusters (VPN, peering, or public endpoints)
- A shared root CA for mTLS (or Istio's built-in CA with shared root certificates)

Create the shared root certificate:

```bash
# Generate root CA
mkdir -p certs
openssl req -new -newkey rsa:4096 -x509 -sha256 \
  -days 3650 -nodes -out certs/root-cert.pem \
  -keyout certs/root-key.pem \
  -subj "/O=example Inc./CN=Root CA"
```

Generate intermediate CAs for each cluster:

```bash
# For cluster1
openssl req -new -newkey rsa:4096 -nodes \
  -out certs/cluster1-ca-cert.csr \
  -keyout certs/cluster1-ca-key.pem \
  -subj "/O=example Inc./CN=Cluster1 Intermediate CA"

openssl x509 -req -days 730 -CA certs/root-cert.pem \
  -CAkey certs/root-key.pem -CAcreateserial \
  -in certs/cluster1-ca-cert.csr \
  -out certs/cluster1-ca-cert.pem
```

Create the cacerts secret in each cluster:

```bash
kubectl create secret generic cacerts -n istio-system \
  --from-file=ca-cert.pem=certs/cluster1-ca-cert.pem \
  --from-file=ca-key.pem=certs/cluster1-ca-key.pem \
  --from-file=root-cert.pem=certs/root-cert.pem \
  --from-file=cert-chain.pem=certs/cluster1-cert-chain.pem \
  --context=cluster1
```

## Setting Up Multi-Primary on Different Networks

Label each cluster with its network and cluster name:

```bash
# On cluster1
kubectl --context=cluster1 label namespace istio-system topology.istio.io/network=network1

# On cluster2
kubectl --context=cluster2 label namespace istio-system topology.istio.io/network=network2
```

Install Istio on cluster1:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  name: istio-cluster1
spec:
  values:
    global:
      meshID: mesh1
      multiCluster:
        clusterName: cluster1
      network: network1
```

```bash
istioctl install --context=cluster1 -f cluster1.yaml
```

Install Istio on cluster2 with its own configuration:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  name: istio-cluster2
spec:
  values:
    global:
      meshID: mesh1
      multiCluster:
        clusterName: cluster2
      network: network2
```

```bash
istioctl install --context=cluster2 -f cluster2.yaml
```

## Setting Up East-West Gateways

When clusters are on different networks, they need east-west gateways to route traffic between them. Install the gateway on each cluster:

```bash
# On cluster1
samples/multicluster/gen-eastwest-gateway.sh --network network1 | \
  istioctl install --context=cluster1 -y -f -

# On cluster2
samples/multicluster/gen-eastwest-gateway.sh --network network2 | \
  istioctl install --context=cluster2 -y -f -
```

Expose services through the east-west gateway:

```bash
kubectl apply --context=cluster1 -f samples/multicluster/expose-services.yaml -n istio-system
kubectl apply --context=cluster2 -f samples/multicluster/expose-services.yaml -n istio-system
```

The expose-services configuration looks like this:

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

## Exchanging Remote Secrets

Each cluster needs credentials to access the other cluster's Kubernetes API server. This is how istiod discovers services in remote clusters.

Create a remote secret for cluster2 and apply it in cluster1:

```bash
istioctl create-remote-secret --context=cluster2 --name=cluster2 | \
  kubectl apply --context=cluster1 -f -
```

And vice versa:

```bash
istioctl create-remote-secret --context=cluster1 --name=cluster1 | \
  kubectl apply --context=cluster2 -f -
```

These secrets allow each cluster's istiod to watch the Kubernetes API of the remote cluster and discover services there.

## Verifying Service Discovery

Deploy a test service in cluster2:

```bash
kubectl apply --context=cluster2 -n sample -f - <<EOF
apiVersion: v1
kind: Service
metadata:
  name: hello-service
  labels:
    app: hello
spec:
  ports:
  - port: 8080
    name: http
  selector:
    app: hello
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: hello-service
spec:
  replicas: 1
  selector:
    matchLabels:
      app: hello
  template:
    metadata:
      labels:
        app: hello
    spec:
      containers:
      - name: hello
        image: hashicorp/http-echo:0.2.3
        args: ["-text=hello from cluster2"]
        ports:
        - containerPort: 8080
EOF
```

From cluster1, call the service:

```bash
kubectl exec --context=cluster1 -n sample deploy/sleep -- curl -s http://hello-service.sample:8080
```

If multi-cluster service discovery is working, you should see "hello from cluster2."

## Checking the Service Registry

Verify that services from both clusters appear in the proxy configuration:

```bash
istioctl proxy-config endpoint deploy/sleep -n sample --context=cluster1 | grep hello-service
```

You should see endpoints from both clusters listed.

## Locality-Aware Routing

With multi-cluster service discovery, Istio can route traffic preferentially to local endpoints. Configure locality load balancing:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: hello-service
  namespace: sample
spec:
  host: hello-service.sample.svc.cluster.local
  trafficPolicy:
    connectionPool:
      http:
        h2UpgradePolicy: DEFAULT
    outlierDetection:
      consecutive5xxErrors: 1
      interval: 5s
      baseEjectionTime: 30s
```

With outlier detection enabled, Istio will prefer local endpoints but fail over to remote endpoints if the local ones become unhealthy.

## Troubleshooting Multi-Cluster Discovery

If services aren't being discovered across clusters, check these things:

Verify the remote secrets are in place:

```bash
kubectl get secrets -n istio-system --context=cluster1 | grep istio-remote-secret
```

Check istiod logs for remote cluster connection issues:

```bash
kubectl logs deploy/istiod -n istio-system --context=cluster1 | grep "remote cluster"
```

Verify the east-west gateway has an external IP:

```bash
kubectl get svc -n istio-system --context=cluster1 | grep eastwestgateway
```

If the gateway is in `Pending` state, your cluster might not support LoadBalancer services and you'll need to use NodePort or another approach.

Multi-cluster service discovery with Istio takes some effort to set up, but once running, it provides transparent cross-cluster communication with full mTLS, load balancing, and observability. Services don't need to know which cluster they're calling; the mesh handles it automatically.
