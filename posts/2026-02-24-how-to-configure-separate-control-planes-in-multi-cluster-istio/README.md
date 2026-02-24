# How to Configure Separate Control Planes in Multi-Cluster Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Multi-Cluster, Control Plane, Kubernetes, High Availability

Description: Guide to setting up multi-cluster Istio where each cluster runs its own independent control plane for maximum resilience.

---

Running separate control planes means each cluster has its own istiod instance. This is the "primary-primary" model in Istio terminology. Each cluster is self-sufficient and can operate independently even if the other cluster goes down. The trade-off is that you have more components to manage, but you get much better fault isolation.

## Why Separate Control Planes

The shared control plane model has a single point of failure. If the primary cluster's istiod goes down, remote clusters can't get configuration updates or inject sidecars into new pods. With separate control planes:

- Each cluster operates independently
- Control plane failure in one cluster doesn't affect the others
- You can upgrade clusters independently
- There's no bottleneck on a single istiod

This is the recommended approach for production multi-cluster deployments where high availability matters.

## Architecture

Each cluster runs:
- Its own istiod
- Its own ingress and east-west gateways
- Its own sidecar injector

Cross-cluster service discovery happens through remote secrets. Each istiod watches the Kubernetes API of all clusters in the mesh to discover endpoints.

## Prerequisites

```bash
export CTX_CLUSTER1=cluster1
export CTX_CLUSTER2=cluster2

kubectl --context=${CTX_CLUSTER1} get nodes
kubectl --context=${CTX_CLUSTER2} get nodes
```

## Step 1: Shared Root CA

Even with separate control planes, the clusters need a shared root CA for mTLS to work across clusters:

```bash
mkdir -p certs && cd certs

openssl req -new -newkey rsa:4096 -x509 -sha256 \
  -days 3650 -nodes \
  -subj "/O=Istio/CN=Root CA" \
  -keyout root-key.pem -out root-cert.pem

for cluster in cluster1 cluster2; do
  openssl req -new -newkey rsa:4096 -nodes \
    -subj "/O=Istio/CN=Intermediate CA ${cluster}" \
    -keyout ${cluster}-ca-key.pem -out ${cluster}-ca-csr.pem

  openssl x509 -req -sha256 -days 3650 \
    -CA root-cert.pem -CAkey root-key.pem -CAcreateserial \
    -in ${cluster}-ca-csr.pem -out ${cluster}-ca-cert.pem
done

for ctx in ${CTX_CLUSTER1} ${CTX_CLUSTER2}; do
  kubectl --context=${ctx} create namespace istio-system
  kubectl --context=${ctx} create secret generic cacerts -n istio-system \
    --from-file=ca-cert.pem=${ctx}-ca-cert.pem \
    --from-file=ca-key.pem=${ctx}-ca-key.pem \
    --from-file=root-cert.pem=root-cert.pem \
    --from-file=cert-chain.pem=${ctx}-ca-cert.pem
done
```

## Step 2: Install Istio on Cluster 1

Each cluster gets a full Istio installation with the `default` profile:

```yaml
# cluster1-config.yaml
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

```bash
istioctl install --context=${CTX_CLUSTER1} -f cluster1-config.yaml -y
```

## Step 3: Install East-West Gateway on Cluster 1

```yaml
# eastwest-cluster1.yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  name: eastwest-cluster1
spec:
  profile: empty
  components:
    ingressGateways:
      - name: istio-eastwestgateway
        label:
          istio: eastwestgateway
          app: istio-eastwestgateway
          topology.istio.io/network: network1
        enabled: true
        k8s:
          env:
            - name: ISTIO_META_REQUESTED_NETWORK_VIEW
              value: network1
          service:
            ports:
              - name: status-port
                port: 15021
                targetPort: 15021
              - name: tls
                port: 15443
                targetPort: 15443
              - name: tls-istiod
                port: 15012
                targetPort: 15012
              - name: tls-webhook
                port: 15017
                targetPort: 15017
  values:
    global:
      meshID: mesh1
      multiCluster:
        clusterName: cluster1
      network: network1
```

```bash
istioctl install --context=${CTX_CLUSTER1} -f eastwest-cluster1.yaml -y
```

Expose services:

```bash
kubectl --context=${CTX_CLUSTER1} apply -n istio-system -f - <<EOF
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: cross-network-gateway
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
EOF
```

## Step 4: Install Istio on Cluster 2

Same process, different cluster name and network:

```yaml
# cluster2-config.yaml
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
      network: network2
