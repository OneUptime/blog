# How to Configure Primary-Remote Multicluster Deployment in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, MultiCluster, Primary-Remote, Kubernetes, Control Plane

Description: How to set up a primary-remote Istio multicluster deployment where one cluster runs the control plane and remotes connect to it.

---

The primary-remote model is the simplest way to run Istio across multiple Kubernetes clusters. One cluster (the primary) runs the full Istio control plane. Other clusters (the remotes) run only the data plane proxies and connect back to the primary cluster's istiod for configuration and certificates. This reduces operational overhead because you only manage one control plane, but it does introduce a dependency on the primary cluster.

## When to Use Primary-Remote

Primary-remote is a good fit when:

- You have a main cluster and satellite clusters that do not need independent mesh control
- You want to minimize the operational burden of managing multiple control planes
- The remote clusters have reliable network connectivity to the primary cluster
- You accept that a primary cluster failure affects remote clusters' ability to get configuration updates

It is not a great fit when:

- Remote clusters must operate fully independently
- Network between clusters is unreliable
- You need the strongest possible availability guarantees

## Architecture

In a primary-remote setup:

- **Primary cluster** runs istiod, manages configuration, and issues certificates
- **Remote clusters** run Envoy sidecars that connect to the primary's istiod
- Service discovery works across clusters - services in the remote cluster are visible in the primary and vice versa

The primary cluster's istiod watches both clusters' Kubernetes APIs to discover services and endpoints.

## Prerequisites

You need:

