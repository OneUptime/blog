# How to Handle Network Topology in Multi-Cluster Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Network Topology, Multi-Cluster, Kubernetes, Networking

Description: Guide to understanding and configuring network topology labels and routing behavior in multi-cluster Istio mesh deployments.

---

Network topology is the foundation of Istio's multi-cluster routing decisions. The `topology.istio.io/network` label on the `istio-system` namespace tells Istio whether clusters share a flat network or sit behind separate network boundaries. Getting this label right determines whether traffic goes directly to remote pods or through east-west gateways.

But network topology in Istio goes beyond just the network label. It also includes region, zone, and subzone locality information that drives load balancing decisions. This post covers all of it.

## The Network Label

The most important topology decision in multi-cluster Istio is the network label. It answers a simple question: can pods in cluster A directly reach pods in cluster B by IP address?

If yes, both clusters get the same network label:

```bash
kubectl label namespace istio-system topology.istio.io/network=network1 --context="${CTX_CLUSTER1}"
kubectl label namespace istio-system topology.istio.io/network=network1 --context="${CTX_CLUSTER2}"
```

If no, each cluster gets a different network label:

```bash
kubectl label namespace istio-system topology.istio.io/network=network1 --context="${CTX_CLUSTER1}"
kubectl label namespace istio-system topology.istio.io/network=network2 --context="${CTX_CLUSTER2}"
```

You can also set the network during Istio installation:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  values:
    global:
      network: network1
```

This sets the network identity for the local cluster's workloads and influences how Istiod programs endpoint addresses in EDS responses.

## How Network Labels Affect Routing

When Istiod builds the endpoint list for a service, it checks the network label of each endpoint:

- **Same network as the caller**: Use the actual pod IP
- **Different network from the caller**: Replace the pod IP with the east-west gateway IP of the endpoint's network

This is why the network label must be accurate. If you label two clusters as the same network but pods cannot actually reach each other, traffic will be sent to unreachable IPs and fail. If you label two clusters as different networks when they share a flat network, traffic will be unnecessarily routed through the east-west gateway, adding latency.

## Region, Zone, and Subzone

Beyond the network label, Istio uses Kubernetes node topology labels for locality-aware routing:

```
topology.kubernetes.io/region    -> e.g., us-east-1
topology.kubernetes.io/zone      -> e.g., us-east-1a
```

Cloud providers (AWS, GCP, Azure) automatically set these labels on nodes. You can check them:

```bash
kubectl get nodes --show-labels --context="${CTX_CLUSTER1}" | grep topology
```

Istio reads these labels and assigns locality to each workload endpoint. This locality information drives:

1. **Locality-aware load balancing**: Prefer endpoints in the same zone/region
2. **Locality failover**: When local endpoints are unhealthy, spill over to specific regions
3. **Locality weighted distribution**: Send fixed percentages of traffic to specific regions

For on-premises or bare metal clusters where these labels are not set automatically, add them manually:

```bash
kubectl label node worker-1 topology.kubernetes.io/region=datacenter1
kubectl label node worker-1 topology.kubernetes.io/zone=rack-a
```

## Subzone Labels

Istio supports a third level of locality called subzone, using the label `topology.istio.io/subzone`. This is not a standard Kubernetes label; it is Istio-specific:

```bash
kubectl label node worker-1 topology.istio.io/subzone=pod-row-1
```

Subzones are useful for large zones where you want more granular locality routing.

## Mixed Network Topologies

Real-world deployments are not always clean. You might have:

- Two clusters in AWS sharing a VPC (same network)
- One cluster in GCP (different network)
- One on-premises cluster (different network)

You can handle this with appropriate network labels:

```bash
# AWS clusters share a network
kubectl label namespace istio-system topology.istio.io/network=aws-vpc --context=aws-cluster1
kubectl label namespace istio-system topology.istio.io/network=aws-vpc --context=aws-cluster2

# GCP is on a different network
kubectl label namespace istio-system topology.istio.io/network=gcp-vpc --context=gcp-cluster

