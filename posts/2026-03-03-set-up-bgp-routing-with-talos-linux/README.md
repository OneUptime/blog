# How to Set Up BGP Routing with Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, BGP, Networking, Routing, Kubernetes, MetalLB, Calico

Description: Step-by-step guide to configuring BGP routing on Talos Linux clusters for advanced networking and service advertisement.

---

BGP (Border Gateway Protocol) is the routing protocol that holds the internet together. In the context of Kubernetes clusters running on Talos Linux, BGP serves a different but equally important purpose: advertising service IPs and pod networks to your physical network infrastructure. This allows external clients to reach Kubernetes services without relying on a single load balancer as a bottleneck.

Setting up BGP on Talos Linux involves configuring both the Kubernetes networking layer and potentially the Talos node itself. This guide walks through the entire process.

## Why BGP for Kubernetes?

In a bare-metal Kubernetes environment (which is common with Talos Linux), you need a way to make LoadBalancer-type services reachable from outside the cluster. Cloud providers handle this automatically, but on bare metal you have two main options:

1. **Layer 2 (ARP/NDP)**: Simple but limited to a single subnet, with failover characteristics that some network teams do not like
2. **BGP**: Scalable, supports ECMP (Equal-Cost Multi-Path) routing, and integrates with existing network infrastructure

BGP is the preferred choice for production environments because it allows true load balancing across multiple nodes and integrates cleanly with enterprise networking equipment.

## Architecture Overview

A typical BGP setup for Talos Linux involves:

- **Talos nodes**: Running a BGP speaker that advertises routes
- **Top-of-rack (ToR) switches**: Acting as BGP peers that receive route advertisements
- **MetalLB or Cilium**: Providing the BGP speaker implementation in Kubernetes
- **Service IPs**: The addresses that get advertised via BGP

## Setting Up BGP with MetalLB

MetalLB is the most common way to add BGP capabilities to a Kubernetes cluster.

### Step 1: Install MetalLB

```bash
# Install MetalLB using Helm
helm repo add metallb https://metallb.github.io/metallb
helm repo update

helm install metallb metallb/metallb \
  --namespace metallb-system \
  --create-namespace
```

Or using plain manifests:

```bash
kubectl apply -f https://raw.githubusercontent.com/metallb/metallb/v0.14.5/config/manifests/metallb-native.yaml
```

### Step 2: Configure BGP Peers

Define the BGP peers (your network routers/switches):

```yaml
apiVersion: metallb.io/v1beta2
kind: BGPPeer
metadata:
  name: tor-switch-1
  namespace: metallb-system
spec:
  myASN: 64512        # Your cluster's ASN (use private range 64512-65534)
  peerASN: 64501      # The router's ASN
  peerAddress: 192.168.1.1  # The router's IP address
  keepaliveTime: 20s
  holdTime: 60s
---
apiVersion: metallb.io/v1beta2
kind: BGPPeer
metadata:
  name: tor-switch-2
  namespace: metallb-system
spec:
  myASN: 64512
  peerASN: 64501
  peerAddress: 192.168.1.2
  keepaliveTime: 20s
  holdTime: 60s
```

### Step 3: Configure IP Address Pools

Define which IP ranges MetalLB can assign to LoadBalancer services:

```yaml
apiVersion: metallb.io/v1beta1
kind: IPAddressPool
metadata:
  name: production-pool
  namespace: metallb-system
spec:
  addresses:
    - 10.100.0.0/24    # Range for production services
---
apiVersion: metallb.io/v1beta1
kind: L2Advertisement
metadata:
  name: l2-advert
  namespace: metallb-system
spec:
  ipAddressPools:
    - production-pool
---
apiVersion: metallb.io/v1beta1
kind: BGPAdvertisement
metadata:
  name: bgp-advert
  namespace: metallb-system
spec:
  ipAddressPools:
    - production-pool
  communities:
    - 64512:100
  localPref: 100
```

### Step 4: Create a LoadBalancer Service

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-service
  namespace: default
spec:
  type: LoadBalancer
  selector:
    app: myapp
  ports:
    - port: 80
      targetPort: 8080
```

MetalLB assigns an IP from the pool and advertises it via BGP to the configured peers.

## Setting Up BGP with Cilium

If you use Cilium as your CNI, it has built-in BGP support:

### Step 1: Install Cilium with BGP Enabled

```bash
helm install cilium cilium/cilium \
  --namespace kube-system \
  --set bgpControlPlane.enabled=true \
  --set ipam.mode=kubernetes
```

### Step 2: Configure BGP Peering Policy

```yaml
apiVersion: cilium.io/v2alpha1
kind: CiliumBGPPeeringPolicy
metadata:
  name: rack1
