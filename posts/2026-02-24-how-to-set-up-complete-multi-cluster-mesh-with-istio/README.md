# How to Set Up Complete Multi-Cluster Mesh with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Multi-Cluster, Kubernetes, High Availability, Service Mesh

Description: Configure a complete multi-cluster Istio service mesh with shared control plane, cross-cluster service discovery, and unified traffic management.

---

Running Istio across multiple Kubernetes clusters lets you build highly available applications, isolate workloads by environment, and comply with data residency requirements. But setting it up correctly requires careful attention to networking, certificates, and configuration synchronization. Here's a complete walkthrough.

## Choosing Your Multi-Cluster Model

Istio supports several multi-cluster topologies. The right choice depends on your requirements:

### Multi-Primary (Recommended)

Each cluster has its own istiod. Clusters share a root certificate and can discover services in other clusters. This is the most resilient option because there's no single point of failure.

### Primary-Remote

One cluster runs istiod, and other clusters connect to it as remote clusters. Simpler to set up but creates a dependency on the primary cluster.

### External Control Plane

istiod runs outside all data plane clusters. Good for managed service providers.

We'll set up a multi-primary mesh with two clusters since that's the most practical starting point.

## Prerequisites

You need:
- Two Kubernetes clusters (we'll call them `cluster1` and `cluster2`)
- kubectl contexts configured for both: `ctx-cluster1` and `ctx-cluster2`
- Network connectivity between clusters (east-west gateways handle this)
- `istioctl` installed

```bash
# Verify your contexts
kubectl config get-contexts

# Verify connectivity to both clusters
kubectl get nodes --context ctx-cluster1
kubectl get nodes --context ctx-cluster2
```

## Step 1: Create a Shared Root Certificate

Both clusters must trust the same root CA. If they don't, mTLS between clusters will fail because the certificates won't validate.

```bash
# Create a directory for certificates
mkdir -p certs
cd certs

# Generate root CA
openssl req -new -x509 -nodes -days 3650 \
  -keyout root-key.pem -out root-cert.pem \
  -subj "/O=example Inc./CN=Root CA"

# Generate intermediate CA for cluster1
mkdir -p cluster1
openssl genrsa -out cluster1/ca-key.pem 4096
openssl req -new -key cluster1/ca-key.pem \
  -out cluster1/ca-csr.pem \
  -subj "/O=example Inc./CN=Cluster1 CA"
openssl x509 -req -in cluster1/ca-csr.pem \
  -CA root-cert.pem -CAkey root-key.pem \
  -CAcreateserial -days 1825 \
  -out cluster1/ca-cert.pem
cat cluster1/ca-cert.pem root-cert.pem > cluster1/cert-chain.pem
cp root-cert.pem cluster1/root-cert.pem

# Generate intermediate CA for cluster2
mkdir -p cluster2
openssl genrsa -out cluster2/ca-key.pem 4096
openssl req -new -key cluster2/ca-key.pem \
  -out cluster2/ca-csr.pem \
  -subj "/O=example Inc./CN=Cluster2 CA"
openssl x509 -req -in cluster2/ca-csr.pem \
  -CA root-cert.pem -CAkey root-key.pem \
  -CAcreateserial -days 1825 \
  -out cluster2/ca-cert.pem
cat cluster2/ca-cert.pem root-cert.pem > cluster2/cert-chain.pem
cp root-cert.pem cluster2/root-cert.pem
```

Install the certificates into each cluster:

```bash
# Create istio-system namespace if it doesn't exist
kubectl create ns istio-system --context ctx-cluster1 --dry-run=client -o yaml | \
  kubectl apply --context ctx-cluster1 -f -
kubectl create ns istio-system --context ctx-cluster2 --dry-run=client -o yaml | \
  kubectl apply --context ctx-cluster2 -f -

# Install CA certificates
kubectl create secret generic cacerts -n istio-system --context ctx-cluster1 \
  --from-file=ca-cert.pem=cluster1/ca-cert.pem \
  --from-file=ca-key.pem=cluster1/ca-key.pem \
  --from-file=root-cert.pem=cluster1/root-cert.pem \
  --from-file=cert-chain.pem=cluster1/cert-chain.pem

kubectl create secret generic cacerts -n istio-system --context ctx-cluster2 \
  --from-file=ca-cert.pem=cluster2/ca-cert.pem \
  --from-file=ca-key.pem=cluster2/ca-key.pem \
  --from-file=root-cert.pem=cluster2/root-cert.pem \
  --from-file=cert-chain.pem=cluster2/cert-chain.pem
```

## Step 2: Install Istio on Both Clusters

Each cluster gets its own IstioOperator configuration:

```yaml
# cluster1-config.yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  values:
    global:
      meshID: my-mesh
      multiCluster:
        clusterName: cluster1
      network: network1
```

```yaml
# cluster2-config.yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  values:
    global:
      meshID: my-mesh
      multiCluster:
        clusterName: cluster2
      network: network2
```

```bash
# Install on both clusters
istioctl install --context ctx-cluster1 -f cluster1-config.yaml -y
istioctl install --context ctx-cluster2 -f cluster2-config.yaml -y
```

## Step 3: Install East-West Gateways

Since the clusters are on different networks, they need east-west gateways for cross-cluster traffic:

```bash
# Generate and install east-west gateway for cluster1
samples/multicluster/gen-eastwest-gateway.sh \
  --mesh my-mesh --cluster cluster1 --network network1 | \
  istioctl install --context ctx-cluster1 -y -f -

# Wait for the gateway to get an external IP
kubectl get svc istio-eastwestgateway -n istio-system --context ctx-cluster1 -w

# Generate and install east-west gateway for cluster2
samples/multicluster/gen-eastwest-gateway.sh \
  --mesh my-mesh --cluster cluster2 --network network2 | \
  istioctl install --context ctx-cluster2 -y -f -

kubectl get svc istio-eastwestgateway -n istio-system --context ctx-cluster2 -w
```

Expose services through the east-west gateways:

```bash
# Apply the gateway configuration to expose services
kubectl apply --context ctx-cluster1 -n istio-system \
  -f samples/multicluster/expose-services.yaml

kubectl apply --context ctx-cluster2 -n istio-system \
  -f samples/multicluster/expose-services.yaml
```

The `expose-services.yaml` creates a Gateway resource that allows cross-cluster traffic:

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

## Step 4: Enable Cross-Cluster Discovery

Each cluster's istiod needs to know about services in the other cluster. This is done through remote secrets:

```bash
# Allow cluster1 to discover services in cluster2
istioctl create-remote-secret --context ctx-cluster2 --name cluster2 | \
  kubectl apply --context ctx-cluster1 -f -

# Allow cluster2 to discover services in cluster1
istioctl create-remote-secret --context ctx-cluster1 --name cluster1 | \
  kubectl apply --context ctx-cluster2 -f -
```

Verify the secrets were created:

```bash
kubectl get secrets -n istio-system --context ctx-cluster1 | grep istio-remote-secret
kubectl get secrets -n istio-system --context ctx-cluster2 | grep istio-remote-secret
```

## Step 5: Deploy a Test Application

Deploy the same application to both clusters:

```bash
# Create namespace with injection enabled
for CTX in ctx-cluster1 ctx-cluster2; do
  kubectl create ns sample --context ${CTX} --dry-run=client -o yaml | \
    kubectl apply --context ${CTX} -f -
  kubectl label ns sample istio-injection=enabled --context ${CTX} --overwrite
done

# Deploy helloworld v1 to cluster1
kubectl apply --context ctx-cluster1 -n sample -f - <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: helloworld-v1
spec:
  replicas: 2
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

# Deploy helloworld v2 to cluster2
kubectl apply --context ctx-cluster2 -n sample -f - <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: helloworld-v2
spec:
  replicas: 2
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

# Create the service in both clusters (must be identical)
for CTX in ctx-cluster1 ctx-cluster2; do
  kubectl apply --context ${CTX} -n sample -f - <<EOF
apiVersion: v1
kind: Service
metadata:
  name: helloworld
spec:
  selector:
    app: helloworld
  ports:
  - name: http
    port: 5000
    targetPort: 5000
EOF
done

# Deploy a sleep pod for testing in cluster1
kubectl apply --context ctx-cluster1 -n sample -f samples/sleep/sleep.yaml
```

## Step 6: Verify Cross-Cluster Communication

```bash
# Call helloworld repeatedly from cluster1
# You should see responses from both v1 (cluster1) and v2 (cluster2)
for i in $(seq 1 10); do
  kubectl exec --context ctx-cluster1 -n sample deploy/sleep -c sleep -- \
    curl -s http://helloworld.sample:5000/hello
done

# Expected output alternates between:
# Hello version: v1, instance: helloworld-v1-xxxxx
# Hello version: v2, instance: helloworld-v2-xxxxx
```

If you only see v1 responses, the cross-cluster discovery isn't working. Check:

```bash
# Verify endpoints include remote cluster pods
istioctl proxy-config endpoints deploy/sleep -n sample --context ctx-cluster1 | grep helloworld

# Check istiod logs for discovery issues
kubectl logs -l app=istiod -n istio-system --context ctx-cluster1 | grep -i "remote"

# Verify the east-west gateway has an external IP
kubectl get svc istio-eastwestgateway -n istio-system --context ctx-cluster2
```

## Step 7: Configure Locality Load Balancing

Control how traffic is distributed across clusters:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: helloworld
  namespace: sample
spec:
  host: helloworld.sample.svc.cluster.local
  trafficPolicy:
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 30s
      baseEjectionTime: 30s
    loadBalancer:
      localityLbSetting:
        enabled: true
        failover:
        - from: us-east-1  # cluster1 region
          to: us-west-1    # cluster2 region
```

With this, traffic stays local to the cluster when possible and fails over to the remote cluster when the local instances are unhealthy.

## Step 8: Unified Security Policies

Apply security policies that work across both clusters:

```yaml
# Apply to both clusters
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: default
  namespace: sample
spec:
  mtls:
    mode: STRICT

---
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: helloworld-access
  namespace: sample
spec:
  selector:
    matchLabels:
      app: helloworld
  action: ALLOW
  rules:
  - from:
    - source:
        principals:
        - "cluster.local/ns/sample/sa/sleep"
```

```bash
# Apply to both clusters
for CTX in ctx-cluster1 ctx-cluster2; do
  kubectl apply --context ${CTX} -f security-policies.yaml
done
```

## Troubleshooting

Common issues and how to fix them:

```bash
# Issue: Cross-cluster traffic not working
# Check 1: Verify east-west gateway has external IP
kubectl get svc istio-eastwestgateway -n istio-system --context ctx-cluster2

# Check 2: Verify remote secret is present and correct
kubectl get secrets -n istio-system --context ctx-cluster1 -o name | grep remote

# Check 3: Check istiod logs for errors
kubectl logs -l app=istiod -n istio-system --context ctx-cluster1 --tail=50 | grep -i error

# Check 4: Verify endpoints include remote pods
istioctl proxy-config endpoints deploy/sleep -n sample --context ctx-cluster1 | grep helloworld

# Check 5: Test connectivity to east-west gateway
EW_IP=$(kubectl get svc istio-eastwestgateway -n istio-system --context ctx-cluster2 -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
curl -v --max-time 5 https://${EW_IP}:15443 -k

# Issue: Certificate validation failures
# Check that both clusters use certs from the same root
istioctl proxy-config secret deploy/sleep -n sample --context ctx-cluster1
istioctl proxy-config secret deploy/helloworld-v2 -n sample --context ctx-cluster2
# The root cert should be identical
```

Setting up a multi-cluster mesh is more work upfront than a single cluster, but it pays off in resilience and flexibility. Once the mesh is connected, services communicate across clusters transparently, security policies are enforced consistently, and you can handle regional failures gracefully. Take the time to set it up correctly, test failover scenarios regularly, and monitor cross-cluster connectivity as a key health indicator.
