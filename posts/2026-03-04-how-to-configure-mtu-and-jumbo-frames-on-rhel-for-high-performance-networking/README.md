# How to Configure MTU and Jumbo Frames on RHEL for High-Performance Networking

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, MTU, Jumbo Frames, Networking, Performance

Description: Learn how to configure MTU and enable jumbo frames on RHEL to reduce packet overhead and improve network throughput.

---

The Maximum Transmission Unit (MTU) defines the largest packet size that a network interface can transmit. The default MTU is 1500 bytes. Jumbo frames use an MTU of 9000 bytes, reducing overhead and improving throughput for bulk data transfers.

## Checking Current MTU

```bash
# Check the current MTU on all interfaces
ip link show

# Check MTU for a specific interface
ip link show ens192
```

## Setting MTU Temporarily

```bash
# Set MTU to 9000 (jumbo frames) temporarily
sudo ip link set ens192 mtu 9000

# Verify the change
ip link show ens192 | grep mtu
```

## Setting MTU Permanently with nmcli

```bash
# Set MTU permanently using NetworkManager
sudo nmcli connection modify ens192 802-3-ethernet.mtu 9000

# Apply the changes
sudo nmcli connection up ens192

# Verify
ip link show ens192 | grep mtu
```

## Verifying End-to-End Jumbo Frame Support

All devices in the network path must support the same MTU. Test with ping:

```bash
# Test if jumbo frames work end-to-end
# -M do: don't fragment
# -s 8972: payload size (9000 - 20 IP header - 8 ICMP header)
ping -M do -s 8972 -c 3 192.168.1.100
```

If the ping fails with "message too long," a device in the path does not support the MTU.

## Configuring MTU on a Bond Interface

```bash
# Set MTU on a bond interface
sudo nmcli connection modify bond0 802-3-ethernet.mtu 9000

# Set MTU on slave interfaces (must match or exceed bond MTU)
sudo nmcli connection modify ens192 802-3-ethernet.mtu 9000
sudo nmcli connection modify ens224 802-3-ethernet.mtu 9000

# Restart the bond
sudo nmcli connection up bond0
```

## Configuring MTU on a VLAN Interface

```bash
# Set MTU on a VLAN interface
sudo nmcli connection modify vlan100 802-3-ethernet.mtu 9000

# The parent interface must also support the same MTU
sudo nmcli connection modify ens192 802-3-ethernet.mtu 9000
```

## Performance Comparison

```bash
# Benchmark with default MTU (1500)
iperf3 -c 192.168.1.100 -t 30

# Benchmark with jumbo frames (9000)
# After configuring MTU on both endpoints
iperf3 -c 192.168.1.100 -t 30
```

Jumbo frames are most beneficial for large data transfers such as NFS, iSCSI, and database replication traffic. They provide minimal benefit for small packet workloads like web traffic.
