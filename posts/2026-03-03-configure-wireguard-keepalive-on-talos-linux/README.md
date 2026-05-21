# How to Configure WireGuard Keepalive on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, WireGuard, VPN, Networking, NAT

Description: Understand how to configure WireGuard persistent keepalive on Talos Linux to maintain connections through NAT and detect peer failures.

---

WireGuard is a silent protocol by default. If there is no data to send, it sends nothing. This works great in ideal network conditions, but it causes problems when nodes sit behind NAT devices, firewalls with connection tracking, or when you need to detect peer failures quickly. The persistent keepalive setting solves these problems by sending a small packet at regular intervals, keeping the connection alive even when there is no real traffic.

This post explains what persistent keepalive does, when you need it, how to configure it on Talos Linux, and how to choose the right interval for your environment.

## What Persistent Keepalive Does

When you set `persistentKeepaliveInterval` on a WireGuard peer, the local node sends a keepalive packet to that peer at the specified interval. The packet is a small encrypted message that serves several purposes.

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

The `persistentKeepaliveInterval` setting is configured per peer in the WireGuard interface definition. It takes a Go duration value (for example `25s`, `1m`).

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
              persistentKeepaliveInterval: 25s
```

Apply this configuration with talosctl:

```bash
# Apply the configuration patch
talosctl -n 192.168.1.1 patch mc \
  --patch @wireguard-keepalive-patch.yaml
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
    persistentKeepaliveInterval: 15s
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
    persistentKeepaliveInterval: 60s
```

### Zero (Disabled)

Omitting `persistentKeepaliveInterval` (or setting it to `0s`) disables it entirely. Only do this when you are certain there is no NAT between the peers and you do not need the connection-monitoring benefit.

```yaml
# Disabled keepalive - only for direct, stable connections
peers:
  - publicKey: "PEER_PUBLIC_KEY"
    endpoint: 203.0.113.10:51820
    allowedIPs:
      - 10.10.0.2/32
    persistentKeepaliveInterval: 0s
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
              persistentKeepaliveInterval: 25s
            - publicKey: "PUBLIC_NODE_2_KEY"
              endpoint: 198.51.100.20:51820
              allowedIPs:
                - 10.10.0.2/32
              persistentKeepaliveInterval: 25s
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
              persistentKeepaliveInterval: 25s
```

## Monitoring Keepalive Status

WireGuard does not expose a dedicated "last keepalive" counter - keepalives are transport data packets, not handshake messages, so they do not update the "latest handshake" timestamp shown by `wg show`. The cryptographic handshake is renegotiated separately, roughly every two minutes when traffic is flowing. What you can do on Talos is confirm the interface is configured and watch the link itself.

```bash
# Inspect the WireGuard link and its current state
talosctl -n 192.168.1.1 get links wg0 -o yaml

# Watch the interface so you can see it stay up over time
talosctl -n 192.168.1.1 get links wg0 --watch
```

If you need per-peer byte counters or a fresh handshake timestamp, run `wg show` from a peer that has the `wg(8)` userspace tool installed. From the Talos node's perspective, the most reliable signal that keepalive is doing its job is simply that traffic to the peer's allowed IPs continues to work after long idle periods. If connectivity drops after a minute or so of inactivity, the keepalive packets are not reaching the peer - typically because a firewall is blocking UDP, the endpoint is wrong, or the peer is offline.

## Bandwidth Impact

Keepalive packets are tiny. A WireGuard keepalive is a transport data message with an empty payload: 16 bytes of WireGuard header plus a 16-byte Poly1305 tag, giving a 32-byte UDP payload. With an 8-byte UDP header and a 20-byte IPv4 header, that is 60 bytes on the wire (80 bytes over IPv6). At 25-second intervals, that is about 2.4 bytes per second per peer, or roughly 144 bytes per minute.

For a cluster with 10 nodes in a full mesh (each node has 9 peers), the keepalive overhead per node is about 1.3 KB per minute, or under 80 KB per hour. This is negligible for any modern network.

```text
Per peer keepalive overhead:
  WireGuard payload: 32 bytes
  On the wire (IPv4): ~60 bytes
  Interval: 25 seconds
  Rate: ~2.4 bytes/second = ~144 bytes/minute

Per node (9 peers):
  Rate: ~22 bytes/second = ~1.3 KB/minute = ~78 KB/hour

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

# From the Talos node, confirm the WireGuard link is up
# and see the resolved endpoint and listen port
talosctl -n 192.168.1.1 get links wg0 -o yaml
```

## Conclusion

Persistent keepalive is a small but important setting in your WireGuard configuration on Talos Linux. For nodes behind NAT, it is essentially required. Set it to 25 seconds for most environments, adjust lower for restrictive networks, and disable it only when you are certain both peers have stable public connectivity. The bandwidth cost is negligible, and the reliability benefit is significant. When troubleshooting WireGuard connectivity issues on Talos, checking the keepalive configuration should be one of your first steps.
