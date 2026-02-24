# How to Set Up Istio Multi-Primary on Different Networks

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Multi-Cluster, Kubernetes, Service Mesh, East-West Gateway

Description: Step-by-step guide to deploying Istio in multi-primary mode when your Kubernetes clusters are on separate networks and pods cannot directly reach each other.

---

When your Kubernetes clusters live on different networks (separate VPCs, different cloud providers, or isolated subnets where pod IPs are not directly routable), you still get the benefits of multi-primary Istio. The trick is that cross-cluster traffic flows through east-west gateways instead of direct pod-to-pod connections.

This guide covers the full setup, including the additional gateway configuration that makes cross-network communication possible.

## How Different-Network Multi-Primary Works

In this topology, each cluster runs its own Istiod control plane. Both control planes discover services from both clusters using remote secrets, just like the same-network model. The difference is that pods in cluster1 cannot directly reach pods in cluster2 by IP. Instead, Istio routes cross-cluster traffic through dedicated east-west gateways that expose cluster services to the other cluster.

The east-west gateway is essentially an Istio ingress gateway that listens on port 15443 with SNI-based routing. When a sidecar in cluster1 needs to reach a service that lives in cluster2, it sends traffic to cluster2's east-west gateway, which then routes it to the correct pod internally.

## Prerequisites

You need two Kubernetes clusters with separate networks. Set up your context variables:

```bash
export CTX_CLUSTER1=cluster1
export CTX_CLUSTER2=cluster2
```

Make sure you have `istioctl` 1.20+ and `kubectl` configured for both clusters.

## Step 1: Create a Shared Root CA

This step is identical to any multi-cluster setup. Both clusters must share a root certificate authority:

```bash
mkdir -p certs
pushd certs

make -f ../tools/certs/Makefile.selfsigned.mk root-ca
make -f ../tools/certs/Makefile.selfsigned.mk cluster1-cacerts
make -f ../tools/certs/Makefile.selfsigned.mk cluster2-cacerts
```

Apply the intermediate certs to each cluster:

```bash
kubectl create namespace istio-system --context="${CTX_CLUSTER1}"
kubectl create secret generic cacerts -n istio-system --context="${CTX_CLUSTER1}" \
  --from-file=cluster1/ca-cert.pem \
  --from-file=cluster1/ca-key.pem \
  --from-file=cluster1/root-cert.pem \
  --from-file=cluster1/cert-chain.pem

kubectl create namespace istio-system --context="${CTX_CLUSTER2}"
kubectl create secret generic cacerts -n istio-system --context="${CTX_CLUSTER2}" \
  --from-file=cluster2/ca-cert.pem \
  --from-file=cluster2/ca-key.pem \
  --from-file=cluster2/root-cert.pem \
  --from-file=cluster2/cert-chain.pem
```

```bash
popd
```

## Step 2: Label Clusters with Different Networks

This is the key difference from same-network setups. Each cluster gets a distinct network label:

```bash
kubectl label namespace istio-system topology.istio.io/network=network1 --context="${CTX_CLUSTER1}"
kubectl label namespace istio-system topology.istio.io/network=network2 --context="${CTX_CLUSTER2}"
```

When Istio sees that endpoints are on a different network, it knows to route traffic through the east-west gateway instead of trying direct pod connections.

## Step 3: Install Istio on Cluster 1

```yaml
# cluster1-config.yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  values:
    global:
      meshID: mesh1
      multiCluster:
        clusterName: cluster1
      network: network1
```

```bash
istioctl install --context="${CTX_CLUSTER1}" -f cluster1-config.yaml -y
```

## Step 4: Install the East-West Gateway on Cluster 1

After Istio is installed, deploy the east-west gateway. Istio provides a helper for this:

```bash
samples/multicluster/gen-eastwest-gateway.sh \
  --network network1 | \
  istioctl install --context="${CTX_CLUSTER1}" -y -f -
```

Wait for the gateway to get an external IP:

```bash
kubectl get svc istio-eastwestgateway -n istio-system --context="${CTX_CLUSTER1}"
```

Once it has an external IP, expose services through this gateway:

```bash
kubectl apply -n istio-system -f samples/multicluster/expose-services.yaml --context="${CTX_CLUSTER1}"
```

The `expose-services.yaml` file creates a Gateway resource that matches all services on port 15443:

