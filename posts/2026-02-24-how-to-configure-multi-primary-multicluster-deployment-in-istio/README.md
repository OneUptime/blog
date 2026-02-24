# How to Configure Multi-Primary Multicluster Deployment in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Multicluster, Kubernetes, Service Mesh, High Availability

Description: A complete guide to configuring multi-primary multicluster deployments in Istio where each cluster has its own control plane for redundancy and resilience.

---

Running Istio across multiple clusters with each cluster hosting its own control plane is one of the most resilient deployment models available. In a multi-primary setup, every cluster runs an independent Istiod instance, but they all share service discovery information so workloads can communicate across cluster boundaries. This gives you both high availability and isolation - if one control plane goes down, the other clusters keep running without interruption.

## Why Multi-Primary?

The single-primary model has a weakness: one cluster hosts the control plane, and if that cluster has issues, every other cluster loses its ability to update proxy configurations. Multi-primary eliminates that single point of failure. Each cluster is self-sufficient while still participating in a shared mesh.

This model works well when you have clusters in different regions and want each region to be independently operational. It also fits scenarios where different teams manage different clusters but need cross-cluster communication.

## Prerequisites

You need at least two Kubernetes clusters with the following:

- `kubectl` access to both clusters
- Istio CLI (`istioctl`) installed
- Clusters must be able to reach each other's API servers
- A shared root CA or intermediate CAs from the same root

Set up your context variables first:

```bash
export CTX_CLUSTER1=cluster1
export CTX_CLUSTER2=cluster2
```

## Step 1: Set Up a Shared Root CA

Both clusters need to trust each other's workload certificates. The simplest way is to use a shared root CA with per-cluster intermediate CAs.

Generate the root CA:

```bash
mkdir -p certs
pushd certs
make -f ../tools/certs/Makefile.selfsigned.mk root-ca
```

Generate intermediate certs for each cluster:

```bash
make -f ../tools/certs/Makefile.selfsigned.mk cluster1-cacerts
make -f ../tools/certs/Makefile.selfsigned.mk cluster2-cacerts
```

Create the `istio-system` namespace and secrets on both clusters:

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

## Step 2: Configure the Mesh Network

Label each cluster with a mesh ID and network. For multi-primary on the same network:

```bash
kubectl label namespace istio-system topology.istio.io/network=network1 --context="${CTX_CLUSTER1}"
kubectl label namespace istio-system topology.istio.io/network=network1 --context="${CTX_CLUSTER2}"
```

If your clusters are on different networks, use different network labels for each.

## Step 3: Install Istio on Cluster 1

Create an IstioOperator configuration for the first cluster:

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

Install it:

```bash
istioctl install --context="${CTX_CLUSTER1}" -f cluster1.yaml
```

## Step 4: Install Istio on Cluster 2

Create a similar configuration for cluster 2:

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

Install it:

```bash
istioctl install --context="${CTX_CLUSTER2}" -f cluster2.yaml
```

## Step 5: Enable Endpoint Discovery

Each Istiod needs to watch the other cluster's API server to discover remote endpoints. You do this by creating remote secrets.

Create a secret in cluster 2 that gives it access to cluster 1's API server:

```bash
istioctl create-remote-secret \
  --context="${CTX_CLUSTER1}" \
  --name=cluster1 | \
  kubectl apply -f - --context="${CTX_CLUSTER2}"
```

And the reverse - give cluster 1 access to cluster 2:

```bash
istioctl create-remote-secret \
  --context="${CTX_CLUSTER2}" \
  --name=cluster2 | \
  kubectl apply -f - --context="${CTX_CLUSTER1}"
```

## Step 6: Verify the Setup

Deploy a test application across both clusters. A good test is to deploy the `helloworld` service with different versions on each cluster:

```bash
# On cluster 1
kubectl create namespace sample --context="${CTX_CLUSTER1}"
kubectl label namespace sample istio-injection=enabled --context="${CTX_CLUSTER1}"

kubectl apply -f samples/helloworld/helloworld.yaml \
  -l version=v1 -n sample --context="${CTX_CLUSTER1}"
kubectl apply -f samples/helloworld/helloworld.yaml \
  -l service=helloworld -n sample --context="${CTX_CLUSTER1}"

# On cluster 2
kubectl create namespace sample --context="${CTX_CLUSTER2}"
kubectl label namespace sample istio-injection=enabled --context="${CTX_CLUSTER2}"

kubectl apply -f samples/helloworld/helloworld.yaml \
  -l version=v2 -n sample --context="${CTX_CLUSTER2}"
kubectl apply -f samples/helloworld/helloworld.yaml \
  -l service=helloworld -n sample --context="${CTX_CLUSTER2}"
```

Deploy the `sleep` client on either cluster and call the helloworld service:

```bash
kubectl apply -f samples/sleep/sleep.yaml -n sample --context="${CTX_CLUSTER1}"

kubectl exec -n sample -c sleep \
  "$(kubectl get pod -n sample -l app=sleep -o jsonpath='{.items[0].metadata.name}' --context="${CTX_CLUSTER1}")" \
  --context="${CTX_CLUSTER1}" -- \
  curl -sS helloworld.sample:5000/hello
```

If you see responses alternating between v1 and v2, cross-cluster communication is working.

## Troubleshooting Common Issues

**Remote secret not being picked up**: Check that the secret is in the `istio-system` namespace and has the label `istio/multiCluster=true`. The `istioctl create-remote-secret` command adds this automatically, but verify with:

```bash
kubectl get secrets -n istio-system --context="${CTX_CLUSTER1}" -l istio/multiCluster=true
```

**Certificate errors between clusters**: Verify both clusters share the same root CA. You can check the root cert with:

```bash
istioctl proxy-config secret -n sample <pod-name> --context="${CTX_CLUSTER1}" -o json | \
  jq '.dynamicActiveSecrets[0].secret.tlsCertificate.certificateChain'
```

**Istiod not discovering remote endpoints**: Check the Istiod logs for connection errors to the remote cluster's API server:

```bash
kubectl logs -n istio-system -l app=istiod --context="${CTX_CLUSTER1}" | grep "remote cluster"
```

## Production Considerations

For production deployments, consider setting resource limits on Istiod in each cluster. Multi-primary means each Istiod watches multiple API servers, which increases memory usage:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    pilot:
      k8s:
        resources:
          requests:
            cpu: 500m
            memory: 2Gi
          limits:
            cpu: "2"
            memory: 4Gi
  values:
    global:
      meshID: mesh1
      multiCluster:
        clusterName: cluster1
      network: network1
```

You should also set up monitoring for both Istiod instances. Use the built-in Prometheus metrics or connect to your monitoring stack to track control plane health across clusters. The key metrics to watch are `pilot_xds_pushes`, `pilot_proxy_convergence_time`, and `pilot_conflict_outbound_listener_tcp_over_current_tcp`.

Multi-primary multicluster is the gold standard for Istio resilience, but it does come with operational overhead. Each cluster needs its own control plane management, upgrades need coordination, and you are paying for extra compute to run multiple Istiod instances. That said, for organizations that need zero-downtime mesh operations across regions, it is the right choice.
