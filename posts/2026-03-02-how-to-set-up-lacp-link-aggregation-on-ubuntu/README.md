# How to Set Up LACP Link Aggregation on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Networking, LACP, Bonding, High Availability

Description: Configure LACP (802.3ad) link aggregation on Ubuntu to combine multiple network interfaces into a single logical bond for increased bandwidth and redundancy.

---

Link aggregation combines multiple physical network interfaces into a single logical interface. LACP (Link Aggregation Control Protocol), defined in IEEE 802.3ad, is the dynamic negotiation protocol that coordinates link aggregation between a server and a switch. On Ubuntu, link aggregation (called bonding) is well-supported through the kernel's bonding driver, and Netplan makes persistent configuration straightforward.

## Why Use LACP vs Other Bonding Modes

Ubuntu supports several bonding modes:

- **mode 0 (balance-rr)**: Round-robin, no switch coordination needed
- **mode 1 (active-backup)**: One interface active, others standby
- **mode 2 (balance-xor)**: XOR hash distribution
- **mode 4 (802.3ad/LACP)**: Dynamic LACP negotiation with the switch
- **mode 5 (balance-tlb)**: Adaptive transmit load balancing
- **mode 6 (balance-alb)**: Adaptive load balancing (both TX and RX)

LACP (mode 4) requires switch support and coordination, but gives you true active-active bonding that the switch understands. The switch and server negotiate which interfaces are in the aggregate and can detect failures promptly. This is the preferred mode for production server-to-switch links when the switch supports LACP.

## Prerequisites

- Ubuntu 20.04 or 22.04
- A switch that supports LACP (802.3ad)
- Two or more network interfaces on the Ubuntu server
- The interfaces should be connected to the same switch or to a switch stack

**Configure the switch first**: On the switch, create a port-channel or LAG interface and set the member ports to LACP mode (active or passive). Specific steps depend on your switch model.

## Checking Available Interfaces

```bash
# List network interfaces
ip link show

# Check interface driver and hardware details
ethtool eth0
ethtool eth1

# Verify both interfaces are up and connected
ip -br link show
```

For bonding to work, the interfaces should ideally be the same speed and duplex.

## Installing Required Packages

```bash
sudo apt update
sudo apt install -y ifenslave ethtool
```

The `ifenslave` package provides tools for managing bond interfaces.

## Checking the Bonding Module

```bash
# Load the bonding kernel module
sudo modprobe bonding

# Verify it loaded
lsmod | grep bonding

# Make it load at boot
echo "bonding" | sudo tee /etc/modules-load.d/bonding.conf
```

## Configuring LACP with Netplan

Netplan is Ubuntu's default network configuration system. Edit the Netplan configuration to set up bonding:

```bash
# Find your existing Netplan configuration
ls /etc/netplan/

# Edit or create the configuration file
sudo nano /etc/netplan/00-installer-config.yaml
```

```yaml
# /etc/netplan/00-installer-config.yaml
network:
  version: 2
  renderer: networkd

  ethernets:
    # Configure member interfaces - they should have no IP addresses
    eth0:
      dhcp4: false
      dhcp6: false
    eth1:
      dhcp4: false
      dhcp6: false

  bonds:
    bond0:
      # Specify the member interfaces
      interfaces:
        - eth0
        - eth1

      # Configure bond parameters
      parameters:
        # mode 802.3ad = LACP
        mode: 802.3ad

        # How often to send LACP PDUs (fast = 1s, slow = 30s)
        lacp-rate: fast

        # Minimum number of links that must be active
        min-links: 1

        # Hash policy for transmit load balancing
        # layer3+4 = hash based on IP and port (best for most workloads)
        transmit-hash-policy: layer3+4

        # MII monitoring interval in milliseconds (link up/down detection)
        mii-monitor-interval: 100

      # Configure the bond IP address
      dhcp4: false
      addresses:
        - 192.168.1.100/24
      routes:
        - to: default
          via: 192.168.1.1
      nameservers:
        addresses:
          - 8.8.8.8
          - 8.8.4.4
```

Apply the configuration:

```bash
# Test the configuration first
sudo netplan try

# If it looks correct, apply permanently
sudo netplan apply
```

## Verifying LACP Operation

After applying the configuration, verify the bond is working:

```bash
# Check bond interface status
cat /proc/net/bonding/bond0
```

The output shows detailed bond status:

