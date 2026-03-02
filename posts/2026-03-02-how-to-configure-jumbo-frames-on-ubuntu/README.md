# How to Configure Jumbo Frames on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Networking, Jumbo Frames, MTU, Performance

Description: Configure jumbo frames on Ubuntu by setting MTU values above 1500 bytes for improved network performance in storage and high-throughput environments.

---

Jumbo frames are Ethernet frames with an MTU (Maximum Transmission Unit) larger than the standard 1500 bytes. Most networks support jumbo frames up to 9000 bytes, though 9216 is also common. Reducing the per-packet overhead for large data transfers - storage traffic, backups, VM migrations - can meaningfully improve throughput and reduce CPU load.

This guide covers how to configure jumbo frames on Ubuntu, verify end-to-end support, and troubleshoot common issues.

## When Jumbo Frames Help

Jumbo frames benefit specific workloads:

- **NFS and iSCSI storage traffic** - large sequential reads/writes benefit most from larger frames
- **VM live migration** - moving large memory images benefits from reduced framing overhead
- **Backup traffic** - bulk data transfer across a dedicated backup network
- **HPC and scientific computing** - large data transfers between nodes

Jumbo frames do not help (and may hurt) mixed-traffic networks, internet-facing interfaces, or connections with diverse MTU paths.

## Requirements

All devices in the end-to-end path must support and be configured for jumbo frames:

- Network Interface Card (NIC)
- Switch ports on every switch in the path
- All hosts involved in the communication

If any single device in the path does not support the configured MTU, you will see packet fragmentation or dropped packets.

## Checking Current MTU

```bash
# Show MTU for all interfaces
ip link show

# Show MTU for a specific interface
ip link show eth0 | grep mtu
```

Output:

```
2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc fq_codel state UP mode DEFAULT group default qlen 1000
```

The default MTU is 1500 bytes.

## Setting MTU Temporarily

For testing, set the MTU without making it persistent:

```bash
# Set MTU to 9000 on eth0
sudo ip link set eth0 mtu 9000

# Verify
ip link show eth0 | grep mtu
```

The change takes effect immediately but does not survive a reboot.

## Setting MTU Persistently with Netplan

Netplan is the recommended way to set MTU persistently on Ubuntu servers:

```yaml
# /etc/netplan/01-network.yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    eth0:
      dhcp4: false
      addresses:
        - 192.168.1.100/24
      routes:
        - to: default
          via: 192.168.1.1
      # Set jumbo frame MTU
      mtu: 9000
```

Apply the configuration:

```bash
sudo netplan apply
```

Verify:

```bash
ip link show eth0
```

### MTU for Bonded Interfaces

The MTU on a bond should be set on the bond interface, not on the individual member interfaces:

```yaml
bonds:
  bond0:
    interfaces: [eth0, eth1]
    mtu: 9000
    parameters:
      mode: active-backup
      mii-monitor-interval: 100
```

Netplan propagates the MTU setting to the member interfaces automatically.

### MTU for VLAN Interfaces

VLAN interfaces inherit the parent interface's MTU, but you can set it explicitly. Note that VLAN tagging adds 4 bytes, so a parent interface MTU of 9000 supports a VLAN MTU of 8996:

```yaml
ethernets:
  eth0:
    mtu: 9000
vlans:
  eth0.100:
    id: 100
    link: eth0
    mtu: 9000    # Can be up to parent - 4 for VLAN tag
    addresses: [192.168.100.1/24]
```

## Setting MTU with NetworkManager (Desktop)

For desktop Ubuntu using NetworkManager:

```bash
# Set MTU for a connection
nmcli connection modify "Wired connection 1" 802-3-ethernet.mtu 9000

# Apply the change
nmcli connection up "Wired connection 1"

# Verify
nmcli connection show "Wired connection 1" | grep mtu
```

## Verifying End-to-End Jumbo Frame Support

Setting a large MTU locally is only the first step. Verify that jumbo frames can traverse the entire path.

### Test with ping and Large Packets

