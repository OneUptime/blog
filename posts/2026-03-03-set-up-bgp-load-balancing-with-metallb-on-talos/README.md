# How to Set Up BGP Load Balancing with MetalLB on Talos

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, MetalLB, BGP, Load Balancing, Kubernetes, Networking

Description: Configure MetalLB BGP mode on Talos Linux for true multi-node load balancing with router-level traffic distribution.

---

While MetalLB's Layer 2 mode is simple to set up, it has a significant limitation: all traffic for a given service enters the cluster through a single node. BGP (Border Gateway Protocol) mode solves this by having MetalLB peer with your network routers and advertise routes to service IPs. The router then distributes traffic across multiple nodes using ECMP (Equal-Cost Multi-Path) routing, giving you genuine load balancing at the network level.

BGP mode requires a bit more network infrastructure, but the payoff is better performance and more resilient traffic handling. This guide walks through setting up MetalLB BGP on Talos Linux.

## How BGP Mode Works

In BGP mode, the MetalLB speaker on each node establishes a BGP peering session with one or more routers on your network. When a service gets an external IP, MetalLB advertises a route to that IP from every node. Your router sees multiple equal-cost paths to the same IP and distributes incoming traffic across all of them.

```
Internet -> Router -> ECMP across nodes -> kube-proxy -> pods
```

The router spreads traffic across nodes based on packet attributes (source IP, destination port, etc.), giving you multi-node load balancing that L2 mode cannot provide.

## Prerequisites

For BGP mode, you need:

- A router that supports BGP (most enterprise routers, or a software router like FRR or VyOS)
- An AS number for your MetalLB speakers (private AS range: 64512-65534)
- An AS number for your router (or its existing AS number)
- Network connectivity between Talos nodes and the BGP router

## Installing MetalLB

If you have not already installed MetalLB:

```bash
helm repo add metallb https://metallb.github.io/metallb
helm repo update

helm install metallb metallb/metallb \
    --namespace metallb-system \
    --create-namespace \
    --wait
```

Verify the speaker DaemonSet is running:

```bash
kubectl get pods -n metallb-system -l app.kubernetes.io/component=speaker -o wide
```

## Configuring BGP Peers

Define your BGP peering sessions. You need a BGPPeer resource for each router you want to peer with:

```yaml
# bgp-peer.yaml
apiVersion: metallb.io/v1beta2
kind: BGPPeer
metadata:
  name: router-1
  namespace: metallb-system
spec:
  myASN: 64512          # MetalLB's AS number
  peerASN: 64513        # Your router's AS number
  peerAddress: 192.168.1.1  # Router's IP
  peerPort: 179         # Standard BGP port
```

For redundancy, peer with multiple routers:

```yaml
apiVersion: metallb.io/v1beta2
kind: BGPPeer
metadata:
  name: router-1
  namespace: metallb-system
spec:
  myASN: 64512
  peerASN: 64513
  peerAddress: 192.168.1.1
---
apiVersion: metallb.io/v1beta2
kind: BGPPeer
metadata:
  name: router-2
  namespace: metallb-system
spec:
  myASN: 64512
  peerASN: 64513
  peerAddress: 192.168.1.2
```

Apply the configuration:

```bash
kubectl apply -f bgp-peer.yaml
```

## Configuring the Router

Your router needs to be configured to accept BGP connections from your Talos nodes. Here are examples for common router software.

### FRR (Free Range Routing)

```
router bgp 64513
  bgp router-id 192.168.1.1
  no bgp ebgp-requires-policy

  # Add each Talos node as a neighbor
  neighbor 192.168.1.10 remote-as 64512
  neighbor 192.168.1.11 remote-as 64512
  neighbor 192.168.1.12 remote-as 64512

  address-family ipv4 unicast
    # Enable ECMP for multi-path routing
    maximum-paths 8
    neighbor 192.168.1.10 activate
    neighbor 192.168.1.11 activate
    neighbor 192.168.1.12 activate
  exit-address-family
```

### VyOS

```
set protocols bgp 64513 neighbor 192.168.1.10 remote-as 64512
set protocols bgp 64513 neighbor 192.168.1.11 remote-as 64512
set protocols bgp 64513 neighbor 192.168.1.12 remote-as 64512
set protocols bgp 64513 parameters bestpath as-path multipath-relax
set protocols bgp 64513 address-family ipv4-unicast maximum-paths ebgp 8
```

### Cisco IOS

```
router bgp 64513
  neighbor 192.168.1.10 remote-as 64512
  neighbor 192.168.1.11 remote-as 64512
  neighbor 192.168.1.12 remote-as 64512
  maximum-paths 8
  address-family ipv4 unicast
    neighbor 192.168.1.10 activate
    neighbor 192.168.1.11 activate
    neighbor 192.168.1.12 activate
```

## Configuring Address Pools and BGP Advertisement

Define the IP pool and BGP advertisement:

```yaml
# bgp-config.yaml
apiVersion: metallb.io/v1beta1
kind: IPAddressPool
metadata:
  name: bgp-pool
  namespace: metallb-system
spec:
  addresses:
  - 10.10.10.0/24  # IPs to advertise via BGP
---
apiVersion: metallb.io/v1beta1
kind: BGPAdvertisement
metadata:
  name: bgp-advert
  namespace: metallb-system
spec:
  ipAddressPools:
  - bgp-pool
  aggregationLength: 32  # Advertise /32 routes (one per service IP)
  localPref: 100
  communities:
  - 64512:100  # Optional BGP community for traffic engineering
```

