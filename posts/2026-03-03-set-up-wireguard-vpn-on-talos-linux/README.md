# How to Set Up WireGuard VPN on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, WireGuard, VPN, Networking, Security

Description: A complete guide to setting up WireGuard VPN tunnels on Talos Linux for secure inter-site connectivity and encrypted cluster traffic.

---

WireGuard is a modern VPN protocol that is fast, simple, and built into the Linux kernel. Unlike older VPN solutions like IPsec or OpenVPN, WireGuard has a minimal codebase, uses state-of-the-art cryptography, and is significantly easier to configure. Talos Linux includes WireGuard support natively, and you can set it up directly in the machine configuration without installing any extra software.

This post covers how to configure WireGuard on Talos Linux, including point-to-point tunnels, multi-site mesh setups, and integration with Kubernetes networking.

## Why WireGuard on Talos

There are several scenarios where WireGuard makes sense on Talos Linux nodes:

- **Cross-site cluster connectivity** - Connect Kubernetes nodes across different data centers or cloud regions over encrypted tunnels
- **Secure management access** - Create a VPN overlay for administrative traffic
- **Hybrid cloud networking** - Connect on-premises nodes with cloud-based nodes
- **Air-gapped bridging** - Securely connect a protected network to a management network

WireGuard runs in the kernel, so it has very low overhead compared to userspace VPN solutions. On modern hardware, it can easily handle multi-gigabit throughput.

## Generating WireGuard Keys

Before configuring WireGuard, you need to generate key pairs. You can do this on any machine that has the `wg` tool installed:

```bash
# Generate a private key
wg genkey > privatekey

# Derive the public key from the private key
cat privatekey | wg pubkey > publickey

# View the keys
cat privatekey
cat publickey
```

Each node needs its own key pair. Never share private keys between nodes.

## Basic Point-to-Point Configuration

Here is how to set up a WireGuard tunnel between two Talos nodes:

### Node A Configuration (192.168.1.10)

```yaml
machine:
  network:
    interfaces:
      # Regular network interface
      - interface: eth0
        addresses:
          - 192.168.1.10/24
        routes:
          - network: 0.0.0.0/0
            gateway: 192.168.1.1
      # WireGuard tunnel interface
      - interface: wg0
        wireguard:
          privateKey: "uFZwN3gO3gYFnGmt6dGMnM3VhP7CbXkRWEL/vXpJfUE="
          listenPort: 51820
          peers:
            - publicKey: "7aBcDeFgHiJkLmNoPqRsTuVwXyZ1234567890ABCDE="
              endpoint: "192.168.2.10:51820"
              allowedIPs:
                - 10.0.0.2/32
              persistentKeepalive: 25
        addresses:
          - 10.0.0.1/24
```

### Node B Configuration (192.168.2.10)

```yaml
machine:
  network:
    interfaces:
      - interface: eth0
        addresses:
          - 192.168.2.10/24
        routes:
          - network: 0.0.0.0/0
            gateway: 192.168.2.1
      - interface: wg0
        wireguard:
          privateKey: "aBcDeFgHiJkLmNoPqRsTuVwXyZ1234567890ABCDEFG="
          listenPort: 51820
          peers:
            - publicKey: "xYzAbCdEfGhIjKlMnOpQrStUvWxYz1234567890abc="
              endpoint: "192.168.1.10:51820"
              allowedIPs:
                - 10.0.0.1/32
              persistentKeepalive: 25
        addresses:
          - 10.0.0.2/24
```

Let me break down the key fields:

- **privateKey** - The node's WireGuard private key (keep this secret)
- **listenPort** - UDP port for WireGuard traffic (51820 is conventional)
- **peers** - List of remote nodes to connect to
- **publicKey** - The remote node's public key
- **endpoint** - The remote node's public IP and port
- **allowedIPs** - Which IP ranges can be reached through this peer
- **persistentKeepalive** - Sends a keepalive packet every N seconds (useful for NAT traversal)

## Multi-Site Mesh Configuration

For connecting three or more sites, each node needs to know about all other nodes:

```yaml
# Node A (Site 1)
machine:
  network:
    interfaces:
      - interface: wg0
        wireguard:
          privateKey: "NODE_A_PRIVATE_KEY"
          listenPort: 51820
          peers:
            - publicKey: "NODE_B_PUBLIC_KEY"
              endpoint: "site2.example.com:51820"
              allowedIPs:
                - 10.0.0.2/32
                - 10.20.0.0/24
            - publicKey: "NODE_C_PUBLIC_KEY"
              endpoint: "site3.example.com:51820"
              allowedIPs:
                - 10.0.0.3/32
                - 10.30.0.0/24
        addresses:
          - 10.0.0.1/24
```

The `allowedIPs` for each peer includes both the peer's WireGuard address and any subnets behind that peer. This tells WireGuard to route traffic for those subnets through the tunnel.

## Adding Routes for Remote Subnets

