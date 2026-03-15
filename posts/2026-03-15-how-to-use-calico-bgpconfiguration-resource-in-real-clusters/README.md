# How to Use the Calico BGPConfiguration Resource in Real Clusters

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, BGP, Kubernetes, Networking, Production, BGPConfiguration, DevOps

Description: Practical patterns for using the Calico BGPConfiguration resource in production Kubernetes clusters with real-world networking scenarios.

---

## Introduction

The BGPConfiguration resource becomes particularly important in production environments where Kubernetes clusters must integrate with existing network infrastructure. In real clusters, you rarely use the default settings. Instead, you configure BGP to peer with top-of-rack switches, advertise service IPs to load balancers, and manage route distribution through reflectors.

This guide covers practical patterns drawn from common production deployments. Each scenario includes the complete BGPConfiguration along with the supporting resources needed to make it work. The focus is on configurations that solve real networking problems rather than theoretical examples.

Whether you are running on bare metal, in a private data center, or in a hybrid cloud setup, these patterns will help you configure BGP routing that integrates cleanly with your existing infrastructure.

## Prerequisites

- Production Kubernetes cluster with Calico CNI
- `calicoctl` and `kubectl` with cluster-admin access
- Knowledge of your data center AS numbers and peering addresses
- Network team coordination for external BGP peer configuration

## Pattern 1: Bare Metal with Top-of-Rack Peering

In bare metal deployments, nodes peer directly with top-of-rack (ToR) switches. Disable the node-to-node mesh and use the switches for route distribution:

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
  serviceExternalIPs:
    - cidr: 203.0.113.0/24
  serviceLoadBalancerIPs:
    - cidr: 198.51.100.0/24
  listenPort: 179
  logSeverityScreen: Info
```

Pair this with a BGPPeer for the ToR switches:

```yaml
apiVersion: projectcalico.org/v3
kind: BGPPeer
metadata:
  name: tor-switch-peer
spec:
  peerIP: 10.0.0.1
  asNumber: 64501
```

## Pattern 2: Route Reflector Topology

For clusters with more than 50 nodes, the full node-to-node mesh becomes expensive. Use dedicated route reflector nodes instead:

```yaml
apiVersion: projectcalico.org/v3
kind: BGPConfiguration
metadata:
  name: default
spec:
  asNumber: 64512
  nodeToNodeMeshEnabled: false
  communities:
    - name: cluster-internal
      value: "64512:100"
  prefixAdvertisements:
    - cidr: 10.96.0.0/12
      communities:
        - cluster-internal
```

Label specific nodes as route reflectors:

```bash
kubectl label node rr-node-1 route-reflector=true
kubectl label node rr-node-2 route-reflector=true
```

Then configure a BGPPeer that uses node selectors:

```yaml
apiVersion: projectcalico.org/v3
kind: BGPPeer
metadata:
  name: route-reflector-peer
spec:
  nodeSelector: "!route-reflector == 'true'"
  peerSelector: route-reflector == 'true'
```

## Pattern 3: Dual-Stack Networking

For clusters running both IPv4 and IPv6, configure advertisement for both address families:

```yaml
apiVersion: projectcalico.org/v3
kind: BGPConfiguration
metadata:
  name: default
spec:
  asNumber: 64512
  nodeToNodeMeshEnabled: true
  serviceClusterIPs:
    - cidr: 10.96.0.0/12
    - cidr: fd00:10:96::/112
  serviceExternalIPs:
    - cidr: 203.0.113.0/24
    - cidr: 2001:db8::/32
```

## Pattern 4: Multi-Cluster Federation

When multiple Kubernetes clusters need to exchange routes, each cluster uses a distinct AS number:

```yaml
apiVersion: projectcalico.org/v3
kind: BGPConfiguration
metadata:
  name: default
spec:
  asNumber: 64520
  nodeToNodeMeshEnabled: true
  serviceClusterIPs:
    - cidr: 10.100.0.0/16
  communities:
    - name: cluster-b
      value: "64520:200"
  prefixAdvertisements:
    - cidr: 10.244.0.0/16
      communities:
        - cluster-b
```

## Verification

Validate the BGP configuration is active and routes are being advertised:

```bash
# Check BGP session status
calicoctl node status

# Verify advertised routes from a peer router
calicoctl get bgpconfiguration default -o yaml

# Confirm service IPs are being advertised
kubectl get svc -A -o wide | grep LoadBalancer

# Check calico-node BGP logs
kubectl logs -n calico-system -l k8s-app=calico-node --tail=100 | grep -i "advertis\|peer\|establish"
```

## Troubleshooting

Common issues in production BGP deployments:

- Routes not advertised: Verify `serviceClusterIPs` and `serviceLoadBalancerIPs` CIDRs match your actual service CIDR ranges. Check with `kubectl cluster-info dump | grep service-cluster-ip-range`
- BGP sessions stuck in Connect state: Check firewall rules allow TCP port 179 between peers. Verify AS numbers match on both sides of the peering session
- Partial connectivity after disabling mesh: Ensure all nodes can reach at least one route reflector. Check route reflector node health with `kubectl get nodes`
- Community values not applied: Verify community names in `prefixAdvertisements` match names defined in `communities` list exactly

## Conclusion

Real-world BGP configurations in Calico go well beyond the defaults. Bare metal clusters need ToR peering, large clusters need route reflectors, and multi-cluster setups need distinct AS numbers with community tagging. The BGPConfiguration resource provides the flexibility to handle all these scenarios. Start with the pattern that matches your infrastructure and iterate based on monitoring and network team feedback.
