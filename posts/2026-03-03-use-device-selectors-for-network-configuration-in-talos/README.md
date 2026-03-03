# How to Use Device Selectors for Network Configuration in Talos

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Device Selectors, Networking, Configuration, Infrastructure

Description: Learn how to use device selectors in Talos Linux for reliable network interface identification that survives reboots and hardware changes.

---

One of the trickiest parts of network configuration is making sure your settings end up on the right interface. Interface names like `eth0` or `enp3s0f0` can change when you add hardware, update firmware, or even between kernel versions. Device selectors in Talos Linux solve this problem by letting you identify network interfaces based on their physical properties rather than their names.

This post covers how device selectors work, the available matching criteria, and practical patterns for using them in production deployments.

## The Problem Device Selectors Solve

Consider this scenario: you have a server with two NICs. You configure `eth0` for management and `eth1` for data. You reboot, and the kernel assigns the names in reverse order. Now your management traffic is going out the data port, and vice versa. In the best case, nothing works. In the worst case, management traffic ends up on an unprotected network.

Device selectors prevent this by matching interfaces on properties that do not change:

```yaml
# Instead of this (name-based, fragile)
machine:
  network:
    interfaces:
      - interface: eth0
        addresses:
          - 192.168.1.10/24

# Use this (selector-based, stable)
machine:
  network:
    interfaces:
      - deviceSelector:
          hardwareAddr: "aa:bb:cc:dd:ee:ff"
        addresses:
          - 192.168.1.10/24
```

## Available Selector Criteria

Talos Linux supports several properties for device selection:

### Hardware Address (MAC Address)

The most reliable way to identify a specific NIC:

```yaml
deviceSelector:
  hardwareAddr: "aa:bb:cc:dd:ee:ff"
```

MAC addresses are globally unique (in theory) and burned into the NIC. They do not change with reboots, PCI slot changes, or driver updates. This is the recommended selector for most use cases.

### Bus Path

Identifies the NIC by its position on the PCI bus:

```yaml
deviceSelector:
  busPath: "0000:03:00.0"
```

The bus path is stable as long as the NIC stays in the same physical slot. This is useful when you care about which physical slot is being used rather than which specific NIC is installed.

### Kernel Driver

Matches interfaces based on their kernel driver:

```yaml
deviceSelector:
  driver: "igb"
```

This selects all interfaces using the Intel igb driver. Useful when you have different types of NICs and want to configure all interfaces of a certain type the same way. Be careful though - if you have multiple NICs with the same driver, this matches all of them.

### Physical Interface

Filters for physical (hardware) interfaces only, excluding virtual interfaces:

```yaml
deviceSelector:
  physical: true
```

This is useful as an additional filter to avoid accidentally matching virtual interfaces like bridges, bonds, or VLANs.

## Combining Selectors

You can combine multiple selectors to narrow down the match:

```yaml
deviceSelector:
  driver: "ixgbe"
  busPath: "0000:03:00.0"
```

Both criteria must match for the interface to be selected. This is useful when a single criterion is not specific enough.

## Practical Examples

### Two-NIC Server with MAC-Based Selection

```yaml
machine:
  network:
    interfaces:
      # Management NIC - identified by MAC
      - deviceSelector:
          hardwareAddr: "aa:bb:cc:11:22:33"
        addresses:
          - 192.168.1.10/24
        routes:
          - network: 0.0.0.0/0
            gateway: 192.168.1.1
      # Data NIC - identified by MAC
      - deviceSelector:
          hardwareAddr: "aa:bb:cc:44:55:66"
        addresses:
          - 10.10.0.10/24
    nameservers:
      - 8.8.8.8
```

### Selecting by PCI Slot for Homogeneous Hardware

When all your servers have the same hardware configuration, the bus path is consistent across machines:

```yaml
machine:
  network:
    interfaces:
      # Onboard NIC (always at this bus path)
      - deviceSelector:
          busPath: "0000:00:1f.6"
        addresses:
          - 192.168.1.10/24
        routes:
          - network: 0.0.0.0/0
            gateway: 192.168.1.1
      # Add-in card first port
      - deviceSelector:
          busPath: "0000:03:00.0"
        addresses:
          - 10.10.0.10/24
```

### Bonding with Device Selectors

Device selectors work with bonding too:

```yaml
machine:
  network:
    interfaces:
      - interface: bond0
        bond:
          mode: 802.3ad
          deviceSelectors:
            - hardwareAddr: "aa:bb:cc:11:22:33"
            - hardwareAddr: "aa:bb:cc:44:55:66"
        addresses:
          - 192.168.1.10/24
        routes:
          - network: 0.0.0.0/0
            gateway: 192.168.1.1
```

Notice the difference in syntax. For bonded interfaces, you use `deviceSelectors` (plural) inside the `bond` section, providing a list of selectors that identify each member interface.

### Select All Physical Interfaces of a Certain Type

```yaml
machine:
  network:
    interfaces:
      - deviceSelector:
          driver: "mlx5_core"
          physical: true
        dhcp: true
```

This matches all physical Mellanox ConnectX interfaces. Useful for bulk configuration when all interfaces of a type should have the same settings.

## Finding Device Properties

To use device selectors, you first need to know the properties of your interfaces. On a running Talos node:

```bash
# List all interfaces with their properties
talosctl get links --nodes 192.168.1.10

# Get detailed hardware information
talosctl get links --nodes 192.168.1.10 -o yaml
```

The output includes MAC addresses, driver names, bus paths, and other properties you can use in selectors.

If the node is in maintenance mode during initial setup:

```bash
talosctl get links --nodes <maintenance-ip> --insecure
```

## Device Selectors vs. Interface Names

Here is a comparison to help you decide:

**Use interface names when:**
- The environment is simple (single NIC, virtual machine)
- Interface names are guaranteed stable (cloud VMs, consistent hypervisor)
- You are doing quick testing or development

**Use device selectors when:**
- Running on bare metal with multiple NICs
- Interface names might change between reboots
- You are deploying across heterogeneous hardware
- Reliability is critical (production deployments)
- You are using bonding and need to ensure the right interfaces are bonded

## Selector Matching Rules

Some important rules about how selectors work:

**Single match expected** - When using `deviceSelector` for a regular interface (not bonding), it should match exactly one interface. If it matches multiple interfaces, the first match is used, which might not be what you expect.

**No match is an error** - If the selector does not match any interface, the configuration for that interface is skipped. The node may boot without that network configuration, which can cause connectivity issues.

**Selectors are evaluated at boot** - Device matching happens during network initialization. If hardware is added after boot (hot-plug), it is not automatically matched.

## Template Configurations with Selectors

Device selectors are particularly powerful for template-based deployments. You can create a single configuration template that works across all servers with the same hardware:

```yaml
# Template for Dell R740 servers
# All R740s have onboard i350 at bus 0000:00:1f.6
# and add-in X710 at bus 0000:03:00.0
machine:
  network:
    interfaces:
      - deviceSelector:
          busPath: "0000:00:1f.6"
        dhcp: true
        dhcpOptions:
          routeMetric: 100
      - deviceSelector:
          busPath: "0000:03:00.0"
        addresses:
          - 10.10.0.10/24  # This needs to be per-node
```

The bus-path based selection works across all servers of the same model because the PCI layout is identical.

## Migrating from Interface Names to Device Selectors

If you have an existing cluster using interface names, you can migrate to device selectors:

1. Identify the MAC addresses or bus paths of each interface on each node
2. Create patch files with device selectors
3. Apply the changes one node at a time

```bash
# Get interface details from a running node
talosctl get links --nodes 192.168.1.10 -o yaml

# Apply the updated config with device selectors
talosctl apply-config --nodes 192.168.1.10 \
  --file controlplane.yaml \
  --config-patch @device-selector-patch.yaml
```

Test each node after migration before moving to the next one.

## Troubleshooting

**Interface not found** - Check that the selector properties match what the node actually has. Use `talosctl get links` to see the real properties. Typos in MAC addresses are a common cause.

**Wrong interface selected** - If a driver-based selector matches multiple interfaces, the selection might not be what you intended. Add more criteria to narrow the match.

**Configuration not applied** - If the selector matches no interfaces, Talos skips that configuration silently. Check the logs for any network-related warnings.

```bash
# Check network service logs
talosctl logs networkd --nodes 192.168.1.10
```

## Conclusion

Device selectors are the recommended way to identify network interfaces in Talos Linux production deployments. They decouple your configuration from interface names, which can change unpredictably. MAC addresses are the most reliable selector for targeting specific NICs, while bus paths work well for homogeneous hardware fleets. Take the time to catalog your hardware properties before deploying, and your network configuration will be rock-solid across reboots, upgrades, and hardware replacements.
