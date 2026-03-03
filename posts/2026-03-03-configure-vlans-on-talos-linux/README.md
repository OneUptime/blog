# How to Configure VLANs on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, VLAN, Networking, Kubernetes, Network Segmentation

Description: Step-by-step instructions for configuring VLANs on Talos Linux to segment network traffic across your Kubernetes infrastructure.

---

VLANs (Virtual Local Area Networks) let you segment network traffic on a single physical interface into multiple isolated networks. In data center environments, VLANs are everywhere. Your servers might have management traffic on VLAN 10, storage traffic on VLAN 20, and application traffic on VLAN 30 - all running over the same physical cable. Talos Linux supports VLAN configuration natively through the machine config, so you can set this up without any extra tools.

This post covers how to configure VLANs in Talos Linux, including basic setups, VLANs on bonded interfaces, and common network designs.

## VLAN Basics

A VLAN tags network frames with an ID number (1 to 4094). Switches use these tags to route traffic to the correct network segment. On the server side, you create virtual interfaces that add and remove these tags automatically.

When you configure a VLAN on a Talos Linux interface, the system creates a virtual interface (like `eth0.100` for VLAN 100 on `eth0`) that handles the tagging transparently.

## Basic VLAN Configuration

Here is a simple VLAN configuration on a single interface:

```yaml
# machine-config.yaml
machine:
  network:
    interfaces:
      - interface: eth0
        # The parent interface - no IP address if all traffic is tagged
        vlans:
          - vlanId: 100
            addresses:
              - 10.100.0.10/24
            routes:
              - network: 0.0.0.0/0
                gateway: 10.100.0.1
          - vlanId: 200
            addresses:
              - 10.200.0.10/24
    nameservers:
      - 8.8.8.8
```

This creates two VLAN interfaces on `eth0`:
- VLAN 100 with address `10.100.0.10/24` and a default route through `10.100.0.1`
- VLAN 200 with address `10.200.0.10/24` (no default route - only for local subnet traffic)

Only one interface should carry the default route. Other VLANs should have specific routes for their subnets if needed.

## Tagged and Untagged Traffic

Sometimes you need both untagged (native VLAN) and tagged traffic on the same interface:

```yaml
machine:
  network:
    interfaces:
      - interface: eth0
        # Untagged traffic gets this address
        addresses:
          - 192.168.1.10/24
        routes:
          - network: 0.0.0.0/0
            gateway: 192.168.1.1
        # Tagged traffic goes to VLAN interfaces
        vlans:
          - vlanId: 100
            addresses:
              - 10.100.0.10/24
          - vlanId: 200
            addresses:
              - 10.200.0.10/24
```

In this setup, the parent `eth0` interface handles untagged traffic (the "native VLAN" or "default VLAN" on the switch), while VLAN 100 and 200 handle tagged traffic.

## VLANs on Bonded Interfaces

In production environments, you often combine bonding with VLANs. The physical interfaces are bonded for redundancy, and VLANs are configured on top of the bond:

```yaml
machine:
  network:
    interfaces:
      - interface: bond0
        bond:
          mode: 802.3ad
          lacpRate: fast
          xmitHashPolicy: layer3+4
          interfaces:
            - eth0
            - eth1
        # Management VLAN
        vlans:
          - vlanId: 10
            addresses:
              - 10.10.0.20/24
            routes:
              - network: 0.0.0.0/0
                gateway: 10.10.0.1
          # Storage VLAN
          - vlanId: 20
            addresses:
              - 10.20.0.20/24
          # Application VLAN
          - vlanId: 30
            addresses:
              - 10.30.0.20/24
    nameservers:
      - 10.10.0.2
```

The switch ports connected to `eth0` and `eth1` must be configured as trunk ports that allow the tagged VLANs to pass through.

## DHCP on VLANs

You can use DHCP on VLAN interfaces just like on physical interfaces:

```yaml
machine:
  network:
    interfaces:
      - interface: eth0
        vlans:
          - vlanId: 100
            dhcp: true
          - vlanId: 200
            dhcp: true
            dhcpOptions:
              routeMetric: 200
```

Make sure the DHCP server is configured to serve addresses on those VLANs. Each VLAN typically has its own DHCP scope.

## Common VLAN Network Designs

### Separate Management and Data Networks

```yaml
machine:
  network:
    interfaces:
      - interface: eth0
        vlans:
          # Management network - for SSH, talosctl, monitoring
          - vlanId: 10
            addresses:
              - 10.10.0.20/24
            routes:
              - network: 0.0.0.0/0
                gateway: 10.10.0.1
          # Data network - for Kubernetes pod traffic
          - vlanId: 20
            addresses:
              - 10.20.0.20/24
```

