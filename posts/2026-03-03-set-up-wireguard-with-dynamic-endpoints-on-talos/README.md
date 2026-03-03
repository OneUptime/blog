# How to Set Up WireGuard with Dynamic Endpoints on Talos

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, WireGuard, VPN, Networking, Dynamic DNS

Description: Learn how to configure WireGuard on Talos Linux when nodes have dynamic or changing IP addresses, using DNS endpoints and roaming support.

---

WireGuard works best when you know the IP address of every peer. But in many real-world scenarios, IP addresses change. Cloud instances get new public IPs when they restart. Edge devices move between networks. Home lab servers sit behind ISPs that rotate addresses periodically. Setting up WireGuard on Talos Linux in these dynamic environments requires a different approach than using static endpoints.

This post covers strategies for running WireGuard on Talos Linux when one or more peers have changing IP addresses, including DNS-based endpoints, the roaming feature, and keepalive settings that keep tunnels alive through NAT changes.

## Understanding WireGuard Endpoint Behavior

WireGuard has a built-in roaming capability. When a peer sends a valid encrypted packet from a new IP address, WireGuard automatically updates the endpoint for that peer. This means that if a node's IP changes and it sends a packet to one of its peers, the peer will start sending responses to the new IP.

The challenge is initiating communication after an IP change. If both sides have dynamic IPs and neither knows the other's current address, the tunnel breaks until one side resolves the situation.

The general pattern for dynamic endpoints is to have at least one peer with a known, stable endpoint. This peer acts as a rendezvous point. Peers with dynamic IPs connect to the stable endpoint, and WireGuard's roaming feature handles the rest.

## Using DNS Names as Endpoints

Instead of hardcoding IP addresses, you can use DNS names for WireGuard endpoints in Talos Linux. When the endpoint is a DNS name, the system resolves it when establishing the connection. If the IP behind the DNS name changes, WireGuard will pick up the new address on the next resolution.

```yaml
# Talos machine config with DNS-based WireGuard endpoint
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
              # Use a DNS name instead of an IP address
              endpoint: node2.example.com:51820
              allowedIPs:
                - 10.10.0.2/32
              persistentKeepalive: 25
```

For this to work, you need a dynamic DNS service that updates the DNS record when the node's IP changes. Popular options include services like DynDNS, No-IP, or running your own DNS update script with a provider like Cloudflare or Route53.

```bash
# Example script to update a Cloudflare DNS record
# Run this on the node with a dynamic IP (outside Talos, on a management system)
# or as a CronJob in Kubernetes

CURRENT_IP=$(curl -s https://api.ipify.org)
ZONE_ID="your-zone-id"
RECORD_ID="your-record-id"
API_TOKEN="your-cloudflare-api-token"

curl -X PUT "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records/${RECORD_ID}" \
  -H "Authorization: Bearer ${API_TOKEN}" \
  -H "Content-Type: application/json" \
  --data "{\"type\":\"A\",\"name\":\"node2.example.com\",\"content\":\"${CURRENT_IP}\",\"ttl\":60}"
```

## Configuring the Hub-and-Spoke Model

When most of your nodes have dynamic IPs, a hub-and-spoke topology works best. One node (the hub) has a stable, known endpoint. All other nodes (spokes) connect to the hub. The hub can then relay traffic between spokes if needed, or spokes can discover each other's endpoints through the hub.

```yaml
# Hub node configuration (stable IP)
# This node has a static public IP or a reliable DNS name
machine:
  network:
    interfaces:
      - interface: wg0
        mtu: 1420
        addresses:
          - 10.10.0.1/24
        wireguard:
          privateKey: "HUB_PRIVATE_KEY"
          listenPort: 51820
          peers:
            # Spoke 1 - no endpoint because it has a dynamic IP
            - publicKey: "SPOKE1_PUBLIC_KEY"
              allowedIPs:
                - 10.10.0.2/32
            # Spoke 2 - also dynamic
            - publicKey: "SPOKE2_PUBLIC_KEY"
              allowedIPs:
                - 10.10.0.3/32
            # Spoke 3 - also dynamic
            - publicKey: "SPOKE3_PUBLIC_KEY"
              allowedIPs:
                - 10.10.0.4/32
```

Notice that the hub does not specify an endpoint for the spoke nodes. It does not need to because the spokes will initiate the connection to the hub, and WireGuard will learn their current IP from the incoming packets.

```yaml
# Spoke node configuration (dynamic IP)
machine:
  network:
    interfaces:
      - interface: wg0
        mtu: 1420
        addresses:
          - 10.10.0.2/24
        wireguard:
          privateKey: "SPOKE1_PRIVATE_KEY"
          listenPort: 51820
          peers:
            # The hub node with a known endpoint
            - publicKey: "HUB_PUBLIC_KEY"
              endpoint: hub.example.com:51820
              allowedIPs:
                # Route all WireGuard network traffic through the hub
                - 10.10.0.0/24
              persistentKeepalive: 25
```

The `persistentKeepalive` setting is critical for spoke nodes. It ensures the spoke sends a packet to the hub every 25 seconds, which keeps the NAT mapping alive and allows the hub to know the spoke's current IP address.

