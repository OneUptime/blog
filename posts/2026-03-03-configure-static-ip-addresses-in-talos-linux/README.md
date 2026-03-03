# How to Configure Static IP Addresses in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Networking, Static IP, Kubernetes, Infrastructure

Description: A hands-on guide to configuring static IP addresses in Talos Linux for stable and predictable network configurations.

---

Static IP addresses are essential for Kubernetes control plane nodes. If a control plane node gets a different IP address after a reboot, the cluster can break - other nodes cannot find the API server, etcd members lose connectivity, and certificates become invalid. While DHCP reservations can sometimes work, static IPs configured directly on the node are more reliable and do not depend on an external DHCP server.

This post walks through how to configure static IP addresses in Talos Linux, covering single and multiple interfaces, IPv4 and IPv6, and the common pitfalls to avoid.

## Basic Static IP Configuration

Static IPs are configured in the `machine.network.interfaces` section of the Talos machine config:

```yaml
# machine-config.yaml
machine:
  network:
    hostname: cp-node-1
    interfaces:
      - interface: eth0
        addresses:
          - 192.168.1.10/24
        routes:
          - network: 0.0.0.0/0
            gateway: 192.168.1.1
    nameservers:
      - 8.8.8.8
      - 8.8.4.4
```

Let me break down each part:

- **interface** - The network interface name (like `eth0`, `eno1`, or `enp0s3`)
- **addresses** - A list of IP addresses in CIDR notation. The `/24` suffix is the subnet mask.
- **routes** - Static routes. The `0.0.0.0/0` network with a gateway is the default route.
- **nameservers** - DNS servers, configured at the machine level.

## Finding Interface Names

Before configuring static IPs, you need to know the interface names on your machine. If Talos is already running (even in maintenance mode):

```bash
# List network interfaces
talosctl get links --nodes 192.168.1.10

# Get detailed interface information
talosctl get addresses --nodes 192.168.1.10
```

Common interface naming patterns:
- `eth0`, `eth1` - Traditional naming (when `net.ifnames=0` kernel argument is used)
- `eno1`, `eno2` - Onboard NICs
- `enp0s3`, `enp0s8` - PCI-based naming (common in VMs)
- `ens3`, `ens4` - Slot-based naming (common in cloud VMs)

## Applying Static IP During Initial Setup

When setting up a new Talos node, you typically boot from an ISO or PXE in maintenance mode. The node gets a DHCP address initially, which you use to apply the configuration with static IP settings:

```bash
# Generate the config
talosctl gen config my-cluster https://192.168.1.10:6443 \
  --output-dir ./configs

# Create a patch for the static IP
cat > static-ip-patch.yaml << 'EOF'
machine:
  network:
    hostname: cp-node-1
    interfaces:
      - interface: eth0
        addresses:
          - 192.168.1.10/24
        routes:
          - network: 0.0.0.0/0
            gateway: 192.168.1.1
    nameservers:
      - 8.8.8.8
      - 8.8.4.4
EOF

# Apply the config to the node (using its current DHCP address)
talosctl apply-config --insecure --nodes 192.168.1.50 \
  --file ./configs/controlplane.yaml \
  --config-patch @static-ip-patch.yaml
```

After applying, the node will switch from its DHCP address to the static IP. You will lose connectivity briefly and need to connect to the new address.

## IPv6 Configuration

Talos supports IPv6 static addresses as well:

```yaml
machine:
  network:
    interfaces:
      - interface: eth0
        addresses:
          - 192.168.1.10/24
          - fd00::10/64
        routes:
          - network: 0.0.0.0/0
            gateway: 192.168.1.1
          - network: ::/0
            gateway: fd00::1
```

You can run dual-stack (both IPv4 and IPv6) by including addresses from both families on the same interface.

## Multiple Interfaces

Servers often have multiple network interfaces. You might have one for management traffic and another for data or storage traffic:

```yaml
machine:
  network:
    hostname: worker-node-1
    interfaces:
      # Management interface
      - interface: eth0
        addresses:
          - 192.168.1.20/24
        routes:
          - network: 0.0.0.0/0
            gateway: 192.168.1.1
      # Storage network interface
      - interface: eth1
        addresses:
          - 10.10.0.20/24
        routes:
          - network: 10.10.0.0/16
            gateway: 10.10.0.1
    nameservers:
      - 8.8.8.8
```

Only one interface should have the default route (`0.0.0.0/0`). Other interfaces should only have routes for their specific subnets.

## Using Device Selectors Instead of Interface Names

Interface names can change between reboots or when hardware is added. Talos supports device selectors that match interfaces by their properties instead of names:

```yaml
machine:
  network:
    interfaces:
      - deviceSelector:
          busPath: "0000:01:00.0"
        addresses:
          - 192.168.1.10/24
        routes:
          - network: 0.0.0.0/0
            gateway: 192.168.1.1
```

You can select devices by:
- `busPath` - PCI bus path
- `hardwareAddr` - MAC address
- `driver` - Kernel driver name
- `physical` - Only match physical interfaces (not virtual ones)

Using the MAC address is a reliable way to identify interfaces across reboots:

```yaml
machine:
  network:
    interfaces:
      - deviceSelector:
          hardwareAddr: "aa:bb:cc:dd:ee:ff"
        addresses:
          - 192.168.1.10/24
        routes:
          - network: 0.0.0.0/0
            gateway: 192.168.1.1
```

## Per-Node Static IP Configuration

Each node in your cluster needs its own IP address, so you need per-node configuration. There are several ways to handle this:

### Separate Patch Files Per Node

```bash
# Apply config for each node with its specific IP
talosctl apply-config --nodes 192.168.1.50 \
  --file controlplane.yaml \
  --config-patch @patches/node-cp1.yaml

talosctl apply-config --nodes 192.168.1.51 \
  --file controlplane.yaml \
  --config-patch @patches/node-cp2.yaml
```

### Inline Patches

```bash
# Apply with inline patch for each node
talosctl apply-config --nodes 192.168.1.50 \
  --file controlplane.yaml \
  --config-patch '{"machine": {"network": {"hostname": "cp-1", "interfaces": [{"interface": "eth0", "addresses": ["192.168.1.10/24"], "routes": [{"network": "0.0.0.0/0", "gateway": "192.168.1.1"}]}]}}}'
```

## Verifying the Configuration

After applying static IP configuration, verify that it took effect:

```bash
# Check assigned addresses
talosctl get addresses --nodes 192.168.1.10

# Check routing table
talosctl get routes --nodes 192.168.1.10

# Check DNS resolution
talosctl get resolvers --nodes 192.168.1.10

# Test connectivity
talosctl ping 8.8.8.8 --nodes 192.168.1.10
```

## Common Mistakes

**Forgetting the subnet mask** - Writing `192.168.1.10` instead of `192.168.1.10/24`. Without the CIDR notation, Talos does not know the subnet size.

**Missing default route** - If you do not specify a default route (`0.0.0.0/0`), the node cannot reach anything outside its local subnet, including the internet and often other cluster nodes.

**Wrong gateway** - The gateway must be on the same subnet as the interface address. If your address is `192.168.1.10/24`, the gateway must be in the `192.168.1.0/24` range.

**Duplicate IPs** - Make sure no two nodes have the same IP address. This sounds obvious, but it is easy to copy-paste a configuration and forget to change the address.

**DNS configuration** - Forgetting nameservers means the node cannot resolve hostnames. This breaks image pulling, NTP synchronization, and many other things.

## IP Address Planning for Clusters

Before deploying your cluster, plan your IP address allocation:

```text
# Example IP plan for a small cluster
192.168.1.1   - Gateway
192.168.1.2   - DNS server
192.168.1.10  - Control plane node 1
192.168.1.11  - Control plane node 2
192.168.1.12  - Control plane node 3
192.168.1.20  - Worker node 1
192.168.1.21  - Worker node 2
192.168.1.22  - Worker node 3
192.168.1.100 - Virtual IP for API server (if using VIP)
```

Document this plan and keep it updated. In larger deployments, use a proper IPAM (IP Address Management) tool.

## Changing Static IPs on Running Nodes

If you need to change a node's IP address after the cluster is running:

```bash
# Update the network configuration
talosctl patch machineconfig --nodes 192.168.1.10 \
  --patch '{"machine": {"network": {"interfaces": [{"interface": "eth0", "addresses": ["192.168.1.15/24"], "routes": [{"network": "0.0.0.0/0", "gateway": "192.168.1.1"}]}]}}}'
```

Be aware that changing the IP of a control plane node requires updating the endpoint references in other nodes' configurations and may require certificate regeneration if the old IP was in the certificate SANs.

## Conclusion

Static IP configuration in Talos Linux is straightforward once you understand the YAML structure. For control plane nodes, static IPs are practically required. For worker nodes, they are strongly recommended in production. Use device selectors instead of interface names when possible for reliability across reboots. Plan your IP address space before deploying, document it, and use per-node patch files to keep each node's configuration clean and auditable. Take the time to verify connectivity after applying the configuration, and you will have a solid network foundation for your cluster.