1. Two Kubernetes clusters with network connectivity
2. kubectl configured with contexts for both clusters
3. The primary cluster must be reachable from remote cluster pods (specifically, istiod's port 15012)

```bash
export CTX_PRIMARY=primary-cluster
export CTX_REMOTE=remote-cluster
```

## Step 1: Set Up a Shared Root CA

Both clusters need to trust each other for mTLS. From the top-level directory of the Istio release package, create a shared root CA and per-cluster intermediate certificates:

```bash
mkdir -p certs
pushd certs

# Create root CA
make -f ../tools/certs/Makefile.selfsigned.mk root-ca

# Create intermediate CA for primary and remote
make -f ../tools/certs/Makefile.selfsigned.mk primary-cacerts
make -f ../tools/certs/Makefile.selfsigned.mk remote-cacerts

popd
```

Install the CA secrets:

```bash
# Primary cluster
kubectl create namespace istio-system --context=$CTX_PRIMARY
kubectl label namespace istio-system topology.istio.io/network=network1 \
  --context=$CTX_PRIMARY
kubectl create secret generic cacerts -n istio-system \
  --context=$CTX_PRIMARY \
  --from-file=certs/primary/ca-cert.pem \
  --from-file=certs/primary/ca-key.pem \
  --from-file=certs/primary/root-cert.pem \
  --from-file=certs/primary/cert-chain.pem

# Remote cluster
kubectl create namespace istio-system --context=$CTX_REMOTE
kubectl annotate namespace istio-system topology.istio.io/controlPlaneClusters=primary \
  --context=$CTX_REMOTE
kubectl label namespace istio-system topology.istio.io/network=network2 \
  --context=$CTX_REMOTE
kubectl create secret generic cacerts -n istio-system \
  --context=$CTX_REMOTE \
  --from-file=certs/remote/ca-cert.pem \
  --from-file=certs/remote/ca-key.pem \
  --from-file=certs/remote/root-cert.pem \
  --from-file=certs/remote/cert-chain.pem
```

## Step 2: Install Istio on the Primary Cluster

Configure the primary cluster with full Istio including the control plane:

```yaml
# primary-cluster.yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  values:
    global:
      meshID: my-mesh
      multiCluster:
        clusterName: primary
      network: network1
      externalIstiod: true
  components:
    pilot:
      k8s:
        replicaCount: 3
        resources:
          requests:
            cpu: 500m
            memory: 1Gi
          limits:
            cpu: 2000m
            memory: 4Gi
  meshConfig:
    defaultConfig:
      proxyMetadata:
        ISTIO_META_DNS_CAPTURE: "true"
        ISTIO_META_DNS_AUTO_ALLOCATE: "true"
```

```bash
istioctl install --context=$CTX_PRIMARY -f primary-cluster.yaml
```

## Step 3: Expose Istiod to Remote Clusters

The remote cluster's proxies need to reach istiod. If the clusters are on different networks, expose istiod through the east-west gateway:

```bash
# Install the east-west gateway on the primary cluster
samples/multicluster/gen-eastwest-gateway.sh \
  --network network1 | \
  istioctl install --context=$CTX_PRIMARY -y -f -
```

Expose istiod through the gateway:

```bash
kubectl apply --context=$CTX_PRIMARY -n istio-system \
  -f samples/multicluster/expose-istiod.yaml
```

Get the east-west gateway's external IP:

```bash
kubectl get svc istio-eastwestgateway -n istio-system --context=$CTX_PRIMARY
```

## Step 4: Install Istio on the Remote Cluster

The remote cluster gets a minimal Istio installation - no control plane, just the data plane components configured to connect to the primary:

```yaml
# remote-cluster.yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  profile: remote
  values:
    istiodRemote:
      injectionPath: /inject/cluster/remote/net/network2
    global:
      meshID: my-mesh
      multiCluster:
        clusterName: remote
      network: network2
      remotePilotAddress: <EAST_WEST_GATEWAY_IP>
```

Replace `<EAST_WEST_GATEWAY_IP>` with the external IP of the east-west gateway from the previous step.

```bash
istioctl install --context=$CTX_REMOTE -f remote-cluster.yaml
```

## Step 5: Give the Primary Access to the Remote's API

The primary cluster's istiod needs to watch the remote cluster's Kubernetes API for service discovery:

```bash
istioctl create-remote-secret \
  --context=$CTX_REMOTE \
  --name=remote | \
  kubectl apply -f - --context=$CTX_PRIMARY
```

Because the clusters are on different networks, install an east-west gateway for the remote cluster and expose cross-network service traffic:

```bash
samples/multicluster/gen-eastwest-gateway.sh \
  --network network2 | \
  istioctl install --context=$CTX_REMOTE -y -f -

kubectl apply --context=$CTX_PRIMARY -n istio-system \
  -f samples/multicluster/expose-services.yaml
```

Verify the remote cluster is connected:

```bash
kubectl get secrets -n istio-system --context=$CTX_PRIMARY | grep remote
```

Check istiod logs on the primary for remote cluster connection:

```bash
kubectl logs -l app=istiod -n istio-system --context=$CTX_PRIMARY | grep "remote"
```

## Step 6: Verify the Setup

Deploy a test service on the remote cluster:

```bash
kubectl create namespace sample --context=$CTX_REMOTE
kubectl label namespace sample istio-injection=enabled --context=$CTX_REMOTE
kubectl apply --context=$CTX_REMOTE -n sample -f - <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: hello
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
        image: nginx
        ports:
        - containerPort: 80
---
apiVersion: v1
kind: Service
metadata:
  name: hello
spec:
  selector:
    app: hello
  ports:
  - port: 80
EOF
```

Test from the primary cluster:

```bash
kubectl create namespace sample --context=$CTX_PRIMARY
kubectl label namespace sample istio-injection=enabled --context=$CTX_PRIMARY

kubectl run client --image=curlimages/curl -n sample \
  --context=$CTX_PRIMARY -- sleep infinity

# Wait for the pod to start
kubectl exec client -n sample --context=$CTX_PRIMARY -- \
  curl -s hello.sample.svc.cluster.local
```

Check that the remote service's endpoints are visible on the primary:

```bash
istioctl proxy-config endpoints client.sample --context=$CTX_PRIMARY | grep hello
```

## Failover Configuration

Configure locality-based failover so traffic stays local when possible:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: hello
  namespace: sample
spec:
  host: hello.sample.svc.cluster.local
  trafficPolicy:
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 30s
      baseEjectionTime: 30s
    loadBalancer:
      localityLbSetting:
        enabled: true
```

## Monitoring the Primary-Remote Setup

Key things to monitor:

```bash
# Check remote cluster connectivity from istiod
kubectl logs -l app=istiod -n istio-system --context=$CTX_PRIMARY | grep "cluster=remote"

# Check proxy sync status across both clusters
istioctl proxy-status --context=$CTX_PRIMARY

# Check that remote proxies are connected
istioctl proxy-status --context=$CTX_PRIMARY | grep "remote"
```

Prometheus queries for cross-cluster health:

```promql
# Config push latency to remote proxies
histogram_quantile(0.99,
  sum(rate(pilot_proxy_convergence_time_bucket[5m])) by (le)
)

# Connected proxies from remote cluster
pilot_xds{type="ads", cluster="remote"}
```

## Handling Primary Cluster Failures

If the primary cluster goes down:

1. Remote cluster proxies continue with their last known configuration
2. No new configuration can be pushed
3. No new certificates can be issued (existing ones have a 24-hour TTL by default)
4. New pods on the remote cluster will not get sidecar injection

To mitigate this:

- Keep the primary cluster highly available (3+ istiod replicas, multi-AZ)
- Consider increasing certificate TTL for remote clusters
- Have a procedure to promote a remote to primary if needed
- Monitor primary cluster health closely

## Summary

Primary-remote multicluster in Istio centralizes the control plane on one cluster while remote clusters run only the data plane. The setup involves shared root CAs, east-west gateways for cross-network communication, and remote secrets for API access. This model is simpler to operate than primary-primary since you manage only one control plane, but it creates a dependency on the primary cluster. Keep the primary highly available and monitor cross-cluster connectivity to ensure remote proxies stay in sync.
