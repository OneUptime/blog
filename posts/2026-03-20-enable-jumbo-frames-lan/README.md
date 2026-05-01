# How to Enable Jumbo Frames for Local Network Performance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Jumbo Frame, MTU, Linux, Network Performance, LAN, ethtool

Description: Learn how to enable jumbo frames (9000-byte MTU) on Linux for local network performance improvement, covering NIC configuration, switch requirements, and verification.

## What Are Jumbo Frames?

Standard Ethernet frames have a Maximum Transmission Unit (MTU) of 1500 bytes. Jumbo frames increase this to 9000 bytes (or 9216 for some NICs), allowing larger payloads per frame.

Benefits on LAN:
- Fewer frames to transmit the same data → lower CPU overhead
- Fewer interrupts per MB of data
- Higher throughput for large bulk transfers (NFS, iSCSI, backups)
- Can improve bulk-transfer throughput when every device in the path is configured for the larger MTU

**Important**: Jumbo frames are usually practical only on controlled local networks. All devices in the path (NICs, switches, and any routed hops) must support the chosen MTU.

## Step 1: Verify Hardware Support

```bash
# Check maximum MTU supported by the NIC

ip -d link show eth0
# look for "minmtu" / "maxmtu" fields (if present)

# Check with ethtool
ethtool -i eth0
# Note the driver name

# Test if jumbo MTU is accepted
sudo ip link set eth0 mtu 9000 2>&1
# If no error, the NIC supports it
```

## Step 2: Enable Jumbo Frames on Linux

```bash
# Set MTU to 9000 on the interface
sudo ip link set eth0 mtu 9000

# Verify
ip link show eth0 | grep mtu
# should show: mtu 9000

# Test with a large IPv4 ping (9000 - 28 bytes header = 8972 bytes payload)
ping -M do -s 8972 192.168.1.1
# If successful from both endpoints, jumbo frames are working end-to-end
```

## Step 3: Make MTU Persistent

```bash
# Method 1: /etc/network/interfaces (Debian/Ubuntu with ifupdown)
sudo tee -a /etc/network/interfaces > /dev/null << 'EOF'
auto eth0
iface eth0 inet static
    address 192.168.1.10
    netmask 255.255.255.0
    gateway 192.168.1.1
    mtu 9000
EOF

# Method 2: NetworkManager (most modern systems)
sudo nmcli connection modify "Wired connection 1" 802-3-ethernet.mtu 9000
sudo nmcli connection up "Wired connection 1"

# Method 3: netplan (Ubuntu 18.04+)
sudo tee /etc/netplan/01-netcfg.yaml > /dev/null << 'EOF'
network:
  version: 2
  ethernets:
    eth0:
      dhcp4: false
      addresses:
        - 192.168.1.10/24
      routes:
        - to: default
          via: 192.168.1.1
      mtu: 9000
EOF
sudo netplan apply
```

## Step 4: Configure Jumbo Frames on the Switch

All switches in the path must support jumbo frames. Example for common platforms:

**Cisco Catalyst (platform-dependent):**
```text
! Many Catalyst platforms use a global jumbo MTU command
system mtu jumbo 9000

! Cisco IOS XE 17.1.1+ also supports per-port MTU on supported hardware
interface GigabitEthernet1/0/1
 mtu 9000
```

**Arista EOS (routed interface example):**
```text
interface Ethernet1
   no switchport
   mtu 9000
```

**Linux bridge:**
```bash
# Set MTU on bridge member interfaces, then on the bridge itself
sudo ip link set eth0 mtu 9000
sudo ip link set eth1 mtu 9000
sudo ip link set br0 mtu 9000
```

## Step 5: Verify End-to-End Jumbo Frame Support

```bash
# Test jumbo ping to remote host (must have jumbo frames configured)
# -M do = set DF, -s 8972 = 8972 byte payload (+ 28 bytes IPv4+ICMP header = 9000)
ping -M do -s 8972 192.168.1.100

# Run the test from both endpoints. If you get "Message too long",
# the path MTU is smaller somewhere along the path.

# Trace the MTU along the path
tracepath -n 192.168.1.100
# Can help identify where the discovered path MTU drops

# Test throughput improvement
# Before jumbo frames:
iperf3 -c 192.168.1.100 -t 30
# After jumbo frames:
iperf3 -c 192.168.1.100 -t 30
```

## Step 6: NFS and iSCSI Jumbo Frame Configuration

Jumbo frames provide the most benefit for storage protocols:

```bash
# NFS with jumbo frames
# Ensure both NFS server and client have MTU 9000 on the storage interface.
# No jumbo-frame-specific mount option is required.
sudo mount -t nfs 192.168.1.200:/data /mnt/data

# iSCSI with jumbo frames
# iSCSI also uses the interface MTU; no special iSCSI payload setting is
# required just to enable jumbo frames. Verify the storage NIC is set correctly.
ip link show eth1 | grep mtu
```

## Conclusion

Jumbo frames improve bulk transfer throughput on controlled local networks by reducing per-packet overhead. Enable with `ip link set eth0 mtu 9000`, verify with a large fragmentation-forbidden ping, and persist through NetworkManager, netplan, or `/etc/network/interfaces`. Ensure all switches in the path are also configured for jumbo frames - a single smaller-MTU device in the path will break end-to-end jumbo-frame traffic.