```bash
# Ping with a 9000-byte packet (MTU 9000 = 8972 data + 28 IP/ICMP headers)
# -M do = don't fragment (causes error if path MTU is smaller)
# -s 8972 = data payload size
ping -M do -s 8972 192.168.1.200

# Test with various packet sizes to find the actual path MTU
ping -M do -s 8972 192.168.1.200   # 9000 byte frame
ping -M do -s 8000 192.168.1.200   # 8028 byte frame
ping -M do -s 1472 192.168.1.200   # 1500 byte frame (standard)
```

If the large ping succeeds, jumbo frames are working end-to-end. If it fails with "Message too long" or "Frag needed", something in the path does not support that MTU.

### Discover Path MTU

```bash
# Use tracepath to discover the MTU at each hop
tracepath -n 192.168.1.200

# Or use the path MTU discovery mechanism
# (requires icmp errors to be passed through)
sudo nmap --script=path-mtu 192.168.1.200
```

### Test Actual Throughput

After configuring jumbo frames, verify improved throughput:

```bash
# Install iperf3
sudo apt install iperf3

# On the remote host (server mode):
iperf3 -s

# On this host (client mode):
# Test with default MTU first
iperf3 -c 192.168.1.200 -t 30 -M 1460   # Standard MSS

# Then test with jumbo frame MSS
iperf3 -c 192.168.1.200 -t 30 -M 8960   # Jumbo frame MSS
```

Compare the throughput numbers. For dedicated storage networks, jumbo frames can provide 10-30% throughput improvement and noticeable CPU reduction.

## NFS with Jumbo Frames

For NFS performance, configure jumbo frames on both the server and client, then tune the NFS mount options to use large read/write sizes:

```bash
# Mount NFS with large block sizes to take advantage of jumbo frames
sudo mount -t nfs -o rsize=65536,wsize=65536 192.168.1.50:/data /mnt/nfs

# Or add to /etc/fstab
# 192.168.1.50:/data /mnt/nfs nfs rsize=65536,wsize=65536,timeo=14,_netdev 0 0
```

## iSCSI with Jumbo Frames

For iSCSI targets, configure the MTU in the initiator configuration:

```bash
# Edit open-iscsi settings
sudo nano /etc/iscsi/iscsid.conf

# Set the interface MTU (the iSCSI initiator uses the system network stack)
# Ensure the network interface is configured for jumbo frames via Netplan
```

The iSCSI initiator uses the network interface's MTU automatically.

## Troubleshooting

### Packets Getting Fragmented

If you see fragmented packets despite configuring jumbo frames:

```bash
# Check for ICMP "Fragmentation Needed" messages
sudo tcpdump -i eth0 icmp and 'icmp[icmptype] = icmp-unreach' -v

# Check for fragmented IP packets
sudo tcpdump -i eth0 'ip[6:2] & 0x1fff != 0' -c 50
```

Fragmentation indicates a device in the path has a smaller MTU than expected.

### Connection Issues After Enabling Jumbo Frames

If connections break after increasing the MTU:

```bash
# Check for PMTUD blackhole (ICMP errors being blocked)
# Temporarily add ICMP unreachable rules to allow path MTU discovery
sudo iptables -I INPUT -p icmp --icmp-type destination-unreachable -j ACCEPT
sudo iptables -I FORWARD -p icmp --icmp-type destination-unreachable -j ACCEPT

# Test connectivity again
ping -M do -s 8972 192.168.1.200
```

### Verify NIC Supports Jumbo Frames

Not all NICs support 9000-byte MTU. Check the maximum:

```bash
# Some NICs report their maximum MTU
sudo ethtool -i eth0 | grep driver
# Then check the driver's documentation

# Try setting different MTU values to find the maximum
sudo ip link set eth0 mtu 9000
# If this fails, try smaller values: 8000, 7000, etc.
```

Jumbo frames are one of the higher-value tuning options for dedicated storage and high-throughput networks. The investment in verifying end-to-end support is worth it - misconfigured MTU causes subtle performance issues and intermittent failures that are frustrating to diagnose without knowing to check the MTU.
