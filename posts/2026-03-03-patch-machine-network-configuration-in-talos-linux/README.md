# How to Patch Machine Network Configuration in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Networking, Machine Configuration, Patches, Infrastructure

Description: A practical guide to patching network configuration in Talos Linux machines, covering interfaces, routes, DNS, VLANs, and bonds.

---

Network configuration is one of the most frequently patched aspects of a Talos Linux machine configuration. Whether you are adding a secondary interface, changing DNS servers, setting up VLANs, or configuring bonds, patches give you a clean way to modify network settings without touching the full configuration. This guide walks through common network patching scenarios with working examples.

## How Network Patches Merge

Before diving into examples, understanding the merge behavior for network configuration is important. Network interfaces use the `interface` field as a merge key in strategic merge patches. This means:

- Patching with a new interface name adds it alongside existing interfaces
- Patching with an existing interface name updates that interface
- Other network fields (nameservers, hostname, etc.) follow standard merge rules

```yaml
# This patch ADDS eth1 without affecting eth0
machine:
  network:
    interfaces:
      - interface: eth1
        addresses:
          - 192.168.100.20/24
```

```yaml
# This patch UPDATES eth0 (because eth0 already exists)
machine:
  network:
    interfaces:
      - interface: eth0
        mtu: 9000
```

## Patching the Hostname

The simplest network patch is changing the hostname:

```yaml
# hostname-patch.yaml
machine:
  network:
    hostname: production-worker-01
```

```bash
talosctl apply-config --nodes 10.0.1.21 --patch @hostname-patch.yaml --mode no-reboot
```

## Patching DNS Configuration

Update nameservers and search domains:

```yaml
# dns-patch.yaml
machine:
  network:
    nameservers:
      - 10.0.1.1
      - 1.1.1.1
      - 8.8.8.8
    search:
      - cluster.local
      - example.com
```

Remember that `nameservers` is a list without a merge key, so this replaces the entire nameserver list. Include all nameservers you want in the final configuration.

## Adding a Static Network Interface

To configure a new static IP interface:

```yaml
# static-interface-patch.yaml
machine:
  network:
    interfaces:
      - interface: eth0
        dhcp: false
        addresses:
          - 10.0.1.21/24
        routes:
          - network: 0.0.0.0/0
            gateway: 10.0.1.1
            metric: 100
        mtu: 1500
```

```bash
talosctl apply-config --nodes 10.0.1.21 --patch @static-interface-patch.yaml
```

## Switching from DHCP to Static

If a node is currently using DHCP and you want to switch to a static address:

```yaml
# dhcp-to-static-patch.yaml
machine:
  network:
    interfaces:
      - interface: eth0
        dhcp: false
        addresses:
          - 10.0.1.21/24
        routes:
          - network: 0.0.0.0/0
            gateway: 10.0.1.1
```

Be careful with this change on remote nodes. If the static IP you configure is different from the DHCP-assigned IP, you will lose connectivity to the node immediately after applying. Plan accordingly and make sure you can access the node through other means (like a console or a different network) if something goes wrong.

## Adding a Secondary Interface

Add a second network interface without modifying the first:

```yaml
# secondary-interface-patch.yaml
machine:
  network:
    interfaces:
      - interface: eth1
        dhcp: false
        addresses:
          - 192.168.100.21/24
        routes:
          - network: 192.168.100.0/24
            gateway: 192.168.100.1
            metric: 200
        mtu: 9000
```

Since `eth1` is a new interface name (different merge key), this patch adds it alongside the existing `eth0` configuration.

## Configuring VLANs

Add VLAN interfaces to an existing physical interface:

```yaml
# vlan-patch.yaml
machine:
  network:
    interfaces:
      - interface: eth0
        vlans:
          - vlanId: 100
            addresses:
              - 10.100.0.21/24
            routes:
              - network: 10.100.0.0/16
                gateway: 10.100.0.1
            mtu: 1500
          - vlanId: 200
            addresses:
              - 10.200.0.21/24
            routes:
              - network: 10.200.0.0/16
                gateway: 10.200.0.1
            mtu: 9000
```

## Setting Up Network Bonding

Create a bond interface from two physical interfaces:

```yaml
# bond-patch.yaml
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
        dhcp: false
        addresses:
          - 10.0.1.21/24
        routes:
          - network: 0.0.0.0/0
            gateway: 10.0.1.1
        mtu: 9000
```

Important: when switching from standalone interfaces to a bond, you are making a significant network change. If this is a remote node, you could lose connectivity. Test on a local or test environment first.

## Configuring a Virtual IP

Add a floating VIP to a control plane node's interface:

```yaml
# vip-patch.yaml
machine:
  network:
    interfaces:
      - interface: eth0
        vip:
          ip: 10.0.1.100
```

The VIP is shared among all control plane nodes. Only one node actively holds it at any time.

## Adding Extra Host Entries

