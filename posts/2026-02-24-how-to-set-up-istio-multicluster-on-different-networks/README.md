# How to Set Up Istio Multicluster on Different Networks

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, MultiCluster, Networking, Kubernetes, Service Mesh

Description: Step-by-step instructions for setting up Istio multicluster when clusters are on separate networks that cannot directly route pod traffic between them.

---

When your Kubernetes clusters sit on different networks - think different VPCs, different cloud providers, or on-prem mixed with cloud - pods in one cluster cannot directly reach pods in the other. Istio handles this by routing cross-cluster traffic through east-west gateways. These gateways act as bridges between the networks, tunneling mesh traffic through mTLS connections.

This is different from the same-network setup where pods can talk directly. The different-network model adds a gateway hop, but it works across any network topology, which makes it the more common choice for real-world multicluster deployments.

## Architecture Overview

In a different-network setup, each cluster gets an east-west gateway. When a service in cluster 1 needs to reach a service in cluster 2, the sidecar proxy in cluster 1 routes the request to the east-west gateway in cluster 2 instead of trying to reach the pod directly. The gateway then forwards the request to the actual pod.

Istio handles all of this transparently. Your applications just call services by name, and the mesh figures out the routing.

## Prerequisites

- Two Kubernetes clusters on separate networks
- `istioctl` CLI installed
- kubectl access to both clusters
- Each cluster's east-west gateway must be reachable from the other cluster (typically via a LoadBalancer service)

Set up your contexts:

```bash
export CTX_CLUSTER1=cluster1
export CTX_CLUSTER2=cluster2
```

## Step 1: Configure Shared Trust

Generate certificates so both clusters trust each other:

```bash
mkdir -p certs
pushd certs

# Generate root CA
make -f ../tools/certs/Makefile.selfsigned.mk root-ca

# Generate per-cluster intermediate certs
make -f ../tools/certs/Makefile.selfsigned.mk cluster1-cacerts
make -f ../tools/certs/Makefile.selfsigned.mk cluster2-cacerts
popd
```

Apply the CA secrets:

```bash
for ctx in "${CTX_CLUSTER1}" "${CTX_CLUSTER2}"; do
  cluster_name=$(echo $ctx | tr '[:upper:]' '[:lower:]')
  kubectl create namespace istio-system --context="${ctx}"
  kubectl create secret generic cacerts -n istio-system --context="${ctx}" \
    --from-file=certs/${cluster_name}/ca-cert.pem \
    --from-file=certs/${cluster_name}/ca-key.pem \
    --from-file=certs/${cluster_name}/root-cert.pem \
    --from-file=certs/${cluster_name}/cert-chain.pem
done
```

## Step 2: Label Networks

This is the critical difference from same-network setups. Each cluster gets a different network label:

```bash
kubectl label namespace istio-system topology.istio.io/network=network1 --context="${CTX_CLUSTER1}"
kubectl label namespace istio-system topology.istio.io/network=network2 --context="${CTX_CLUSTER2}"
```

These labels tell Istio that pods across clusters cannot communicate directly.

## Step 3: Install Istio on Cluster 1

```yaml
# cluster1.yaml
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
istioctl install --context="${CTX_CLUSTER1}" -f cluster1.yaml
```

## Step 4: Install the East-West Gateway on Cluster 1

The east-west gateway is what allows traffic to flow between networks. Istio provides a generation command for this:

```bash
samples/multicluster/gen-eastwest-gateway.sh \
  --network network1 | \
  istioctl install --context="${CTX_CLUSTER1}" -f -
```

Wait for the gateway to get an external IP:

```bash
kubectl get svc istio-eastwestgateway -n istio-system --context="${CTX_CLUSTER1}"
```

Then expose services through the gateway:

```bash
kubectl apply -n istio-system -f samples/multicluster/expose-services.yaml --context="${CTX_CLUSTER1}"
```

The `expose-services.yaml` creates a Gateway resource that allows mTLS traffic on port 15443:

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

## Step 5: Install Istio and East-West Gateway on Cluster 2