# On-prem is on yet another network
kubectl label namespace istio-system topology.istio.io/network=onprem --context=onprem-cluster
```

East-west gateways are only needed between different networks:

- aws-cluster1 to aws-cluster2: direct pod traffic (same network)
- aws-cluster1 to gcp-cluster: through east-west gateway (different network)
- gcp-cluster to onprem-cluster: through east-west gateway (different network)

## Configuring Locality for Cross-Cluster Failover

DestinationRules control locality behavior. Here is a configuration that prefers local endpoints and fails over to specific regions:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: reviews
  namespace: bookinfo
spec:
  host: reviews.bookinfo.svc.cluster.local
  trafficPolicy:
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 10s
      baseEjectionTime: 30s
    loadBalancer:
      localityLbSetting:
        failover:
        - from: us-east-1
          to: us-west-2
        - from: us-west-2
          to: us-east-1
        - from: europe-west1
          to: us-east-1
      simple: ROUND_ROBIN
```

Without the `outlierDetection` section, locality failover will not work. Istio needs health signals to determine when to stop sending traffic to local endpoints.

## Verifying Topology Configuration

Check how Istiod sees your topology:

```bash
# Check the locality of a specific proxy
istioctl proxy-config bootstrap deployment/sleep -n sample --context="${CTX_CLUSTER1}" -o json | \
  jq '.bootstrap.node.locality'
```

This returns something like:

```json
{
  "region": "us-east-1",
  "zone": "us-east-1a"
}
```

Check what network the proxy is on:

```bash
istioctl proxy-config bootstrap deployment/sleep -n sample --context="${CTX_CLUSTER1}" -o json | \
  jq '.bootstrap.node.metadata.NETWORK'
```

Check endpoint localities:

```bash
istioctl proxy-config endpoints deployment/sleep -n sample --context="${CTX_CLUSTER1}" -o json | \
  jq '.[] | select(.clusterName | contains("helloworld")) | {address: .endpoint.address, locality: .locality}'
```

## Common Topology Mistakes

**Wrong network label**: The most common issue. Pods are on different networks but labeled as the same network (or vice versa). Symptoms: connection timeouts (if labeled same but actually different) or unnecessary gateway hops (if labeled different but actually same).

**Missing locality labels on nodes**: Without region/zone labels, Istio cannot do locality-aware routing. Traffic distributes evenly across all endpoints regardless of location.

**Overlapping pod CIDRs**: If two clusters use the same pod CIDR range (e.g., both use 10.244.0.0/16) and are labeled as the same network, routing will break because the same IP could refer to pods in either cluster. Make sure pod CIDRs do not overlap when using same-network mode.

**Forgetting the east-west gateway**: If clusters are on different networks, you need east-west gateways deployed and the expose-services Gateway resource applied. Without these, Istiod has no gateway address to substitute for remote pod IPs.

## Testing Topology Changes

If you need to change network topology (for example, moving from different-network to same-network after VPC peering), follow these steps:

1. Update the network labels on `istio-system`
2. Restart Istiod to pick up the label change
3. Rolling restart all workloads to get updated endpoint configuration
4. If moving to same-network, you can decommission east-west gateways after confirming direct connectivity works

```bash
kubectl label namespace istio-system topology.istio.io/network=shared-network --overwrite --context="${CTX_CLUSTER1}"
kubectl label namespace istio-system topology.istio.io/network=shared-network --overwrite --context="${CTX_CLUSTER2}"
kubectl rollout restart deployment istiod -n istio-system --context="${CTX_CLUSTER1}"
kubectl rollout restart deployment istiod -n istio-system --context="${CTX_CLUSTER2}"
```

## Summary

Network topology in Istio is controlled by labels. The `topology.istio.io/network` label determines whether clusters share a flat network, and the `topology.kubernetes.io/region` and `zone` labels enable locality-aware routing. Getting these labels right is critical - they directly control how Istio routes cross-cluster traffic and whether it goes direct or through gateways. Always verify your topology configuration with `istioctl proxy-config` commands before deploying production workloads.