Add entries to the node's host resolution (equivalent to `/etc/hosts`):

```yaml
# hosts-patch.yaml
machine:
  network:
    extraHostEntries:
      - ip: 10.0.1.100
        aliases:
          - api.cluster.local
          - kubernetes.cluster.local
      - ip: 10.0.1.50
        aliases:
          - registry.internal
```

## Patching Routes

Add specific routes for network segmentation:

```yaml
# routes-patch.yaml
machine:
  network:
    interfaces:
      - interface: eth0
        routes:
          - network: 0.0.0.0/0
            gateway: 10.0.1.1
            metric: 100
          - network: 172.16.0.0/12
            gateway: 10.0.1.254
            metric: 50
          - network: 192.168.0.0/16
            gateway: 10.0.1.253
            metric: 50
```

The `metric` field determines route priority (lower is higher priority). Use specific routes for internal networks and the default route for everything else.

## Changing the MTU

Update the MTU on an existing interface:

```yaml
# mtu-patch.yaml
machine:
  network:
    interfaces:
      - interface: eth0
        mtu: 9000
```

Before changing MTU, verify that your network infrastructure (switches, routers) supports the desired MTU. Setting the MTU too high on one node without matching the network equipment will cause packet fragmentation or drops.

## Complete Network Overhaul Patch

For a major network reconfiguration, include everything in one patch:

```yaml
# complete-network-patch.yaml
machine:
  network:
    hostname: prod-worker-01
    nameservers:
      - 10.0.1.1
      - 1.1.1.1
    search:
      - prod.internal
      - cluster.local
    interfaces:
      # Primary network - management and cluster traffic
      - interface: bond0
        bond:
          mode: 802.3ad
          lacpRate: fast
          interfaces:
            - eth0
            - eth1
        dhcp: false
        addresses:
          - 10.0.1.21/24
        routes:
          - network: 0.0.0.0/0
            gateway: 10.0.1.1
            metric: 100
        mtu: 1500

      # Storage network
      - interface: bond1
        bond:
          mode: 802.3ad
          lacpRate: fast
          interfaces:
            - eth2
            - eth3
        dhcp: false
        addresses:
          - 192.168.100.21/24
        routes:
          - network: 192.168.100.0/24
            gateway: 192.168.100.1
            metric: 200
        mtu: 9000

    extraHostEntries:
      - ip: 10.0.1.100
        aliases:
          - api.cluster.local
```

## Validating Network Patches

Always validate network patches before applying, especially for remote nodes:

```bash
# Generate a test config with the patch
talosctl machineconfig patch current.yaml --patch @network-patch.yaml -o test.yaml

# Validate
talosctl validate --config test.yaml --mode metal

# Review the network section specifically
yq '.machine.network' test.yaml
```

## Verifying Network Changes After Applying

After applying a network patch, verify the changes took effect:

```bash
# Check assigned addresses
talosctl get addresses --nodes 10.0.1.21

# Check routes
talosctl get routes --nodes 10.0.1.21

# Check link status
talosctl get links --nodes 10.0.1.21

# Check DNS resolution
talosctl get resolvers --nodes 10.0.1.21
```

## Removing Network Configuration

To remove a network interface or VLAN, use JSON Patches:

```yaml
# remove-eth1.yaml
# Remove the second interface (index 1)
- op: test
  path: /machine/network/interfaces/1/interface
  value: eth1
- op: remove
  path: /machine/network/interfaces/1
```

```bash
talosctl apply-config --nodes 10.0.1.21 --patch @remove-eth1.yaml
```

## Troubleshooting Network Patches

If a network patch causes connectivity issues:

1. If you can still reach the node via the Talos API (perhaps from a different interface), apply a corrective patch
2. If the node is completely unreachable, use a console (IPMI, cloud console) to boot from a Talos ISO and apply a working configuration
3. Always test major network changes on a non-production node first

```bash
# If you can still reach the node, revert to the backup config
talosctl apply-config --nodes 10.0.1.21 --file backup-config.yaml

# Check for network errors in logs
talosctl logs networkd --nodes 10.0.1.21
```

## Network Patching Best Practices

1. Always back up the current configuration before making network changes
2. Test network patches on non-production nodes first
3. Have console access available when making major network changes on remote nodes
4. Use `talosctl get addresses` and `talosctl get routes` to verify changes
5. Start with minimal changes and iterate rather than making large changes at once
6. Keep all network patches in version control for audit and rollback purposes

## Conclusion

Patching network configuration in Talos Linux is a common operation that ranges from simple hostname changes to complex multi-interface setups with bonding and VLANs. The strategic merge patch behavior for network interfaces, which uses the interface name as a merge key, makes it straightforward to add or modify interfaces without affecting others. For removal, switch to JSON Patches. Always validate before applying, especially for remote nodes, and keep backups of working configurations so you can recover quickly if a change causes connectivity issues.
