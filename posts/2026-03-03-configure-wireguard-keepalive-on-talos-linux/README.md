# How to Configure WireGuard Keepalive on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, WireGuard, VPN, Networking, NAT

Description: Understand how to configure WireGuard persistent keepalive on Talos Linux to maintain connections through NAT and detect peer failures.

---

WireGuard is a silent protocol by default. If there is no data to send, it sends nothing. This works great in ideal network conditions, but it causes problems when nodes sit behind NAT devices, firewalls with connection tracking, or when you need to detect peer failures quickly. The persistent keepalive setting solves these problems by sending a small packet at regular intervals, keeping the connection alive even when there is no real traffic.

This post explains what persistent keepalive does, when you need it, how to configure it on Talos Linux, and how to choose the right interval for your environment.

## What Persistent Keepalive Does

When you set `persistentKeepalive` on a WireGuard peer, the local node sends a keepalive packet to that peer at the specified interval (in seconds). The packet is a small encrypted message that serves several purposes.

First, it keeps NAT mappings alive. NAT devices track active connections and expire them after a period of inactivity. If the mapping expires, incoming packets from the peer get dropped because the NAT device no longer knows where to forward them. Keepalive packets prevent the mapping from expiring.

Second, it keeps stateful firewall rules active. Many firewalls track UDP "connections" and expire them after a timeout. Regular keepalive traffic prevents the firewall from closing the allowed path.

Third, it enables the remote peer to discover the current endpoint of the sending node. When a node behind NAT sends a keepalive, the receiving peer learns the node's current public IP and port, allowing it to send traffic back.

## When You Need Keepalive

Not every WireGuard peer needs keepalive. Here are the scenarios where you should enable it.

### Nodes Behind NAT

This is the most common reason. If a Talos node sits behind a NAT device (a home router, a cloud NAT gateway, or a corporate firewall), you need keepalive to maintain the NAT mapping.

```text
[Talos Node] --> [NAT Router] --> [Internet] --> [Remote Peer]

Without keepalive:
  NAT mapping expires after ~60s of inactivity
  Remote peer can no longer reach the node

With keepalive:
  Small packet sent every 25s
  NAT mapping stays active
  Bidirectional communication works reliably
```

### Nodes with Dynamic IPs

When a node's IP address changes (like when a cloud instance restarts or an ISP rotates addresses), the keepalive packet sent from the new IP tells the peer about the address change.

### Monitoring and Detection

Even without NAT, keepalive helps you detect when a peer goes offline. If you see regular keepalive traffic in the WireGuard stats and it suddenly stops, you know the peer is down.

### When You Do NOT Need It

If both peers have stable, public IP addresses and there is no NAT or stateful firewall between them, you can skip keepalive. In this case, WireGuard's natural traffic is enough to maintain the connection, and adding keepalive just adds unnecessary overhead (though the overhead is minimal).

## Configuring Keepalive on Talos Linux

The `persistentKeepalive` setting is configured per peer in the WireGuard interface definition. It is set in seconds.

```yaml
# Talos machine configuration with keepalive
machine:
  network:
    interfaces:
      - interface: wg0
        mtu: 1420
        addresses:
          - 10.10.0.1/24
        wireguard:
          privateKey: "YOUR_PRIVATE_KEY"
          listenPort: 51820
          peers:
            - publicKey: "PEER_PUBLIC_KEY"
              endpoint: peer.example.com:51820
              allowedIPs:
                - 10.10.0.2/32
              # Send a keepalive every 25 seconds
              persistentKeepalive: 25
```

Apply this configuration with talosctl:

```bash
# Apply the configuration patch
talosctl -n 192.168.1.1 patch machineconfig \
  --patch-file wireguard-keepalive-patch.yaml
```

## Choosing the Right Keepalive Interval

The default recommendation is 25 seconds. This works well for most situations because the majority of NAT devices have a UDP session timeout between 30 and 120 seconds. Sending a packet every 25 seconds keeps the mapping alive with a comfortable margin.

However, there are situations where you might want a different value.

### Aggressive NAT (15 seconds)

Some cheaper routers and mobile networks have very short UDP timeouts, sometimes as low as 20-30 seconds. In these environments, set keepalive to 15 seconds.

```yaml
# Aggressive keepalive for restrictive NAT
peers:
  - publicKey: "PEER_PUBLIC_KEY"
    endpoint: peer.example.com:51820
    allowedIPs:
      - 10.10.0.2/32
    # More frequent keepalive for aggressive NAT
    persistentKeepalive: 15
```

### Relaxed Networks (60 seconds)

If you are on a well-behaved network where NAT timeouts are known to be long (120+ seconds), you can reduce the keepalive frequency to save a tiny bit of bandwidth.

