# How to Configure Network Bonding with Netplan on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Networking, Netplan, Bonding, High Availability

Description: Set up network interface bonding (link aggregation/LACP) on Ubuntu using Netplan for redundancy and increased throughput, with practical examples for common bonding modes.

---

Network bonding combines multiple physical network interfaces into a single logical interface. Depending on the bonding mode, this provides link redundancy (failover), increased throughput, or both. It is standard practice for production servers where network availability directly affects service uptime.

Linux supports several bonding modes, and Netplan makes configuring them relatively straightforward with its YAML syntax.

## Bonding Modes Overview

The Linux bonding driver supports several modes, numbered 0 through 6:

| Mode | Name | Description |
|------|------|-------------|
| 0 | balance-rr | Round-robin load balancing, no switch configuration needed |
| 1 | active-backup | One active, others standby for failover |
| 2 | balance-xor | XOR-based load balancing |
| 3 | broadcast | Transmit on all interfaces simultaneously |
| 4 | 802.3ad (LACP) | IEEE standard link aggregation, requires switch support |
| 5 | balance-tlb | Adaptive transmit load balancing |
| 6 | balance-alb | Adaptive load balancing |

For most production use cases:
- `active-backup` when you want simple failover without touching switch config
- `802.3ad` (LACP) when you want true load balancing and your switch supports it

## Prerequisite: Load the Bonding Kernel Module

```bash
# Check if the bonding module is loaded
lsmod | grep bonding

# Load it (usually auto-loaded when you configure bonding, but verify)
sudo modprobe bonding

# Make it persistent across reboots
echo "bonding" | sudo tee /etc/modules-load.d/bonding.conf
```

## Active-Backup Bonding (Mode 1)

This is the safest mode - one interface is active, the others wait as hot standby. If the active link fails, one of the standby interfaces takes over automatically.

```yaml
# /etc/netplan/01-bonding.yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    # Slave/member interfaces - no IP, no DHCP
    enp3s0:
      dhcp4: false
    enp4s0:
      dhcp4: false
  bonds:
    bond0:
      interfaces:
        - enp3s0
        - enp4s0
      parameters:
        mode: active-backup
        primary: enp3s0         # prefer enp3s0 as the active interface
        mii-monitor-interval: 100  # check link every 100ms
        fail-over-mac-policy: active  # bond uses active slave's MAC
      dhcp4: false
      addresses:
        - 192.168.1.100/24
      routes:
        - to: default
          via: 192.168.1.1
      nameservers:
        addresses:
          - 8.8.8.8
```

Apply it:

```bash
sudo netplan apply
```

## LACP (802.3ad) Bonding with Switch Configuration

LACP provides both failover and load balancing. It requires switch-side configuration (port-channel or LAG on Cisco, bond on most Linux switches).

```yaml
# /etc/netplan/01-lacp-bonding.yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    enp3s0:
      dhcp4: false
    enp4s0:
      dhcp4: false
  bonds:
    bond0:
      interfaces:
        - enp3s0
        - enp4s0
      parameters:
        mode: 802.3ad           # LACP
        lacp-rate: fast         # send LACP PDUs every 1 second (vs slow = 30s)
        mii-monitor-interval: 100
        transmit-hash-policy: layer3+4  # hash on IP and port for better distribution
        ad-select: stable       # how to select the aggregation group
      dhcp4: false
      addresses:
        - 192.168.1.100/24
      routes:
        - to: default
          via: 192.168.1.1
      nameservers:
        addresses:
          - 8.8.8.8
```

For LACP, the switch ports connected to `enp3s0` and `enp4s0` must be configured as an LACP port-channel with the same settings. A Cisco IOS example:

```
interface GigabitEthernet0/1
 channel-group 1 mode active

interface GigabitEthernet0/2
 channel-group 1 mode active

interface Port-channel1
 switchport mode access
 switchport access vlan 10
```

## Balance-RR Bonding (Mode 0)

Round-robin requires no switch configuration and provides some aggregate bandwidth, but it can cause out-of-order packet delivery which degrades TCP performance. Better suited for storage or backup networks where this is less of an issue:

```yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    enp3s0:
      dhcp4: false
    enp4s0:
      dhcp4: false
  bonds:
    bond0:
      interfaces:
        - enp3s0
        - enp4s0
      parameters:
        mode: balance-rr
        mii-monitor-interval: 100
      dhcp4: false
      addresses:
        - 10.10.0.50/24
```

## Verifying Bond Status

After applying the configuration:

```bash
# Check bond status
cat /proc/net/bonding/bond0

# Should show:
# Bonding Mode: active-backup
# Primary Slave: enp3s0 (primary_reselect failure)
# Currently Active Slave: enp3s0
# MII Status: up
# MII Polling Interval (ms): 100

# More readable output
sudo networkctl status bond0

# Check member interfaces
ip link show master bond0

# View bond statistics
ip -s link show bond0
```

## Testing Failover

For active-backup mode, test that failover works:

```bash
# Identify the current active interface
cat /proc/net/bonding/bond0 | grep "Currently Active"

# Bring down the active interface
sudo ip link set enp3s0 down

# Check that bond0 is still up (failover happened)
ping -c 5 192.168.1.1

# Check which interface is now active
cat /proc/net/bonding/bond0 | grep "Currently Active"

# Bring the primary back up
sudo ip link set enp3s0 up

# Verify primary is re-selected (if primary_reselect policy allows)
cat /proc/net/bonding/bond0 | grep "Currently Active"
```

## Bond with VLAN

Bonding and VLANs often go together in production:

```yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    enp3s0:
      dhcp4: false
    enp4s0:
      dhcp4: false
  bonds:
    bond0:
      interfaces:
        - enp3s0
        - enp4s0
      parameters:
        mode: 802.3ad
        mii-monitor-interval: 100
  vlans:
    bond0.10:
      link: bond0
      id: 10
      dhcp4: false
      addresses:
        - 192.168.10.100/24
      routes:
        - to: default
          via: 192.168.10.1
    bond0.20:
      link: bond0
      id: 20
      dhcp4: false
      addresses:
        - 192.168.20.100/24
```

## MTU and Bond Configuration

For jumbo frame setups (common with storage networks):

```yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    enp3s0:
      dhcp4: false
      mtu: 9000                  # set MTU on slave interface
    enp4s0:
      dhcp4: false
      mtu: 9000
  bonds:
    bond0:
      interfaces:
        - enp3s0
        - enp4s0
      mtu: 9000                  # set MTU on bond interface too
      parameters:
        mode: 802.3ad
        mii-monitor-interval: 100
      dhcp4: false
      addresses:
        - 10.10.0.50/24
```

## Common Bonding Issues

**Bond interface does not come up:**
```bash
# Check if bonding module is loaded
lsmod | grep bonding

# Check kernel logs for bonding errors
sudo dmesg | grep bond

# Verify slave interfaces are not in use by another configuration
ip addr show enp3s0
```

**LACP not forming:**
```bash
# Check LACP negotiation status
cat /proc/net/bonding/bond0 | grep -A5 "Slave Interface: enp3s0"

# Look for "MII Status: up" and "Link Failure Count: 0"
# If LACP PDUs are not being received, check switch configuration

# Capture LACP PDUs to verify switch is sending them
sudo tcpdump -i enp3s0 ether proto 0x8809
```

**Performance not as expected with LACP:**

LACP load balancing happens per-flow, not per-packet. Two servers talking to each other will always use the same physical link because they have the same source/destination IP pair. The throughput improvement comes from having multiple simultaneous flows use different links. Check your transmit hash policy:

```bash
cat /proc/net/bonding/bond0 | grep "Transmit Hash Policy"

# layer3+4 (using IP and port) gives the best distribution across flows
# layer2 (MAC-based) gives poor distribution
```

Network bonding is a foundational configuration for any server that needs to stay online. Combine it with monitoring to get alerts when slave links go down - a one-link failure in active-backup mode leaves you with no redundancy until the problem is noticed and fixed.
