# How to Set Up Multi-Network Multi-Cluster Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Multi-Cluster, Multi-Network, Kubernetes, Service Mesh

Description: How to configure Istio across multiple clusters on separate networks using east-west gateways for cross-cluster communication.

---

When your Kubernetes clusters live on different networks and pods can't directly reach each other by IP, you need a multi-network setup. This is the more common scenario in practice. Maybe you have one cluster in AWS and another in GCP, or two clusters in different VPCs without peering. Istio handles this by routing cross-cluster traffic through east-west gateways.

## How Multi-Network Istio Works

In a multi-network setup, each cluster gets labeled with a network identifier. When a service in cluster1 needs to talk to a service in cluster2, the traffic flows like this:

1. The sidecar in cluster1 sends traffic to the east-west gateway in cluster2
2. The east-west gateway in cluster2 terminates the mTLS connection and routes to the destination pod
3. The response follows the reverse path

This means cross-cluster traffic always goes through a gateway, which adds a small amount of latency but works across any network topology.

## Prerequisites

- Two Kubernetes clusters on separate networks
- istioctl installed (1.20+)
- kubectl contexts for both clusters
- A shared root CA (or the ability to create one)

```bash
export CTX_CLUSTER1=cluster1
export CTX_CLUSTER2=cluster2

# Verify access
kubectl --context=${CTX_CLUSTER1} get nodes
kubectl --context=${CTX_CLUSTER2} get nodes
```

## Step 1: Set Up the Shared Trust Domain

Just like flat network setups, multi-network Istio requires a shared root CA. Generate it if you haven't already:

```bash
mkdir -p certs && cd certs

# Root CA
openssl req -new -newkey rsa:4096 -x509 -sha256 \
  -days 3650 -nodes \
  -subj "/O=Istio/CN=Root CA" \
  -keyout root-key.pem -out root-cert.pem

# Intermediate CAs for each cluster
for cluster in cluster1 cluster2; do
  openssl req -new -newkey rsa:4096 -nodes \
    -subj "/O=Istio/CN=Intermediate CA ${cluster}" \
    -keyout ${cluster}-ca-key.pem -out ${cluster}-ca-csr.pem

  openssl x509 -req -sha256 -days 3650 \
    -CA root-cert.pem -CAkey root-key.pem -CAcreateserial \
    -in ${cluster}-ca-csr.pem -out ${cluster}-ca-cert.pem
done
```

Install the CA secrets:

```bash
for ctx in ${CTX_CLUSTER1} ${CTX_CLUSTER2}; do
  cluster=$(echo ${ctx})
  kubectl --context=${ctx} create namespace istio-system
  kubectl --context=${ctx} create secret generic cacerts -n istio-system \
    --from-file=ca-cert.pem=${cluster}-ca-cert.pem \
    --from-file=ca-key.pem=${cluster}-ca-key.pem \
    --from-file=root-cert.pem=root-cert.pem \
    --from-file=cert-chain.pem=${cluster}-ca-cert.pem
done
```

## Step 2: Install Istio on Cluster 1

The key difference from flat networking is the `network` label. Each cluster gets a unique network name:

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

## Step 3: Install the East-West Gateway on Cluster 1

The east-west gateway handles incoming cross-cluster traffic. Generate the gateway configuration:

```bash
samples/multicluster/gen-eastwest-gateway.sh --network network1 | \
  istioctl --context=${CTX_CLUSTER1} install -y -f -
```

If you don't have the Istio samples directory, create the gateway manually:

```yaml
# eastwest-gateway-cluster1.yaml
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
istioctl install --context=${CTX_CLUSTER1} -f eastwest-gateway-cluster1.yaml -y
```

Wait for the gateway to get an external IP:

```bash
kubectl --context=${CTX_CLUSTER1} get svc -n istio-system istio-eastwestgateway
```

Expose services through the east-west gateway:

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

Repeat the same process for cluster 2 with `network2`:

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

Install the east-west gateway on cluster 2 as well (same process, different network name):

```yaml
# eastwest-gateway-cluster2.yaml
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
istioctl install --context=${CTX_CLUSTER2} -f eastwest-gateway-cluster2.yaml -y
```

Apply the cross-network gateway on cluster 2:

```bash
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

```bash
istioctl create-remote-secret --context=${CTX_CLUSTER2} --name=cluster2 | \
  kubectl apply --context=${CTX_CLUSTER1} -f -

istioctl create-remote-secret --context=${CTX_CLUSTER1} --name=cluster1 | \
  kubectl apply --context=${CTX_CLUSTER2} -f -
```

## Step 6: Verify

Deploy test workloads and confirm cross-cluster routing goes through the gateway:

```bash
# Deploy in both clusters
for ctx in ${CTX_CLUSTER1} ${CTX_CLUSTER2}; do
  kubectl --context=${ctx} create namespace sample
  kubectl --context=${ctx} label namespace sample istio-injection=enabled
done

# Test connectivity
kubectl --context=${CTX_CLUSTER1} apply -n sample -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/sleep/sleep.yaml
kubectl --context=${CTX_CLUSTER2} apply -n sample -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/helloworld/helloworld.yaml
```

Check that the proxy config shows the east-west gateway as an endpoint:

```bash
istioctl --context=${CTX_CLUSTER1} proxy-config endpoints deploy/sleep -n sample | grep helloworld
```

You should see endpoints pointing to the east-west gateway's external IP on port 15443, not directly to pod IPs.

Multi-network multi-cluster is the go-to setup when your clusters can't talk to each other directly. The east-west gateways bridge the network gap, and Istio handles the routing transparently. The main thing to remember is that every cluster needs its own east-west gateway and a unique network label.
