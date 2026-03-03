# How to Set Up a Network Bridge in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Network Bridge, Networking, Kubernetes, Virtualization

Description: Learn how to configure a network bridge in Talos Linux for connecting virtual machines, containers, and network segments together.

---

A network bridge in Linux connects two or more network segments at the data link layer, making them behave as a single network. While bridges are most commonly associated with virtualization (connecting VMs to the host network), they also have uses in container networking and in scenarios where you need to aggregate multiple interfaces into a single broadcast domain without bonding.

Talos Linux supports bridge configuration through the machine config. This post covers how to set up bridges, common use cases, and the configuration options available.

## What Is a Network Bridge

Think of a network bridge as a virtual network switch inside your server. Physical interfaces connected to the bridge become ports on this virtual switch. Any device connected to one port can communicate with devices on other ports, just like they were all plugged into the same physical switch.

Bridges differ from bonds in an important way. A bond combines multiple links for redundancy or bandwidth - the member interfaces all carry the same traffic. A bridge connects different network segments so devices on those segments can talk to each other.

## Basic Bridge Configuration

Here is how to create a simple bridge in Talos Linux:

```yaml
# machine-config.yaml
machine:
  network:
    interfaces:
      # Define the bridge interface
      - interface: br0
        bridge:
          stp:
            enabled: true
          interfaces:
            - eth0
        addresses:
          - 192.168.1.10/24
        routes:
          - network: 0.0.0.0/0
            gateway: 192.168.1.1
    nameservers:
      - 8.8.8.8
```

This creates a bridge `br0` with `eth0` as a member port. The bridge gets an IP address, and `eth0` becomes a port on the bridge (it no longer has its own IP).

## Bridge with Multiple Interfaces

You can add multiple physical interfaces to a bridge:

```yaml
machine:
  network:
    interfaces:
      - interface: br0
        bridge:
          stp:
            enabled: true
          interfaces:
            - eth0
            - eth1
        addresses:
          - 192.168.1.10/24
        routes:
          - network: 0.0.0.0/0
            gateway: 192.168.1.1
```

With two interfaces on the bridge, devices connected to either port can communicate. The STP (Spanning Tree Protocol) configuration prevents network loops that would occur if the two interfaces are connected to the same switch or network segment.

## Spanning Tree Protocol (STP)

STP prevents network loops, which can cause broadcast storms and bring down your network. When you bridge multiple interfaces that might create a loop, STP is essential:

```yaml
machine:
  network:
    interfaces:
      - interface: br0
        bridge:
          stp:
            enabled: true
          interfaces:
            - eth0
            - eth1
```

If you are sure there are no loops (for example, a bridge with a single physical interface used for VM connectivity), you can disable STP to reduce the bridge's convergence time:

```yaml
machine:
  network:
    interfaces:
      - interface: br0
        bridge:
          stp:
            enabled: false
          interfaces:
            - eth0
```

With STP disabled, the bridge starts forwarding frames immediately. With STP enabled, there is a 30-second delay while STP converges.

## Use Case - VM Networking

The most common use case for bridges is connecting virtual machines to the physical network. If you run VMs on Talos nodes (using KubeVirt or similar), the VM's virtual NIC connects to the bridge, giving it direct access to the physical network:

```yaml
machine:
  network:
    interfaces:
      # Bridge for VM connectivity
      - interface: br0
        bridge:
          stp:
            enabled: false
          interfaces:
            - eth0
        addresses:
          - 192.168.1.10/24
        routes:
          - network: 0.0.0.0/0
            gateway: 192.168.1.1
      # Keep a separate interface for management
      - interface: eth1
        addresses:
          - 10.0.0.10/24
```

In this setup, `eth0` is bridged for VM traffic, and `eth1` is kept separate for node management. This way, even if something goes wrong with the bridge, you can still manage the node through `eth1`.

## Use Case - Container Networking

Some container networking plugins use bridges to connect container network namespaces to the host network. While Kubernetes typically handles this through CNI plugins, understanding the bridge setup helps when troubleshooting.

## Bridge with DHCP

You can use DHCP on a bridge interface:

```yaml
machine:
  network:
    interfaces:
      - interface: br0
        bridge:
          stp:
            enabled: true
          interfaces:
            - eth0
        dhcp: true
```

