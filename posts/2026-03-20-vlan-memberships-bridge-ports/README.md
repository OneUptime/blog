# How to Add VLAN Memberships to Bridge Ports

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: VLAN, Bridge, Linux, Bridge vlan, 802.1Q, VLAN-aware Bridge, Networking

Description: Learn how to configure VLAN memberships on Linux bridge ports using the VLAN-aware bridge mode, enabling 802.1Q VLAN filtering and trunk/access port behavior.

---

Linux bridges support 802.1Q VLAN filtering when `vlan_filtering=1` is enabled. This allows bridge ports to behave like managed switch ports with VLAN membership control.

## Enabling VLAN Filtering on a Bridge

```bash
# Create VLAN-aware bridge

ip link add br0 type bridge
ip link set br0 type bridge vlan_filtering 1
ip link set br0 up

# Or enable on existing bridge
ip link set br0 type bridge vlan_filtering 1
```

## Adding Ports to the Bridge

```bash
# Add physical ports and VM tap interfaces
ip link set eth0 master br0
ip link set eth1 master br0
ip link set tap0 master br0   # VM tap interface
ip link set eth0 up
ip link set eth1 up
```

## Configuring VLAN Memberships

```bash
# Default: PVID 1, egress untagged on all ports

# Configure eth0 as trunk port (carries VLANs 10, 20, 30 tagged)
# VLANs are tagged by default when neither pvid nor untagged is specified
bridge vlan add dev eth0 vid 10
bridge vlan add dev eth0 vid 20
bridge vlan add dev eth0 vid 30
bridge vlan del dev eth0 vid 1     # Remove default VLAN 1

# Configure tap0 as access port (VLAN 10, untagged)
bridge vlan add dev tap0 vid 10 pvid untagged   # PVID=10, egress untagged
bridge vlan del dev tap0 vid 1

# Configure tap1 as access port (VLAN 20)
bridge vlan add dev tap1 vid 20 pvid untagged
bridge vlan del dev tap1 vid 1
```

## Viewing VLAN Memberships

```bash
# Show all VLAN memberships
bridge vlan show

# Output:
# port    vlan ids
# eth0     10
#          20
#          30
# tap0     10 PVID Egress Untagged
# tap1     20 PVID Egress Untagged
# br0       1
```

## Assigning IP to a VLAN on the Bridge

```bash
# Create VLAN interface on top of bridge for routing
ip link add link br0 name br0.10 type vlan id 10
ip addr add 192.168.10.1/24 dev br0.10
ip link set br0.10 up

ip link add link br0 name br0.20 type vlan id 20
ip addr add 192.168.20.1/24 dev br0.20
ip link set br0.20 up
```

## Persistent Configuration (systemd-networkd)

```ini
# /etc/systemd/network/br0.netdev
[NetDev]
Name=br0
Kind=bridge

[Bridge]
VLANFiltering=yes
```

```ini
# /etc/systemd/network/eth0.network - trunk port
[Match]
Name=eth0

[Network]
Bridge=br0

[BridgeVLAN]
VLAN=10
VLAN=20
VLAN=30
```

```ini
# /etc/systemd/network/tap0.network - access port VLAN 10
[Match]
Name=tap0

[Network]
Bridge=br0

[BridgeVLAN]
PVID=10
EgressUntagged=10
```

## Key Takeaways

- Enable `vlan_filtering=1` on the bridge to activate 802.1Q VLAN filtering per port.
- Use `bridge vlan add dev <port> vid <id> pvid untagged` for access ports (VM interfaces).
- Use `bridge vlan add dev <port> vid <id>` for trunk ports (uplinks to switches); VLANs are tagged by default when neither `pvid` nor `untagged` is specified.
- `bridge vlan show` is the primary command to inspect VLAN membership across all bridge ports.
