# How to Set Up Mesh Federation Between Istio Meshes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Service Mesh, Federation, Kubernetes, Multi-Cluster

Description: A practical guide to federating multiple Istio service meshes across clusters for unified traffic management and service discovery.

---

Running a single Istio mesh works great until your organization grows to the point where you need multiple clusters, maybe across regions or managed by different teams. That's where mesh federation comes in. It connects separate Istio meshes so services in one mesh can talk to services in another, without cramming everything into a single control plane.

Federation is different from multi-cluster Istio (where all clusters share one control plane). With federation, each mesh keeps its own control plane, its own root of trust, and its own policies. The meshes just agree to share certain services with each other.

## Prerequisites

Before you start, make sure you have:

- Two or more Kubernetes clusters, each with Istio installed
- Network connectivity between clusters (the east-west gateways need to reach each other)
- `istioctl` installed locally
- `kubectl` configured with contexts for both clusters

For this guide, we'll call them `cluster-west` and `cluster-east`.

## Step 1: Install Istio on Both Clusters

Each cluster gets its own independent Istio installation. The key thing is to give each mesh a unique mesh ID and network name.

For cluster-west:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  name: istio-west
spec:
  meshConfig:
    meshId: mesh-west
  values:
    global:
      meshID: mesh-west
      multiCluster:
        clusterName: cluster-west
      network: network-west
```

For cluster-east:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  name: istio-east
spec:
  meshConfig:
    meshId: mesh-east
  values:
    global:
      meshID: mesh-east
      multiCluster:
        clusterName: cluster-east
      network: network-east
```

Apply each configuration to its respective cluster:

```bash
istioctl install --context=cluster-west -f istio-west.yaml
istioctl install --context=cluster-east -f istio-east.yaml
```

## Step 2: Set Up East-West Gateways

Federation relies on east-west gateways to route traffic between meshes. These gateways expose services from one mesh to another.

Generate and apply the east-west gateway for cluster-west:

```bash
samples/multicluster/gen-eastwest-gateway.sh \
  --mesh mesh-west \
  --cluster cluster-west \
  --network network-west | \
  istioctl install --context=cluster-west -y -f -
```

Do the same for cluster-east:

```bash
samples/multicluster/gen-eastwest-gateway.sh \
  --mesh mesh-east \
  --cluster cluster-east \
  --network network-east | \
  istioctl install --context=cluster-east -y -f -
```

Wait for the gateways to get external IPs:

```bash
kubectl --context=cluster-west get svc istio-eastwestgateway -n istio-system
kubectl --context=cluster-east get svc istio-eastwestgateway -n istio-system
```

## Step 3: Expose Services Through the Gateway

You need to tell each mesh which services should be reachable from the other mesh. Apply a Gateway resource that opens up cross-network traffic:

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

Apply this on both clusters:

```bash
kubectl apply --context=cluster-west -f cross-network-gateway.yaml
kubectl apply --context=cluster-east -f cross-network-gateway.yaml
```

## Step 4: Exchange Remote Secrets

For the meshes to discover each other's services, each cluster needs a remote secret that provides API server access to the other cluster.

Create a secret from cluster-east and apply it to cluster-west:

```bash
istioctl create-remote-secret \
  --context=cluster-east \
  --name=cluster-east | \
  kubectl apply --context=cluster-west -f -
```

And the reverse:

```bash
istioctl create-remote-secret \
  --context=cluster-west \
  --name=cluster-west | \
  kubectl apply --context=cluster-east -f -
```

## Step 5: Verify the Federation

Deploy a test service on cluster-east:

```bash
kubectl create --context=cluster-east namespace sample
kubectl label --context=cluster-east namespace sample istio-injection=enabled
kubectl apply --context=cluster-east -n sample \
  -f samples/helloworld/helloworld.yaml -l version=v2
```

Deploy the client on cluster-west:

```bash
kubectl create --context=cluster-west namespace sample
kubectl label --context=cluster-west namespace sample istio-injection=enabled
kubectl apply --context=cluster-west -n sample \
  -f samples/sleep/sleep.yaml
```

Now test cross-mesh connectivity:

```bash
kubectl exec --context=cluster-west -n sample -c sleep \
  "$(kubectl get pod --context=cluster-west -n sample -l app=sleep \
  -o jsonpath='{.items[0].metadata.name}')" \
  -- curl -sS helloworld.sample:5000/hello
```

If federation is working, you should get a response from the v2 instance running on cluster-east.

## Step 6: Configure ServiceEntry for Explicit Federation

If you want more control over which services are federated (instead of sharing everything), you can use ServiceEntry resources:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: ServiceEntry
metadata:
  name: payment-service-remote
  namespace: payments
spec:
  hosts:
    - payment-api.payments.svc.cluster.local
  location: MESH_INTERNAL
  ports:
    - number: 8080
      name: http
      protocol: HTTP
  resolution: DNS
  endpoints:
    - address: payment-api.payments.svc.cluster.local
      network: network-east
```

This approach gives you fine-grained control. You pick exactly which services are visible across meshes, and you can even set different traffic properties for the remote endpoints.

## Troubleshooting Common Issues

**Services not discoverable across meshes**: Check that the remote secrets were applied correctly. Run `kubectl get secrets -n istio-system` and look for `istio-remote-secret-*` entries.

**Connection timeouts**: Verify that the east-west gateways have external IPs and that firewall rules allow traffic on port 15443 between clusters.

**TLS handshake failures**: This usually means the trust configuration is wrong. If the meshes use different root CAs, you need to set up cross-mesh trust (covered in the next post in this series).

Check the istiod logs for more details:

```bash
kubectl logs -n istio-system -l app=istiod --tail=100 --context=cluster-west
```

And inspect the proxy configuration on the client side:

```bash
istioctl proxy-config endpoints \
  $(kubectl get pod -n sample -l app=sleep -o jsonpath='{.items[0].metadata.name}' --context=cluster-west) \
  --context=cluster-west | grep helloworld
```

## Key Considerations

Federation adds network hops and latency. A call that used to stay within a single cluster now crosses a gateway and possibly traverses the internet or a VPN. Keep this in mind for latency-sensitive services.

Also think about failure domains. If one mesh goes down, the federated services from that mesh become unavailable. Build retry logic and circuit breaking into your traffic policies to handle this gracefully.

Finally, capacity planning matters more with federation. Each east-west gateway handles cross-mesh traffic, so size your gateway pods appropriately based on expected cross-mesh request volume.

Federation is powerful but it adds operational complexity. Start small by federating a couple of non-critical services, observe the behavior, and then expand gradually.
