# How to Set Up Network Bonding/Teaming on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, Network, Bonding, Teaming, High Availability, Tutorial

Description: Configure network interface bonding on Ubuntu for increased bandwidth, redundancy, and high availability using Netplan.

---

Network bonding (also called NIC teaming) combines multiple network interfaces into a single logical interface. This provides redundancy, load balancing, or increased throughput depending on the mode. This guide covers setting up bonding on Ubuntu using Netplan.

## Understanding Bonding Modes

| Mode | Name | Description |
|------|------|-------------|
| 0 | balance-rr | Round-robin across interfaces (increased throughput) |
| 1 | active-backup | One active, others standby (fault tolerance) |
| 2 | balance-xor | XOR-based balancing (load balancing) |
| 3 | broadcast | Transmit on all interfaces |
| 4 | 802.3ad | LACP - requires switch support (best for throughput) |
| 5 | balance-tlb | Adaptive transmit load balancing |
| 6 | balance-alb | Adaptive load balancing (tx and rx) |

### Choosing a Mode

- **Fault tolerance only**: Mode 1 (active-backup)
- **Increased throughput + fault tolerance**: Mode 4 (802.3ad) with LACP-capable switch
- **Load balancing without switch support**: Mode 6 (balance-alb)

## Prerequisites

- Ubuntu 20.04, 22.04, or 24.04
- Two or more network interfaces
- Root or sudo access
- For mode 4: LACP-capable switch

## Identify Network Interfaces

```bash
# List all network interfaces
ip link show

# Show interface details
ip addr

# Alternative: use lshw
sudo lshw -class network -short

# Check interface status
cat /sys/class/net/*/operstate
```

Note your interface names (e.g., `eth0`, `eth1`, `enp0s3`, `enp0s8`).

## Install Bonding Module

The bonding kernel module should be available by default:

```bash
# Check if bonding module is available
modinfo bonding

# Load bonding module
sudo modprobe bonding

# Verify it's loaded
lsmod | grep bonding
```

## Configure Bonding with Netplan

Ubuntu uses Netplan for network configuration.

### Backup Existing Configuration

```bash
# Backup current netplan config
sudo cp /etc/netplan/*.yaml /etc/netplan/backup/
```

### Mode 1: Active-Backup (Fault Tolerance)

Best for redundancy without switch configuration:

```bash
sudo nano /etc/netplan/01-netcfg.yaml
```

```yaml
network:
  version: 2
  renderer: networkd

  ethernets:
    # Define physical interfaces - no IP config here
    enp0s3:
      dhcp4: false
    enp0s8:
      dhcp4: false

  bonds:
    bond0:
      interfaces:
        - enp0s3
        - enp0s8
      addresses:
        - 192.168.1.100/24
      routes:
        - to: default
          via: 192.168.1.1
      nameservers:
        addresses:
          - 8.8.8.8
          - 8.8.4.4
      parameters:
        mode: active-backup
        primary: enp0s3
        mii-monitor-interval: 100
```

### Mode 4: 802.3ad (LACP)

Requires switch configured for LACP:

```yaml
network:
  version: 2
  renderer: networkd

  ethernets:
    enp0s3:
      dhcp4: false
    enp0s8:
      dhcp4: false

  bonds:
    bond0:
      interfaces:
        - enp0s3
        - enp0s8
      addresses:
        - 192.168.1.100/24
      routes:
        - to: default
          via: 192.168.1.1
      nameservers:
        addresses:
          - 8.8.8.8
          - 8.8.4.4
      parameters:
        mode: 802.3ad
        lacp-rate: fast
        mii-monitor-interval: 100
        transmit-hash-policy: layer3+4
```

### Mode 6: Adaptive Load Balancing

Works without special switch configuration:

```yaml
network:
  version: 2
  renderer: networkd

  ethernets:
    enp0s3:
      dhcp4: false
    enp0s8:
      dhcp4: false

  bonds:
    bond0:
      interfaces:
        - enp0s3
        - enp0s8
      addresses:
        - 192.168.1.100/24
      routes:
        - to: default
          via: 192.168.1.1
      nameservers:
        addresses:
          - 8.8.8.8
      parameters:
        mode: balance-alb
        mii-monitor-interval: 100
```

### DHCP Configuration

To use DHCP instead of static IP:

```yaml
network:
  version: 2
  renderer: networkd

  ethernets:
    enp0s3:
      dhcp4: false
    enp0s8:
      dhcp4: false

  bonds:
    bond0:
      interfaces:
        - enp0s3
        - enp0s8
      dhcp4: true
      parameters:
        mode: active-backup
        primary: enp0s3
        mii-monitor-interval: 100
```

## Apply Configuration

```bash
# Validate configuration syntax
sudo netplan generate

# Test configuration (reverts after 120 seconds if no confirmation)
sudo netplan try

# Apply configuration permanently
sudo netplan apply
```

## Verify Bonding

### Check Bond Status

```bash
# View bond interface
ip addr show bond0

# Detailed bond information
cat /proc/net/bonding/bond0

# Check link status
ip link show
```

### Expected Output

