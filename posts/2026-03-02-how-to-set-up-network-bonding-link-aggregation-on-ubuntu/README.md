# How to Set Up Network Bonding (Link Aggregation) on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Networking, Bonding, Link Aggregation, High Availability

Description: Configure network bonding on Ubuntu for increased bandwidth, redundancy, and failover using Netplan and the Linux bonding driver.

---

Network bonding combines multiple physical network interfaces into a single logical interface. Depending on the bonding mode, you gain redundancy (failover if one link dies), increased throughput (load balancing across links), or both. This is standard practice for servers where network availability and throughput matter.

Ubuntu uses Netplan as the primary network configuration tool, which makes bonding configuration cleaner than the old `/etc/network/interfaces` approach.

## Bonding Modes Overview

The Linux bonding driver supports several modes:

| Mode | Name | Description |
|------|------|-------------|
| 0 | balance-rr | Round-robin. Transmits packets in sequence across slaves. Requires switch support. |
| 1 | active-backup | Only one slave active at a time. Failover only. Works with any switch. |
| 2 | balance-xor | XOR-based selection. Requires switch support. |
| 3 | broadcast | Transmits on all slaves. Fault tolerance only. |
| 4 | 802.3ad | IEEE 802.3ad LACP. Requires switch with LACP. Best for throughput + redundancy. |
| 5 | balance-tlb | Adaptive transmit load balancing. No switch support needed. |
| 6 | balance-alb | Adaptive load balancing. No switch support needed. |

For most server setups: mode 1 (active-backup) for simple failover, or mode 4 (802.3ad/LACP) when the switch supports it and you want both redundancy and throughput.

## Prerequisites

Check that your network interfaces are detected:

```bash
ip link show
```

Identify the physical interfaces to bond (e.g., `eth0` and `eth1`). Note their MAC addresses and current state.

Install required tools:

```bash
sudo apt update
sudo apt install ifenslave
```

The `bonding` kernel module is included in Ubuntu kernels. Load it if not already active:

```bash
# Load the bonding module
sudo modprobe bonding

# Verify it's loaded
lsmod | grep bonding
```

## Configuring Bonding with Netplan

Netplan configuration files live in `/etc/netplan/`. Check what exists:

```bash
ls /etc/netplan/
```

You may see a file like `00-installer-config.yaml` or `50-cloud-init.yaml`. Edit the appropriate file or create a new one.

### Mode 1: Active-Backup (Failover Only)

This is the safest mode - no switch configuration required:

```yaml
# /etc/netplan/01-bonding.yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    eth0:
      # Slave interface - no IP, no DHCP
      dhcp4: false
    eth1:
      # Slave interface - no IP, no DHCP
      dhcp4: false
  bonds:
    bond0:
      # List of slave interfaces
      interfaces: [eth0, eth1]
      addresses:
        - 192.168.1.100/24
      routes:
        - to: default
          via: 192.168.1.1
      nameservers:
        addresses: [8.8.8.8, 8.8.4.4]
      parameters:
        # mode 1 = active-backup
        mode: active-backup
        # Check link status every 100ms
        mii-monitor-interval: 100
        # Use eth0 as primary active interface
        primary: eth0
```

### Mode 4: LACP (802.3ad)

Use this when your switch is configured for LACP. Provides both redundancy and bandwidth aggregation:

```yaml
# /etc/netplan/01-bonding.yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    eth0:
      dhcp4: false
    eth1:
      dhcp4: false
  bonds:
    bond0:
      interfaces: [eth0, eth1]
      addresses:
        - 192.168.1.100/24
      routes:
        - to: default
          via: 192.168.1.1
      nameservers:
        addresses: [8.8.8.8, 8.8.4.4]
      parameters:
        # mode 802.3ad = LACP
        mode: 802.3ad
        # MII link monitoring interval in ms
        mii-monitor-interval: 100
        # LACP rate: fast = 1s PDUs, slow = 30s PDUs
        lacp-rate: fast
        # Transmit hash policy for load balancing
        transmit-hash-policy: layer3+4
```

The `layer3+4` transmit hash policy distributes traffic based on IP and port, which provides better distribution across many flows than the default `layer2` policy.

### Mode 0: Round-Robin

For scenarios where you just want raw throughput and the switch is a dumb unmanaged switch (note: this can cause packet reordering, so it is not ideal for TCP):

```yaml
parameters:
  mode: balance-rr
  mii-monitor-interval: 100
```

## Applying the Configuration

Test the configuration before applying:

```bash
# Validate the Netplan YAML without applying
sudo netplan generate
```

If no errors appear, apply:

```bash
# Apply the configuration
sudo netplan apply
```

On a remote connection, the bond takes a moment to come up. If connectivity drops, the configuration may have an error. Use `--debug` for more verbose output:

```bash
sudo netplan --debug apply
```

## Verifying the Bond

Check that the bond interface exists and is UP:

```bash
ip link show bond0
ip addr show bond0
```

View detailed bond status:

```bash
cat /proc/net/bonding/bond0
```

Sample output:

```text
Ethernet Channel Bonding Driver: v5.15.0

Bonding Mode: active-backup
Primary Slave: eth0 (primary_reselect failure)
Currently Active Slave: eth0
MII Status: up
MII Polling Interval (ms): 100
Up Delay (ms): 0
Down Delay (ms): 0

Slave Interface: eth0
MII Status: up
Speed: 1000 Mbps
Duplex: full
Link Failure Count: 0
Permanent HW addr: 52:54:00:ab:cd:01
Slave queue ID: 0

Slave Interface: eth1
MII Status: up
Speed: 1000 Mbps
Duplex: full
Link Failure Count: 0
Permanent HW addr: 52:54:00:ab:cd:02
Slave queue ID: 0
```

## Testing Failover

For active-backup mode, test that failover works:

```bash
# While pinging from another host, bring down the primary
sudo ip link set eth0 down

# The bond should keep working via eth1
# Check which slave is now active
cat /proc/net/bonding/bond0 | grep "Currently Active"

# Restore eth0
sudo ip link set eth0 up

# After restoration, eth0 should become primary again
cat /proc/net/bonding/bond0 | grep "Currently Active"
```

## Making the Bonding Module Load at Boot

With Netplan and networkd, the bonding module is typically loaded automatically. Verify by rebooting and checking:

```bash
lsmod | grep bonding
```

If it fails to load automatically, add it to the modules list:

```bash
echo "bonding" | sudo tee -a /etc/modules
```

## Configuring with DHCP

If you use DHCP instead of static addresses:

```yaml
bonds:
  bond0:
    interfaces: [eth0, eth1]
    dhcp4: true
    parameters:
      mode: active-backup
      mii-monitor-interval: 100
```

## Monitoring Bond Health

Set up monitoring to catch link failures:

```bash
# Watch bond status in real time
watch -n 1 cat /proc/net/bonding/bond0

# Check for link failure events in the kernel log
sudo journalctl -k | grep bonding
sudo journalctl -k | grep "link becomes"
```

Configure kernel logging for bonding events:

```bash
# Add to /etc/modprobe.d/bonding.conf for debug output
options bonding debug=1
```

Network bonding is one of those configurations that requires some planning upfront - particularly around switch configuration for LACP - but once in place it is transparent and reliable. The Netplan configuration approach on Ubuntu keeps the setup maintainable and easy to reproduce across hosts.
