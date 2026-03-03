# How to Set Up SideroLink VPN for Remote Management

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, SideroLink, VPN, Remote Management, WireGuard

Description: Learn how to set up SideroLink VPN for secure remote management of Talos Linux nodes across different networks and locations

---

SideroLink is a purpose-built VPN technology for managing Talos Linux nodes remotely. It uses WireGuard under the hood to create encrypted tunnels between your Talos nodes and a management endpoint (typically Sidero Omni). This allows you to manage nodes that are behind NAT, firewalls, or in completely different networks, all from a single management interface.

Unlike traditional VPN solutions that require complex configuration and certificate management, SideroLink is integrated directly into Talos Linux and sets up automatically. This guide explains how SideroLink works and how to set it up for remote management.

## How SideroLink Works

SideroLink establishes a WireGuard tunnel from each Talos node to a central endpoint. The key characteristics that make it different from generic VPN solutions are:

1. **Node-initiated connections** - The node connects outbound to the management endpoint, so no inbound firewall rules are needed on the node
2. **WireGuard-based encryption** - All traffic is encrypted using WireGuard, which provides modern, high-performance cryptography
3. **IPv6 overlay** - SideroLink uses an IPv6 overlay network (fdae::/32) for management traffic, keeping it separate from your regular network
4. **Automatic key management** - Cryptographic keys are generated and exchanged automatically during the connection process

The architecture looks like this:

```text
Talos Node 1 (Office)          Omni Endpoint (Cloud)
  WireGuard tunnel ---------> SideroLink Server
  fdae:41e4:...:1              fdae:41e4:...:0

Talos Node 2 (Datacenter)
  WireGuard tunnel --------->
  fdae:41e4:...:2

Talos Node 3 (Edge Location)
  WireGuard tunnel --------->
  fdae:41e4:...:3
```

Each node gets a unique IPv6 address on the SideroLink overlay. All management traffic (API calls, logs, events) flows through these tunnels.

## Setting Up SideroLink with Omni SaaS

The easiest way to use SideroLink is through Sidero Omni SaaS. When you boot a Talos node with an Omni-generated image, SideroLink is configured automatically.

```bash
# Generate an Omni-enabled image
omnictl download --output talos-omni.iso

# The image includes kernel arguments for SideroLink:
# siderolink.api=grpc://omni-endpoint:8099?jointoken=TOKEN
# talos.events.sink=[fdae:41e4:649b:9303::1]:8090
# talos.logging.kernel=tcp://[fdae:41e4:649b:9303::1]:8092
```

These kernel arguments tell the node where to establish the SideroLink tunnel. The `jointoken` authenticates the node with the Omni instance.

## Setting Up SideroLink with Self-Hosted Omni

For self-hosted Omni deployments, you need to configure the SideroLink server endpoint:

```yaml
# omni-config.yaml
apiVersion: v1
kind: OmniConfig
metadata:
  name: default
spec:
  siderolink:
    # Public endpoint where nodes will connect
    endpoint: vpn.example.com:8099

    # WireGuard listen port
    wireguardPort: 8099

    # IPv6 network prefix for SideroLink
    prefix: fdae:41e4:649b:9303::/64
```

Ensure your Omni server has the SideroLink port accessible:

```bash
# Verify the SideroLink endpoint is reachable
# From a machine that can reach the endpoint
nc -zuv vpn.example.com 8099

# Check if the endpoint is listening
ss -ulnp | grep 8099
```

## Configuring Talos Nodes for SideroLink

To connect existing Talos nodes to SideroLink, add the connection parameters to the machine configuration:

```yaml
# talos-machine-config.yaml
machine:
  install:
    extraKernelArgs:
      # SideroLink API endpoint
      - siderolink.api=grpc://vpn.example.com:8099?jointoken=your-join-token-here

      # Event sink (sends Talos events to Omni)
      - talos.events.sink=[fdae:41e4:649b:9303::1]:8090

      # Kernel log forwarding
      - talos.logging.kernel=tcp://[fdae:41e4:649b:9303::1]:8092
```

Apply this configuration:

```bash
# Apply to an existing node
talosctl apply-config --nodes 10.0.0.1 --file talos-machine-config.yaml

# The node will need a reboot for kernel arg changes
talosctl reboot --nodes 10.0.0.1
```

After reboot, the node establishes the SideroLink tunnel automatically.

## Firewall Configuration

SideroLink requires minimal firewall rules because connections are initiated from the node side:

### On the Talos Nodes (Outbound)

```text
# Required outbound rules
Protocol: UDP
Port: 8099 (or your configured WireGuard port)
Destination: Your Omni endpoint
Direction: Outbound
```

No inbound rules are needed on the Talos nodes. This is one of SideroLink's biggest advantages for managing nodes behind restrictive firewalls.

### On the Omni Server (Inbound)

