# How to Set Up Istio Primary-Remote on Different Networks

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Multi-Cluster, Kubernetes, Primary-Remote, East-West Gateway

Description: Complete walkthrough for setting up Istio primary-remote topology when your clusters are on separate networks with no direct pod connectivity.

---

The primary-remote topology with different networks combines the simplicity of a single control plane with the reality that many organizations run clusters across separate network boundaries. Your primary cluster hosts Istiod and the remote cluster connects to it, but since pods cannot reach each other directly, all cross-cluster data plane traffic goes through east-west gateways.

This is a common setup for hybrid cloud scenarios where you have a main cluster in one cloud provider and a secondary cluster elsewhere.

## Architecture Overview

Here is what the traffic flow looks like:

- **Control plane**: The remote cluster's sidecars connect to the primary's Istiod through the east-west gateway (or a LoadBalancer) in the primary cluster.
- **Data plane**: When workloads in one cluster need to reach workloads in the other, traffic flows through the east-west gateway because pods cannot communicate directly across network boundaries.

The primary cluster runs Istiod and has full mesh configuration authority. The remote cluster has no local control plane and relies entirely on the primary.

## Prerequisites

```bash
export CTX_CLUSTER1=cluster1   # Primary cluster
export CTX_CLUSTER2=cluster2   # Remote cluster
```

Both clusters should have `istioctl` 1.20+ available. The clusters are on separate networks (no pod IP reachability between them).

## Step 1: Shared Root CA

Generate and distribute certificates:

```bash
mkdir -p certs && pushd certs

make -f ../tools/certs/Makefile.selfsigned.mk root-ca
make -f ../tools/certs/Makefile.selfsigned.mk cluster1-cacerts
make -f ../tools/certs/Makefile.selfsigned.mk cluster2-cacerts

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

popd
```

## Step 2: Set Network Labels

Each cluster gets a unique network identity:

```bash
kubectl label namespace istio-system topology.istio.io/network=network1 --context="${CTX_CLUSTER1}"
kubectl label namespace istio-system topology.istio.io/network=network2 --context="${CTX_CLUSTER2}"
```

## Step 3: Install Istio on the Primary

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

## Step 4: Deploy the East-West Gateway on the Primary

The east-west gateway serves two purposes here: it lets the remote cluster reach Istiod for control plane communication, and it handles cross-cluster data plane traffic.

```bash
samples/multicluster/gen-eastwest-gateway.sh \
  --network network1 | \
  istioctl install --context="${CTX_CLUSTER1}" -y -f -
```

Wait for the gateway to get an external IP:

```bash
kubectl get svc istio-eastwestgateway -n istio-system --context="${CTX_CLUSTER1}" -w
```

Expose both Istiod and mesh services:

```bash
kubectl apply -f samples/multicluster/expose-istiod.yaml -n istio-system --context="${CTX_CLUSTER1}"
kubectl apply -f samples/multicluster/expose-services.yaml -n istio-system --context="${CTX_CLUSTER1}"
```

Save the gateway address:

```bash
export EAST_WEST_GW=$(kubectl get svc istio-eastwestgateway -n istio-system --context="${CTX_CLUSTER1}" \
  -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
echo "East-West Gateway IP: ${EAST_WEST_GW}"
```

## Step 5: Install Istio on the Remote Cluster

The remote cluster uses the `remote` profile, which skips installing Istiod and instead configures sidecars to connect to the primary:

```yaml
# cluster2-remote.yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  profile: remote
  values:
    istiodRemote:
      injectionPath: /inject/cluster/cluster2/net/network2
    global:
      remotePilotAddress: EAST_WEST_GW_IP_HERE
      meshID: mesh1
      multiCluster:
        clusterName: cluster2
      network: network2
```

Replace `EAST_WEST_GW_IP_HERE` with the actual IP from step 4:

```bash
sed -i "s/EAST_WEST_GW_IP_HERE/${EAST_WEST_GW}/" cluster2-remote.yaml
istioctl install --context="${CTX_CLUSTER2}" -f cluster2-remote.yaml -y
```