## Advanced BGP Configuration

### Node-Specific Peering

If different nodes peer with different routers (e.g., in a multi-rack setup):

```yaml
apiVersion: metallb.io/v1beta2
kind: BGPPeer
metadata:
  name: rack-1-router
  namespace: metallb-system
spec:
  myASN: 64512
  peerASN: 64513
  peerAddress: 192.168.1.1
  nodeSelectors:
  - matchLabels:
      rack: rack-1
---
apiVersion: metallb.io/v1beta2
kind: BGPPeer
metadata:
  name: rack-2-router
  namespace: metallb-system
spec:
  myASN: 64512
  peerASN: 64514
  peerAddress: 192.168.2.1
  nodeSelectors:
  - matchLabels:
      rack: rack-2
```

### BGP Authentication

Use MD5 authentication for BGP sessions:

```yaml
apiVersion: metallb.io/v1beta2
kind: BGPPeer
metadata:
  name: router-1
  namespace: metallb-system
spec:
  myASN: 64512
  peerASN: 64513
  peerAddress: 192.168.1.1
  password: "your-bgp-password"  # MD5 password (must match router config)
```

### Route Aggregation

Instead of advertising individual /32 routes, you can aggregate:

```yaml
apiVersion: metallb.io/v1beta1
kind: BGPAdvertisement
metadata:
  name: aggregated
  namespace: metallb-system
spec:
  ipAddressPools:
  - bgp-pool
  aggregationLength: 24  # Advertise the whole /24 block
```

## Verifying BGP Sessions

Check that BGP peering is established:

```bash
# Check MetalLB speaker logs for BGP session status
kubectl logs -n metallb-system -l app.kubernetes.io/component=speaker --tail=50 | grep -i bgp

# Check events for session establishment
kubectl get events -n metallb-system --sort-by=.lastTimestamp

# From the router side (FRR example)
# vtysh -c "show bgp summary"
# vtysh -c "show bgp ipv4 unicast"
# vtysh -c "show ip route bgp"
```

Create a test service and verify the route appears on the router:

```bash
# Create a test LoadBalancer service
kubectl create deployment test-web --image=nginx
kubectl expose deployment test-web --type=LoadBalancer --port=80

# Check the assigned IP
kubectl get svc test-web

# On the router, verify the route was learned
# vtysh -c "show ip route 10.10.10.1"
# Should show multiple next-hops (one per node) with ECMP
```

## Testing ECMP Distribution

Verify that traffic is actually being distributed across nodes:

```bash
#!/bin/bash
# test-ecmp.sh
# Sends traffic and checks which nodes receive it

SERVICE_IP="10.10.10.1"
SERVICE_PORT="80"

# Send 100 requests from different source ports
for i in $(seq 1 100); do
    curl -s -o /dev/null "http://$SERVICE_IP:$SERVICE_PORT"
done

# Check which nodes handled the traffic
# Use pod logs or node-level traffic counters to verify distribution
for node in $(kubectl get nodes -o jsonpath='{.items[*].metadata.name}'); do
    echo "Node $node:"
    kubectl get pods -o wide | grep test-web | grep "$node" | wc -l
done
```

## Handling BGP Session Failures

Configure graceful restart and hold timers for better resilience:

```yaml
apiVersion: metallb.io/v1beta2
kind: BGPPeer
metadata:
  name: router-1
  namespace: metallb-system
spec:
  myASN: 64512
  peerASN: 64513
  peerAddress: 192.168.1.1
  holdTime: 90s          # How long to wait before declaring peer dead
  keepaliveTime: 30s     # How often to send keepalive messages
  ebgpMultiHop: false    # Set to true if router is not directly connected
  bfdProfile: "fast"     # Optional BFD for faster failure detection
```

## Monitoring BGP Health

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: metallb-bgp-alerts
  namespace: monitoring
spec:
  groups:
  - name: metallb-bgp
    rules:
    - alert: MetalLBBGPSessionDown
      expr: |
        metallb_bgp_session_up == 0
      for: 2m
      labels:
        severity: critical
      annotations:
        summary: "MetalLB BGP session is down"
        description: "BGP session between MetalLB and router is not established"

    - alert: MetalLBBGPPrefixNotAdvertised
      expr: |
        metallb_bgp_announced_prefixes_total == 0 and metallb_allocator_addresses_in_use_total > 0
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "MetalLB has IPs allocated but no BGP prefixes announced"
```

## Talos-Specific Notes

On Talos Linux, make sure the BGP port (TCP 179) is accessible. Talos has a minimal firewall that allows most traffic by default, but if you have applied any custom network rules, verify that port 179 is open between your nodes and the routers.

```bash
# Verify connectivity to the BGP router from a Talos node
talosctl netstat --nodes $NODE_IP | grep 179
```

## Wrapping Up

BGP mode with MetalLB on Talos Linux gives you production-grade load balancing with true multi-node traffic distribution. It requires more setup than L2 mode, namely a BGP-capable router and proper peering configuration, but the benefits are substantial: better bandwidth utilization, faster failover with BFD, and no single-node bottleneck. If your network infrastructure supports BGP, it is the recommended approach for any serious bare-metal Talos deployment.
