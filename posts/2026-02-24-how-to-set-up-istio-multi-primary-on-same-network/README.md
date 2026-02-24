# How to Set Up Istio Multi-Primary on Same Network

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Multi-Cluster, Kubernetes, Service Mesh, Multi-Primary

Description: A practical guide to deploying Istio in multi-primary mode across two Kubernetes clusters that share the same flat network.

---

Running Istio across multiple Kubernetes clusters is one of the more advanced configurations you can tackle, but it is also one of the most rewarding. When your clusters sit on the same network (meaning pods can reach each other directly by IP), the multi-primary topology gives you a fully redundant control plane setup where each cluster runs its own Istiod and both clusters share service discovery.

This guide walks through the full setup from scratch, including prerequisites, certificate configuration, installation on both clusters, and verification.

## Why Multi-Primary on the Same Network?

The multi-primary model means every cluster has its own Istio control plane. Workloads in cluster1 talk to the local Istiod, and workloads in cluster2 talk to their local Istiod. But both control planes are aware of services running in the other cluster.

Because the clusters share a flat network, pods can communicate directly without needing an east-west gateway. That simplifies things considerably compared to multi-network setups. You get high availability for your control plane, locality-aware routing, and cross-cluster service discovery all at once.

## Prerequisites

You need two Kubernetes clusters. For this walkthrough, I will call them `cluster1` and `cluster2`. Both clusters need to be on the same network (for example, they share a VPC or are connected via VPC peering with full pod CIDR reachability).

Make sure you have:

- `kubectl` installed and configured to talk to both clusters
- `istioctl` version 1.20+ installed
- Cluster contexts named `cluster1` and `cluster2` in your kubeconfig

Set up your context variables:

```bash
export CTX_CLUSTER1=cluster1
export CTX_CLUSTER2=cluster2
```

## Step 1: Create a Shared Root CA

Both clusters need to trust each other's workload certificates. The easiest way to achieve this is to use the same root certificate authority and generate intermediate CAs for each cluster.

Start by creating the root certificate:

```bash
mkdir -p certs
pushd certs

# Generate root CA
make -f ../tools/certs/Makefile.selfsigned.mk root-ca

# Generate intermediate certs for each cluster
make -f ../tools/certs/Makefile.selfsigned.mk cluster1-cacerts
make -f ../tools/certs/Makefile.selfsigned.mk cluster2-cacerts
```

Now create the `istio-system` namespace and load the certs as secrets in each cluster:

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

## Step 2: Label Clusters with Topology

Istio uses labels on the `istio-system` namespace to determine the mesh, cluster, and network identity. Since both clusters are on the same network, they get the same network label:

```bash
kubectl label namespace istio-system topology.istio.io/network=network1 --context="${CTX_CLUSTER1}"
kubectl label namespace istio-system topology.istio.io/network=network1 --context="${CTX_CLUSTER2}"
```

## Step 3: Install Istio on Cluster 1

Create an IstioOperator configuration for the first cluster:

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

Install Istio using this configuration:

```bash
istioctl install --context="${CTX_CLUSTER1}" -f cluster1-config.yaml -y
```

## Step 4: Install Istio on Cluster 2

Use a similar configuration for the second cluster:

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
      network: network1
```

```bash
istioctl install --context="${CTX_CLUSTER2}" -f cluster2-config.yaml -y
```

## Step 5: Enable Cross-Cluster Discovery

Each Istiod needs to be able to read the Kubernetes API of the other cluster to discover services. You do this by creating a remote secret that holds the kubeconfig for the remote cluster.

Create a remote secret for cluster2 and apply it to cluster1:

```bash
istioctl create-remote-secret \
  --context="${CTX_CLUSTER2}" \
  --name=cluster2 | \
  kubectl apply -f - --context="${CTX_CLUSTER1}"
```

And the reverse - create a remote secret for cluster1 and apply it to cluster2:

```bash
istioctl create-remote-secret \
  --context="${CTX_CLUSTER1}" \
  --name=cluster1 | \
  kubectl apply -f - --context="${CTX_CLUSTER2}"
