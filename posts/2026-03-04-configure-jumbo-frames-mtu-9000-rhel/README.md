# How to Configure Jumbo Frames and MTU 9000 on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Networking, Jumbo Frames, MTU, Performance

Description: Configure jumbo frames (MTU 9000) on RHEL network interfaces to improve throughput for storage networks, backup traffic, and high-bandwidth applications.

---

Jumbo frames increase the Maximum Transmission Unit (MTU) from the default 1500 bytes to 9000 bytes, reducing CPU overhead per byte transferred. They are commonly used on storage networks and for inter-server communication where all network devices support the larger frame size.

## Prerequisites

All network devices in the path (NICs, switches, routers) must support jumbo frames. A single device with a lower MTU will cause packet fragmentation or drops.

## Setting MTU Using NetworkManager

```bash
# Check the current MTU on the interface
ip link show ens192 | grep mtu

# Set MTU to 9000 using nmcli
sudo nmcli connection modify ens192 802-3-ethernet.mtu 9000

# Apply the change (this briefly disconnects the interface)
sudo nmcli connection up ens192

# Verify the new MTU
ip link show ens192 | grep mtu
```

## Testing Jumbo Frame Connectivity

Before committing the change, verify that jumbo frames work end-to-end.

```bash
# Test with a large ping (8972 bytes payload + 28 bytes header = 9000)
# The -M do flag prevents fragmentation
ping -M do -s 8972 -c 5 192.168.10.20

# If the ping fails with "Message too long", a device in the path
# does not support jumbo frames

# Test with incrementally larger packets to find the MTU limit
ping -M do -s 8000 -c 1 192.168.10.20
ping -M do -s 8500 -c 1 192.168.10.20
ping -M do -s 8972 -c 1 192.168.10.20
```

## Configuring for Bond or Team Interfaces

```bash
# For bonded interfaces, set MTU on both the bond and the member interfaces
sudo nmcli connection modify bond0 802-3-ethernet.mtu 9000
sudo nmcli connection modify bond-slave-ens192 802-3-ethernet.mtu 9000
sudo nmcli connection modify bond-slave-ens224 802-3-ethernet.mtu 9000

# Restart the bond
sudo nmcli connection up bond0
```

## Configuring for VLAN Interfaces

```bash
# The VLAN MTU must not exceed the parent interface MTU
# Set the parent interface MTU first
sudo nmcli connection modify ens192 802-3-ethernet.mtu 9000
sudo nmcli connection up ens192

# Then set the VLAN MTU
sudo nmcli connection modify vlan100 802-3-ethernet.mtu 9000
sudo nmcli connection up vlan100
```

## Verifying Performance Improvement

```bash
# Test network throughput with iperf3
# On the server
iperf3 -s

# On the client
iperf3 -c 192.168.10.20 -t 30

# Compare results with MTU 1500 vs MTU 9000
# You should see reduced CPU usage and slightly higher throughput
```

## Rolling Back

```bash
# If jumbo frames cause problems, revert to the default MTU
sudo nmcli connection modify ens192 802-3-ethernet.mtu 1500
sudo nmcli connection up ens192
```

Only enable jumbo frames on dedicated storage or backend networks. Do not enable them on interfaces that face the internet or communicate with devices that do not support jumbo frames.