The bridge itself acts as the DHCP client. The physical interface (`eth0`) does not have its own address - all addressing happens on the bridge.

## Bridge with VLANs

You can add VLAN interfaces on top of a bridge:

```yaml
machine:
  network:
    interfaces:
      - interface: br0
        bridge:
          stp:
            enabled: true
          interfaces:
            - eth0
        vlans:
          - vlanId: 100
            addresses:
              - 10.100.0.10/24
          - vlanId: 200
            addresses:
              - 10.200.0.10/24
```

Or you can bridge VLAN interfaces themselves, though this is a more advanced configuration.

## Bridge Options

Talos supports several bridge configuration options:

```yaml
machine:
  network:
    interfaces:
      - interface: br0
        bridge:
          stp:
            enabled: true
          interfaces:
            - eth0
            - eth1
        # Set MTU for the bridge
        mtu: 9000
        addresses:
          - 192.168.1.10/24
```

The MTU setting applies to the bridge interface. All member interfaces should have the same or higher MTU for consistent behavior.

## Applying the Configuration

For new clusters:

```bash
# Generate config with bridge patch
talosctl gen config my-cluster https://192.168.1.100:6443 \
  --config-patch @bridge-config.yaml
```

For existing nodes:

```bash
# Apply bridge configuration to a running node
talosctl apply-config --nodes 192.168.1.10 \
  --file controlplane.yaml \
  --config-patch @bridge-config.yaml
```

Changing from a regular interface to a bridge on a running node will briefly disrupt connectivity. Have out-of-band access ready.

## Verifying Bridge Configuration

After applying the configuration:

```bash
# Check that the bridge interface exists
talosctl get links --nodes 192.168.1.10

# Verify the bridge has an address
talosctl get addresses --nodes 192.168.1.10

# Check routes
talosctl get routes --nodes 192.168.1.10
```

You should see `br0` in the link list with the member interfaces showing as part of the bridge.

## Bridge vs. Bond - When to Use Which

**Use a bond when:**
- You want redundancy (failover between links)
- You want increased bandwidth between the same endpoints
- Both interfaces connect to the same network
- You want your server to have a single identity on the network

**Use a bridge when:**
- You need to connect VMs or containers to the physical network
- You want to create a virtual switch inside the server
- You need to connect different network segments
- Different interfaces serve different traffic with shared access

In many production setups, you might use both: bond two physical interfaces for redundancy, then bridge the bond for VM connectivity:

```yaml
machine:
  network:
    interfaces:
      # First, create a bond for redundancy
      - interface: bond0
        bond:
          mode: active-backup
          interfaces:
            - eth0
            - eth1
      # Then bridge the bond for VM connectivity
      - interface: br0
        bridge:
          stp:
            enabled: false
          interfaces:
            - bond0
        addresses:
          - 192.168.1.10/24
        routes:
          - network: 0.0.0.0/0
            gateway: 192.168.1.1
```

## Troubleshooting

**No connectivity after creating bridge** - The most common mistake is keeping an IP address on the physical interface after adding it to a bridge. The IP should be on the bridge, not on the member interface.

**Slow network after bridge creation** - If STP is enabled, the bridge takes about 30 seconds to start forwarding after creation. This is normal STP behavior. Disable STP if you do not need loop prevention.

**Bridge not forwarding traffic** - Check that the member interfaces are up and physically connected. An interface with no link will not forward traffic through the bridge.

**Duplicate frames** - If you see duplicate packets, check for network loops. Enable STP to prevent loops, or verify your physical cabling.

## Security Considerations

Bridges operate at Layer 2, which means they forward all Ethernet frames between member interfaces. This includes broadcast traffic, ARP requests, and any other Layer 2 protocols. Be mindful of what traffic can reach the bridge ports, especially in multi-tenant environments.

If you bridge a physical interface that connects to an untrusted network, anything on that network can potentially reach other devices on the bridge. Use VLANs or firewall rules to restrict access as needed.

## Conclusion

Network bridges in Talos Linux are configured through the same declarative machine config as everything else. They are most useful for VM networking and for connecting multiple network segments. The configuration is straightforward - define the bridge, add member interfaces, and assign addresses to the bridge itself. Pay attention to STP settings (enable it when there is loop risk, disable it when there is not), and always test after applying changes. For the most robust setup, combine bonding with bridging to get both redundancy and flexible connectivity.
