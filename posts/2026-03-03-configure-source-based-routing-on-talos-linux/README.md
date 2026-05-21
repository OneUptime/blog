# How to Configure Source-Based Routing on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Source-Based Routing, Networking, Multi-Homed, Routing, Kubernetes

Description: Configure source-based routing on Talos Linux to ensure traffic exits through the correct interface based on its source address.

---

Source-based routing is a specific form of policy-based routing where the routing decision depends on the source address of the packet rather than just the destination. This is critical for multi-homed servers - machines connected to multiple networks through different interfaces. Without source-based routing, a multi-homed Talos Linux node might send response traffic through the wrong interface, causing connections to fail.

This guide explains the problem source-based routing solves and shows you how to configure it on Talos Linux.

## The Multi-Homed Problem

Consider a Talos Linux node with two network interfaces:

```text
eth0: 192.168.1.10/24 (gateway: 192.168.1.1)
eth1: 10.0.0.10/24   (gateway: 10.0.0.1)
```

A client on the 10.0.0.0/24 network sends a request to 10.0.0.10 (arriving on eth1). The node processes the request and generates a response. But which interface does the response go out on?

With standard routing, there is only one default gateway. If the default route points to 192.168.1.1 (via eth0), the response to the 10.0.0.0/24 client goes out eth0. The client sent the request to an address on eth1 but receives the reply from a different network. Many firewalls and clients will drop this response because it appears to come from the wrong place.

Source-based routing fixes this. It says: "If the source address of this packet is 10.0.0.10, use the routing table that goes through eth1."

## Configuring Source-Based Routing

### Basic Two-Interface Setup

Talos 1.13 introduced the `RoutingRuleConfig` multi-document machine config for declaring Linux policy routing rules. Rules live in their own top-level documents (separated by `---`) rather than nested under an interface. The `name` field of the document is the rule priority and must be unique.

Here is a complete Talos machine configuration for a node with two interfaces, each needing source-based routing:

```yaml
machine:
  network:
    interfaces:
      # Primary network interface
      - interface: eth0
        addresses:
          - 192.168.1.10/24
        routes:
          - network: 0.0.0.0/0
            gateway: 192.168.1.1
      # Secondary network interface
      - interface: eth1
        addresses:
          - 10.0.0.10/24
        routes:
          # Higher metric so this default is the backup, not the primary
          - network: 0.0.0.0/0
            gateway: 10.0.0.1
            metric: 200
  sysctls:
    # Use loose reverse path filtering for multi-homed setup
    net.ipv4.conf.all.rp_filter: "2"
    net.ipv4.conf.default.rp_filter: "2"
    net.ipv4.ip_forward: "1"
---
# Traffic sourced from eth0's IP looks up table 100
apiVersion: v1alpha1
kind: RoutingRuleConfig
name: "100"
src: 192.168.1.10/32
table: "100"
action: unicast
---
# Traffic sourced from eth1's IP looks up table 200
apiVersion: v1alpha1
kind: RoutingRuleConfig
name: "200"
src: 10.0.0.10/32
table: "200"
action: unicast
```

Note: `RoutingRuleConfig` only declares the policy rule itself. Talos does not currently expose a way to populate routes in custom (non-main) tables through machine configuration. For the rules above to direct traffic to a specific gateway, tables `100` and `200` need to be populated with routes (for example, by an in-cluster operator or a post-boot script that runs `ip route add` on each node). If a rule looks up an empty table, the kernel falls through to the next rule.

### What This Configuration Does

When a packet leaves the node with source address 192.168.1.10, the kernel checks the routing rules:
1. Rule at priority 100 matches (source is 192.168.1.10/32)
2. It looks up table 100
3. Table 100 has a default route via 192.168.1.1 (eth0)
4. The packet goes out eth0

When a packet leaves with source address 10.0.0.10:
1. Rule at priority 200 matches (source is 10.0.0.10/32)
2. It looks up table 200
3. Table 200 has a default route via 10.0.0.1 (eth1)
4. The packet goes out eth1

Each interface's traffic uses its own gateway. Problem solved.

## Applying and Verifying

Apply the configuration:

```bash
# Apply to the node

talosctl apply-config --nodes 192.168.1.10 --file config.yaml
```

Verify the routing rules are in place:

```bash
# Check routing rules
kubectl debug node/talos-node-1 -it --image=nicolaka/netshoot -- ip rule show
```

Expected output:

```text
0:      from all lookup local
100:    from 192.168.1.10 lookup 100
200:    from 10.0.0.10 lookup 200
32766:  from all lookup main
32767:  from all lookup default
```

Verify the routing tables:

```bash
# Check table 100
kubectl debug node/talos-node-1 -it --image=nicolaka/netshoot -- ip route show table 100

# Expected:
# default via 192.168.1.1 dev eth0
# 192.168.1.0/24 dev eth0 scope link

# Check table 200
kubectl debug node/talos-node-1 -it --image=nicolaka/netshoot -- ip route show table 200

# Expected:
# default via 10.0.0.1 dev eth1
# 10.0.0.0/24 dev eth1 scope link
```

Test the routing decision:

```bash
# Test routing for traffic from eth0's address
kubectl debug node/talos-node-1 -it --image=nicolaka/netshoot -- \
  ip route get 8.8.8.8 from 192.168.1.10
# Should show: via 192.168.1.1 dev eth0 table 100

# Test routing for traffic from eth1's address
kubectl debug node/talos-node-1 -it --image=nicolaka/netshoot -- \
  ip route get 8.8.8.8 from 10.0.0.10
# Should show: via 10.0.0.1 dev eth1 table 200
```

