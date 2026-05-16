# How to Set Up Network Routes in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Network Routes, Networking, Kubernetes, Routing

Description: A practical guide to setting up static network routes in Talos Linux for multi-subnet environments and custom traffic paths.

---

Network routing determines how traffic gets from one place to another. While a default route handles most outbound traffic, many real-world environments need additional routes for specific networks - internal subnets, VPN destinations, storage networks, or management planes. Talos Linux lets you define static routes in the machine configuration, giving you precise control over traffic flow.

This post covers how to configure static routes in Talos Linux, common routing patterns, and troubleshooting tips for when traffic does not go where you expect it.

## How Routing Works

When a node sends a packet, the kernel looks up the destination address in its routing table. It finds the most specific matching route and sends the packet accordingly. Routes have three key pieces:

- **Network** - The destination subnet (in CIDR notation)
- **Gateway** - The next-hop address to send the packet to
- **Interface** - Which network interface to send the packet out of

The kernel always picks the most specific route. A route for `10.20.0.0/24` is more specific than `10.0.0.0/8`, which is more specific than `0.0.0.0/0` (the default route).

## Default Route

The default route (`0.0.0.0/0`) is where traffic goes when no other route matches. This is typically your internet gateway:

```yaml
apiVersion: v1alpha1
kind: LinkConfig
name: eth0
addresses:
  - address: 192.168.1.10/24
routes:
  - destination: 0.0.0.0/0
    gateway: 192.168.1.1
```

Every node needs a default route to communicate with the broader network. Without one, the node can only reach addresses on its directly-connected subnets.

## Adding Static Routes

Static routes are defined per interface in the `routes` list:

```yaml
apiVersion: v1alpha1
kind: LinkConfig
name: eth0
addresses:
  - address: 192.168.1.10/24
routes:
  # Default route - internet gateway
  - destination: 0.0.0.0/0
    gateway: 192.168.1.1
  # Route to office network through a specific gateway
  - destination: 10.10.0.0/16
    gateway: 192.168.1.254
  # Route to data center network
  - destination: 172.16.0.0/12
    gateway: 192.168.1.253
```

Each route entry specifies which destination network should be reached through which gateway. The gateway must be directly reachable from the interface where the route is defined.

## Multi-Interface Routing

When your node has multiple interfaces on different networks, you need routes to tell the kernel which interface to use for which destinations:

```yaml
# Management interface
apiVersion: v1alpha1
kind: LinkConfig
name: eth0
addresses:
  - address: 192.168.1.10/24
routes:
  - destination: 0.0.0.0/0
    gateway: 192.168.1.1
---
# Storage interface
apiVersion: v1alpha1
kind: LinkConfig
name: eth1
addresses:
  - address: 10.10.0.10/24
routes:
  # Route storage traffic through the storage network
  - destination: 10.10.0.0/16
    gateway: 10.10.0.1
---
# Application interface
apiVersion: v1alpha1
kind: LinkConfig
name: eth2
addresses:
  - address: 10.20.0.10/24
routes:
  - destination: 10.20.0.0/16
    gateway: 10.20.0.1
```

Only one interface should have the default route. The other interfaces have specific routes for their networks.

## Route Metrics

When two routes point to the same destination, the route with the lower metric is preferred. This is useful for failover scenarios:

```yaml
apiVersion: v1alpha1
kind: LinkConfig
name: eth0
addresses:
  - address: 192.168.1.10/24
routes:
  # Primary default route - metric 100 (preferred)
  - destination: 0.0.0.0/0
    gateway: 192.168.1.1
    metric: 100
---
apiVersion: v1alpha1
kind: LinkConfig
name: eth1
addresses:
  - address: 192.168.2.10/24
routes:
  # Backup default route - metric 200 (fallback)
  - destination: 0.0.0.0/0
    gateway: 192.168.2.1
    metric: 200
```

In this setup, traffic normally goes through `eth0` (metric 100). If `eth0` is down, the kernel uses the route through `eth1` (metric 200).

## Routes for VPN and Tunnel Traffic

When you have VPN tunnels (like WireGuard), you need routes to direct traffic for remote networks through the tunnel:

```yaml
apiVersion: v1alpha1
kind: LinkConfig
name: eth0
addresses:
  - address: 192.168.1.10/24
routes:
  - destination: 0.0.0.0/0
    gateway: 192.168.1.1
---
apiVersion: v1alpha1
kind: WireguardConfig
name: wg0
privateKey: <base64-private-key>
peers:
  - publicKey: <base64-peer-public-key>
    allowedIPs:
      - 10.20.0.0/16
      - 10.30.0.0/16
addresses:
  - address: 10.0.0.1/24
routes:
  # Route remote site traffic through the tunnel
  - destination: 10.20.0.0/16
  - destination: 10.30.0.0/16
```

