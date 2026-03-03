# How to Configure KubeSpan Endpoint Filters

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, KubeSpan, Endpoint Filters, WireGuard, Networking

Description: Learn how to configure KubeSpan endpoint filters in Talos Linux to control which network addresses are advertised for WireGuard peer connections.

---

KubeSpan endpoint filters give you precise control over which IP addresses your Talos Linux nodes advertise as reachable WireGuard endpoints. Without proper filtering, nodes might advertise addresses that are not routable from other nodes, leading to failed connections or suboptimal routing. This guide explains how endpoint filters work and how to configure them for different network environments.

## What Endpoint Filters Do

Every Talos Linux node with KubeSpan enabled has one or more network addresses. A node in a cloud environment might have a private VPC address (10.0.1.5), a public elastic IP (52.20.100.50), and possibly a link-local address (169.254.x.x). By default, KubeSpan advertises all of these addresses as potential endpoints through the discovery service.

Other nodes in the cluster then try to connect using these endpoints. If a node tries a private IP that is not routable from its network, the connection attempt wastes time and delays establishing the tunnel. Endpoint filters let you specify exactly which addresses should be advertised.

## Filter Syntax

Endpoint filters use CIDR notation with an optional negation prefix. The filters are evaluated in order, and the first match wins:

```yaml
machine:
  network:
    kubespan:
      enabled: true
      filters:
        endpoints:
          - "!10.0.0.0/8"       # Exclude: do not advertise 10.x.x.x addresses
          - "!172.16.0.0/12"    # Exclude: do not advertise 172.16-31.x.x addresses
          - "0.0.0.0/0"         # Include: advertise everything else
```

The exclamation mark (`!`) prefix means "do not advertise addresses matching this CIDR." A CIDR without the prefix means "advertise addresses matching this CIDR." The catch-all `0.0.0.0/0` at the end acts as a default rule.

## Common Filter Configurations

### Public Nodes Only Advertise Public IPs

If your nodes have both public and private IPs but should only be reached via their public IPs:

```yaml
# Exclude all private IP ranges
machine:
  network:
    kubespan:
      enabled: true
      filters:
        endpoints:
          - "!10.0.0.0/8"
          - "!172.16.0.0/12"
          - "!192.168.0.0/16"
          - "!169.254.0.0/16"   # Link-local addresses
          - "!127.0.0.0/8"      # Loopback
          - "0.0.0.0/0"         # Everything else (public IPs)
```

### LAN-Only Nodes

For nodes that should only be reached within the local network:

```yaml
# Only advertise the local subnet
machine:
  network:
    kubespan:
      enabled: true
      filters:
        endpoints:
          - "192.168.1.0/24"    # Only advertise IPs in this subnet
```

### Advertise Everything (Default Behavior)

If you want nodes to advertise all their addresses and let KubeSpan figure out connectivity:

```yaml
machine:
  network:
    kubespan:
      enabled: true
      filters:
        endpoints:
          - "0.0.0.0/0"         # Advertise all IPv4 addresses
```

### Specific Subnets for Multi-Site

In a multi-site setup where each site has a specific public subnet:

```yaml
# Site A node - advertise its public range and local range
machine:
  network:
    kubespan:
      enabled: true
      filters:
        endpoints:
          - "203.0.113.0/24"    # Site A public range
          - "10.1.0.0/16"       # Site A private range (for local peers)
```

```yaml
# Site B node - advertise its public range and local range
machine:
  network:
    kubespan:
      enabled: true
      filters:
        endpoints:
          - "198.51.100.0/24"   # Site B public range
          - "10.2.0.0/16"       # Site B private range (for local peers)
```

## How Filter Evaluation Works

Filters are evaluated against each address on the node. For each address, the filter list is checked from top to bottom. The first matching rule determines whether the address is advertised or not.

Consider this example:

```yaml
filters:
  endpoints:
    - "!10.0.0.0/8"
    - "10.1.5.0/24"
    - "0.0.0.0/0"
```

