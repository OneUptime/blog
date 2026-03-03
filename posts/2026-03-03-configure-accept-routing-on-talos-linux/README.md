# How to Configure Accept Routing on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Networking, Accept Routing, Sysctl, Load Balancing, Kubernetes

Description: Learn how to enable and configure accept routing on Talos Linux for proper functioning of direct server return, MetalLB, and multi-homed network setups.

---

Accept routing is a Linux kernel networking feature controlled by the `net.ipv4.conf.all.accept_local` and related sysctl parameters. In the context of Talos Linux and Kubernetes, accept routing becomes important when you use certain load balancing configurations, particularly MetalLB in L2 or BGP mode with Direct Server Return (DSR), or when your nodes have multiple network interfaces that need to accept traffic destined for each other's addresses.

This guide explains what accept routing is, when you need it in Talos Linux, and how to configure it properly.

## What Is Accept Routing?

At its core, accept routing controls whether the Linux kernel accepts packets that arrive on one interface but are addressed to another interface on the same machine. By default, Linux applies a "strong host model" on each interface, which means it drops packets that arrive on an interface but have a destination address assigned to a different interface. Enabling accept routing switches to a "weak host model" where the kernel accepts these packets regardless of which interface they arrive on.

The relevant kernel parameters are:

- `net.ipv4.conf.all.accept_local` - Accept packets with local source addresses
- `net.ipv4.conf.all.rp_filter` - Reverse path filtering mode
- `net.ipv4.conf.all.arp_announce` - ARP announcement behavior
- `net.ipv4.conf.all.arp_ignore` - ARP response behavior

## When You Need Accept Routing

Several common Kubernetes networking scenarios require accept routing:

**MetalLB with L2 Mode**: When MetalLB assigns a virtual IP to a service, traffic arrives at the node that currently owns that IP. If the VIP is not on the same interface that receives the traffic, accept routing prevents the kernel from dropping those packets.

**Direct Server Return**: In DSR load balancing, the load balancer sends traffic to the backend server, but the server responds directly to the client without going back through the load balancer. This requires the backend to accept packets for the VIP address.

**Multi-homed Nodes**: If your nodes have multiple network interfaces (management network, storage network, workload network), you might need accept routing to handle traffic that arrives on one interface but is destined for an address on another.

## Configuring Accept Routing Through Sysctls

In Talos Linux, you configure accept routing through the `machine.sysctls` section:

```yaml
# Enable accept routing for MetalLB and DSR
machine:
  sysctls:
    # Accept packets with local source addresses
    net.ipv4.conf.all.accept_local: "1"
    net.ipv4.conf.default.accept_local: "1"

    # Disable strict reverse path filtering
    net.ipv4.conf.all.rp_filter: "0"
    net.ipv4.conf.default.rp_filter: "0"
```

Setting `accept_local` to `1` tells the kernel to accept packets with a local source address (packets that come from an address assigned to the machine itself). Setting `rp_filter` to `0` disables reverse path filtering, which prevents the kernel from dropping packets that arrive on an unexpected interface.

## MetalLB Configuration

If you are running MetalLB, here is the complete sysctl configuration you typically need:

```yaml
# Full sysctl configuration for MetalLB
machine:
  sysctls:
    # Required for MetalLB to function properly
    net.ipv4.conf.all.accept_local: "1"
    net.ipv4.conf.default.accept_local: "1"

    # Relaxed reverse path filtering
    net.ipv4.conf.all.rp_filter: "2"
    net.ipv4.conf.default.rp_filter: "2"

    # ARP settings for load balancing
    net.ipv4.conf.all.arp_announce: "2"
    net.ipv4.conf.default.arp_announce: "2"
    net.ipv4.conf.all.arp_ignore: "1"
    net.ipv4.conf.default.arp_ignore: "1"

    # Ensure IP forwarding is enabled
    net.ipv4.ip_forward: "1"
```

Let me explain the ARP settings:

- `arp_announce=2`: Use the best local address for ARP requests. This prevents nodes from announcing the VIP on all interfaces, which would cause ARP conflicts.
- `arp_ignore=1`: Only respond to ARP requests for addresses configured on the incoming interface. This prevents multiple nodes from responding to ARP for the same VIP.
- `rp_filter=2`: Loose reverse path filtering. Instead of requiring packets to arrive on the interface closest to the source, it only requires that a route to the source exists somewhere.

## Per-Interface Configuration

