# How to Use the Calico BGPPeer Resource in Real Clusters

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, BGP, BGPPeer, Kubernetes, Networking, Production, DevOps

Description: Production patterns for the Calico BGPPeer resource including top-of-rack peering, route reflector hierarchies, and multi-site cluster federation.

---

## Introduction

In production Kubernetes clusters, BGPPeer resources define how your cluster integrates with the surrounding network infrastructure. The peering topology you choose directly impacts network resilience, convergence time, and scalability. A poorly designed peering setup can lead to single points of failure or excessive BGP session counts that overwhelm route processors.

Real clusters typically use one of several proven peering patterns: direct top-of-rack peering for bare metal, route reflector hierarchies for large clusters, or cross-cluster peering for multi-site deployments. Each pattern has specific BGPPeer configurations and supporting requirements.

This guide presents complete, production-tested BGPPeer configurations for each of these scenarios, including the related BGPConfiguration and node labeling required to make them work.

## Prerequisites

- Production Kubernetes cluster with Calico CNI
- Network team coordination for external peer configuration
- `calicoctl` and `kubectl` with cluster-admin access
- Understanding of your data center network topology

## Pattern 1: Top-of-Rack Switch Peering

Each node peers with its local top-of-rack switch. Nodes in different racks use different BGPPeers:

```bash
# Label nodes by rack
kubectl label node worker-1 worker-2 worker-3 rack=rack1
kubectl label node worker-4 worker-5 worker-6 rack=rack2
```

```yaml
apiVersion: projectcalico.org/v3
kind: BGPPeer
metadata:
  name: rack1-tor
spec:
  peerIP: 10.1.0.1
  asNumber: 64501
  nodeSelector: rack == 'rack1'
---
apiVersion: projectcalico.org/v3
kind: BGPPeer
metadata:
  name: rack2-tor
spec:
  peerIP: 10.2.0.1
  asNumber: 64502
  nodeSelector: rack == 'rack2'
```

Disable the node-to-node mesh since the ToR switches handle route distribution:

```yaml
apiVersion: projectcalico.org/v3
kind: BGPConfiguration
metadata:
  name: default
spec:
  asNumber: 64512
  nodeToNodeMeshEnabled: false
  serviceClusterIPs:
    - cidr: 10.96.0.0/12
```

```bash
calicoctl apply -f rack-peers.yaml
calicoctl apply -f bgp-config.yaml
```

## Pattern 2: Route Reflector Hierarchy

For clusters with many nodes, designate 2-3 nodes as route reflectors. All other nodes peer only with the reflectors:

```bash
# Designate route reflector nodes
kubectl label node rr-1 route-reflector=true
kubectl label node rr-2 route-reflector=true
kubectl annotate node rr-1 projectcalico.org/RouteReflectorClusterID=224.0.0.1
kubectl annotate node rr-2 projectcalico.org/RouteReflectorClusterID=224.0.0.1
```

```yaml
apiVersion: projectcalico.org/v3
kind: BGPPeer
metadata:
  name: worker-to-rr
spec:
  nodeSelector: "!route-reflector == 'true'"
  peerSelector: route-reflector == 'true'
---
apiVersion: projectcalico.org/v3
kind: BGPPeer
metadata:
  name: rr-full-mesh
spec:
  nodeSelector: route-reflector == 'true'
  peerSelector: route-reflector == 'true'
```

```bash
calicoctl apply -f rr-peers.yaml
```

## Pattern 3: Route Reflectors with External Uplinks

Combine route reflectors with external peering. Only the reflector nodes peer with upstream routers:

```yaml
apiVersion: projectcalico.org/v3
kind: BGPPeer
metadata:
  name: rr-to-upstream
spec:
  peerIP: 10.0.0.1
  asNumber: 64501
  nodeSelector: route-reflector == 'true'
  filters:
    - external-upstream-filter
---
apiVersion: projectcalico.org/v3
kind: BGPPeer
metadata:
  name: worker-to-rr
spec:
  nodeSelector: "!route-reflector == 'true'"
  peerSelector: route-reflector == 'true'
---
apiVersion: projectcalico.org/v3
kind: BGPPeer
metadata:
  name: rr-mesh
spec:
  nodeSelector: route-reflector == 'true'
  peerSelector: route-reflector == 'true'
```

```bash
calicoctl apply -f rr-upstream-peers.yaml
```

## Pattern 4: Multi-Site Cluster Federation

Two clusters in different sites exchange routes through designated gateway nodes:

Cluster A configuration:

```yaml
apiVersion: projectcalico.org/v3
kind: BGPPeer
metadata:
  name: site-b-gateway
spec:
  peerIP: 192.168.2.10
  asNumber: 64520
  nodeSelector: gateway-node == 'true'
  filters:
    - cross-site-filter
```

Cluster B configuration:

```yaml
apiVersion: projectcalico.org/v3
kind: BGPPeer
metadata:
  name: site-a-gateway
spec:
  peerIP: 192.168.1.10
  asNumber: 64512
  nodeSelector: gateway-node == 'true'
  filters:
    - cross-site-filter
```

```bash
# On each cluster, label the gateway nodes
kubectl label node gateway-1 gateway-node=true
```

## Pattern 5: Redundant Upstream Peering

For high availability, peer with multiple upstream routers:

```yaml
apiVersion: projectcalico.org/v3
kind: BGPPeer
metadata:
  name: upstream-primary
spec:
  peerIP: 10.0.0.1
  asNumber: 64501
  filters:
    - upstream-filter
---
apiVersion: projectcalico.org/v3
kind: BGPPeer
metadata:
  name: upstream-secondary
spec:
  peerIP: 10.0.0.2
  asNumber: 64501
  filters:
    - upstream-filter
```

## Verification

Validate the peering topology is working as expected:

```bash
# Check all peers
calicoctl get bgppeer -o wide

# Verify sessions on each node
calicoctl node status

# Confirm routes are being learned
kubectl logs -n calico-system -l k8s-app=calico-node --tail=50 | grep -i "establish\|learned\|advertis"

# Test external connectivity through BGP routes
kubectl run test --image=busybox --rm -it --restart=Never -- traceroute <external-ip>
```

## Troubleshooting

Common issues with BGPPeer in production:

- Sessions flapping: Check for MTU issues on the peering link or unstable underlying network connectivity. Review `calicoctl node status` for frequent state changes
- Asymmetric routing: Verify all upstream peers have consistent routing policies and AS path preferences
- Route reflector overload: Monitor CPU and memory on reflector nodes. Consider adding more reflectors or splitting into multiple clusters
- Node selector not matching: Verify labels with `kubectl get nodes --show-labels` and ensure label syntax in nodeSelector is correct
- Sessions stuck in OpenSent: Usually indicates the remote peer is not configured. Coordinate with the network team

## Conclusion

BGPPeer resources in production follow established networking patterns adapted for Kubernetes. Top-of-rack peering works for bare metal, route reflector hierarchies scale beyond the mesh limit, and gateway peering enables multi-site federation. Choose the pattern that matches your infrastructure, configure redundancy for critical peering sessions, and monitor session health continuously with `calicoctl node status`. Always coordinate with your network team when creating peers that connect to infrastructure routers.
