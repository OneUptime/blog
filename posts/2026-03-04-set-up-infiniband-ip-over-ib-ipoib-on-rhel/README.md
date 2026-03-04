# How to Set Up InfiniBand IP over IB (IPoIB) on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, InfiniBand, IPoIB, Networking, HPC

Description: Configure IP over InfiniBand (IPoIB) on RHEL to run standard IP networking over InfiniBand fabric, enabling TCP/UDP applications on high-speed interconnects.

---

IPoIB (IP over InfiniBand) lets you run standard IP traffic over an InfiniBand fabric. This allows existing TCP/UDP applications to benefit from InfiniBand bandwidth without modification. IPoIB supports two modes: Datagram mode and Connected mode.

## Prerequisites

Ensure InfiniBand drivers and the subnet manager are running:

```bash
# Verify InfiniBand is active
ibstat

# Check that ib0 interface exists
ip link show ib0
```

## Configure IPoIB with nmcli

```bash
# Create an IPoIB connection in connected mode
sudo nmcli connection add type infiniband ifname ib0 con-name ib0-ipoib \
    ipv4.addresses 10.10.0.1/24 \
    ipv4.method manual \
    infiniband.transport-mode connected

# Bring up the connection
sudo nmcli connection up ib0-ipoib

# Verify the IP is assigned
ip addr show ib0
```

## Datagram vs Connected Mode

Datagram mode (default) has lower overhead but limits MTU to 2044 bytes:

```bash
# Set datagram mode
sudo nmcli connection modify ib0-ipoib infiniband.transport-mode datagram
sudo nmcli connection up ib0-ipoib

# Check the MTU
ip link show ib0
# Datagram mode: MTU 2044
```

Connected mode supports larger MTU (up to 65520 bytes) for better throughput:

```bash
# Set connected mode with jumbo MTU
sudo nmcli connection modify ib0-ipoib infiniband.transport-mode connected
sudo nmcli connection modify ib0-ipoib 802-3-ethernet.mtu 65520
sudo nmcli connection up ib0-ipoib

# Verify MTU
ip link show ib0
# Connected mode: MTU 65520
```

## Create IPoIB Child Interfaces (P_Key Partitions)

Partition keys allow network segmentation over InfiniBand:

```bash
# Create a child interface on partition key 0x8001
sudo nmcli connection add type infiniband ifname ib0.8001 con-name ib0-pkey \
    infiniband.parent ib0 \
    infiniband.p-key 0x8001 \
    ipv4.addresses 10.20.0.1/24 \
    ipv4.method manual

sudo nmcli connection up ib0-pkey
```

## Test Connectivity

```bash
# Ping another IPoIB host
ping -c 4 10.10.0.2

# Test bandwidth with iperf3
# Server side
iperf3 -s -B 10.10.0.1

# Client side
iperf3 -c 10.10.0.1 -t 30
```

## Verify IPoIB Mode

```bash
# Check the current transport mode
cat /sys/class/net/ib0/mode

# Output: "datagram" or "connected"
```

## Persistent Configuration

The nmcli connection is already persistent. Verify it survives a reboot:

```bash
# List saved connections
nmcli connection show

# Check auto-connect is enabled
nmcli connection show ib0-ipoib | grep autoconnect
```

IPoIB lets you use standard networking tools and applications over InfiniBand on RHEL, making it easy to integrate high-performance interconnects into existing infrastructure.
