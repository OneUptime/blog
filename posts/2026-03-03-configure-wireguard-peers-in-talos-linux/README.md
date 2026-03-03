# How to Configure WireGuard Peers in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, WireGuard, VPN, Networking, Kubernetes

Description: A hands-on guide to configuring WireGuard peers in Talos Linux for secure, encrypted networking between nodes and external endpoints.

---

WireGuard has become the go-to VPN protocol for modern infrastructure because it is fast, simple, and has a small attack surface. Talos Linux supports WireGuard natively through its machine configuration, which means you can set up encrypted tunnels between nodes without installing any additional software. This is particularly useful for clusters that span multiple networks, data centers, or cloud providers.

In this post, we will walk through how to configure WireGuard peers in Talos Linux, from generating keys to applying the configuration and verifying connectivity.

## Why WireGuard on Talos Linux?

Talos Linux is an immutable operating system, so you cannot install packages after boot. Fortunately, the Talos kernel includes the WireGuard module, and the machine configuration supports WireGuard interface definitions natively. This means you configure WireGuard as part of the Talos config and it comes up automatically when the node boots.

The typical use cases for WireGuard on Talos include connecting nodes across different networks, creating secure tunnels to on-premises infrastructure, and encrypting node-to-node traffic in environments where the underlying network is not trusted.

## Generating WireGuard Keys

Before configuring peers, you need to generate key pairs. Each node in your WireGuard network needs its own private key, and you share the corresponding public key with its peers.

```bash
# Generate a private key
wg genkey > node1-private.key

# Derive the public key from the private key
cat node1-private.key | wg pubkey > node1-public.key

# Generate keys for a second node
wg genkey > node2-private.key
cat node2-private.key | wg pubkey > node2-public.key

# View the keys
cat node1-private.key
# Output: something like kF3Hs7g2LmQ9V...
cat node1-public.key
# Output: something like YH7Bs3gPLqM2W...
```

Keep private keys secure. They should never be shared or committed to version control. The public keys are safe to distribute.

## Configuring a WireGuard Interface in Talos

WireGuard configuration in Talos Linux lives in the machine configuration under the network section. You define a WireGuard interface with a private key, listen port, and a list of peers.

Here is the configuration for the first node:

```yaml
# Machine configuration patch for node1
# This creates a WireGuard interface named wg0
machine:
  network:
    interfaces:
      - interface: wg0
        mtu: 1420
        addresses:
          # The WireGuard tunnel IP for this node
          - 10.10.0.1/24
        wireguard:
          # Private key for this node (keep secret)
          privateKey: "kF3Hs7g2LmQ9V..."
          # Port to listen on for incoming WireGuard connections
          listenPort: 51820
          peers:
            # Node 2 peer configuration
            - publicKey: "YH7Bs3gPLqM2W..."
              # The real IP address of node 2
              endpoint: 192.168.1.2:51820
              # Which traffic to route through this tunnel
              allowedIPs:
                - 10.10.0.2/32
              persistentKeepalive: 25
```

And the corresponding configuration for the second node:

```yaml
# Machine configuration patch for node2
machine:
  network:
    interfaces:
      - interface: wg0
        mtu: 1420
        addresses:
          # The WireGuard tunnel IP for this node
          - 10.10.0.2/24
        wireguard:
          privateKey: "mG4Jt8h3NnR0W..."
          listenPort: 51820
          peers:
            # Node 1 peer configuration
            - publicKey: "XK9Ct4hQLnP3V..."
              endpoint: 192.168.1.1:51820
              allowedIPs:
                - 10.10.0.1/32
              persistentKeepalive: 25
```

## Applying the Configuration

You apply the WireGuard configuration as a machine config patch using talosctl. This can be done during initial setup or to an already running cluster.

```bash
# Apply the WireGuard config to node1
talosctl -n 192.168.1.1 patch machineconfig \
  --patch-file node1-wireguard-patch.yaml

# Apply the WireGuard config to node2
talosctl -n 192.168.1.2 patch machineconfig \
  --patch-file node2-wireguard-patch.yaml
```

After applying the patch, Talos will create the wg0 interface and establish the tunnel. No reboot is required for network configuration changes.

## Configuring Multiple Peers

In a real cluster, you will have more than two nodes. Each node needs to list all its peers in the WireGuard configuration. Here is an example with three nodes forming a full mesh.