Sometimes you only want accept routing on specific interfaces rather than globally. You can set sysctls per-interface:

```yaml
# Enable accept routing only on the external interface
machine:
  sysctls:
    net.ipv4.conf.eth0.accept_local: "1"
    net.ipv4.conf.eth0.rp_filter: "0"

    # Keep strict filtering on the management interface
    net.ipv4.conf.eth1.rp_filter: "1"
```

This gives you fine-grained control over which interfaces accept routed traffic while keeping tighter security on interfaces that do not need it.

## IPv6 Accept Routing

If your cluster uses IPv6 (dual-stack or IPv6-only), you also need to configure the IPv6 equivalents:

```yaml
# IPv6 accept routing configuration
machine:
  sysctls:
    # IPv4 settings
    net.ipv4.conf.all.accept_local: "1"
    net.ipv4.conf.all.rp_filter: "0"

    # IPv6 settings
    net.ipv6.conf.all.accept_ra: "2"
    net.ipv6.conf.all.forwarding: "1"
```

IPv6 does not have an exact equivalent of `accept_local`, but ensuring `accept_ra` and `forwarding` are configured correctly covers most routing scenarios.

## Interaction with CNI Plugins

Your CNI plugin might also need specific accept routing settings. For example, Cilium manages its own sysctl settings but may conflict with manually configured values:

```yaml
# Settings compatible with Cilium
machine:
  sysctls:
    net.ipv4.conf.all.rp_filter: "0"
    net.ipv4.conf.default.rp_filter: "0"
    # Cilium manages forwarding itself, but it doesn't hurt to set it
    net.ipv4.ip_forward: "1"
    net.ipv6.conf.all.forwarding: "1"
```

If you are using Calico, the recommended settings differ:

```yaml
# Settings compatible with Calico
machine:
  sysctls:
    net.ipv4.conf.all.rp_filter: "1"
    net.ipv4.conf.default.rp_filter: "1"
    net.ipv4.ip_forward: "1"
```

Always check your CNI plugin's documentation for the recommended sysctl values.

## Applying the Configuration

Apply the sysctl changes to your nodes:

```bash
# Apply config with accept routing settings
talosctl apply-config \
  --nodes 192.168.1.100 \
  --file worker.yaml
```

Some sysctl changes take effect immediately, while others require a reboot:

```bash
# Check if reboot is needed
talosctl get machinestatus --nodes 192.168.1.100

# Reboot if necessary
talosctl reboot --nodes 192.168.1.100
```

## Verifying the Configuration

After applying, verify that the sysctls are set correctly:

```bash
# Verify accept_local is enabled
talosctl read --nodes 192.168.1.100 /proc/sys/net/ipv4/conf/all/accept_local

# Verify rp_filter setting
talosctl read --nodes 192.168.1.100 /proc/sys/net/ipv4/conf/all/rp_filter

# Verify arp_announce
talosctl read --nodes 192.168.1.100 /proc/sys/net/ipv4/conf/all/arp_announce
```

Each command should return the value you configured.

## Testing Accept Routing

To test that accept routing is working, you can deploy a service with MetalLB and verify that traffic flows correctly:

```bash
# Deploy a test service with a LoadBalancer type
kubectl create deployment nginx --image=nginx
kubectl expose deployment nginx --type=LoadBalancer --port=80

# Check the assigned external IP
kubectl get svc nginx

# Test connectivity from outside the cluster
curl http://<external-ip>
```

If the service responds, accept routing is working correctly. If it times out, check your sysctl settings and make sure MetalLB is configured to use the correct address pool.

## Security Implications

Enabling accept routing and disabling reverse path filtering does reduce your network-level security posture slightly. Reverse path filtering helps prevent IP spoofing attacks by dropping packets that arrive on an interface that would not be used to route replies back to the source. By disabling it, you allow a broader range of traffic patterns, which is necessary for load balancing but also opens the door for spoofed packets.

Mitigate this risk by ensuring your network perimeter has proper spoofing protection (like BCP38/uRPF at your border routers) and by using Kubernetes NetworkPolicies to restrict pod-to-pod traffic. The trade-off between functionality and security is worth it when you need features like MetalLB, but understand what you are giving up.

Accept routing in Talos Linux is a straightforward sysctl configuration, but getting it right requires understanding how it interacts with your specific load balancing and CNI setup. Configure it based on your actual needs and always test thoroughly before rolling it out to production.