## Step 6: Deploy the East-West Gateway on the Remote

The remote cluster also needs an east-west gateway so that traffic from the primary can reach remote workloads:

```bash
samples/multicluster/gen-eastwest-gateway.sh \
  --network network2 | \
  istioctl install --context="${CTX_CLUSTER2}" -y -f -
```

Expose services through the remote gateway:

```bash
kubectl apply -f samples/multicluster/expose-services.yaml -n istio-system --context="${CTX_CLUSTER2}"
```

## Step 7: Create Remote Secret

Give the primary cluster's Istiod access to the remote cluster's API:

```bash
istioctl create-remote-secret \
  --context="${CTX_CLUSTER2}" \
  --name=cluster2 | \
  kubectl apply -f - --context="${CTX_CLUSTER1}"
```

## Step 8: Verify the Setup

Check that Istiod on the primary sees the remote cluster:

```bash
kubectl logs -n istio-system -l app=istiod --context="${CTX_CLUSTER1}" | grep "Adding cluster"
```

Deploy test applications:

```bash
# Primary cluster
kubectl create namespace sample --context="${CTX_CLUSTER1}"
kubectl label namespace sample istio-injection=enabled --context="${CTX_CLUSTER1}"
kubectl apply -f samples/helloworld/helloworld.yaml -l version=v1 -n sample --context="${CTX_CLUSTER1}"
kubectl apply -f samples/helloworld/helloworld.yaml -l service=helloworld -n sample --context="${CTX_CLUSTER1}"
kubectl apply -f samples/sleep/sleep.yaml -n sample --context="${CTX_CLUSTER1}"

# Remote cluster
kubectl create namespace sample --context="${CTX_CLUSTER2}"
kubectl label namespace sample istio-injection=enabled --context="${CTX_CLUSTER2}"
kubectl apply -f samples/helloworld/helloworld.yaml -l version=v2 -n sample --context="${CTX_CLUSTER2}"
kubectl apply -f samples/helloworld/helloworld.yaml -l service=helloworld -n sample --context="${CTX_CLUSTER2}"
kubectl apply -f samples/sleep/sleep.yaml -n sample --context="${CTX_CLUSTER2}"
```

Test from the primary:

```bash
for i in $(seq 1 10); do
  kubectl exec -n sample -c sleep \
    "$(kubectl get pod -n sample -l app=sleep -o jsonpath='{.items[0].metadata.name}' --context=${CTX_CLUSTER1})" \
    --context="${CTX_CLUSTER1}" -- curl -sS helloworld.sample:5000/hello
done
```

You should see traffic hitting both v1 (local) and v2 (remote via east-west gateway).

## Failure Scenarios to Consider

**Primary cluster goes down**: The remote cluster's sidecars will keep running with their last known configuration. New pods in the remote cluster will not get sidecar injection since Istiod is unavailable. Existing workloads continue to function.

**East-west gateway goes down on primary**: Remote cluster sidecars lose their connection to Istiod. Similar behavior to above - existing proxies work, but configuration updates stop. Also, cross-cluster data plane traffic from the remote to the primary breaks.

**East-west gateway goes down on remote**: Traffic from the primary to the remote cluster stops. The primary's Istiod still sees the remote services but cannot reach them.

For production environments, make sure the east-west gateways run with multiple replicas and proper pod disruption budgets:

```bash
kubectl scale deployment istio-eastwestgateway -n istio-system --replicas=3 --context="${CTX_CLUSTER1}"
kubectl scale deployment istio-eastwestgateway -n istio-system --replicas=3 --context="${CTX_CLUSTER2}"
```

## Summary

Primary-remote on different networks requires east-west gateways on both sides. The primary cluster's gateway does double duty - handling both control plane (Istiod) and data plane (cross-cluster service) traffic. The remote cluster's gateway handles inbound data plane traffic from the primary. This topology works well when you want a single point of mesh management but your clusters span network boundaries.