```

```bash
istioctl install --context=${CTX_CLUSTER2} -f cluster2-config.yaml -y
```

Install east-west gateway and expose services on cluster 2 as well:

```yaml
# eastwest-cluster2.yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  name: eastwest-cluster2
spec:
  profile: empty
  components:
    ingressGateways:
      - name: istio-eastwestgateway
        label:
          istio: eastwestgateway
          app: istio-eastwestgateway
          topology.istio.io/network: network2
        enabled: true
        k8s:
          env:
            - name: ISTIO_META_REQUESTED_NETWORK_VIEW
              value: network2
          service:
            ports:
              - name: status-port
                port: 15021
                targetPort: 15021
              - name: tls
                port: 15443
                targetPort: 15443
              - name: tls-istiod
                port: 15012
                targetPort: 15012
              - name: tls-webhook
                port: 15017
                targetPort: 15017
  values:
    global:
      meshID: mesh1
      multiCluster:
        clusterName: cluster2
      network: network2
```

```bash
istioctl install --context=${CTX_CLUSTER2} -f eastwest-cluster2.yaml -y

kubectl --context=${CTX_CLUSTER2} apply -n istio-system -f - <<EOF
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: cross-network-gateway
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
EOF
```

## Step 5: Exchange Remote Secrets

This is where the magic happens. Each cluster's istiod needs access to the other cluster's API server:

```bash
istioctl create-remote-secret --context=${CTX_CLUSTER1} --name=cluster1 | \
  kubectl apply --context=${CTX_CLUSTER2} -f -

istioctl create-remote-secret --context=${CTX_CLUSTER2} --name=cluster2 | \
  kubectl apply --context=${CTX_CLUSTER1} -f -
```

After applying the remote secrets, each istiod will start watching the other cluster's API server. Check the istiod logs to confirm:

```bash
kubectl --context=${CTX_CLUSTER1} logs -n istio-system deploy/istiod --tail=20 | grep "remote cluster"
```

You should see messages about adding a remote cluster.

## Step 6: Verify Independent Operation

Test that each cluster can serve traffic independently:

```bash
# Deploy on cluster1
kubectl --context=${CTX_CLUSTER1} create namespace sample
kubectl --context=${CTX_CLUSTER1} label namespace sample istio-injection=enabled
kubectl --context=${CTX_CLUSTER1} apply -n sample -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/helloworld/helloworld.yaml
kubectl --context=${CTX_CLUSTER1} apply -n sample -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/sleep/sleep.yaml

# Deploy on cluster2
kubectl --context=${CTX_CLUSTER2} create namespace sample
kubectl --context=${CTX_CLUSTER2} label namespace sample istio-injection=enabled
kubectl --context=${CTX_CLUSTER2} apply -n sample -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/helloworld/helloworld.yaml
kubectl --context=${CTX_CLUSTER2} apply -n sample -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/sleep/sleep.yaml
```

Verify cross-cluster load balancing:

```bash
for i in $(seq 1 10); do
  kubectl --context=${CTX_CLUSTER1} exec -n sample deploy/sleep -c sleep -- \
    curl -s helloworld.sample:5000/hello
done
```

## Independent Upgrades

One of the biggest benefits of separate control planes is independent upgrades. You can upgrade one cluster while the other continues serving traffic. The recommended approach:

1. Upgrade cluster1's istiod
2. Verify cluster1 is healthy
3. Upgrade cluster1's data plane (restart workloads)
4. Repeat for cluster2

```bash
# Upgrade cluster1 only
istioctl upgrade --context=${CTX_CLUSTER1} -f cluster1-config.yaml -y

# Verify
istioctl --context=${CTX_CLUSTER1} proxy-status

# Restart workloads to pick up new sidecar
kubectl --context=${CTX_CLUSTER1} rollout restart deployment -n sample
```

The Istio version skew policy allows control planes to be at most one minor version apart, so you have time to upgrade the second cluster.

## Monitoring Both Control Planes

Keep an eye on both istiod instances:

```bash
# Check proxy status on both clusters
istioctl --context=${CTX_CLUSTER1} proxy-status
istioctl --context=${CTX_CLUSTER2} proxy-status

# Check istiod resource usage
kubectl --context=${CTX_CLUSTER1} top pod -n istio-system -l app=istiod
kubectl --context=${CTX_CLUSTER2} top pod -n istio-system -l app=istiod
```

Watch for `STALE` proxies, which indicate connectivity issues between the sidecar and its control plane.

Separate control planes give you the strongest multi-cluster setup in terms of resilience. Each cluster is fully autonomous, and the remote secrets provide cross-cluster service discovery without creating a hard dependency. For production workloads where downtime in one cluster shouldn't affect another, this is the way to go.
