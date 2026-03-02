# How to Use ethtool to Diagnose NIC Issues on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Networking, ethtool, Troubleshooting, Hardware

Description: Comprehensive guide to using ethtool on Ubuntu to diagnose network interface card problems, check link speed, duplex settings, driver info, and interface statistics.

---

`ethtool` is the standard tool for querying and configuring Ethernet network interfaces at the hardware and driver level. It reads information directly from the NIC driver - things that `ip link` and `ifconfig` cannot tell you: link speed, duplex negotiation, pause frame settings, ring buffer sizes, offload capabilities, and hardware-level statistics including error counters.

When network performance is poor or connectivity is unreliable, ethtool often reveals the root cause.

## Installing ethtool

```bash
# ethtool is installed by default on most Ubuntu systems
which ethtool
# /usr/sbin/ethtool

# If missing
sudo apt-get install -y ethtool

# Check the version
ethtool --version
```

## Basic Interface Information

```bash
# Get complete NIC information
sudo ethtool eth0

# Replace eth0 with your actual interface name
# Find interface names with:
ip link show
```

A typical output:

```
Settings for eth0:
    Supported ports: [ TP ]
    Supported link modes:   10baseT/Half 10baseT/Full
                            100baseT/Half 100baseT/Full
                            1000baseT/Full
    Supported pause frame use: No
    Supports auto-negotiation: Yes
    Supported FEC modes: Not reported
    Advertised link modes:  10baseT/Half 10baseT/Full
                            100baseT/Half 100baseT/Full
                            1000baseT/Full
    Advertised pause frame use: No
    Advertised auto-negotiation: Yes
    Speed: 1000Mb/s
    Duplex: Full
    Auto-negotiation: on
    Port: Twisted Pair
    PHYAD: 0
    Transceiver: internal
    MDI-X: off (auto)
    Supports Wake-on: pumbg
    Wake-on: d
    Current message level: 0x00000007 (7)
    Link detected: yes
```

### Key Fields to Check

**Speed and Duplex**: A mismatch is one of the most common causes of poor network performance:

```bash
# Quick check of speed and duplex
sudo ethtool eth0 | grep -E 'Speed|Duplex|Auto-neg|Link detected'

# Common problem: one side is 100Mb/Half and other is 1000Mb/Full
# This causes massive packet loss under any significant traffic load
```

**Auto-negotiation**: If both ends are capable, auto-negotiation should be on. Mismatched auto-negotiation (one end fixed, one end auto) causes half-duplex collisions:

```bash
# Check auto-negotiation state
sudo ethtool eth0 | grep 'Auto-negotiation'
```

**Link detected**: If `Link detected: no`, the physical link is down - check the cable, switch port, and SFP/transceiver.

## Changing Speed and Duplex

Fixing a duplex mismatch:

```bash
# Force a specific speed and duplex (use when auto-negotiation fails)
sudo ethtool -s eth0 speed 1000 duplex full autoneg on

# Force a fixed speed (disables auto-negotiation)
sudo ethtool -s eth0 speed 100 duplex full autoneg off

# Verify the change took effect
sudo ethtool eth0 | grep -E 'Speed|Duplex|Auto-neg'
```

To make speed changes persistent with Netplan:

```yaml
# /etc/netplan/00-installer-config.yaml
network:
  version: 2
  ethernets:
    eth0:
      dhcp4: true
      link-local: []
      wakeonlan: false
      match:
        name: eth0
```

For more granular hardware settings, create a udev rule:

```bash
sudo tee /etc/udev/rules.d/99-nic-settings.rules <<EOF
ACTION=="add", SUBSYSTEM=="net", KERNEL=="eth0", \
  RUN+="/sbin/ethtool -s eth0 speed 1000 duplex full autoneg on"
EOF
```

## Driver and Hardware Information

```bash
# Get driver information
sudo ethtool -i eth0

# Output:
# driver: virtio_net (or e1000, igb, r8169, etc.)
# version: 1.0.0
# firmware-version: N/A
# expansion-rom-version:
# bus-info: 0000:00:03.0
# supports-statistics: yes
# supports-test: no
# supports-eeprom-access: no
# supports-register-dump: no
# supports-priv-flags: no
```

The driver name helps identify firmware update possibilities and known driver bugs.

## Interface Statistics

Hardware statistics reveal errors at the NIC level that do not show up in `ip -s link`:

```bash
# View NIC hardware statistics
sudo ethtool -S eth0

# This shows driver-specific counters - varies by NIC
# Common fields to look for:
sudo ethtool -S eth0 | grep -iE 'error|drop|miss|over|collision|crc|fifo|frame'

# Example output for Intel NIC (igb driver):
# rx_errors: 0
# tx_errors: 0
# rx_dropped: 0
# tx_dropped: 0
# rx_crc_errors: 0        # CRC errors indicate bad cable or electrical interference
# rx_fifo_errors: 0       # FIFO overruns indicate buffer overflow
# rx_frame_errors: 0
# tx_aborted_errors: 0
# tx_carrier_errors: 0    # Carrier loss indicates physical link issues
```

### Interpreting Error Counters

**CRC errors**: Bad cable, loose connection, or electrical interference. Even a few CRC errors per day indicate a hardware problem.