```yaml
apiVersion: networking.istio.io/v1beta1
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

## Step 5: Install Istio on Cluster 2

```yaml
# cluster2-config.yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  values:
    global:
      meshID: mesh1
      multiCluster:
        clusterName: cluster2
      network: network2
```

```bash
istioctl install --context="${CTX_CLUSTER2}" -f cluster2-config.yaml -y
```

## Step 6: Install the East-West Gateway on Cluster 2

```bash
samples/multicluster/gen-eastwest-gateway.sh \
  --network network2 | \
  istioctl install --context="${CTX_CLUSTER2}" -y -f -
```

Wait for the external IP, then expose services:

```bash
kubectl get svc istio-eastwestgateway -n istio-system --context="${CTX_CLUSTER2}"
kubectl apply -n istio-system -f samples/multicluster/expose-services.yaml --context="${CTX_CLUSTER2}"
```

## Step 7: Enable Cross-Cluster Discovery

Just like the same-network setup, create bilateral remote secrets:

```bash
istioctl create-remote-secret \
  --context="${CTX_CLUSTER2}" \
  --name=cluster2 | \
  kubectl apply -f - --context="${CTX_CLUSTER1}"

istioctl create-remote-secret \
  --context="${CTX_CLUSTER1}" \
  --name=cluster1 | \
  kubectl apply -f - --context="${CTX_CLUSTER2}"
```

## Step 8: Verify Cross-Cluster Communication

Deploy the helloworld sample across both clusters:

```bash
kubectl create namespace sample --context="${CTX_CLUSTER1}"
kubectl label namespace sample istio-injection=enabled --context="${CTX_CLUSTER1}"
kubectl apply -f samples/helloworld/helloworld.yaml -l version=v1 -n sample --context="${CTX_CLUSTER1}"
kubectl apply -f samples/helloworld/helloworld.yaml -l service=helloworld -n sample --context="${CTX_CLUSTER1}"
kubectl apply -f samples/sleep/sleep.yaml -n sample --context="${CTX_CLUSTER1}"

kubectl create namespace sample --context="${CTX_CLUSTER2}"
kubectl label namespace sample istio-injection=enabled --context="${CTX_CLUSTER2}"
kubectl apply -f samples/helloworld/helloworld.yaml -l version=v2 -n sample --context="${CTX_CLUSTER2}"
kubectl apply -f samples/helloworld/helloworld.yaml -l service=helloworld -n sample --context="${CTX_CLUSTER2}"
kubectl apply -f samples/sleep/sleep.yaml -n sample --context="${CTX_CLUSTER2}"
```

Test from cluster1:

```bash
for i in $(seq 1 10); do
  kubectl exec -n sample -c sleep \
    "$(kubectl get pod -n sample -l app=sleep -o jsonpath='{.items[0].metadata.name}' --context=${CTX_CLUSTER1})" \
    --context="${CTX_CLUSTER1}" -- curl -sS helloworld.sample:5000/hello
done
```

You should see responses from both v1 (local) and v2 (remote via east-west gateway).

## Troubleshooting

**No responses from remote cluster:** Check that the east-west gateway has an external IP and that the expose-services Gateway resource is applied. Also verify the network labels are correct and different between clusters.

**TLS handshake failures:** Make sure both clusters use certificates from the same root CA. Check the cacerts secret in istio-system.

**Check east-west gateway logs:**

```bash
kubectl logs -n istio-system -l app=istio-eastwestgateway --context="${CTX_CLUSTER1}"
```

**Verify endpoint discovery:**

```bash
istioctl proxy-config endpoints \
  "$(kubectl get pod -n sample -l app=sleep -o jsonpath='{.items[0].metadata.name}' --context=${CTX_CLUSTER1})" \
  -n sample --context="${CTX_CLUSTER1}" | grep helloworld
```

You should see endpoints pointing to both local pod IPs and the remote east-west gateway IP.

## Performance Considerations

Cross-network traffic goes through an extra hop (the east-west gateway), which adds some latency. For latency-sensitive workloads, you can use locality-aware load balancing to prefer local endpoints and only fall back to remote endpoints when local ones are unhealthy. This happens naturally with Istio's locality settings.

The multi-primary multi-network topology is the most common production setup for organizations running Kubernetes across multiple cloud regions or providers. It gives you full control plane redundancy and works even when your clusters cannot share a flat network.