For WireGuard, the gateway is often omitted because the kernel knows to use the tunnel interface based on WireGuard's `allowedIPs` configuration.

## Routes for Kubernetes Pod and Service Networks

Kubernetes pod-to-pod traffic usually goes through the CNI plugin's overlay network, so you do not need explicit routes for the pod CIDR. However, in some CNI setups (like Calico with direct routing), you might need routes to peer nodes:

```yaml
apiVersion: v1alpha1
kind: LinkConfig
name: eth0
addresses:
  - address: 192.168.1.10/24
routes:
  - destination: 0.0.0.0/0
    gateway: 192.168.1.1
  # Direct routes to pod subnets on other nodes
  # (only needed for specific CNI configurations)
  - destination: 10.244.1.0/24
    gateway: 192.168.1.11
  - destination: 10.244.2.0/24
    gateway: 192.168.1.12
```

This is not typical - most CNI plugins handle this routing automatically. But it can be useful for troubleshooting or custom networking setups.

## Applying Routes

For new clusters:

```bash
talosctl gen config my-cluster https://192.168.1.100:6443 \
  --config-patch @routes-patch.yaml
```

For existing nodes:

```bash
# Add routes to a running node

talosctl patch machineconfig --nodes 192.168.1.10 \
  --patch @routes-patch.yaml --mode=try
```

Remember that the routes field is a list, and patches replace lists entirely. Include all routes you want, not just the new ones. When changing routes on a live node, `--mode=try` gives Talos a rollback window if the new network configuration breaks access.

## Verifying Routes

Check the routing table on a node:

```bash
# View all routes
talosctl get routes --nodes 192.168.1.10
```

This shows the complete routing table including directly-connected routes (from interface addresses), configured static routes, and any dynamically-added routes.

To confirm traffic is using the expected interface while you test from another host:

```bash
# Watch traffic while testing from another host
talosctl pcap --nodes 192.168.1.10 --interface eth0
```

## Blackhole Routes

A blackhole route silently drops traffic to a specific destination. This can be useful for blocking traffic or preventing routing loops:

```yaml
apiVersion: v1alpha1
kind: LinkConfig
name: eth0
routes:
  - destination: 0.0.0.0/0
    gateway: 192.168.1.1
---
# Drop traffic to this range
apiVersion: v1alpha1
kind: BlackholeRouteConfig
name: 10.99.0.0/16
```

## Common Routing Patterns

### Hub-and-Spoke

One node acts as a router for traffic between subnets:

```yaml
# On the hub node with multiple interfaces
apiVersion: v1alpha1
kind: LinkConfig
name: eth0
addresses:
  - address: 192.168.1.1/24
---
apiVersion: v1alpha1
kind: LinkConfig
name: eth1
addresses:
  - address: 10.10.0.1/24
---
apiVersion: v1alpha1
kind: LinkConfig
name: eth2
addresses:
  - address: 10.20.0.1/24
---
version: v1alpha1
machine:
  # Enable IP forwarding
  sysctls:
    net.ipv4.ip_forward: "1"
```

### Access to Multiple Data Centers

```yaml
apiVersion: v1alpha1
kind: LinkConfig
name: eth0
addresses:
  - address: 192.168.1.10/24
routes:
  - destination: 0.0.0.0/0
    gateway: 192.168.1.1
  # DC1 networks
  - destination: 10.1.0.0/16
    gateway: 192.168.1.251
  # DC2 networks
  - destination: 10.2.0.0/16
    gateway: 192.168.1.252
```

## Troubleshooting

**Traffic going to wrong gateway** - Check for overlapping routes. A more specific route always wins. If you have `10.0.0.0/8` pointing to one gateway and `10.10.0.0/16` pointing to another, traffic for `10.10.x.x` goes to the more specific route.

**Asymmetric routing** - If traffic goes out one interface but responses come back on another, firewalls may drop the responses. Make sure return traffic follows the same path, or configure stateful firewall rules to handle asymmetric routing.

**Route disappears after reboot** - Make sure the route is in the machine configuration, not just added at runtime. Routes in the Talos config persist across reboots.

**Gateway unreachable** - The gateway address must be on a directly-connected network. You cannot use a gateway that requires another route to reach.

## Conclusion

Static routes in Talos Linux give you control over how traffic flows between networks. For simple setups with a single subnet, the default route is all you need. For multi-subnet environments with storage networks, VPN tunnels, or multiple data centers, static routes direct traffic along the correct paths. Define them in the machine config, verify with `talosctl get routes`, and test connectivity to each destination. Well-planned routing is the backbone of a reliable network architecture, and taking the time to get it right pays off in fewer connectivity issues and easier troubleshooting.