**FIFO errors / rx_missed_errors**: The NIC buffer overflowed. The system is not processing packets fast enough. May indicate CPU saturation or the need to increase ring buffer size.

**tx_carrier_errors**: Physical link dropped during transmission. Check the cable and switch port.

**rx_dropped**: Packets dropped by the driver due to buffer full. Increase ring buffer size or reduce traffic.

## Ring Buffer Sizes

The ring buffer holds received packets waiting for the kernel to process them. Small ring buffers cause drops under high traffic:

```bash
# View current ring buffer sizes
sudo ethtool -g eth0

# Output:
# Ring parameters for eth0:
# Pre-set maximums:
# RX:		4096
# RX Mini:	n/a
# RX Jumbo:	n/a
# TX:		4096
# Current hardware settings:
# RX:		256    <- Often too small for high-traffic interfaces
# RX Mini:	n/a
# RX Jumbo:	n/a
# TX:		256

# Increase ring buffer size (helps with dropped packets at high traffic)
sudo ethtool -G eth0 rx 2048 tx 2048

# Verify the change
sudo ethtool -g eth0
```

Make it persistent by adding to the Netplan configuration or a network configuration script:

```bash
# Add to /etc/rc.local or a systemd service
sudo tee /etc/systemd/system/nic-tuning.service <<EOF
[Unit]
Description=NIC ring buffer and offload tuning
After=network.target

[Service]
Type=oneshot
ExecStart=/sbin/ethtool -G eth0 rx 2048 tx 2048
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl enable --now nic-tuning.service
```

## Offload Settings

NICs can offload packet processing work from the CPU. Sometimes disabling an offload that is misbehaving resolves performance issues:

```bash
# View current offload settings
sudo ethtool -k eth0

# Common offloads:
# rx-checksumming: on        # NIC verifies incoming packet checksums
# tx-checksumming: on        # NIC calculates outgoing checksums
# scatter-gather: on         # Send data from multiple memory regions
# tcp-segmentation-offload: on  # NIC breaks large TCP segments
# generic-segmentation-offload: on
# generic-receive-offload: on   # Combine incoming packets before sending to kernel

# Disable a specific offload (useful for troubleshooting)
sudo ethtool -K eth0 tso off    # Disable TCP segmentation offload
sudo ethtool -K eth0 gro off    # Disable generic receive offload

# Re-enable it
sudo ethtool -K eth0 tso on
```

GSO/GRO offloads sometimes cause issues with certain VPN configurations or unusual traffic patterns. Disabling them temporarily and testing is a valid troubleshooting step.

## Network Diagnostics Test

Some NICs support a self-test:

```bash
# Run NIC self-test (not supported by all drivers)
sudo ethtool -t eth0

# The test checks internal NIC components:
# PHY registers, EEPROM, interrupt handling, loopback
```

## Monitoring Interface Statistics Over Time

For trending, compare statistics at intervals:

```bash
# Simple monitor script
#!/bin/bash
# Save to /usr/local/bin/nic-monitor.sh

INTERFACE=${1:-eth0}
INTERVAL=${2:-5}

echo "Monitoring $INTERFACE every ${INTERVAL}s (Ctrl-C to stop)"
while true; do
    echo -n "$(date +%H:%M:%S) - "
    sudo ethtool -S "$INTERFACE" 2>/dev/null | \
      grep -E 'rx_errors|tx_errors|rx_dropped|tx_dropped|rx_crc|rx_missed' | \
      tr '\n' ' '
    echo ""
    sleep "$INTERVAL"
done
```

```bash
sudo chmod +x /usr/local/bin/nic-monitor.sh
sudo /usr/local/bin/nic-monitor.sh eth0 10
```

## Common Problem Diagnostics

### NIC Reports 100Mb Instead of 1000Mb

```bash
sudo ethtool eth0 | grep Speed
# Speed: 100Mb/s  <- Should be 1000Mb/s

# Cause: usually a bad cable (Cat5 instead of Cat5e/Cat6), a failing switch port,
# or auto-negotiation failure

# Fix 1: Try a different cable
# Fix 2: Force 1Gbps (may not work if the cable genuinely cannot support it)
sudo ethtool -s eth0 speed 1000 duplex full autoneg off

# Fix 3: Check the switch port configuration
```

### Half-Duplex Detection

```bash
sudo ethtool eth0 | grep Duplex
# Duplex: Half  <- Very bad on modern networks

# Force full duplex
sudo ethtool -s eth0 speed 100 duplex full autoneg off
# Or enable auto-negotiation and retest
sudo ethtool -s eth0 autoneg on
```

### High CRC Error Rate

```bash
sudo ethtool -S eth0 | grep crc
# rx_crc_errors: 1247  <- Physical problem

# CRC errors with a working link usually mean:
# 1. Bad cable (replace it)
# 2. Faulty switch port (try a different port)
# 3. Failing NIC transceiver
# 4. EMI/RFI interference (check cable routing near power lines or motors)
```

ethtool gives you ground truth about what the hardware is actually doing. For a system where `ip link` shows the interface is up and packets are flowing, but performance is degraded or connections are dropping, ethtool's statistics and speed/duplex information almost always point to the root cause.
