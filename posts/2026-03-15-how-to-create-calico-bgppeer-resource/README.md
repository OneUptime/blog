# How to Create the Calico BGPPeer Resource

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, BGP, BGPPeer, Kubernetes, Networking, Peering, DevOps

Description: Learn how to create the Calico BGPPeer resource to establish BGP peering sessions between your Kubernetes cluster nodes and external routers or route reflectors.

---

## Introduction

The BGPPeer resource in Calico defines a BGP peering session between Calico nodes and an external BGP speaker. This is how your Kubernetes cluster exchanges routing information with the rest of your network infrastructure. Without BGPPeer resources, Calico nodes can only communicate via the internal node-to-node mesh, which does not extend beyond the cluster boundary.

BGPPeer resources can target specific nodes using node selectors, specific peers using peer selectors, or define global peerings that apply to all nodes. This flexibility allows you to model complex network topologies including top-of-rack peering, route reflector hierarchies, and cross-cluster federation.

This guide covers creating BGPPeer resources for different peering scenarios, from simple single-peer setups to node-specific and selector-based configurations.

## Prerequisites

- Kubernetes cluster with Calico CNI installed
- BGPConfiguration resource already configured with an AS number
- `calicoctl` and `kubectl` with cluster-admin access
- External router or route reflector IP address and AS number
- TCP port 179 open between peering endpoints

## Understanding the BGPPeer Schema

The BGPPeer resource uses the `projectcalico.org/v3` API. Here is the basic structure:

```yaml
apiVersion: projectcalico.org/v3
kind: BGPPeer
metadata:
  name: my-peer
spec:
  peerIP: 10.0.0.1
  asNumber: 64501
```

Key fields include `peerIP` (the remote peer address), `asNumber` (the remote AS number), `nodeSelector` (which local nodes peer), `peerSelector` (for node-to-node peering within the cluster), and `filters` (referencing BGPFilter resources).

## Creating a Global BGPPeer

A global BGPPeer applies to all Calico nodes. Every node will attempt to establish a BGP session with the specified peer:

```yaml
apiVersion: projectcalico.org/v3
kind: BGPPeer
metadata:
  name: global-upstream-peer
spec:
  peerIP: 10.0.0.1
  asNumber: 64501
```

```bash
calicoctl apply -f global-peer.yaml
```

## Creating a Node-Specific BGPPeer

To peer only from specific nodes, use `nodeSelector`. This is common when only certain nodes connect to a particular rack switch:

```yaml
apiVersion: projectcalico.org/v3
kind: BGPPeer
metadata:
  name: rack1-tor-peer
spec:
  peerIP: 10.1.0.1
  asNumber: 64501
  nodeSelector: rack == 'rack1'
```

```bash
kubectl label node worker-1 rack=rack1
kubectl label node worker-2 rack=rack1
calicoctl apply -f rack1-peer.yaml
```

## Creating a Route Reflector Peer

For route reflector topologies, use `peerSelector` to have non-reflector nodes peer with reflector nodes:

```yaml
apiVersion: projectcalico.org/v3
kind: BGPPeer
metadata:
  name: rr-mesh
spec:
  nodeSelector: "!route-reflector == 'true'"
  peerSelector: route-reflector == 'true'
```

And a separate peer for reflectors to peer with each other:

```yaml
apiVersion: projectcalico.org/v3
kind: BGPPeer
metadata:
  name: rr-to-rr
spec:
  nodeSelector: route-reflector == 'true'
  peerSelector: route-reflector == 'true'
```

```bash
kubectl label node rr-node-1 route-reflector=true
kubectl label node rr-node-2 route-reflector=true
calicoctl apply -f rr-mesh.yaml
calicoctl apply -f rr-to-rr.yaml
```

## Creating a BGPPeer with Filters

Attach BGPFilter resources to control route exchange:

```yaml
apiVersion: projectcalico.org/v3
kind: BGPPeer
metadata:
  name: filtered-upstream-peer
spec:
  peerIP: 10.0.0.1
  asNumber: 64501
  filters:
    - external-upstream-filter
```

## Creating a BGPPeer with Password Authentication

For secured peering sessions using TCP MD5 authentication:

```yaml
apiVersion: projectcalico.org/v3
kind: BGPPeer
metadata:
  name: secure-peer
spec:
  peerIP: 10.0.0.1
  asNumber: 64501
  password:
    secretKeyRef:
      name: bgp-secrets
      key: upstream-password
```

Create the secret first:

```bash
kubectl create secret generic bgp-secrets -n calico-system --from-literal=upstream-password=MyBGPSecret123
```

## Creating an IPv6 BGPPeer

For IPv6 peering sessions:

```yaml
apiVersion: projectcalico.org/v3
kind: BGPPeer
metadata:
  name: ipv6-peer
spec:
  peerIP: "2001:db8::1"
  asNumber: 64501
```

## Verification

After creating a BGPPeer, verify the session is established:

```bash
# List all peers
calicoctl get bgppeer -o wide

# Check BGP session status on each node
calicoctl node status

# View detailed peer configuration
calicoctl get bgppeer filtered-upstream-peer -o yaml
```

The `calicoctl node status` output should show the peer with status `Established` and the correct AS number.

## Troubleshooting

If the BGP session does not establish:

- Check TCP port 179 connectivity: `kubectl exec -n calico-system <calico-node-pod> -- nc -zv 10.0.0.1 179`
- Verify AS numbers match on both sides of the peering session
- Check calico-node logs: `kubectl logs -n calico-system -l k8s-app=calico-node | grep -i "peer\|session\|connect"`
- Confirm the nodeSelector matches intended nodes: `kubectl get nodes -l rack=rack1`
- Verify the BGPConfiguration AS number is set: `calicoctl get bgpconfiguration default -o yaml`
- For password-authenticated peers, verify the secret exists: `kubectl get secret bgp-secrets -n calico-system`

## Conclusion

The BGPPeer resource is how Calico nodes establish BGP sessions with the outside world. Global peers work for simple topologies, while node selectors and peer selectors enable sophisticated routing architectures like route reflector hierarchies and rack-aware peering. Always verify session establishment with `calicoctl node status` after creating a new peer, and use BGPFilter resources to control route exchange on each peering session.