## Source-Based Routing with VLANs

If your Talos node uses VLANs, each VLAN can be targeted by its own `RoutingRuleConfig`:

```yaml
machine:
  network:
    interfaces:
      - interface: eth0
        addresses:
          - 192.168.1.10/24
        routes:
          - network: 0.0.0.0/0
            gateway: 192.168.1.1
        vlans:
          - vlanId: 100
            addresses:
              - 10.100.0.10/24
          - vlanId: 200
            addresses:
              - 10.200.0.10/24
---
apiVersion: v1alpha1
kind: RoutingRuleConfig
name: "100"
src: 10.100.0.10/32
table: "100"
action: unicast
---
apiVersion: v1alpha1
kind: RoutingRuleConfig
name: "200"
src: 10.200.0.10/32
table: "200"
action: unicast
```

## Source-Based Routing for Kubernetes Services

When using LoadBalancer services with external IPs on specific interfaces, source-based routing ensures response traffic goes back through the correct interface:

```yaml
machine:
  network:
    interfaces:
      # Public-facing interface
      - interface: eth0
        addresses:
          - 203.0.113.10/24
      # Internal cluster interface
      - interface: eth1
        addresses:
          - 10.0.0.10/24
        routes:
          - network: 0.0.0.0/0
            gateway: 10.0.0.1
          - network: 10.0.0.0/8
            gateway: 10.0.0.1
---
apiVersion: v1alpha1
kind: RoutingRuleConfig
name: "100"
src: 203.0.113.10/32
table: "100"
action: unicast
```

When a LoadBalancer service binds to the public IP (203.0.113.10), the rule above directs response traffic to table 100. Table 100 must hold a default route via 203.0.113.1 (added out-of-band - see the note in the basic setup section) so the reply leaves through eth0 to the internet-facing gateway.

## Handling Multiple IPs on the Same Interface

If an interface has multiple IPs, you may need source-based routing for each:

```yaml
machine:
  network:
    interfaces:
      - interface: eth0
        addresses:
          - 192.168.1.10/24
          - 192.168.1.11/24  # Additional IP
        routes:
          - network: 0.0.0.0/0
            gateway: 192.168.1.1
---
# Both IPs use the same table since they share the same gateway
apiVersion: v1alpha1
kind: RoutingRuleConfig
name: "100"
src: 192.168.1.10/32
table: "100"
action: unicast
---
apiVersion: v1alpha1
kind: RoutingRuleConfig
name: "101"
src: 192.168.1.11/32
table: "100"
action: unicast
```

## The Reverse Path Filter Setting

The `rp_filter` (reverse path filter) kernel parameter is crucial for source-based routing. It controls whether the kernel verifies that incoming packets could have arrived on the interface they actually arrived on:

- **0 (disabled)**: No verification. Packets from any source are accepted on any interface.
- **1 (strict)**: Packets are dropped if the return path for the source address does not go through the same interface. This breaks multi-homed setups.
- **2 (loose)**: Packets are only dropped if the source address is not reachable via any interface. This is the correct setting for multi-homed hosts.

```yaml
machine:
  sysctls:
    net.ipv4.conf.all.rp_filter: "2"
    net.ipv4.conf.default.rp_filter: "2"
    # Set for specific interfaces too
    net.ipv4.conf.eth0.rp_filter: "2"
    net.ipv4.conf.eth1.rp_filter: "2"
```

## Troubleshooting

### Connections Timing Out on One Interface

If connections through one interface work but the other does not:

```bash
# Verify the routing rule exists
kubectl debug node/talos-node-1 -it --image=nicolaka/netshoot -- ip rule show

# Test the routing decision
kubectl debug node/talos-node-1 -it --image=nicolaka/netshoot -- \
  ip route get 8.8.8.8 from <source-ip>

# Check if rp_filter is blocking traffic
kubectl debug node/talos-node-1 -it --image=nicolaka/netshoot -- \
  sysctl net.ipv4.conf.all.rp_filter
```

### Packets Being Dropped

If packets are arriving but responses are not reaching the client:

```bash
# Use tcpdump to trace traffic
kubectl debug node/talos-node-1 -it --image=nicolaka/netshoot -- \
  tcpdump -i eth1 -n host 10.0.0.100

# Check for dropped packets
kubectl debug node/talos-node-1 -it --image=nicolaka/netshoot -- \
  netstat -s | grep -i drop
```

### Rules Not Persisting After Reboot

If routing rules disappear after a reboot, they are not properly configured in the machine configuration. Verify the applied `RoutingRuleConfig` documents and the rules Talos has materialized:

```bash
# Inspect the applied machine configuration
talosctl --nodes 192.168.1.10 get machineconfig -o yaml

# Inspect the routing rule resources Talos manages via COSI
talosctl --nodes 192.168.1.10 get routingrules

# Or read the kernel's view of the rules directly
talosctl --nodes 192.168.1.10 read /proc/net/fib_rules
```

## Conclusion

Source-based routing is essential for any Talos Linux node connected to multiple networks. Without it, response traffic may exit through the wrong interface, breaking connections and confusing network security devices. The Talos machine configuration supports source-based routing through routing rules and custom routing tables, giving you declarative, version-controlled control over this critical networking feature. Always remember to set the reverse path filter to loose mode (2) on multi-homed nodes, and verify your routing decisions using `ip route get` after configuration changes.