## Handling NAT Traversal

Most dynamic IP situations also involve NAT. The node sits behind a router that performs network address translation, and the WireGuard port is not directly reachable from the internet.

WireGuard handles NAT well because it uses UDP and maintains state based on the source address of incoming packets. As long as the node behind NAT initiates the connection (by sending a packet to a peer with a known endpoint), the NAT device creates a mapping that allows return traffic.

```yaml
# Key settings for nodes behind NAT
machine:
  network:
    interfaces:
      - interface: wg0
        mtu: 1420
        addresses:
          - 10.10.0.2/24
        wireguard:
          privateKey: "NODE_PRIVATE_KEY"
          # You can still set a listen port even behind NAT
          # This is used for outgoing packets
          listenPort: 51820
          peers:
            - publicKey: "PEER_PUBLIC_KEY"
              endpoint: stable-peer.example.com:51820
              allowedIPs:
                - 10.10.0.1/32
              # Keep the NAT mapping alive
              # Without this, the NAT mapping expires
              # and incoming packets get dropped
              persistentKeepalive: 25
```

Without `persistentKeepalive`, the NAT mapping expires after a period of inactivity (usually 30-120 seconds depending on the router). Once it expires, the hub cannot send packets to the spoke until the spoke sends another packet.

## Dynamic Endpoint Resolution Interval

WireGuard resolves DNS endpoints when the interface comes up and when it needs to re-establish a connection. However, it does not continuously re-resolve DNS. If a peer's IP changes and the DNS record is updated, WireGuard might still be using the old IP until it detects the connection is broken.

To force more frequent re-resolution, you can configure the system DNS resolver settings in Talos:

```yaml
# Configure DNS settings in Talos
machine:
  network:
    nameservers:
      - 8.8.8.8
      - 1.1.1.1
  # Set low DNS cache TTL through resolved configuration
  files:
    - content: |
        [Resolve]
        Cache=no-negative
        DNSStubListener=no
      path: /etc/systemd/resolved.conf.d/low-cache.conf
      op: create
```

For environments where IP changes happen frequently, consider running a lightweight monitoring service that detects IP changes and triggers a WireGuard interface restart.

## Peer Discovery with External Tools

For larger clusters where managing WireGuard peers manually is impractical, consider using external tools for peer discovery.

```yaml
# Example: Using a Kubernetes CronJob to update WireGuard peers
apiVersion: batch/v1
kind: CronJob
metadata:
  name: wireguard-peer-updater
  namespace: kube-system
spec:
  schedule: "*/5 * * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: updater
              image: alpine:3.19
              command:
                - /bin/sh
                - -c
                - |
                  # Query DNS for current peer IPs
                  # Update WireGuard configuration if IPs changed
                  PEER_IP=$(dig +short peer-node.example.com)
                  CURRENT_ENDPOINT=$(wg show wg0 endpoints | grep "PEER_PUBLIC_KEY" | awk '{print $2}')
                  if [ "${PEER_IP}:51820" != "$CURRENT_ENDPOINT" ]; then
                    echo "Peer IP changed, updating endpoint"
                    wg set wg0 peer PEER_PUBLIC_KEY endpoint ${PEER_IP}:51820
                  fi
          restartPolicy: OnFailure
```

## Testing Dynamic Endpoint Behavior

To verify that your dynamic endpoint setup works correctly, simulate an IP change and check that WireGuard recovers.

```bash
# Check the current WireGuard status on the hub
talosctl -n hub-ip read /proc/net/wireguard

# Look for the endpoint field for each peer
# It should show the current IP of each spoke

# Simulate an IP change by restarting the spoke's network
# (in a test environment only)
# After the IP change, the spoke's keepalive will establish
# the tunnel from the new IP

# Verify the hub sees the new endpoint
talosctl -n hub-ip read /proc/net/wireguard
# The endpoint for the spoke should now show the new IP
```

## Best Practices for Dynamic WireGuard Deployments

Always have at least one node with a stable, known endpoint. This acts as your anchor point for the network.

Set `persistentKeepalive` to 25 seconds on all nodes with dynamic IPs. This keeps NAT mappings alive and ensures the stable endpoint always knows the current address of dynamic peers.

Use DNS names for endpoints whenever possible. Even if an IP is currently static, using DNS gives you flexibility to change it later without updating WireGuard configurations.

Monitor tunnel status proactively. Set up alerting for when a peer's last handshake is older than expected, which indicates a broken tunnel.

Keep the DNS TTL low (60 seconds or less) for records used as WireGuard endpoints. This ensures that IP changes propagate quickly.

## Conclusion

WireGuard on Talos Linux works well with dynamic endpoints as long as you design the topology correctly. Use a hub-and-spoke model with at least one stable endpoint, rely on DNS for address resolution, and configure persistent keepalives to maintain NAT mappings. The built-in roaming support in WireGuard handles most IP changes transparently once the initial connection is established. For more complex environments, supplement the Talos configuration with external tools that monitor and update peer information as addresses change.