```yaml
# Relaxed keepalive for stable networks
peers:
  - publicKey: "PEER_PUBLIC_KEY"
    endpoint: peer.example.com:51820
    allowedIPs:
      - 10.10.0.2/32
    persistentKeepalive: 60
```

### Zero (Disabled)

Setting keepalive to 0 disables it entirely. Only do this when you are certain there is no NAT between the peers and you do not need the connection-monitoring benefit.

```yaml
# Disabled keepalive - only for direct, stable connections
peers:
  - publicKey: "PEER_PUBLIC_KEY"
    endpoint: 203.0.113.10:51820
    allowedIPs:
      - 10.10.0.2/32
    persistentKeepalive: 0
```

## Keepalive in Different Topologies

### Full Mesh

In a full mesh where every node peers with every other node, you typically enable keepalive on nodes behind NAT and disable it on nodes with public IPs.

```yaml
# Node behind NAT - enable keepalive to all peers
machine:
  network:
    interfaces:
      - interface: wg0
        addresses:
          - 10.10.0.3/24
        wireguard:
          privateKey: "PRIVATE_KEY"
          listenPort: 51820
          peers:
            - publicKey: "PUBLIC_NODE_1_KEY"
              endpoint: 203.0.113.10:51820
              allowedIPs:
                - 10.10.0.1/32
              persistentKeepalive: 25
            - publicKey: "PUBLIC_NODE_2_KEY"
              endpoint: 198.51.100.20:51820
              allowedIPs:
                - 10.10.0.2/32
              persistentKeepalive: 25
```

### Hub and Spoke

In a hub-and-spoke topology, only the spoke nodes need keepalive. The hub has a public IP and does not need to maintain NAT mappings.

```yaml
# Spoke node configuration with keepalive
machine:
  network:
    interfaces:
      - interface: wg0
        addresses:
          - 10.10.0.5/24
        wireguard:
          privateKey: "SPOKE_PRIVATE_KEY"
          listenPort: 51820
          peers:
            # Hub node - keepalive enabled
            - publicKey: "HUB_PUBLIC_KEY"
              endpoint: hub.example.com:51820
              allowedIPs:
                - 10.10.0.0/24
              persistentKeepalive: 25
```

## Monitoring Keepalive Status

You can verify that keepalive is working by checking the last handshake timestamp for each peer. A recent handshake indicates active communication.

```bash
# Check WireGuard peer status
talosctl -n 192.168.1.1 read /proc/net/wireguard

# The output includes for each peer:
# latest handshake: <timestamp>
# If this timestamp is within the keepalive interval,
# the keepalive is working

# Check more frequently to see the pattern
watch -n 5 "talosctl -n 192.168.1.1 read /proc/net/wireguard"
```

If the latest handshake timestamp is much older than your keepalive interval, something is wrong. The keepalive packets are not reaching the peer, which typically means a firewall is blocking UDP traffic or the peer is offline.

## Bandwidth Impact

Keepalive packets are tiny. Each keepalive is a WireGuard packet with no payload, which comes to about 128 bytes on the wire after encryption and UDP headers. At 25-second intervals, that is roughly 5 bytes per second per peer, or about 400 bytes per minute.

For a cluster with 10 nodes in a full mesh (each node has 9 peers), the keepalive overhead per node is about 3.6 KB per minute, or 216 KB per hour. This is negligible for any modern network.

```text
Per peer keepalive overhead:
  Packet size: ~128 bytes
  Interval: 25 seconds
  Rate: ~5 bytes/second = 300 bytes/minute

Per node (9 peers):
  Rate: ~2700 bytes/minute = ~162 KB/hour

Completely negligible for any network connection.
```

## Troubleshooting Keepalive Issues

If keepalive is configured but the tunnel still drops, check these things.

First, make sure the keepalive interval is shorter than the NAT timeout. If your NAT device has a 30-second timeout and keepalive is set to 60 seconds, the mapping will still expire.

Second, verify that UDP traffic is allowed through any firewalls between the peers. Some corporate firewalls block all outbound UDP, which prevents WireGuard from working entirely.

Third, check that the endpoint address is correct and reachable. Keepalive does not help if the remote peer's endpoint is wrong.

```bash
# Test UDP connectivity to the peer endpoint
# From a machine that has nc available
nc -zuv peer.example.com 51820

# Check if the WireGuard port is reachable
talosctl -n 192.168.1.1 ping peer.example.com
```

## Conclusion

Persistent keepalive is a small but important setting in your WireGuard configuration on Talos Linux. For nodes behind NAT, it is essentially required. Set it to 25 seconds for most environments, adjust lower for restrictive networks, and disable it only when you are certain both peers have stable public connectivity. The bandwidth cost is negligible, and the reliability benefit is significant. When troubleshooting WireGuard connectivity issues on Talos, checking the keepalive configuration should be one of your first steps.
