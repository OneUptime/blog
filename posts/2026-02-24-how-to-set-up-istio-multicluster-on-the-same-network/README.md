# How to Set Up Istio Multicluster on the Same Network

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, MultiCluster, Kubernetes, Networking, Service Mesh

Description: Learn how to configure Istio multicluster when your Kubernetes clusters share a flat network where pods can directly communicate with each other.

---

If your Kubernetes clusters share a flat network where pods can route to each other directly, you are in luck. The same-network multicluster setup is simpler than the different-network model because you do not need east-west gateways. Pods talk to each other directly across clusters, and Istio just needs to know about the endpoints in all clusters.

This setup is common when you have multiple clusters in the same VPC, when you use VPC peering, or when you are running clusters on a shared on-premises network. The key requirement is that a pod in cluster A can reach a pod in cluster B using its pod IP without any NAT or gateway in between.

## How It Works

In a same-network multicluster mesh, Istiod in each cluster (or a single shared control plane) discovers endpoints from all clusters. When a sidecar needs to route traffic to a remote service, it sends the request directly to the remote pod IP. There is no extra hop through a gateway, which means lower latency and simpler debugging.

The network label on the `istio-system` namespace is what tells Istio whether clusters share a network. When two clusters have the same network label, Istio knows pods can communicate directly.

## Prerequisites

- Two or more Kubernetes clusters on the same flat network
- Pod CIDR ranges must not overlap between clusters
- `istioctl` installed
- kubectl access to all clusters

```bash
export CTX_CLUSTER1=cluster1
export CTX_CLUSTER2=cluster2
```

## Step 1: Verify Network Connectivity

Before configuring anything, confirm that pods can reach each other across clusters. Deploy a simple pod on each cluster and test connectivity:

```bash
# On cluster 1, get a pod IP
kubectl run test-pod --image=nginx -n default --context="${CTX_CLUSTER1}"
POD_IP=$(kubectl get pod test-pod -n default --context="${CTX_CLUSTER1}" -o jsonpath='{.status.podIP}')

# From cluster 2, try to reach it
kubectl run curl-pod --image=curlimages/curl -n default --context="${CTX_CLUSTER2}" \
  --rm -it --restart=Never -- curl -s -o /dev/null -w "%{http_code}" http://${POD_IP}
```

If you get a 200 response, your network is flat and you can proceed.

## Step 2: Set Up Shared Trust

Both clusters need certificates from the same root CA:

```bash
mkdir -p certs && cd certs

make -f ../tools/certs/Makefile.selfsigned.mk root-ca
make -f ../tools/certs/Makefile.selfsigned.mk cluster1-cacerts
make -f ../tools/certs/Makefile.selfsigned.mk cluster2-cacerts
```

Create the secrets:

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

## Step 3: Apply the Same Network Label

This is the key part. Both clusters get the same network label:

```bash
kubectl label namespace istio-system topology.istio.io/network=network1 --context="${CTX_CLUSTER1}"
kubectl label namespace istio-system topology.istio.io/network=network1 --context="${CTX_CLUSTER2}"
```

When Istio sees matching network labels, it configures sidecars to connect directly to remote pod IPs rather than routing through gateways.

## Step 4: Install Istio on Both Clusters

For cluster 1:

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

For cluster 2:

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
      network: network1
```

```bash
istioctl install --context="${CTX_CLUSTER2}" -f cluster2.yaml
```

Notice that both configurations specify `network: network1`. This is intentional and matches the namespace labels.

## Step 5: Exchange Remote Secrets

Even on the same network, each Istiod needs to discover services in the other cluster. Remote secrets give each control plane read access to the other cluster's API server:

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

## Step 6: Deploy and Test

```bash
kubectl create namespace sample --context="${CTX_CLUSTER1}"
kubectl label namespace sample istio-injection=enabled --context="${CTX_CLUSTER1}"
kubectl apply -f samples/helloworld/helloworld.yaml -l version=v1 -n sample --context="${CTX_CLUSTER1}"
kubectl apply -f samples/helloworld/helloworld.yaml -l service=helloworld -n sample --context="${CTX_CLUSTER1}"

kubectl create namespace sample --context="${CTX_CLUSTER2}"
kubectl label namespace sample istio-injection=enabled --context="${CTX_CLUSTER2}"
kubectl apply -f samples/helloworld/helloworld.yaml -l version=v2 -n sample --context="${CTX_CLUSTER2}"
kubectl apply -f samples/helloworld/helloworld.yaml -l service=helloworld -n sample --context="${CTX_CLUSTER2}"

kubectl apply -f samples/sleep/sleep.yaml -n sample --context="${CTX_CLUSTER1}"
```

Send test requests:

```bash
SLEEP_POD=$(kubectl get pod -n sample -l app=sleep -o jsonpath='{.items[0].metadata.name}' --context="${CTX_CLUSTER1}")

for i in $(seq 1 20); do
  kubectl exec -n sample -c sleep "${SLEEP_POD}" --context="${CTX_CLUSTER1}" -- \
    curl -sS helloworld.sample:5000/hello
done
```

You should see a mix of v1 and v2 responses, confirming traffic flows across clusters.

## Verifying Direct Pod Connectivity

To confirm that traffic is going directly to remote pods (not through a gateway), check the endpoint configuration:

```bash
istioctl proxy-config endpoints "${SLEEP_POD}" -n sample --context="${CTX_CLUSTER1}" | grep helloworld
```

The output should show actual pod IPs from both clusters. If you were on different networks, you would see the east-west gateway IP instead of pod IPs for remote endpoints.

## Common Issues

**Overlapping Pod CIDRs**: If both clusters use the same pod CIDR range (like 10.244.0.0/16), you will get routing conflicts. Each cluster must have a unique pod CIDR. This is something you need to plan during cluster creation.

**Firewall rules**: Even on the same network, cloud providers might have firewall rules that block inter-cluster pod traffic. Make sure your VPC firewall rules allow traffic between the pod CIDR ranges of all clusters.

**DNS resolution**: Kubernetes DNS is cluster-local by default. Istio handles cross-cluster service resolution through its own mechanism, but if you are using headless services, you may need additional configuration.

## Advantages Over Different-Network Setup

The same-network model has several benefits. There is no east-west gateway to manage, which means fewer moving parts. Latency is lower because traffic goes directly between pods. Debugging is easier because you can trace connections without accounting for the gateway hop. And you do not need to worry about gateway capacity planning.

The tradeoff is that you need a flat network, which is not always possible, especially across cloud providers or between on-prem and cloud environments. But if you can arrange it, the same-network setup is the simplest path to multicluster Istio.