### Three-Tier Network

```yaml
machine:
  network:
    interfaces:
      - interface: bond0
        bond:
          mode: active-backup
          interfaces:
            - eth0
            - eth1
        vlans:
          # Management VLAN
          - vlanId: 10
            addresses:
              - 10.10.0.20/24
            routes:
              - network: 0.0.0.0/0
                gateway: 10.10.0.1
          # Storage VLAN (high MTU for storage traffic)
          - vlanId: 20
            mtu: 9000
            addresses:
              - 10.20.0.20/24
          # Application VLAN
          - vlanId: 30
            addresses:
              - 10.30.0.20/24
```

Notice the MTU setting on the storage VLAN. Jumbo frames (MTU 9000) are common for storage traffic to reduce overhead. The switch and all devices on that VLAN must also support the higher MTU.

## VLAN-Specific Settings

Each VLAN interface supports the same settings as a regular interface:

```yaml
machine:
  network:
    interfaces:
      - interface: eth0
        vlans:
          - vlanId: 100
            addresses:
              - 10.100.0.10/24
              - 10.100.0.11/24  # Multiple addresses
            routes:
              - network: 10.200.0.0/24
                gateway: 10.100.0.1  # Specific route
            mtu: 1500
            dhcp: false
```

## Applying the Configuration

For initial setup:

```bash
# Generate config with VLAN patch
talosctl gen config my-cluster https://10.10.0.100:6443 \
  --config-patch @vlan-config.yaml
```

For existing nodes:

```bash
# Apply VLAN configuration
talosctl apply-config --nodes 192.168.1.10 \
  --file controlplane.yaml \
  --config-patch @vlan-config.yaml
```

Be very careful when applying VLAN changes to running nodes. If you are connected to the node through the native VLAN and you change the VLAN configuration, you might lose connectivity. Always have out-of-band access available.

## Verifying VLAN Configuration

After applying:

```bash
# Check all links including VLAN interfaces
talosctl get links --nodes 10.10.0.20

# Check addresses on VLAN interfaces
talosctl get addresses --nodes 10.10.0.20

# Check routes
talosctl get routes --nodes 10.10.0.20
```

You should see VLAN interfaces listed as separate links (like `eth0.100`, `eth0.200` or `bond0.10`, `bond0.20`).

## Switch Configuration

The Talos side is only half of the VLAN setup. The switch ports must be configured to match. Here is what you typically need:

For a single interface with VLANs:
- Configure the switch port as a trunk port
- Allow the required VLAN IDs on the trunk
- Optionally set a native VLAN for untagged traffic

For bonded interfaces with VLANs:
- Configure the switch ports for LACP (if using mode 4)
- Set the port-channel as a trunk
- Allow the required VLAN IDs

The exact switch commands vary by vendor (Cisco, Juniper, Arista, etc.), but the concepts are the same. Work with your network team to ensure the switch configuration matches your Talos VLAN settings.

## Troubleshooting

**No connectivity on VLAN interface** - Check that the switch port is configured as a trunk and allows the VLAN ID. If the switch is set to access mode, tagged frames will be dropped.

**Can reach the gateway but not other subnets** - Check routing. Make sure you have appropriate routes configured, either static routes or a default route on the correct VLAN.

**Intermittent connectivity** - Check MTU. If the VLAN MTU is set higher than what the switch or intermediate devices support, frames will be silently dropped. Test with different MTU values.

**VLAN interface not appearing** - Check that the parent interface (physical or bond) is up. If the parent is down, VLAN interfaces on top of it will not work.

## Performance Considerations

VLAN tagging adds 4 bytes of overhead to each frame. On a standard 1500-byte MTU, this means the effective payload is slightly reduced. In practice, this overhead is negligible.

If you are using VLANs for storage traffic, consider enabling jumbo frames (MTU 9000) on that VLAN to reduce per-frame overhead for large data transfers. Make sure all devices on the VLAN support the larger MTU.

## Conclusion

VLAN configuration in Talos Linux is declarative and clean. Define your VLANs in the machine config, specify addresses and routes for each one, and apply. The key is to make sure the switch side matches the host side - VLANs are a two-party agreement between the server and the network. Test thoroughly after any changes, keep out-of-band access available, and document your VLAN assignments. For production deployments, combining VLANs with bonded interfaces gives you both network segmentation and redundancy in a single, manageable configuration.