```
Ethernet Channel Bonding Driver: v6.x

Bonding Mode: IEEE 802.3ad Dynamic link aggregation
Transmit Hash Policy: layer3+4 (1)
MII Status: up
MII Polling Interval (ms): 100
Up Delay (ms): 0
Down Delay (ms): 0

802.3ad info
LACP rate: fast
Min links: 0
Aggregator selection policy (ad_select): stable
System priority: 65535
System MAC address: aa:bb:cc:dd:ee:ff
Active Aggregator Info:
        Aggregator ID: 1
        Number of ports: 2
        Actor Key: 15
        Partner Key: 1
        Partner Mac Address: 00:11:22:33:44:55

Slave Interface: eth0
MII Status: up
Speed: 1000 Mbps
Duplex: full
Link Failure Count: 0
Permanent HW addr: aa:bb:cc:dd:ee:ff
Slave queue ID: 0
Aggregator ID: 1
Actor Churn State: none
Partner Churn State: none

Slave Interface: eth1
MII Status: up
Speed: 1000 Mbps
Duplex: full
Link Failure Count: 0
...
```

Both interfaces should show as members of the same aggregator ID. If an interface shows a different aggregator ID, LACP negotiation failed for that interface - check the switch configuration.

```bash
# Check the bond interface in ip
ip link show bond0
ip addr show bond0

# Check LACP statistics
ethtool -S eth0 | grep lacp

# View LACP state more detailed
ip -d link show bond0
```

## Testing Redundancy

Verify that removing one link does not disrupt connectivity:

```bash
# While running a ping to another host, bring down one slave interface
ping 192.168.1.1 &

# Disconnect eth0 or disable it
sudo ip link set eth0 down

# The ping should continue without interruption
# Check bond status - should show eth1 as the only active slave
cat /proc/net/bonding/bond0

# Restore eth0
sudo ip link set eth0 up

# After LACP re-negotiates, both interfaces should be active again
cat /proc/net/bonding/bond0
```

## Measuring Bandwidth

LACP provides bandwidth aggregation for flows, not for individual connections. Each TCP session uses one interface. Test aggregate throughput with multiple simultaneous streams:

```bash
# Install iperf3 on both client and server
sudo apt install -y iperf3

# On the server (192.168.1.200)
iperf3 -s

# On the client, run multiple parallel streams to use both links
iperf3 -c 192.168.1.200 -P 4 -t 30
```

With `layer3+4` hash policy and multiple TCP streams to different ports, traffic distributes across both interfaces.

## Configuration Without Netplan (Systemd-networkd)

For systems using systemd-networkd directly instead of Netplan:

```bash
# Create bond netdev file
sudo nano /etc/systemd/network/20-bond0.netdev
```

```ini
[NetDev]
Name=bond0
Kind=bond

[Bond]
Mode=802.3ad
LACPTransmitRate=fast
TransmitHashPolicy=layer3+4
MIIMonitorSec=100ms
MinLinks=1
```

```bash
# Configure the bond network settings
sudo nano /etc/systemd/network/30-bond0.network
```

```ini
[Match]
Name=bond0

[Network]
Address=192.168.1.100/24
Gateway=192.168.1.1
DNS=8.8.8.8
```

```bash
# Create per-interface files to add them to the bond
sudo nano /etc/systemd/network/10-eth0.network
```

```ini
[Match]
Name=eth0

[Network]
Bond=bond0
```

```bash
# Repeat for eth1
sudo nano /etc/systemd/network/10-eth1.network
```

```ini
[Match]
Name=eth1

[Network]
Bond=bond0
```

```bash
sudo systemctl restart systemd-networkd
```

## Troubleshooting LACP Issues

**LACP not negotiating (interfaces in different aggregators)**:

```bash
# Check LACP PDU exchange on the interface
sudo tcpdump -i eth0 ether proto 0x8809 -v

# You should see LACP PDUs being sent and received
# If only sending and not receiving, the switch is not sending LACP back
# Verify the switch has LACP enabled on the correct port
```

**Bond interface has no IP after reboot**:

```bash
# Check Netplan applied correctly
sudo netplan --debug apply 2>&1 | head -50

# Check systemd-networkd if using it
sudo networkctl status bond0
```

**One interface not joining the aggregate**:

- Verify both interfaces connect to the same switch or switch stack
- Confirm the switch has both ports in the same port-channel
- Check that the interfaces have the same speed and duplex: `ethtool eth0`

LACP is the right bonding mode when you have switch support and need the switch to actively participate in link management. The dynamic negotiation means the switch knows which interfaces are in the aggregate, which prevents loops and allows proper traffic distribution.
