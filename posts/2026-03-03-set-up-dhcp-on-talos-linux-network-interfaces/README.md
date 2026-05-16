# How to Set Up DHCP on Talos Linux Network Interfaces

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, DHCP, Networking, Kubernetes, Configuration

Description: Learn how to configure DHCP on Talos Linux network interfaces for automatic IP address assignment and network configuration.

---

DHCP (Dynamic Host Configuration Protocol) is the easiest way to get a Talos Linux node connected to the network. Instead of manually assigning IP addresses, subnet masks, gateways, and DNS servers, the node asks a DHCP server on the network for all of this information automatically. While static IPs are preferred for control plane nodes, DHCP works well for worker nodes, development environments, and initial setup.

This post explains how to configure DHCP in Talos Linux, how to control its behavior, and when DHCP is (and is not) the right choice.

## Default DHCP Behavior

When Talos Linux boots without any network configuration, it enables DHCP on all discovered network interfaces by default. This is why you can boot a Talos ISO and immediately connect to the node - it grabs a DHCP address automatically.

Once you apply a machine configuration, the default behavior changes. If you specify interface configuration, DHCP is only enabled on interfaces where you explicitly set it.

## Enabling DHCP on an Interface

To explicitly configure DHCP on a specific interface:

```yaml
# dhcp-eth0.yaml
apiVersion: v1alpha1
kind: DHCPv4Config
name: eth0
```

That is the minimal configuration. When a `DHCPv4Config` document is present for a link, the interface will:
- Request an IP address from the DHCP server
- Accept the gateway, DNS servers, NTP servers, and other options provided by the server
- Renew the lease automatically before it expires

## DHCP with Specific Options

You can configure more granular DHCP behavior using fields on the DHCP configuration document:

```yaml
apiVersion: v1alpha1
kind: DHCPv4Config
name: eth0
# Set a specific route metric for DHCP-assigned routes
routeMetric: 100
```

The `routeMetric` option is particularly useful when you have multiple interfaces with DHCP. The route metric determines which interface is preferred for routing - lower metrics are preferred:

```yaml
# Primary interface - lower metric means preferred
apiVersion: v1alpha1
kind: DHCPv4Config
name: eth0
routeMetric: 100
---
# Secondary interface - higher metric as fallback
apiVersion: v1alpha1
kind: DHCPv4Config
name: eth1
routeMetric: 200
```

## DHCP with Overrides

Sometimes you want DHCP for the IP address but want to override certain settings like DNS servers or the hostname. You can combine DHCP with static settings:

```yaml
apiVersion: v1alpha1
kind: HostnameConfig
hostname: worker-node-1
---
apiVersion: v1alpha1
kind: DHCPv4Config
name: eth0
---
# Override DNS servers from DHCP
apiVersion: v1alpha1
kind: ResolverConfig
nameservers:
  - address: 10.0.0.2
  - address: 10.0.0.3
```

In this configuration, the interface gets its IP address and gateway from DHCP, but the DNS servers and hostname are set statically. The static settings take priority over whatever the DHCP server provides.

## Dual-Stack DHCP (IPv4 and IPv6)

Talos supports DHCP for both IPv4 and IPv6:

```yaml
apiVersion: v1alpha1
kind: DHCPv4Config
name: eth0
---
apiVersion: v1alpha1
kind: DHCPv6Config
name: eth0
```

With a `DHCPv6Config` document, the interface will attempt DHCPv6 in addition to regular DHCPv4. Note that IPv6 autoconfiguration (SLAAC) may also be active depending on the network's router advertisements.

## DHCP for Worker Nodes

DHCP is commonly used for worker nodes in environments where the DHCP server provides consistent leases. Here is a typical worker node configuration:

```yaml
version: v1alpha1
machine:
  type: worker
  install:
    disk: /dev/sda
    image: ghcr.io/siderolabs/installer:v1.13.0
cluster:
  controlPlane:
    endpoint: https://192.168.1.100:6443
---
apiVersion: v1alpha1
kind: DHCPv4Config
name: eth0
routeMetric: 100
```

The worker gets its network configuration from DHCP but has a static reference to the control plane endpoint. This works because the control plane endpoint should always be at a known, stable address.

## DHCP Reservations vs. Static IPs

For nodes that need stable IP addresses (especially control plane nodes), you have two options: DHCP reservations and static IPs.

**DHCP reservations** are configured on the DHCP server to always assign the same IP to a specific MAC address:

```yaml
# On the Talos side, this is just regular DHCP
apiVersion: v1alpha1
kind: DHCPv4Config
name: eth0
```

The DHCP server is configured to reserve an IP for the node's MAC address. This works but adds a dependency on the DHCP server. If the DHCP server is down during a node reboot, the node cannot get its address.

**Static IPs** are configured directly in the Talos machine config and do not depend on any external service. For control plane nodes, static IPs are the recommended approach.

## Troubleshooting DHCP

If DHCP is not working, check these common issues:

### No DHCP Server on the Network

```bash
# Check if the interface has an address
talosctl get addresses --nodes <node-ip>

# Check DHCP-related logs
talosctl logs networkd --nodes <node-ip>
```

If there is no DHCP server, the interface will not get an address. You will need to either set up a DHCP server or switch to static IP configuration.

### Wrong Interface Name

```bash
# List available interfaces
talosctl get links --nodes <node-ip>
```

Make sure the interface name in your config matches an actual interface on the machine. Interface names vary between hardware and virtualization platforms.

### DHCP Lease Conflicts

If two nodes get the same IP from DHCP, you have a DHCP server configuration issue. Check the DHCP server's lease table and address pool.

### VLAN-Tagged Interfaces

DHCP might not work on VLAN-tagged interfaces if the DHCP server is not configured for that VLAN:

```yaml
# DHCP on a VLAN interface
apiVersion: v1alpha1
kind: VLANConfig
name: eth0.100
parent: eth0
vlanID: 100
---
apiVersion: v1alpha1
kind: DHCPv4Config
name: eth0.100
```

## Monitoring DHCP Leases

You can check the current DHCP lease information on a Talos node:

```bash
# View current network addresses (shows DHCP-assigned addresses)
talosctl get addresses --nodes 192.168.1.10

# View current routes (shows DHCP-assigned routes)
talosctl get routes --nodes 192.168.1.10
```

## Migrating from DHCP to Static IP

If you started with DHCP and want to switch to a static IP (a common progression for production clusters):

```bash
# Patch the machine config to replace DHCP with static IP
talosctl patch machineconfig --nodes 192.168.1.10 \
  --patch @static-eth0.yaml
```

Where `static-eth0.yaml` contains:

```yaml
apiVersion: v1alpha1
kind: DHCPv4Config
name: eth0
$patch: delete
---
apiVersion: v1alpha1
kind: LinkConfig
name: eth0
addresses:
  - address: 192.168.1.10/24
routes:
  - gateway: 192.168.1.1
```

This changes the interface from DHCP to a static configuration. The node will keep the same IP if you specify the address it currently has.

## DHCP in Cloud Environments

In cloud environments like AWS, Azure, or GCP, DHCP is typically the only option. The cloud provider's DHCP server assigns addresses from the VPC or virtual network:

```yaml
# Cloud VM configuration - DHCP is standard
version: v1alpha1
machine:
  install:
    disk: /dev/xvda
    image: ghcr.io/siderolabs/installer:v1.13.0
---
apiVersion: v1alpha1
kind: DHCPv4Config
name: eth0
```

In these environments, do not fight the DHCP setup. The cloud provider manages the IP assignment, and the addresses are typically stable for the lifetime of the VM.

## Performance Considerations

DHCP adds a small amount of time to the boot process since the node needs to complete the DHCP handshake before the network is fully configured. This is typically 1 to 5 seconds, which is negligible in most scenarios.

However, if the DHCP server is slow or unreachable, the timeout can delay boot significantly. Talos will retry DHCP with increasing backoff intervals. On a network with no DHCP server at all, this can add 30 seconds or more to the boot time before the interface gives up.

## Best Practices

Use DHCP for development and testing environments where convenience is more important than stability. Use static IPs for production control plane nodes. For production workers, either approach works - DHCP with reservations or static IPs.

If you use DHCP, make sure your DHCP server is highly available. A single DHCP server is a single point of failure for every node that depends on it.

Always configure the control plane endpoint as a static address, even if worker nodes use DHCP. The control plane endpoint is what every node uses to reach the Kubernetes API, and it must be reachable at a known address.

## Conclusion

DHCP in Talos Linux is simple to configure and works out of the box for most networks. Add a `DHCPv4Config` or `DHCPv6Config` document for the link, optionally configure DHCP options such as route metrics, and let the DHCP server handle the rest. For more control, combine DHCP with static overrides for DNS and hostname. Just remember that DHCP introduces a dependency on an external service, so plan accordingly for production environments where node availability is critical.