```text
# Required inbound rules
Protocol: UDP
Port: 8099
Source: Any (or restrict to known node IP ranges)
Direction: Inbound

Protocol: TCP
Port: 443
Source: Any
Direction: Inbound (for web UI and API)
```

## Verifying the SideroLink Connection

After a node connects, verify the tunnel is working:

```bash
# Check from Omni
omnictl get machines
omnictl get links

# Check the SideroLink interface on the node
talosctl get addresses --nodes 10.0.0.1
# Look for an address with fdae: prefix

# Example output:
# NODE       NAMESPACE   TYPE      ID             VERSION   ADDRESS
# 10.0.0.1   network     Address   siderolink     1         fdae:41e4:649b:9303::1234/128

# Verify the WireGuard interface
talosctl get links --nodes 10.0.0.1
# Look for the siderolink interface
```

## Remote Management Through SideroLink

Once SideroLink is established, you can manage nodes remotely through Omni:

```bash
# Use omnictl to interact with remote nodes
omnictl talosctl --nodes machine-uuid -- version
omnictl talosctl --nodes machine-uuid -- services
omnictl talosctl --nodes machine-uuid -- logs kubelet

# Get kubeconfig for a remote cluster
omnictl kubeconfig --cluster my-cluster > kubeconfig.yaml

# Then use kubectl normally
kubectl --kubeconfig kubeconfig.yaml get nodes
```

You can also use the Omni web interface to:
- View real-time node status and metrics
- Browse logs from remote nodes
- Apply configuration changes
- Trigger upgrades and reboots

## SideroLink Network Architecture

SideroLink creates a flat IPv6 network where every node is directly reachable from the Omni endpoint:

```text
SideroLink Network: fdae:41e4:649b:9303::/64

Omni Server:       fdae:41e4:649b:9303::1
Node 1:            fdae:41e4:649b:9303::a1b2
Node 2:            fdae:41e4:649b:9303::c3d4
Node 3:            fdae:41e4:649b:9303::e5f6
```

This overlay network is separate from your production network. Management traffic (API calls, logs, events) flows over SideroLink, while production traffic (pod-to-pod, service traffic) uses your regular network.

## Handling Network Address Translation

SideroLink works seamlessly behind NAT because:

1. The WireGuard connection is initiated from the node (outbound)
2. WireGuard keeps the NAT mapping alive with periodic keepalives
3. The overlay IPv6 addresses are independent of the node's physical IP

This means you can manage nodes in environments where:
- The node is behind a corporate NAT gateway
- The node has a dynamic IP address
- The node is behind a carrier-grade NAT
- The node is on a private network with no public IP

```yaml
# WireGuard keepalive is configured automatically
# If you have an aggressive NAT that drops idle connections quickly,
# you may need to adjust the keepalive interval
# This is handled internally by the SideroLink implementation
```

## Multi-Site SideroLink Setup

For organizations with nodes in multiple locations, SideroLink connects them all to a single Omni instance:

```text
Site A: Office (10.1.0.0/16)
  - Node A1, A2, A3 -----> SideroLink ---+
                                          |
Site B: Datacenter (172.16.0.0/12)        |
  - Node B1, B2, B3 -----> SideroLink ---+----> Omni
                                          |
Site C: Edge (192.168.0.0/16)             |
  - Node C1, C2 ---------> SideroLink ---+
```

Each node connects independently to Omni. There is no requirement for inter-site connectivity. This makes SideroLink ideal for managing distributed infrastructure where sites may not have direct network connectivity to each other.

## Troubleshooting SideroLink

Common issues and their solutions:

```bash
# Problem: Node not appearing in Omni
# Check if the node can reach the endpoint
talosctl dmesg --nodes 10.0.0.1 | grep -i siderolink

# Problem: Tunnel established but management commands fail
# Check the tunnel health
omnictl get link machine-uuid -o yaml

# Problem: Intermittent connectivity
# Check for firewall rules blocking UDP
# Check for NAT timeout issues
# Verify DNS resolution of the Omni endpoint

# Problem: High latency on management operations
# SideroLink adds the WireGuard tunnel overhead
# For nodes far from the Omni endpoint, latency is expected
# This only affects management, not production traffic
```

## Security Best Practices

1. Rotate join tokens periodically
2. Use machine identity verification in Omni
3. Restrict the SideroLink endpoint to known IP ranges if possible
4. Monitor connected machines for unauthorized nodes
5. Use separate Omni instances for different security zones

## Conclusion

SideroLink VPN transforms Talos Linux node management by providing secure, reliable connectivity regardless of network topology. Whether your nodes are in a cloud VPC, a corporate datacenter, or an edge location behind NAT, SideroLink connects them all to a single management interface. The WireGuard-based encryption, automatic key management, and outbound-only connection model make it both secure and firewall-friendly. Set up SideroLink once and manage your entire Talos fleet from anywhere.