To reach networks behind a WireGuard peer, add routes pointing to the WireGuard interface:

```yaml
machine:
  network:
    interfaces:
      - interface: wg0
        wireguard:
          privateKey: "NODE_PRIVATE_KEY"
          listenPort: 51820
          peers:
            - publicKey: "REMOTE_PUBLIC_KEY"
              endpoint: "remote.example.com:51820"
              allowedIPs:
                - 10.0.0.0/24
                - 10.20.0.0/16
        addresses:
          - 10.0.0.1/32
        routes:
          # Route traffic for the remote network through the tunnel
          - network: 10.20.0.0/16
            gateway: ""
```

## Applying the Configuration

For new clusters:

```bash
# Generate config with WireGuard patch
talosctl gen config my-cluster https://192.168.1.100:6443 \
  --config-patch @wireguard-patch.yaml
```

For existing nodes:

```bash
# Apply WireGuard configuration
talosctl patch machineconfig --nodes 192.168.1.10 \
  --patch @wireguard-patch.yaml
```

WireGuard configuration takes effect without a reboot. Talos creates the interface and establishes the tunnel almost immediately.

## Verifying the Tunnel

Check that the WireGuard interface is up and the tunnel is established:

```bash
# Check interface status
talosctl get links --nodes 192.168.1.10

# Check WireGuard-specific details
talosctl get addresses --nodes 192.168.1.10

# Test connectivity through the tunnel
talosctl ping 10.0.0.2 --nodes 192.168.1.10
```

## Firewall Considerations

WireGuard uses a single UDP port (default 51820). Make sure this port is open in any firewalls between the nodes:

- Allow UDP port 51820 inbound on each WireGuard node
- If nodes are behind NAT, use `persistentKeepalive` to maintain the NAT mapping
- On cloud providers, update security groups to allow the WireGuard port

## NAT Traversal

WireGuard works behind NAT with the `persistentKeepalive` option. When one or both sides are behind NAT:

```yaml
# Node behind NAT
peers:
  - publicKey: "REMOTE_PUBLIC_KEY"
    endpoint: "public-ip.example.com:51820"
    allowedIPs:
      - 10.0.0.0/24
    # Send keepalive every 25 seconds to maintain NAT mapping
    persistentKeepalive: 25
```

The node behind NAT initiates the connection, and the keepalive packets keep the NAT mapping alive. The other side does not need to know the NATted node's real IP - WireGuard learns it from the handshake.

## WireGuard for Kubernetes Cross-Cluster Traffic

If you are connecting Kubernetes nodes across sites, you can route pod traffic through WireGuard:

```yaml
machine:
  network:
    interfaces:
      - interface: wg0
        wireguard:
          privateKey: "NODE_PRIVATE_KEY"
          listenPort: 51820
          peers:
            - publicKey: "REMOTE_PUBLIC_KEY"
              endpoint: "remote.example.com:51820"
              allowedIPs:
                - 10.0.0.0/24
                - 10.244.0.0/16  # Pod CIDR
                - 10.96.0.0/12   # Service CIDR
        addresses:
          - 10.0.0.1/32
```

By including the pod and service CIDRs in `allowedIPs`, Kubernetes traffic between sites flows through the encrypted tunnel. This requires that your CNI plugin knows how to route to the remote pod and service subnets.

## Security Best Practices

Protect your private keys. They should only exist in the Talos machine configuration and not be stored in plain text elsewhere. Consider using a secrets manager to generate and distribute keys.

Rotate keys periodically. While WireGuard keys do not expire on their own, regular rotation limits the impact of a compromised key.

Limit `allowedIPs` to only the networks that need to be reachable through each peer. Overly broad `allowedIPs` (like `0.0.0.0/0`) route all traffic through the tunnel, which may not be what you want.

Use unique keys for every node. Never reuse a private key across multiple nodes.

## Troubleshooting

**Tunnel not establishing** - Check that the endpoints are reachable and the UDP port is open. Verify that the public keys match (Node A's peer public key should be Node B's actual public key, and vice versa).

**Can connect but no traffic flows** - Check `allowedIPs`. If the destination IP is not covered by the peer's `allowedIPs`, WireGuard will not send it through the tunnel.

**Intermittent connectivity** - If one side is behind NAT, make sure `persistentKeepalive` is set. Without it, the NAT mapping may expire and the tunnel drops.

**Performance issues** - WireGuard itself is very efficient, but if you are routing all traffic through a tunnel, the remote endpoint becomes a bottleneck. Check the bandwidth of the tunnel endpoint's internet connection.

## Conclusion

WireGuard on Talos Linux provides a clean, performant way to create encrypted tunnels between nodes. The configuration is declarative and lives in the machine config alongside everything else, so there are no external tools to manage. Whether you need to connect data centers, bridge cloud and on-premises infrastructure, or secure management traffic, WireGuard handles it with minimal complexity and excellent performance. Generate your keys, configure the peers, and you have encrypted connectivity in minutes.