For the address 10.1.5.10, the first rule `!10.0.0.0/8` matches (because 10.1.5.10 is within 10.0.0.0/8), so the address is NOT advertised. The second rule never gets evaluated because the first rule already matched. This is a common mistake. If you want to exclude most of 10.0.0.0/8 but include 10.1.5.0/24, put the include rule first:

```yaml
# Correct order: specific includes before broad excludes
filters:
  endpoints:
    - "10.1.5.0/24"       # Include this specific subnet first
    - "!10.0.0.0/8"       # Then exclude the rest of 10.x.x.x
    - "0.0.0.0/0"         # Include everything else
```

## Verifying Filter Results

After applying endpoint filters, check which endpoints the node is actually advertising:

```bash
# Check the raw addresses on the node
talosctl get addresses --nodes <node-ip>

# Check which endpoints KubeSpan is advertising
talosctl get kubespanendpoint --nodes <node-ip> -o yaml
```

Compare the two outputs. Addresses that match an exclude filter should not appear in the KubeSpan endpoint list.

You can also check what other nodes see for this node:

```bash
# From another node, check discovered endpoints for the filtered node
talosctl get discoveredmembers --nodes <other-node-ip> -o yaml
```

## Applying Filter Changes

To change endpoint filters on a running cluster, patch the machine configuration:

```yaml
# new-filters.yaml
machine:
  network:
    kubespan:
      filters:
        endpoints:
          - "!10.0.0.0/8"
          - "0.0.0.0/0"
```

```bash
# Apply the patch
talosctl patch machineconfig --patch @new-filters.yaml --nodes <node-ip>
```

After the patch is applied, the node will re-evaluate its endpoints and update the discovery service. Other nodes will receive the updated endpoint list on their next discovery poll.

Note that changing filters on a node may cause brief connectivity disruptions as peers switch to different endpoints.

## IPv6 Endpoint Filters

If your nodes have IPv6 addresses, you can filter those too:

```yaml
machine:
  network:
    kubespan:
      enabled: true
      filters:
        endpoints:
          # IPv4 filters
          - "!10.0.0.0/8"
          - "0.0.0.0/0"
          # IPv6 filters
          - "!fe80::/10"        # Exclude link-local IPv6
          - "::/0"              # Include all other IPv6
```

## Debugging Filter Issues

When endpoint filters cause connectivity problems, follow this process:

```bash
# Step 1: Check what addresses the node has
talosctl get addresses --nodes <node-ip>

# Step 2: Check what KubeSpan is advertising after filters
talosctl get kubespanendpoint --nodes <node-ip> -o yaml

# Step 3: If no endpoints are advertised, your filters are too restrictive
# Look at the filter config
talosctl get machineconfig --nodes <node-ip> -o yaml | grep -A20 "kubespan"

# Step 4: Check if peers can see this node
talosctl get discoveredmembers --nodes <other-node-ip> -o yaml

# Step 5: Check controller logs for filter-related messages
talosctl logs controller-runtime --nodes <node-ip> | grep -i endpoint
```

A common mistake is accidentally filtering out all valid endpoints. If your filters exclude every address on the node, KubeSpan has nothing to advertise and no peers can connect.

## Best Practices

Keep your filter rules as simple as possible. Complex filter chains are hard to debug and easy to get wrong. For most deployments, one of these patterns covers the need:

- Advertise everything: `["0.0.0.0/0"]`
- Public only: `["!10.0.0.0/8", "!172.16.0.0/12", "!192.168.0.0/16", "0.0.0.0/0"]`
- Specific subnet: `["192.168.1.0/24"]`

Use consistent filters across nodes at the same site. If one node at a site advertises private IPs and another does not, you will get inconsistent behavior.

Always verify filter results after applying changes. The few seconds it takes to run `talosctl get kubespanendpoint` can save hours of debugging later.

Endpoint filters are a small but important configuration detail in KubeSpan. Getting them right ensures that your nodes advertise the correct addresses, which leads to faster tunnel establishment, fewer failed connection attempts, and a more reliable mesh network overall.