```yaml
# Node 1 WireGuard configuration with two peers
machine:
  network:
    interfaces:
      - interface: wg0
        mtu: 1420
        addresses:
          - 10.10.0.1/24
        wireguard:
          privateKey: "kF3Hs7g2LmQ9V..."
          listenPort: 51820
          peers:
            # Node 2
            - publicKey: "YH7Bs3gPLqM2W..."
              endpoint: 192.168.1.2:51820
              allowedIPs:
                - 10.10.0.2/32
              persistentKeepalive: 25
            # Node 3
            - publicKey: "ZJ8Ds4iPMoN4X..."
              endpoint: 192.168.1.3:51820
              allowedIPs:
                - 10.10.0.3/32
              persistentKeepalive: 25
```

Each node in the mesh gets a similar configuration, just with different keys and addresses. The number of peers grows linearly with the cluster size, so for very large clusters (50+ nodes), you might want to consider a hub-and-spoke topology instead of a full mesh.

## Verifying WireGuard Connectivity

After applying the configuration, verify that the tunnel is up and traffic flows correctly.

```bash
# Check the WireGuard interface status on a node
talosctl -n 192.168.1.1 get links | grep wg0

# Check that the WireGuard interface has the correct IP
talosctl -n 192.168.1.1 get addresses | grep wg0

# Ping the remote peer through the tunnel
talosctl -n 192.168.1.1 ping 10.10.0.2

# Check WireGuard handshake status
# A recent handshake means the tunnel is active
talosctl -n 192.168.1.1 read /proc/net/wireguard
```

If the handshake timestamp is recent (within the last few minutes), the tunnel is working. If there is no handshake, check that the endpoint addresses are correct, the ports are open, and the public keys match.

## Routing Subnets Through Peers

Sometimes you want to route an entire subnet through a WireGuard peer, not just traffic to a single IP. This is common when connecting to an on-premises network through a VPN gateway.

```yaml
# Route an entire subnet through a peer
machine:
  network:
    interfaces:
      - interface: wg0
        mtu: 1420
        addresses:
          - 10.10.0.1/24
        wireguard:
          privateKey: "kF3Hs7g2LmQ9V..."
          listenPort: 51820
          peers:
            # VPN gateway that provides access to the office network
            - publicKey: "AB2Ct4hQLnP3V..."
              endpoint: vpn.office.example.com:51820
              allowedIPs:
                - 10.10.0.100/32
                # Route the entire office subnet through this peer
                - 172.16.0.0/16
              persistentKeepalive: 25
```

With this configuration, any traffic destined for the 172.16.0.0/16 subnet will be sent through the WireGuard tunnel to the VPN gateway, which then routes it to the office network.

## Security Considerations

WireGuard provides strong encryption by default, but there are a few things to keep in mind when configuring peers in Talos.

First, protect your private keys. In Talos, they are stored in the machine configuration, which is encrypted at rest. If you are using Omni, the keys are managed through the Omni configuration system, which adds another layer of protection.

Second, use the allowedIPs field to restrict which traffic can come from each peer. If a peer should only send traffic from a single IP, set allowedIPs to that single IP with a /32 mask. Do not use 0.0.0.0/0 unless you specifically want to route all traffic through that peer.

Third, keep the persistentKeepalive setting enabled for peers behind NAT. Without it, the NAT mapping can expire and the tunnel will stop working until the next outgoing packet.

```yaml
# Good: Restrict allowed IPs to specific addresses
allowedIPs:
  - 10.10.0.2/32

# Bad (unless intentional): Allow all traffic from this peer
allowedIPs:
  - 0.0.0.0/0
```

## Troubleshooting Common Issues

If peers cannot establish a handshake, check these things in order: Verify the public keys are correct on both sides. Make sure the endpoint address and port are reachable. Check that UDP port 51820 (or your chosen port) is open in any firewalls. Finally, confirm that the private and public keys were generated correctly and match.

```bash
# Verify the WireGuard interface exists
talosctl -n 192.168.1.1 get links

# Check for any errors in the Talos logs
talosctl -n 192.168.1.1 dmesg | grep -i wireguard
```

## Conclusion

Configuring WireGuard peers in Talos Linux is straightforward thanks to native support in the machine configuration. You generate keys, define the interface and peers in your Talos config, apply it with talosctl, and verify connectivity. For multi-node setups, plan your IP addressing scheme and decide between full mesh and hub-and-spoke topologies based on your cluster size. WireGuard adds minimal overhead while providing strong encryption, making it an excellent choice for securing traffic between Talos nodes.
