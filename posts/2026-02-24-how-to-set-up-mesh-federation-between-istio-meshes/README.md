# How to Set Up Mesh Federation Between Istio Meshes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Service Mesh, Federation, Kubernetes, Multi-Cluster

Description: A practical guide to federating multiple Istio service meshes across clusters for unified traffic management and service discovery.

---

Running a single Istio mesh works great until your organization grows to the point where you need multiple clusters, maybe across regions or managed by different teams. That's where a multi-primary multicluster mesh comes in. It connects Istio installations in separate clusters so services in one cluster can talk to services in another, without cramming everything into a single control plane.

This is different from a primary-remote multicluster setup, where remote clusters use a control plane in a primary cluster. In a multi-primary setup, each cluster keeps its own control plane, but the clusters belong to the same mesh, use the same mesh ID, and must establish trust with each other.

## Prerequisites

Before you start, make sure you have:

- Two or more Kubernetes clusters, each with Istio installed
- Network connectivity between clusters (the east-west gateways need to reach each other)
- Trust established between the clusters, usually with intermediate certificates generated from a common root CA
- `istioctl` installed locally
- `kubectl` configured with contexts for both clusters

For this guide, we'll call them `cluster-west` and `cluster-east`.

## Step 1: Install Istio on Both Clusters

Each cluster gets its own Istio control plane. The key thing is to use the same mesh ID for both clusters and give each cluster a unique cluster name and network name.

For cluster-west:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  name: istio-west
spec:
  values:
    global:
      meshID: mesh1
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
  values:
    global:
      meshID: mesh1
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

Multicluster connectivity relies on east-west gateways to route traffic between cluster networks. These gateways expose services from one cluster network to another.

Generate and apply the east-west gateway for cluster-west:

```bash
samples/multicluster/gen-eastwest-gateway.sh \
  --network network-west | \
  istioctl install --context=cluster-west -y -f -
```

Do the same for cluster-east:

```bash
samples/multicluster/gen-eastwest-gateway.sh \
  --network network-east | \
  istioctl install --context=cluster-east -y -f -
```

Wait for the gateways to get external IPs:

```bash
kubectl --context=cluster-west get svc istio-eastwestgateway -n istio-system
kubectl --context=cluster-east get svc istio-eastwestgateway -n istio-system
```

## Step 3: Expose Services Through the Gateway

You need to tell each cluster which services should be reachable from the other cluster network. Apply a Gateway resource that opens up cross-network traffic:

```yaml
apiVersion: networking.istio.io/v1
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

For the control planes to discover each other's services, each cluster needs a remote secret that provides API server access to the other cluster.

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

## Step 5: Verify Multicluster Connectivity

Create the sample namespace in both clusters:

```bash
kubectl create --context=cluster-west namespace sample
kubectl create --context=cluster-east namespace sample
kubectl label --context=cluster-west namespace sample istio-injection=enabled
kubectl label --context=cluster-east namespace sample istio-injection=enabled
```

Create the HelloWorld Service in both clusters so DNS resolution works from either side:

```bash
kubectl apply --context=cluster-west -n sample \
  -f samples/helloworld/helloworld.yaml -l service=helloworld
kubectl apply --context=cluster-east -n sample \
  -f samples/helloworld/helloworld.yaml -l service=helloworld
```

Deploy a test workload on cluster-east:

```bash
kubectl apply --context=cluster-east -n sample \
  -f samples/helloworld/helloworld.yaml -l version=v2
```

Deploy the client on cluster-west:

```bash
kubectl apply --context=cluster-west -n sample \
  -f samples/sleep/sleep.yaml
```

Now test cross-cluster connectivity:

```bash
kubectl exec --context=cluster-west -n sample -c sleep \
  "$(kubectl get pod --context=cluster-west -n sample -l app=sleep \
  -o jsonpath='{.items[0].metadata.name}')" \
  -- curl -sS helloworld.sample:5000/hello
```

If multicluster connectivity is working, you should get a response from the v2 instance running on cluster-east.

## Step 6: Configure Cluster-Local Service Visibility

If you want more control over which services can receive cross-cluster traffic, configure `MeshConfig.serviceSettings`. For example, you can make all services cluster-local by default and then allow cross-cluster traffic only for services in the `payments` namespace:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    serviceSettings:
      - settings:
          clusterLocal: true
        hosts:
          - "*"
      - settings:
          clusterLocal: false
        hosts:
          - "*.payments.svc.cluster.local"
```

This approach gives you fine-grained control over cross-cluster routing. You can keep most services local to their own cluster and allow only specific namespaces or services to use remote endpoints.

## Troubleshooting Common Issues

**Services not discoverable across clusters**: Check that the remote secrets were applied correctly. Run `kubectl get secrets -n istio-system` and look for `istio-remote-secret-*` entries.

**Connection timeouts**: Verify that the east-west gateways have external IPs and that firewall rules allow traffic on port 15443 between clusters.

**TLS handshake failures**: This usually means the trust configuration is wrong. For multi-primary multicluster, make sure the clusters trust each other, usually by using intermediate certificates generated from a common root CA.

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

Multicluster connectivity adds network hops and latency. A call that used to stay within a single cluster now crosses a gateway and possibly traverses the internet or a VPN. Keep this in mind for latency-sensitive services.

Also think about failure domains. If one cluster goes down, the services from that cluster become unavailable. Build retry logic and circuit breaking into your traffic policies to handle this gracefully.

Finally, capacity planning matters more with multicluster traffic. Each east-west gateway handles cross-cluster traffic, so size your gateway pods appropriately based on expected cross-cluster request volume.

Multicluster connectivity is powerful but it adds operational complexity. Start small with a couple of non-critical services, observe the behavior, and then expand gradually.
