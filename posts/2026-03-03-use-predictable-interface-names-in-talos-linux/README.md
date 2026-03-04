# How to Use Predictable Interface Names in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Network Interfaces, Naming, Kubernetes, System Administration

Description: Understand predictable network interface naming in Talos Linux and learn when to use or disable it for consistent configurations.

---

Network interface naming in Linux used to be simple - the first Ethernet adapter was `eth0`, the second was `eth1`, and so on. The problem was that this numbering was not stable. Add a NIC, move a NIC to a different slot, or update the kernel, and suddenly `eth0` might become `eth1`. This caused all kinds of headaches with static configurations, firewall rules, and monitoring setups.

Predictable interface naming solves this by assigning names based on the physical location of the hardware - PCI bus path, firmware index, or MAC address. Talos Linux uses predictable naming by default, and this post explains how it works, when it helps, and how to work with (or around) it.

## How Predictable Naming Works

Instead of sequential names like `eth0`, predictable naming uses schemes based on hardware properties. The naming priority in Linux (through systemd's naming rules) is:

1. **eno** - Names based on firmware/BIOS-provided index numbers for onboard devices (e.g., `eno1`, `eno2`)
2. **ens** - Names based on firmware/BIOS-provided PCI Express hotplug slot index (e.g., `ens3`, `ens4`)
3. **enp** - Names based on the PCI bus path (e.g., `enp0s3`, `enp0s8`, `enp3s0f0`)
4. **enx** - Names based on MAC address (e.g., `enx001122334455`)

The kernel tries these in order and uses the first scheme that produces a valid name. If none of them work, it falls back to the traditional `ethN` naming.

## What the Names Mean

The names encode physical information about the adapter:

```text
enp3s0f0
 |  | | |
 |  | | +-- function number (for multi-port NICs)
 |  | +---- slot number
 |  +------ bus number
 +--------- prefix: en=ethernet, wl=wireless
```

So `enp3s0f0` means: Ethernet adapter on PCI bus 3, slot 0, function 0.

Common patterns:
- `eno1` - First onboard NIC (named by firmware)
- `ens3` - Third PCI Express slot (named by firmware)
- `enp0s3` - PCI bus 0, slot 3 (common in VirtualBox)
- `enp0s25` - PCI bus 0, slot 25 (common for onboard Intel NICs)
- `enp3s0f0` - First port of a dual-port NIC in PCI slot 3

## Finding Interface Names

On a running Talos node, list the interfaces:

```bash
# List all network links
talosctl get links --nodes 192.168.1.10
```

This shows all interfaces with their names, types, and states. The output tells you exactly what names the kernel assigned.

If the node is in maintenance mode (during initial setup):

```bash
# Connect to maintenance mode and list interfaces
talosctl get links --nodes <maintenance-ip> --insecure
```

## Using Predictable Names in Configuration

When you know your interface names, use them directly in the machine config:

```yaml
machine:
  network:
    interfaces:
      # Using predictable name for a specific PCI slot
      - interface: enp3s0f0
        addresses:
          - 192.168.1.10/24
        routes:
          - network: 0.0.0.0/0
            gateway: 192.168.1.1
      # Second port of the same dual-port NIC
      - interface: enp3s0f1
        addresses:
          - 10.10.0.10/24
```

The advantage here is that these names are tied to the physical hardware location. Moving the NIC to a different PCI slot changes the name (which is good - it prevents accidentally using the wrong port). Keeping the NIC in the same slot keeps the name the same across reboots and OS reinstalls.

## Disabling Predictable Naming

If you prefer the traditional `eth0`, `eth1` naming, you can disable predictable naming with a kernel argument:

```yaml
machine:
  install:
    extraKernelArgs:
      - net.ifnames=0
      - biosdevname=0
  network:
    interfaces:
      - interface: eth0
        addresses:
          - 192.168.1.10/24
        routes:
          - network: 0.0.0.0/0
            gateway: 192.168.1.1
```

The `net.ifnames=0` argument disables systemd's predictable naming, and `biosdevname=0` disables Dell's biosdevname scheme. With both disabled, the kernel uses the traditional sequential naming.

After adding these kernel arguments, you need to upgrade or reinstall the node for them to take effect (kernel arguments are boot-time settings).

## When to Use Predictable Names

Predictable naming is generally better for:

- **Bare metal servers** - Names are tied to physical hardware, so you always know which port is which
- **Multi-NIC configurations** - No risk of interfaces swapping names after a reboot
- **Consistent automation** - The same hardware always gets the same names
- **Large deployments** - When you have hundreds of nodes with identical hardware, the names are consistent across all of them

## When to Disable Predictable Names

Traditional naming might be better when:

- **Virtual machines** - VMs usually have a predictable interface order (one virtual NIC = `eth0`), and the PCI-based names are long and less readable
- **Simple single-NIC setups** - If you only have one interface, `eth0` is simpler than `enp0s3`
- **Cross-platform scripts** - Scripts that assume `eth0` do not work with predictable names

## Device Selectors as an Alternative

Instead of relying on interface names at all, you can use device selectors to identify interfaces by their properties:

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

Device selectors match interfaces by MAC address, driver, bus path, or other properties. This approach is completely independent of the naming scheme and works regardless of whether predictable naming is enabled or not.

Available selector fields:

```yaml
deviceSelector:
  # Match by MAC address (most reliable)
  hardwareAddr: "aa:bb:cc:dd:ee:ff"

  # Match by kernel driver
  driver: "igb"

  # Match by PCI bus path
  busPath: "0000:03:00.0"

  # Only match physical interfaces (not virtual)
  physical: true
```

## Predictable Names on Different Platforms

The names you get depend on the hardware and virtualization platform:

### Bare Metal (Intel NICs)
```text
eno1        # First onboard port
eno2        # Second onboard port
enp3s0f0    # Add-in card, first port
enp3s0f1    # Add-in card, second port
```

### VMware
```text
ens192      # First virtual NIC
ens224      # Second virtual NIC
```

### KVM/QEMU
```text
enp0s3      # First VirtIO NIC
enp0s8      # Second VirtIO NIC
```

### Hyper-V
```text
eth0        # Hyper-V often uses traditional names
```

### AWS EC2
```text
ens5        # Primary ENI
ens6        # Second ENI
```

## Migrating Between Naming Schemes

If you need to switch from predictable to traditional naming (or vice versa) on a running cluster, plan carefully:

1. Update the kernel arguments to enable or disable `net.ifnames`
2. Update all interface references in the machine config to use the new names
3. Apply both changes together
4. Upgrade the node to apply the kernel argument change

```yaml
# Switching from predictable to traditional
machine:
  install:
    extraKernelArgs:
      - net.ifnames=0
      - biosdevname=0
  network:
    interfaces:
      # Changed from enp3s0f0 to eth0
      - interface: eth0
        addresses:
          - 192.168.1.10/24
        routes:
          - network: 0.0.0.0/0
            gateway: 192.168.1.1
```

Do this one node at a time and verify connectivity after each change. If something goes wrong, you need out-of-band access (IPMI/iDRAC/iLO) to fix it.

## Mapping Physical Ports to Names

On bare metal servers, figuring out which physical port corresponds to which name can be tricky. Some tips:

- Check the server documentation for onboard NIC PCI addresses
- Use the link status to identify active ports (plug a cable into one port at a time and check which interface shows link up)
- Use `talosctl get links` to see hardware addresses, which you can match against port labels

```bash
# Check link states to identify connected ports
talosctl get links --nodes 192.168.1.10
```

## Conclusion

Predictable interface naming in Talos Linux prevents the "interface name roulette" that plagued traditional Linux deployments. The names are derived from hardware properties and remain stable across reboots and reinstalls. For bare metal, predictable naming is the right default. For simple VM setups, you might prefer traditional naming with `net.ifnames=0`. And for maximum flexibility, device selectors let you identify interfaces by properties like MAC address, completely bypassing the naming question. Whichever approach you choose, the key is consistency - pick a scheme and stick with it across your entire fleet.
