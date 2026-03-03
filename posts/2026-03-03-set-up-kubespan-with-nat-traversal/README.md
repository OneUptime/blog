# How to Set Up KubeSpan with NAT Traversal

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, KubeSpan, NAT Traversal, WireGuard, Networking

Description: Learn how to configure KubeSpan for Talos Linux nodes behind NAT, including endpoint filtering, port forwarding, and techniques for reliable connectivity.

---

Not every node in your Talos Linux cluster will have a public IP address. In many real-world deployments, some or all nodes sit behind NAT routers, corporate firewalls, or cloud provider VPCs. KubeSpan handles NAT traversal reasonably well out of the box because WireGuard is designed to work through NAT, but there are configurations and considerations that can make the difference between a reliable setup and one that drops connections randomly. This guide covers how to set up KubeSpan when NAT is involved.

## How WireGuard NAT Traversal Works

WireGuard is a UDP-based protocol, which gives it a natural advantage with NAT traversal compared to TCP-based VPNs. When a WireGuard peer behind NAT sends a packet to a peer with a public IP, the NAT router creates a mapping. As long as the public peer sends responses back to the same source address and port, the NAT router forwards them correctly.

WireGuard also includes a persistent keepalive feature. When enabled, a peer sends an empty packet every N seconds to maintain the NAT mapping. Without keepalives, NAT mappings expire (typically after 30-120 seconds of inactivity), and the tunnel effectively dies.

KubeSpan builds on WireGuard and inherits these NAT traversal capabilities. It also adds intelligent endpoint management that helps nodes find each other through different network paths.

## Common NAT Scenarios

There are several scenarios you might encounter:

**Scenario 1: Some nodes public, some behind NAT.** This is the easiest case. Nodes behind NAT can reach public nodes directly, and WireGuard handles the rest.

**Scenario 2: All nodes behind NAT but different NATs.** This is harder. Neither node can initiate a connection to the other because both are behind NAT. You need at least one node with a public endpoint or use STUN-like techniques.

**Scenario 3: Nodes behind the same NAT.** Nodes on the same LAN behind the same NAT can reach each other using private IPs. The challenge is making sure KubeSpan uses private IPs for local peers and public IPs for remote peers.

## Setting Up KubeSpan with Mixed NAT

In the most common scenario, you have some nodes with public IPs and some behind NAT. Configure the NAT nodes to advertise their public-facing endpoint:

For nodes with public IPs:

```yaml
# public-node-config.yaml
machine:
  network:
    kubespan:
      enabled: true
      filters:
        endpoints:
          - "0.0.0.0/0"  # Advertise all endpoints
```

For nodes behind NAT, you need to make sure the NAT router forwards UDP port 51820:

```yaml
# nat-node-config.yaml
machine:
  network:
    kubespan:
      enabled: true
      filters:
        endpoints:
          # Only advertise the public (NAT) IP, not the private LAN IP
          - "!192.168.0.0/16"
          - "!10.0.0.0/8"
          - "!172.16.0.0/12"
          - "0.0.0.0/0"
```

Set up port forwarding on the NAT router:

```text
# NAT router port forwarding rule (varies by router)
# Forward UDP 51820 from public IP to the Talos node's private IP
# External port: 51820 -> Internal IP: 192.168.1.100, Internal port: 51820
```

## Endpoint Filtering for NAT Environments

Endpoint filtering is crucial in NAT environments. Without proper filters, a node might advertise its private LAN IP (like 192.168.1.100) to the discovery service. Nodes on other networks will try to connect to that private IP and fail.

```yaml
# Filter endpoints to only advertise routable IPs
machine:
  network:
    kubespan:
      enabled: true
      filters:
        endpoints:
          # Exclude RFC1918 private ranges
          - "!10.0.0.0/8"
          - "!172.16.0.0/12"
          - "!192.168.0.0/16"
          # Exclude link-local
          - "!169.254.0.0/16"
          # Allow everything else (public IPs)
          - "0.0.0.0/0"
```

However, if some of your nodes are on the same private network, you DO want them to use private IPs to communicate with each other (to avoid hairpin NAT). In this case, advertise both private and public endpoints:

```yaml
# Advertise both private and public IPs
machine:
  network:
    kubespan:
      enabled: true
      filters:
        endpoints:
          - "0.0.0.0/0"  # Advertise everything
```

