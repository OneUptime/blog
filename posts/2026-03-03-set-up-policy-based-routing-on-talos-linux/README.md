# How to Set Up Policy-Based Routing on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Policy-Based Routing, Networking, Routing Rules, Kubernetes, Network Configuration

Description: Guide to configuring policy-based routing on Talos Linux to route traffic based on source address, protocol, or other criteria.

---

Standard routing makes decisions based on the destination address alone. A packet going to 10.0.0.1 always follows the same path, regardless of where it came from or what protocol it uses. Policy-based routing (PBR) changes this. With PBR, you can route traffic based on the source address, the incoming interface, packet marks, protocol, or other criteria.

On Talos Linux, PBR is configured through the machine configuration and can also be influenced by Kubernetes networking components. This guide covers how to set up and use policy-based routing in your Talos cluster.

## When You Need Policy-Based Routing

There are several practical scenarios where PBR is necessary:

- **Multi-homed nodes**: When a node has multiple network interfaces connected to different networks, and you need responses to go back through the same interface they arrived on
- **VPN split tunneling**: Routing some traffic through a VPN while other traffic goes directly
- **Compliance requirements**: Sending specific traffic through a security appliance or monitoring system
- **Multi-tenant networks**: Different tenants' traffic needs to use different network paths
- **ISP dual-homing**: Using different ISPs for different types of traffic

## Understanding Linux Routing Policy

Linux implements PBR through routing rules and multiple routing tables. The routing rules specify conditions, and each condition points to a specific routing table:

```text
Rule: if source is 192.168.1.0/24, use table 100
Rule: if source is 10.0.0.0/8, use table 200
Rule: everything else, use the main table
```

Each routing table can have its own set of routes with different default gateways and paths.

## Configuring PBR in Talos Machine Configuration

Talos supports routing rules and multiple routing tables through network configuration documents. Use `LinkConfig` for interface addresses and routes, and `RoutingRuleConfig` for Linux policy routing rules:

### Basic Setup with Two Uplinks

```yaml
apiVersion: v1alpha1
kind: LinkConfig
name: eth0 # Primary interface - connected to ISP1
addresses:
  - address: 203.0.113.10/24
routes:
  - destination: 0.0.0.0/0
    gateway: 203.0.113.1
    metric: 100
  # Also add this route to a custom routing table
  - destination: 0.0.0.0/0
    gateway: 203.0.113.1
    table: "100"
---
apiVersion: v1alpha1
kind: LinkConfig
name: eth1 # Secondary interface - connected to ISP2
addresses:
  - address: 198.51.100.20/24
routes:
  - destination: 0.0.0.0/0
    gateway: 198.51.100.1
    table: "200"
---
apiVersion: v1alpha1
kind: RoutingRuleConfig
name: "100" # Priority of the routing rule
src: 203.0.113.10/32
table: "100"
---
apiVersion: v1alpha1
kind: RoutingRuleConfig
name: "200" # Priority of the routing rule
src: 198.51.100.20/32
table: "200"
```

This configuration ensures that traffic originating from the IP on eth0 goes through ISP1, and traffic originating from the IP on eth1 goes through ISP2. This is essential for asymmetric routing prevention.

### Applying the Configuration

```bash
# Apply to a new or existing node

talosctl apply-config --nodes 192.168.1.10 --file config.yaml

# Verify configured routes from the Talos API
talosctl get routes --nodes 192.168.1.10
```

## Verifying the Configuration

After applying, verify that the routing rules and tables are set up correctly:

```bash
# Check routing rules
# Use a debug pod since talosctl doesn't have a direct 'ip rule' equivalent
kubectl debug node/talos-node-1 -it --profile=sysadmin --image=nicolaka/netshoot -- ip rule show

# Expected output:
# 0:      from all lookup local
# 100:    from 203.0.113.10 lookup 100
# 200:    from 198.51.100.20 lookup 200
# 32766:  from all lookup main
# 32767:  from all lookup default
```

Check the individual routing tables:

```bash
# Check table 100
kubectl debug node/talos-node-1 -it --profile=sysadmin --image=nicolaka/netshoot -- ip route show table 100

# Expected output:
# default via 203.0.113.1 dev eth0

# Check table 200
kubectl debug node/talos-node-1 -it --profile=sysadmin --image=nicolaka/netshoot -- ip route show table 200

# Expected output:
# default via 198.51.100.1 dev eth1
```

## Advanced PBR Scenarios

### Routing Based on Source Subnet

Route entire subnets through different paths:

```yaml
apiVersion: v1alpha1
kind: LinkConfig
name: eth0
addresses:
  - address: 192.168.1.10/24
routes:
  - destination: 0.0.0.0/0
    gateway: 192.168.1.1
  - destination: 0.0.0.0/0
    gateway: 192.168.1.1
    table: "100"
  - destination: 0.0.0.0/0
    gateway: 192.168.1.254
    table: "200"
---
apiVersion: v1alpha1
kind: RoutingRuleConfig
name: "100"
# Management traffic through gateway 1
src: 10.10.0.0/16
table: "100"
---
apiVersion: v1alpha1
kind: RoutingRuleConfig
name: "200"
# Application traffic through gateway 254
src: 10.20.0.0/16
table: "200"
```

### Routing Based on Destination

You can also create rules based on the destination:

```yaml
apiVersion: v1alpha1
kind: LinkConfig
name: eth0
addresses:
  - address: 192.168.1.10/24
routes:
  - destination: 0.0.0.0/0
    gateway: 192.168.1.1
  # Route specific destination through a different gateway
  - destination: 10.50.0.0/16
    gateway: 192.168.1.254
    table: "300"
---
apiVersion: v1alpha1
kind: RoutingRuleConfig
name: "150"
# Traffic to 10.50.0.0/16 uses table 300
dst: 10.50.0.0/16
table: "300"
```

### Combined Source and Destination Rules

```yaml
apiVersion: v1alpha1
kind: LinkConfig
name: eth0
addresses:
  - address: 192.168.1.10/24
routes:
  - destination: 10.99.0.0/16
    gateway: 192.168.1.254
    table: "400"
---
apiVersion: v1alpha1
kind: RoutingRuleConfig
name: "50"
# Traffic from management subnet to monitoring network
# goes through the security appliance
src: 10.10.0.0/16
dst: 10.99.0.0/16
table: "400"
```

## PBR with Kubernetes Networking

Policy-based routing can interact with Kubernetes networking in important ways.

### Pod CIDR Routing

If your pods need different routing based on their IP ranges:

```yaml
apiVersion: v1alpha1
kind: LinkConfig
name: eth0
addresses:
  - address: 192.168.1.10/24
routes:
  - destination: 0.0.0.0/0
    gateway: 192.168.1.1
  - destination: 0.0.0.0/0
    gateway: 192.168.1.254
    table: "500"
---
apiVersion: v1alpha1
kind: RoutingRuleConfig
name: "100"
# Pod traffic (CIDR 10.244.0.0/16) uses a specific table
src: 10.244.0.0/16
table: "500"
```

### Service Traffic Routing

For routing traffic to Kubernetes service IPs through specific paths:

```yaml
apiVersion: v1alpha1
kind: RoutingRuleConfig
name: "50"
# Traffic to the Service CIDR uses the main table (default behavior)
dst: 10.96.0.0/12
table: "254"
```

## Kernel Parameters for PBR

Some kernel parameters affect PBR behavior. Configure them in the Talos machine configuration:

```yaml
machine:
  sysctls:
    # Enable IP forwarding
    net.ipv4.ip_forward: "1"

    # Reverse path filtering - important for PBR
    # Set to 2 (loose mode) to prevent dropped packets on multi-homed hosts
    net.ipv4.conf.all.rp_filter: "2"
    net.ipv4.conf.default.rp_filter: "2"

    # Source routing is not required for PBR and should normally remain disabled
    net.ipv4.conf.all.accept_source_route: "0"
```

The reverse path filter setting is particularly important. The default strict mode (1) drops packets that arrive on an interface that is not the one the kernel would use to reach the source. With PBR, this check can incorrectly drop valid traffic. Setting it to loose mode (2) prevents this.

## Troubleshooting PBR

### Traffic Not Following Expected Path

```bash
# Check which table is being used for a specific flow
kubectl debug node/talos-node-1 -it --profile=sysadmin --image=nicolaka/netshoot -- \
  ip route get 8.8.8.8 from 203.0.113.10

# Output shows which table and route is selected:
# 8.8.8.8 from 203.0.113.10 via 203.0.113.1 dev eth0 table 100 uid 0
```

### Rules Not Being Applied

```bash
# Verify rules are present
kubectl debug node/talos-node-1 -it --profile=sysadmin --image=nicolaka/netshoot -- ip rule show

# Check for conflicting rules with lower priority numbers (higher priority)
# Lower number = higher priority
```

### Asymmetric Routing Issues

If you see connection timeouts or reset packets, asymmetric routing might be the cause. This happens when traffic goes out one path but the return traffic comes back on a different path:

```bash
# Check conntrack for problematic connections
kubectl debug node/talos-node-1 -it --profile=sysadmin --image=nicolaka/netshoot -- \
  conntrack -L | grep "UNREPLIED"
```

Fix by ensuring that PBR rules are set up for both directions of the traffic flow.

## Monitoring PBR

Inspect PBR rules and routing table state:

```bash
# Inspect routing rules
kubectl debug node/talos-node-1 -it --profile=sysadmin --image=nicolaka/netshoot -- \
  ip rule show

# Check per-table routes
kubectl debug node/talos-node-1 -it --profile=sysadmin --image=nicolaka/netshoot -- \
  ip -s route show table 100
```

## Best Practices

1. **Use consistent priority numbering**: Establish a numbering scheme for rule priorities and document it
2. **Set reverse path filtering to loose mode**: Prevents legitimate traffic from being dropped
3. **Test with ip route get**: Verify routing decisions before deploying to production
4. **Document your routing policy**: PBR adds complexity, so clear documentation is essential
5. **Monitor failover paths**: If a gateway in a custom routing table goes down, traffic using that table will fail unless you have fallback routes
6. **Keep it simple**: Only use PBR when standard routing is genuinely insufficient

## Conclusion

Policy-based routing on Talos Linux allows you to make sophisticated routing decisions based on traffic characteristics beyond just the destination address. Whether you need to handle multi-homed nodes, separate management and application traffic, or route through security appliances, PBR gives you the control you need. Configure it through the Talos machine configuration for persistent, version-controlled routing policies that survive reboots and upgrades.