```yaml
# cluster2.yaml
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
istioctl install --context="${CTX_CLUSTER2}" -f cluster2.yaml

samples/multicluster/gen-eastwest-gateway.sh \
  --network network2 | \
  istioctl install --context="${CTX_CLUSTER2}" -f -

kubectl apply -n istio-system -f samples/multicluster/expose-services.yaml --context="${CTX_CLUSTER2}"
```

## Step 6: Exchange Remote Secrets

```bash
istioctl create-remote-secret \
  --context="${CTX_CLUSTER1}" \
  --name=cluster1 | \
  kubectl apply -f - --context="${CTX_CLUSTER2}"

istioctl create-remote-secret \
  --context="${CTX_CLUSTER2}" \
  --name=cluster2 | \
  kubectl apply -f - --context="${CTX_CLUSTER1}"
```

## Step 7: Verify Cross-Network Communication

Deploy test workloads:

```bash
# Deploy helloworld v1 on cluster 1
kubectl create namespace sample --context="${CTX_CLUSTER1}"
kubectl label namespace sample istio-injection=enabled --context="${CTX_CLUSTER1}"
kubectl apply -f samples/helloworld/helloworld.yaml -l version=v1 -n sample --context="${CTX_CLUSTER1}"
kubectl apply -f samples/helloworld/helloworld.yaml -l service=helloworld -n sample --context="${CTX_CLUSTER1}"

# Deploy helloworld v2 on cluster 2
kubectl create namespace sample --context="${CTX_CLUSTER2}"
kubectl label namespace sample istio-injection=enabled --context="${CTX_CLUSTER2}"
kubectl apply -f samples/helloworld/helloworld.yaml -l version=v2 -n sample --context="${CTX_CLUSTER2}"
kubectl apply -f samples/helloworld/helloworld.yaml -l service=helloworld -n sample --context="${CTX_CLUSTER2}"

# Deploy sleep client
kubectl apply -f samples/sleep/sleep.yaml -n sample --context="${CTX_CLUSTER1}"
```

Test the connection:

```bash
for i in $(seq 1 10); do
  kubectl exec -n sample -c sleep \
    "$(kubectl get pod -n sample -l app=sleep -o jsonpath='{.items[0].metadata.name}' --context="${CTX_CLUSTER1}")" \
    --context="${CTX_CLUSTER1}" -- curl -sS helloworld.sample:5000/hello
done
```

You should see responses from both v1 and v2, confirming that traffic flows across networks through the east-west gateways.

## Debugging Network Issues

If cross-cluster calls fail, check these things in order:

1. Verify the east-west gateway has an external IP and is reachable from the other cluster
2. Check that the `expose-services.yaml` Gateway resource exists
3. Look at the Istiod logs for remote cluster connection errors
4. Verify that the AUTO_PASSTHROUGH TLS mode is working by checking gateway access logs

```bash
# Check east-west gateway logs
kubectl logs -n istio-system -l istio=eastwestgateway --context="${CTX_CLUSTER1}"

# Verify endpoints are discovered
istioctl proxy-config endpoints \
  "$(kubectl get pod -n sample -l app=sleep -o jsonpath='{.items[0].metadata.name}' --context="${CTX_CLUSTER1}")" \
  -n sample --context="${CTX_CLUSTER1}" | grep helloworld
```

The endpoints output should show addresses from both clusters. Remote endpoints will show the east-west gateway IP rather than individual pod IPs.

## Performance Considerations

The extra gateway hop adds some latency. In practice, this is usually a few milliseconds, which is negligible compared to cross-region network latency. If you are running clusters in different regions, the gateway overhead is a rounding error compared to the network round-trip time.

For high-throughput services, make sure your east-west gateway has enough replicas and CPU resources. The gateway handles all cross-cluster traffic, so it can become a bottleneck if undersized.

The different-network multicluster model is the most flexible option Istio offers. It works across cloud providers, across regions, and between on-prem and cloud without requiring any special network configuration like VPC peering. The tradeoff is the extra gateway component, but for most organizations, that is a small price for the connectivity it provides.
