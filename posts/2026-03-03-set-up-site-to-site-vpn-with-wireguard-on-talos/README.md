# How to Set Up Site-to-Site VPN with WireGuard on Talos

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, WireGuard, VPN, Networking, Site-to-Site

Description: Learn how to establish a site-to-site VPN using WireGuard on Talos Linux to connect clusters across different locations securely.

---

When you run Talos Linux clusters in multiple locations, whether that is different data centers, cloud regions, or a mix of on-premises and cloud infrastructure, you need a secure way to connect them. A site-to-site VPN with WireGuard is one of the cleanest solutions for this. It creates encrypted tunnels between the sites, allowing pods and services in one location to communicate with those in another as if they were on the same network.

This post covers how to set up a site-to-site VPN using WireGuard on Talos Linux, including the network design, configuration on both sides, and routing setup.

## Network Design

Before configuring anything, plan your network topology. A site-to-site VPN connects two or more networks through gateway nodes. Each site has at least one node that acts as the WireGuard gateway, and traffic between sites flows through these gateways.

Here is a typical two-site setup:

```
Site A (Data Center)              Site B (Cloud)
  Node CIDR: 10.1.0.0/24           Node CIDR: 10.2.0.0/24
  Pod CIDR:  10.244.0.0/17         Pod CIDR:  10.244.128.0/17
  Service:   10.96.0.0/17          Service:   10.96.128.0/17
  WG Gateway: 10.1.0.1             WG Gateway: 10.2.0.1
  WG Tunnel:  10.10.0.1/30         WG Tunnel:  10.10.0.2/30
  Public IP:  203.0.113.10         Public IP:  198.51.100.20
```

The key principle is that each site uses non-overlapping CIDR ranges. If both sites use the same pod or service CIDR, routing will break. Plan this carefully before deploying your clusters.

## Generating Keys for Both Sites

Each gateway node needs its own WireGuard key pair.

```bash
# Generate keys for Site A gateway
wg genkey | tee site-a-private.key | wg pubkey > site-a-public.key

# Generate keys for Site B gateway
wg genkey | tee site-b-private.key | wg pubkey > site-b-public.key

# Display the public keys (you will need these for peer configuration)
echo "Site A public key: $(cat site-a-public.key)"
echo "Site B public key: $(cat site-b-public.key)"
```

## Configuring the Site A Gateway

The gateway node at Site A needs a WireGuard interface configured with the Site B gateway as a peer. The allowedIPs field is critical here because it tells WireGuard which traffic to route through the tunnel.

```yaml
# site-a-gateway-patch.yaml
# WireGuard configuration for the Site A gateway node
machine:
  network:
    interfaces:
      - interface: wg0
        mtu: 1420
        addresses:
          # Tunnel IP for this end
          - 10.10.0.1/30
        wireguard:
          privateKey: "SITE_A_PRIVATE_KEY_HERE"
          listenPort: 51820
          peers:
            - publicKey: "SITE_B_PUBLIC_KEY_HERE"
              # Public IP of Site B gateway
              endpoint: 198.51.100.20:51820
              allowedIPs:
                # Site B tunnel IP
                - 10.10.0.2/32
                # Site B node network
                - 10.2.0.0/24
                # Site B pod CIDR
                - 10.244.128.0/17
                # Site B service CIDR
                - 10.96.128.0/17
              persistentKeepalive: 25
    # Add static routes for Site B networks
    routes:
      - network: 10.2.0.0/24
        gateway: 10.10.0.2
      - network: 10.244.128.0/17
        gateway: 10.10.0.2
      - network: 10.96.128.0/17
        gateway: 10.10.0.2
  # Enable IP forwarding so the gateway can route traffic
  sysctls:
    net.ipv4.ip_forward: "1"
```

Apply this configuration to the gateway node at Site A:

```bash
talosctl -n 10.1.0.1 patch machineconfig \
  --patch-file site-a-gateway-patch.yaml
```

## Configuring the Site B Gateway

The Site B gateway gets the mirror configuration, with Site A as its peer.

```yaml
# site-b-gateway-patch.yaml
# WireGuard configuration for the Site B gateway node
machine:
  network:
    interfaces:
      - interface: wg0
        mtu: 1420
        addresses:
          - 10.10.0.2/30
        wireguard:
          privateKey: "SITE_B_PRIVATE_KEY_HERE"
          listenPort: 51820
          peers:
            - publicKey: "SITE_A_PUBLIC_KEY_HERE"
              endpoint: 203.0.113.10:51820
              allowedIPs:
                - 10.10.0.1/32
                - 10.1.0.0/24
                - 10.244.0.0/17
                - 10.96.0.0/17
              persistentKeepalive: 25
    routes:
      - network: 10.1.0.0/24
        gateway: 10.10.0.1
      - network: 10.244.0.0/17
        gateway: 10.10.0.1
      - network: 10.96.0.0/17
        gateway: 10.10.0.1
  sysctls:
    net.ipv4.ip_forward: "1"
```

Apply it to the Site B gateway:

```bash
talosctl -n 10.2.0.1 patch machineconfig \
  --patch-file site-b-gateway-patch.yaml
```

## Routing Traffic from Non-Gateway Nodes

The gateway nodes can now communicate across sites through the WireGuard tunnel. But the other nodes in each site need to know to send cross-site traffic to the gateway. You need to add static routes on every non-gateway node.

```yaml
# route-patch-site-a-nodes.yaml
# Apply this to all non-gateway nodes at Site A
machine:
  network:
    routes:
      # Route Site B traffic through the local gateway
      - network: 10.2.0.0/24
        gateway: 10.1.0.1
      - network: 10.244.128.0/17
        gateway: 10.1.0.1
      - network: 10.96.128.0/17
        gateway: 10.1.0.1
```

```bash
# Apply routes to all non-gateway nodes at Site A
for node in 10.1.0.2 10.1.0.3 10.1.0.4; do
  talosctl -n $node patch machineconfig \
    --patch-file route-patch-site-a-nodes.yaml
done
```

Do the same for Site B nodes, routing Site A traffic through the Site B gateway.

```yaml
# route-patch-site-b-nodes.yaml
machine:
  network:
    routes:
      - network: 10.1.0.0/24
        gateway: 10.2.0.1
      - network: 10.244.0.0/17
        gateway: 10.2.0.1
      - network: 10.96.0.0/17
        gateway: 10.2.0.1
```

## Verifying the VPN Connection

With both gateways configured and routes in place, verify the connection end to end.

```bash
# Test tunnel connectivity between gateways
talosctl -n 10.1.0.1 ping 10.10.0.2

# Test cross-site node connectivity
talosctl -n 10.1.0.2 ping 10.2.0.2

# Check WireGuard handshake status
talosctl -n 10.1.0.1 read /proc/net/wireguard
```

If pings work between the gateways but not between non-gateway nodes, the issue is likely with the static routes. Verify that the routes are applied correctly on both sides.

## Handling Pod-to-Pod Communication Across Sites

For pods to communicate across sites, the CNI plugin needs to be aware of the cross-site routing. If you are using Cilium, you can configure it to use the WireGuard tunnel for cross-cluster communication.

```yaml
# Cilium Helm values for cross-site routing
# This tells Cilium to route pod traffic through the node network
cluster:
  name: site-a
  id: 1
ipam:
  mode: kubernetes
routingMode: native
autoDirectNodeRoutes: true
# Enable cross-cluster connectivity
clustermesh:
  useAPIServer: true
```

Alternatively, if you are using Flannel or Calico, you need to ensure they are configured with the correct backend that works with the WireGuard tunnel.

## Adding a Third Site

Extending the VPN to additional sites follows the same pattern. Each new site gets its own gateway node, key pair, and non-overlapping CIDRs. Each gateway peers with all other gateways.

```yaml
# Site C gateway peering with both Site A and Site B
machine:
  network:
    interfaces:
      - interface: wg0
        mtu: 1420
        addresses:
          - 10.10.0.5/30
        wireguard:
          privateKey: "SITE_C_PRIVATE_KEY_HERE"
          listenPort: 51820
          peers:
            # Site A gateway
            - publicKey: "SITE_A_PUBLIC_KEY_HERE"
              endpoint: 203.0.113.10:51820
              allowedIPs:
                - 10.10.0.1/32
                - 10.1.0.0/24
                - 10.244.0.0/17
              persistentKeepalive: 25
            # Site B gateway
            - publicKey: "SITE_B_PUBLIC_KEY_HERE"
              endpoint: 198.51.100.20:51820
              allowedIPs:
                - 10.10.0.2/32
                - 10.2.0.0/24
                - 10.244.128.0/17
              persistentKeepalive: 25
```

Remember to update the Site A and Site B gateways to include Site C as a peer as well.

## High Availability for the VPN Gateway

Running a single gateway node per site creates a single point of failure. For production environments, run two gateway nodes per site with identical WireGuard configurations. Use a floating virtual IP or a load balancer in front of the gateways to handle failover.

```yaml
# Use Talos VIP for gateway failover
machine:
  network:
    interfaces:
      - interface: eth0
        vip:
          ip: 10.1.0.100
      - interface: wg0
        addresses:
          - 10.10.0.1/30
        wireguard:
          privateKey: "GATEWAY_PRIVATE_KEY"
          listenPort: 51820
          peers:
            - publicKey: "REMOTE_PUBLIC_KEY"
              endpoint: 198.51.100.20:51820
              allowedIPs:
                - 10.10.0.2/32
                - 10.2.0.0/24
```

## Conclusion

Setting up a site-to-site VPN with WireGuard on Talos Linux gives you a reliable, encrypted connection between locations. The keys are proper network planning with non-overlapping CIDRs, correct routing configuration on all nodes, and careful peer setup on the gateways. Once established, the VPN is low maintenance because WireGuard handles reconnection automatically and Talos brings the interface up on every boot. For production deployments, add gateway redundancy and make sure your CNI plugin is configured to route across the tunnel correctly.