spec:
  nodeSelector:
    matchLabels:
      rack: "1"
  virtualRouters:
    - localASN: 64512
      exportPodCIDR: true
      neighbors:
        - peerAddress: "192.168.1.1/32"
          peerASN: 64501
          gracefulRestart:
            enabled: true
            restartTimeSeconds: 120
        - peerAddress: "192.168.1.2/32"
          peerASN: 64501
      serviceSelector:
        matchExpressions:
          - key: app
            operator: Exists
```

### Step 3: Advertise Service IPs

Cilium can advertise LoadBalancer service IPs through BGP:

```yaml
apiVersion: cilium.io/v2alpha1
kind: CiliumLoadBalancerIPPool
metadata:
  name: production-pool
spec:
  blocks:
    - cidr: "10.100.0.0/24"
```

## Talos-Specific Networking Considerations

### Kernel Parameters

BGP may require specific kernel parameters. Configure these in the Talos machine configuration:

```yaml
machine:
  sysctls:
    # Enable IP forwarding (required for routing)
    net.ipv4.ip_forward: "1"
    net.ipv6.conf.all.forwarding: "1"
    # Increase the number of connections tracked
    net.netfilter.nf_conntrack_max: "524288"
```

### Network Interface Configuration

Make sure your Talos nodes have properly configured network interfaces:

```yaml
machine:
  network:
    interfaces:
      - interface: eth0
        addresses:
          - 192.168.1.10/24
        routes:
          - network: 0.0.0.0/0
            gateway: 192.168.1.1
```

### Firewall Considerations

BGP uses TCP port 179. Talos Linux does not have a host firewall by default, but if you have network-level firewalls, make sure port 179 is open between the Talos nodes and the BGP peers:

```text
# Required firewall rules
# Allow BGP traffic (TCP 179) between nodes and routers
# Allow ICMP for path MTU discovery
```

## Router-Side Configuration

Your BGP setup is only half complete until the routers are configured. Here is an example for a common router configuration:

### Cisco IOS Example

```text
router bgp 64501
  neighbor 192.168.1.10 remote-as 64512
  neighbor 192.168.1.11 remote-as 64512
  neighbor 192.168.1.12 remote-as 64512
  !
  address-family ipv4 unicast
    neighbor 192.168.1.10 activate
    neighbor 192.168.1.11 activate
    neighbor 192.168.1.12 activate
    maximum-paths 3
  exit-address-family
```

### FRRouting Example (Linux Router)

```text
router bgp 64501
  neighbor k8s-nodes peer-group
  neighbor k8s-nodes remote-as 64512
  neighbor 192.168.1.10 peer-group k8s-nodes
  neighbor 192.168.1.11 peer-group k8s-nodes
  neighbor 192.168.1.12 peer-group k8s-nodes
  !
  address-family ipv4 unicast
    neighbor k8s-nodes activate
    maximum-paths 3
  exit-address-family
```

## Verifying BGP Sessions

### From the Kubernetes Side

```bash
# Check MetalLB speaker status
kubectl get pods -n metallb-system
kubectl logs -n metallb-system -l component=speaker

# Check if BGP sessions are established
kubectl get bgppeers -n metallb-system -o yaml

# For Cilium, check BGP status
kubectl exec -n kube-system cilium-xxxxx -- cilium bgp peers
```

### From the Router Side

```bash
# On a Cisco router
show ip bgp summary
show ip bgp neighbors 192.168.1.10

# On a FRRouting router
show bgp summary
show bgp neighbors 192.168.1.10
```

You should see the BGP sessions in "Established" state and received routes in the BGP table.

## Troubleshooting BGP on Talos Linux

### Sessions Not Establishing

```bash
# Check if port 179 is reachable
kubectl debug node/talos-worker-1 -it --image=nicolaka/netshoot -- \
  nc -zv 192.168.1.1 179

# Check MetalLB speaker logs for errors
kubectl logs -n metallb-system -l component=speaker | grep -i "error\|bgp"
```

### Routes Not Being Advertised

```bash
# Verify the IP address pool has available addresses
kubectl get ipaddresspools -n metallb-system -o yaml

# Check if services have been assigned IPs
kubectl get services -A | grep LoadBalancer

# Verify BGP advertisements
kubectl get bgpadvertisements -n metallb-system -o yaml
```

## Conclusion

BGP routing on Talos Linux gives your bare-metal Kubernetes cluster the same networking flexibility that cloud environments provide automatically. Whether you choose MetalLB or Cilium for the BGP implementation, the setup process involves configuring peers, address pools, and router-side settings. The result is a production-grade networking setup where service IPs are advertised across your network, enabling true load balancing and high availability for your Kubernetes services.
