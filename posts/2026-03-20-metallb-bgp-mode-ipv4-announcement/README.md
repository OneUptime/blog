# How to Configure MetalLB BGP Mode for IPv4 Address Announcement

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MetalLB, Kubernetes, IPv4, BGP, Networking, Bare Metal

Description: Configure MetalLB BGP mode to announce Kubernetes service IPv4 addresses to your network routers using BGP for scalable, fault-tolerant load balancing.

Assuming your routers are configured to support multipath (ECMP), BGP mode provides true load balancing across Kubernetes nodes and enables multi-path routing to services. It requires BGP-capable routers in your network.

## How MetalLB BGP Mode Works

```text
MetalLB speaker on each node → BGP peers with router
Each eligible node announces service IPs via BGP
Router receives multiple next hops for the service IP (ECMP)
Traffic distributed across the advertising nodes at the router level
```

## Step 1: Configure the BGP Peer (Router Side)

On your router (example: a Linux router with FRRouting, configured to allow BGP multipath/ECMP):

```bash
# On the router, configure BGP to accept peers from Kubernetes nodes

# /etc/frr/frr.conf

router bgp 65000
 bgp router-id 192.168.1.1
 neighbor 192.168.1.10 remote-as 65001  ! Kubernetes node 1
 neighbor 192.168.1.11 remote-as 65001  ! Kubernetes node 2
 neighbor 192.168.1.12 remote-as 65001  ! Kubernetes node 3
 !
 address-family ipv4 unicast
  neighbor 192.168.1.10 activate
  neighbor 192.168.1.11 activate
  neighbor 192.168.1.12 activate
 exit-address-family
```

## Step 2: Configure MetalLB BGP Peer

```yaml
# metallb-bgp-peer.yaml
apiVersion: metallb.io/v1beta2
kind: BGPPeer
metadata:
  name: router-peer
  namespace: metallb-system
spec:
  # Your router's IPv4 address
  peerAddress: 192.168.1.1
  # Your router's BGP AS number
  peerASN: 65000
  # MetalLB's ASN (all Kubernetes nodes use the same ASN)
  myASN: 65001
  # Optional: BFD for fast failure detection (FRR mode only)
  # bfdProfile: fast-bfd
```

```bash
kubectl apply -f metallb-bgp-peer.yaml
```

## Step 3: Create IP Pool and BGP Advertisement

```yaml
# metallb-bgp-config.yaml
apiVersion: metallb.io/v1beta1
kind: IPAddressPool
metadata:
  name: bgp-pool
  namespace: metallb-system
spec:
  addresses:
  - 10.0.0.0/24  # Public or routable IP range for services

---
apiVersion: metallb.io/v1beta1
kind: BGPAdvertisement
metadata:
  name: bgp-advert
  namespace: metallb-system
spec:
  ipAddressPools:
  - bgp-pool
  # Optional: set BGP communities on advertisements
  communities:
  - 65000:1
  # Optional: only advertise from specific nodes
  # nodeSelectors:
  # - matchLabels:
  #     node-role: edge
```

```bash
kubectl apply -f metallb-bgp-config.yaml
```

## Step 4: Verify BGP Session Status

```bash
# Check MetalLB speaker logs for BGP activity
kubectl logs -n metallb-system -l app.kubernetes.io/component=speaker --all-containers=true | grep -i "bgp\|session\|established"

# If you're using MetalLB FRR mode, verify the session directly from the FRR container
kubectl get pods -n metallb-system -l app.kubernetes.io/component=speaker
kubectl exec -n metallb-system <speaker-pod> -c frr -- vtysh -c 'show bgp neighbors 192.168.1.1'
# Expected state: Established

# On the router, verify MetalLB routes are received
# (FRR router):
# show bgp ipv4 unicast
# Should show routes for the service IPs learned from Kubernetes nodes
```

## Testing Load Balancing with ECMP

```bash
# Create a service
kubectl expose deployment my-app --type=LoadBalancer --port=80

# Check the external IP
kubectl get svc my-app
# EXTERNAL-IP: 10.0.0.5

# Confirm MetalLB intends to advertise the service from multiple nodes
kubectl get servicebgpstatuses -n metallb-system -l metallb.io/service-name="my-app",metallb.io/service-namespace="default"
# You should see multiple nodes listed for the service

# On the router, confirm the service /32 has multiple next hops
# (FRR router):
# show bgp ipv4 unicast 10.0.0.5/32
# You should see the service route learned via multiple Kubernetes nodes

# From outside the cluster, verify the service is reachable through the announced IP
for i in $(seq 1 10); do curl -s http://10.0.0.5 | grep "Hostname"; done
# Different hostnames indicate end-to-end service load balancing; the router output is what confirms ECMP
```

BGP mode provides better performance and true load balancing compared to L2 mode, but requires router-level BGP configuration.
