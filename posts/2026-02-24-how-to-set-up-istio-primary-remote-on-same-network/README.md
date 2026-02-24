# How to Set Up Istio Primary-Remote on Same Network

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Multi-Cluster, Kubernetes, Primary-Remote, Service Mesh

Description: Learn how to configure Istio in primary-remote mode on a shared network where one cluster hosts the control plane and the remote cluster uses it.

---

Not every multi-cluster deployment needs a full control plane in every cluster. The primary-remote topology gives you a single Istiod running in the primary cluster, while the remote cluster connects to that same control plane. Workloads in both clusters participate in the same mesh, but you only manage one Istiod instance.

When the clusters share the same network (pods can reach each other directly), this setup is straightforward because you do not need east-west gateways for data plane traffic.

## When to Use Primary-Remote

Primary-remote makes sense when:

- You want to minimize operational overhead by running fewer control plane instances
- The remote cluster is smaller or has fewer resources
- You are adding a temporary cluster (for burst capacity, testing, etc.)
- You want a simpler upgrade path since there is only one Istiod to upgrade

The trade-off is that the remote cluster depends on the primary cluster's control plane. If the primary goes down, workloads in the remote cluster lose their ability to get configuration updates (though existing proxies continue working with their last known configuration).

## Prerequisites

Two Kubernetes clusters on the same network. Set up context variables:

```bash
export CTX_CLUSTER1=cluster1
export CTX_CLUSTER2=cluster2
```

Cluster1 will be the primary (runs Istiod). Cluster2 will be the remote (no local Istiod).

## Step 1: Set Up Shared Root CA

As always with multi-cluster Istio, you need a shared root certificate:

```bash
mkdir -p certs
pushd certs

make -f ../tools/certs/Makefile.selfsigned.mk root-ca
make -f ../tools/certs/Makefile.selfsigned.mk cluster1-cacerts
make -f ../tools/certs/Makefile.selfsigned.mk cluster2-cacerts
```

Install the certificates:

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

## Step 2: Label the Network

Since both clusters are on the same network:

```bash
kubectl label namespace istio-system topology.istio.io/network=network1 --context="${CTX_CLUSTER1}"
kubectl label namespace istio-system topology.istio.io/network=network1 --context="${CTX_CLUSTER2}"
```

## Step 3: Install Istio on the Primary Cluster

The primary cluster configuration needs to make Istiod discoverable to the remote cluster. You do this by setting `externalIstiod` to true:

```yaml
# cluster1-primary.yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  values:
    global:
      meshID: mesh1
      multiCluster:
        clusterName: cluster1
      network: network1
      externalIstiod: true
```

```bash
istioctl install --context="${CTX_CLUSTER1}" -f cluster1-primary.yaml -y
```

After installation, you need to expose the Istiod service so the remote cluster can reach it. On the same network, the ClusterIP is directly reachable, but you still need to create the appropriate configuration. The typical approach is to expose Istiod via a LoadBalancer or use the east-west gateway even on the same network for the control plane connection:

```bash
# Get the Istiod service address
kubectl get svc istiod -n istio-system --context="${CTX_CLUSTER1}"
```

## Step 4: Create the Remote Cluster Configuration

The remote cluster does not run Istiod. Instead, it points its sidecars at the primary cluster's Istiod. First, get the address of the primary cluster's Istiod:

```bash
export DISCOVERY_ADDRESS=$(kubectl get svc istiod -n istio-system --context="${CTX_CLUSTER1}" -o jsonpath='{.spec.clusterIP}')
```

Since you are on the same network, the ClusterIP might not be reachable. Alternatively, use the east-west gateway or an external LoadBalancer. A common approach is to install a small gateway in the primary cluster:

```bash
samples/multicluster/gen-eastwest-gateway.sh \
  --network network1 | \
  istioctl install --context="${CTX_CLUSTER1}" -y -f -
```

Then expose Istiod through it:

```bash
kubectl apply -f samples/multicluster/expose-istiod.yaml -n istio-system --context="${CTX_CLUSTER1}"
```

The expose-istiod.yaml looks like:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: istiod-gateway
  namespace: istio-system
spec:
  selector:
    istio: eastwestgateway
  servers:
  - port:
      number: 15012
      name: tls-istiod
      protocol: TLS
    tls:
      mode: PASSTHROUGH
    hosts:
    - "*"
  - port:
      number: 15017
      name: tls-istiodwebhook
      protocol: TLS
    tls:
      mode: PASSTHROUGH
    hosts:
    - "*"
```

Get the external IP of the east-west gateway:

```bash
export DISCOVERY_ADDRESS=$(kubectl get svc istio-eastwestgateway -n istio-system --context="${CTX_CLUSTER1}" -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
echo "Istiod reachable at: ${DISCOVERY_ADDRESS}"
```

## Step 5: Install Istio on the Remote Cluster

Configure the remote cluster to use the primary's control plane:

```yaml
# cluster2-remote.yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  profile: remote
  values:
    istiodRemote:
      injectionPath: /inject/cluster/cluster2/net/network1
    global:
      remotePilotAddress: ${DISCOVERY_ADDRESS}
      meshID: mesh1
      multiCluster:
        clusterName: cluster2
      network: network1
```

Replace `${DISCOVERY_ADDRESS}` with the actual IP address from the previous step, then install:

```bash
istioctl install --context="${CTX_CLUSTER2}" -f cluster2-remote.yaml -y
```

## Step 6: Give the Primary Access to the Remote Cluster API

The primary's Istiod needs to watch the remote cluster's Kubernetes API to discover services and endpoints:

```bash
istioctl create-remote-secret \
  --context="${CTX_CLUSTER2}" \
  --name=cluster2 | \
  kubectl apply -f - --context="${CTX_CLUSTER1}"
```

Notice this is only one direction. The remote cluster does not need a secret for the primary since it does not run Istiod.

## Step 7: Verify

Deploy test workloads:

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

Test cross-cluster traffic:

```bash
for i in $(seq 1 10); do
  kubectl exec -n sample -c sleep \
    "$(kubectl get pod -n sample -l app=sleep -o jsonpath='{.items[0].metadata.name}' --context=${CTX_CLUSTER1})" \
    --context="${CTX_CLUSTER1}" -- curl -sS helloworld.sample:5000/hello
done
```

You should see responses from both v1 and v2.

## Checking Remote Cluster Health

To confirm the remote cluster is properly connected to the primary's Istiod:

```bash
# Check that sidecar injection works in the remote cluster
kubectl get mutatingwebhookconfigurations --context="${CTX_CLUSTER2}" | grep istio

# Check proxy status from the primary
istioctl proxy-status --context="${CTX_CLUSTER1}"
```

You should see proxies from both clusters listed in the output.

## Summary

Primary-remote on the same network gives you a lighter footprint with centralized control. The remote cluster just runs sidecars that connect back to the primary's Istiod. The main thing to remember is that you need to expose Istiod to the remote cluster (even on the same network, a gateway or LoadBalancer is the cleanest approach) and only the primary needs a remote secret for the remote cluster's API access.