KubeSpan will try multiple endpoints and use whichever works. Nodes on the same LAN will connect using the private IP, while remote nodes will connect using the public IP.

## Handling Double NAT

Double NAT (where your node is behind two layers of NAT) makes things more complicated. Port forwarding needs to be configured on both NAT devices, and the public IP that gets advertised needs to be the outermost public IP.

```text
Internet -> Router 1 (ISP NAT) -> Router 2 (Home/Office NAT) -> Talos Node
```

In this case, you typically need to:

1. Configure port forwarding on Router 2 (inner NAT) to forward UDP 51820 to the Talos node
2. Configure port forwarding on Router 1 (outer NAT) to forward UDP 51820 to Router 2

If you cannot configure Router 1 (like an ISP's carrier-grade NAT), you will need to use a relay node with a public IP. More on that below.

## Using a Relay Node

When nodes cannot establish direct connections (both behind restrictive NATs), you can use a relay node. This is a Talos node with a public IP that acts as an intermediary:

```yaml
# relay-node-config.yaml
# This node has a public IP and acts as a relay
machine:
  network:
    kubespan:
      enabled: true
      advertiseKubernetesNetworks: true
      filters:
        endpoints:
          - "0.0.0.0/0"
```

The relay node does not need special configuration. KubeSpan automatically routes traffic through nodes that can reach both sides. However, this adds latency and puts extra load on the relay node. For production use, make sure the relay has sufficient bandwidth.

## Testing NAT Traversal

After configuring KubeSpan, verify that NAT traversal is working:

```bash
# Check peer status - look at the endpoint column
talosctl get kubespanpeerstatus --nodes <public-node-ip>

# You should see the public (NAT) IP of nodes behind NAT
# NODE           NAMESPACE   TYPE                 ID     LABEL      ENDPOINT              STATE
# 203.0.113.10   network     KubeSpanPeerStatus   ...    nat-node   198.51.100.5:51820    up
```

If the endpoint shows a private IP for a node that should be using its public IP, your endpoint filters are not configured correctly.

```bash
# Check what endpoints a node is advertising
talosctl get kubespanendpoint --nodes <node-behind-nat> -o yaml

# You should see the public IP, not the private one
```

## Adjusting Keepalive Timers

NAT mappings have a timeout. If no traffic flows through a mapping for long enough, the NAT router drops it and the tunnel breaks. WireGuard's persistent keepalive prevents this.

KubeSpan configures keepalives automatically, but if you are behind an aggressive NAT with very short timeouts (some enterprise firewalls use 15-30 second timeouts), you might need to ensure keepalives are frequent enough.

Check the current keepalive behavior:

```bash
# Look at last handshake times to see if connections stay alive
talosctl get kubespanpeerstatus --nodes <node-ip> -o yaml | grep -i handshake
```

If handshakes are happening frequently (every few seconds instead of the normal every ~2 minutes), it might indicate NAT timeouts. The WireGuard keepalive in KubeSpan is set to 25 seconds by default, which should handle most NATs.

## MTU Considerations with NAT

NAT does not change the packet size, but it does add complexity to path MTU discovery. WireGuard already reduces the MTU to 1420 (from the typical 1500) to account for its own overhead. If your NAT environment also uses encapsulation (like when running in a cloud VPC), lower the MTU further:

```yaml
machine:
  network:
    kubespan:
      enabled: true
      mtu: 1360  # Conservative MTU for NAT + cloud environments
```

## Troubleshooting NAT Issues

When KubeSpan NAT traversal is not working:

```bash
# Step 1: Verify the node can reach the discovery service
talosctl get discoveredmembers --nodes <node-ip>

# Step 2: Check what endpoints are advertised
talosctl get kubespanendpoint --nodes <node-ip> -o yaml

# Step 3: Check peer status for connection state
talosctl get kubespanpeerstatus --nodes <node-ip>

# Step 4: Check for NAT-related issues in logs
talosctl logs controller-runtime --nodes <node-ip> | grep -i "endpoint\|kubespan"

# Step 5: Verify port forwarding from another machine
nc -zu <public-nat-ip> 51820
```

NAT traversal with KubeSpan on Talos Linux is mostly automatic, but it requires attention to endpoint filtering and port forwarding. The key takeaway is that at least one node needs to be reachable on its WireGuard port from the other nodes. If all your nodes are behind NAT, invest in a small relay node with a public IP. It is a small cost for reliable cluster connectivity.