```
$ cat /proc/net/bonding/bond0
Ethernet Channel Bonding Driver: v5.15.0

Bonding Mode: fault-tolerance (active-backup)
Primary Slave: enp0s3 (primary_reselect always)
Currently Active Slave: enp0s3
MII Status: up
MII Polling Interval (ms): 100

Slave Interface: enp0s3
MII Status: up
Speed: 1000 Mbps
Duplex: full

Slave Interface: enp0s8
MII Status: up
Speed: 1000 Mbps
Duplex: full
```

## Testing Failover

### Mode 1 (Active-Backup) Test

```bash
# Watch bond status in one terminal
watch -n 1 cat /proc/net/bonding/bond0

# In another terminal, simulate interface failure
sudo ip link set enp0s3 down

# Verify failover occurred (Active Slave changed)
# Restore interface
sudo ip link set enp0s3 up
```

### Continuous Ping Test

```bash
# Start ping to gateway while testing failover
ping -i 0.2 192.168.1.1

# Should see minimal packet loss during failover
```

## Bonding Parameters

### Common Parameters

```yaml
parameters:
  # Bonding mode (required)
  mode: active-backup

  # Primary interface for active-backup mode
  primary: enp0s3

  # Link monitoring interval in milliseconds
  mii-monitor-interval: 100

  # For 802.3ad mode
  lacp-rate: fast  # fast or slow
  transmit-hash-policy: layer3+4

  # ARP monitoring (alternative to MII)
  arp-interval: 100
  arp-ip-targets:
    - 192.168.1.1
```

### Transmit Hash Policies (for modes 2, 4)

| Policy | Description |
|--------|-------------|
| layer2 | MAC addresses |
| layer2+3 | MAC + IP addresses |
| layer3+4 | IP addresses + ports (best for varied traffic) |
| encap2+3 | Encapsulated layer 2+3 |
| encap3+4 | Encapsulated layer 3+4 |

## Bonding with VLANs

Add VLANs on top of the bond:

```yaml
network:
  version: 2
  renderer: networkd

  ethernets:
    enp0s3:
      dhcp4: false
    enp0s8:
      dhcp4: false

  bonds:
    bond0:
      interfaces:
        - enp0s3
        - enp0s8
      parameters:
        mode: 802.3ad
        mii-monitor-interval: 100

  vlans:
    bond0.100:
      id: 100
      link: bond0
      addresses:
        - 192.168.100.10/24

    bond0.200:
      id: 200
      link: bond0
      addresses:
        - 192.168.200.10/24
```

## Bonding with Bridges

For VMs or containers:

```yaml
network:
  version: 2
  renderer: networkd

  ethernets:
    enp0s3:
      dhcp4: false
    enp0s8:
      dhcp4: false

  bonds:
    bond0:
      interfaces:
        - enp0s3
        - enp0s8
      parameters:
        mode: active-backup
        mii-monitor-interval: 100

  bridges:
    br0:
      interfaces:
        - bond0
      addresses:
        - 192.168.1.100/24
      routes:
        - to: default
          via: 192.168.1.1
      nameservers:
        addresses:
          - 8.8.8.8
```

## Monitoring Bonding

### Real-Time Status

```bash
# Watch bond status
watch -n 1 cat /proc/net/bonding/bond0

# Monitor network statistics
watch -n 1 "ip -s link show bond0"

# View interface throughput
iftop -i bond0
```

### Check for Issues

```bash
# View kernel messages for bond events
dmesg | grep -i bond

# Check systemd-networkd logs
journalctl -u systemd-networkd -f

# Network interface statistics
netstat -i
```

## Troubleshooting

### Bond Not Coming Up

```bash
# Check netplan configuration syntax
sudo netplan generate

# View detailed errors
sudo netplan --debug generate

# Check interface status
ip link show

# Verify bonding module is loaded
lsmod | grep bonding
```

### Slave Interface Not Joining

```bash
# Check interface is not already configured
ip addr show enp0s3

# Release any existing IP
sudo ip addr flush dev enp0s3

# Manually add to bond (for testing)
sudo ip link set enp0s3 master bond0
```

### Slow Failover

Reduce monitoring interval:

```yaml
parameters:
  mii-monitor-interval: 50  # Faster detection
```

Or use ARP monitoring:

```yaml
parameters:
  arp-interval: 100
  arp-ip-targets:
    - 192.168.1.1
```

### Mode 4 Not Working

Ensure switch is configured for LACP:
- Create LACP port channel/LAG
- Add both switch ports to the channel
- Verify LACP negotiation: `cat /proc/net/bonding/bond0`

## Performance Testing

### Test Bandwidth

```bash
# Install iperf3
sudo apt install iperf3 -y

# On server
iperf3 -s

# On client
iperf3 -c server_ip -P 4  # 4 parallel streams
```

### Check Link Speed

```bash
# View interface speed
ethtool enp0s3 | grep Speed
ethtool enp0s8 | grep Speed

# Combined bond speed depends on mode
# Mode 4 with 2x 1Gbps = up to 2Gbps aggregate
```

## Removing Bonding

To revert to single interface:

```bash
sudo nano /etc/netplan/01-netcfg.yaml
```

```yaml
network:
  version: 2
  renderer: networkd

  ethernets:
    enp0s3:
      dhcp4: true
```

```bash
sudo netplan apply
```

---

Network bonding significantly improves reliability and can increase throughput in the right configuration. Mode 1 (active-backup) is simplest and works universally, while Mode 4 (802.3ad) provides the best throughput but requires switch support. Always test failover scenarios before relying on bonding for production workloads.