```

After applying these secrets, each Istiod will start watching the remote cluster's API server for service and endpoint information.

## Step 6: Verify the Installation

Deploy a test application to both clusters. The classic approach is to use the `helloworld` sample with different versions in each cluster:

```bash
# Enable sidecar injection
kubectl create namespace sample --context="${CTX_CLUSTER1}"
kubectl label namespace sample istio-injection=enabled --context="${CTX_CLUSTER1}"

kubectl create namespace sample --context="${CTX_CLUSTER2}"
kubectl label namespace sample istio-injection=enabled --context="${CTX_CLUSTER2}"
```

Deploy version v1 in cluster1:

```bash
kubectl apply -f samples/helloworld/helloworld.yaml -l version=v1 -n sample --context="${CTX_CLUSTER1}"
kubectl apply -f samples/helloworld/helloworld.yaml -l service=helloworld -n sample --context="${CTX_CLUSTER1}"
```

Deploy version v2 in cluster2:

```bash
kubectl apply -f samples/helloworld/helloworld.yaml -l version=v2 -n sample --context="${CTX_CLUSTER2}"
kubectl apply -f samples/helloworld/helloworld.yaml -l service=helloworld -n sample --context="${CTX_CLUSTER2}"
```

Deploy the sleep client in both clusters:

```bash
kubectl apply -f samples/sleep/sleep.yaml -n sample --context="${CTX_CLUSTER1}"
kubectl apply -f samples/sleep/sleep.yaml -n sample --context="${CTX_CLUSTER2}"
```

Now test cross-cluster connectivity:

```bash
# From cluster1, call helloworld multiple times
for i in $(seq 1 10); do
  kubectl exec -n sample -c sleep \
    "$(kubectl get pod -n sample -l app=sleep -o jsonpath='{.items[0].metadata.name}' --context=${CTX_CLUSTER1})" \
    --context="${CTX_CLUSTER1}" -- curl -sS helloworld.sample:5000/hello
done
```

If everything is working, you should see responses from both v1 and v2, which means traffic is being load balanced across both clusters.

## Troubleshooting Common Issues

If you only see responses from the local cluster, check a few things:

1. **Remote secrets**: Make sure the remote secrets were applied correctly:

```bash
kubectl get secrets -n istio-system --context="${CTX_CLUSTER1}" | grep istio-remote-secret
```

2. **Istiod logs**: Check if Istiod successfully connected to the remote cluster:

```bash
kubectl logs -n istio-system -l app=istiod --context="${CTX_CLUSTER1}" | grep "remote cluster"
```

3. **Network connectivity**: Verify pods can actually reach each other across clusters. The same-network assumption means pod IPs must be routable:

```bash
# Get a pod IP from cluster2
REMOTE_POD_IP=$(kubectl get pod -n sample -l app=helloworld -o jsonpath='{.items[0].status.podIP}' --context="${CTX_CLUSTER2}")

# Try to reach it from cluster1
kubectl exec -n sample -c sleep \
  "$(kubectl get pod -n sample -l app=sleep -o jsonpath='{.items[0].metadata.name}' --context=${CTX_CLUSTER1})" \
  --context="${CTX_CLUSTER1}" -- curl -sS ${REMOTE_POD_IP}:5000/hello
```

4. **Certificate trust**: If you see TLS errors, confirm both clusters are using intermediate certs derived from the same root CA.

## Cleaning Up

To remove the test deployment:

```bash
kubectl delete namespace sample --context="${CTX_CLUSTER1}"
kubectl delete namespace sample --context="${CTX_CLUSTER2}"
```

To fully uninstall Istio:

```bash
istioctl uninstall --purge --context="${CTX_CLUSTER1}" -y
istioctl uninstall --purge --context="${CTX_CLUSTER2}" -y
kubectl delete namespace istio-system --context="${CTX_CLUSTER1}"
kubectl delete namespace istio-system --context="${CTX_CLUSTER2}"
```

## Wrapping Up

The multi-primary same-network topology is arguably the simplest multi-cluster Istio setup. You avoid the complexity of east-west gateways, and each cluster gets its own resilient control plane. The key steps are shared root CA, proper cluster and network labels, bilateral remote secrets, and matching mesh IDs. Once those pieces are in place, Istio handles cross-cluster service discovery and load balancing automatically.
