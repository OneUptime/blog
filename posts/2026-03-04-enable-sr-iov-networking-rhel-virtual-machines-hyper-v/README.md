# How to Enable SR-IOV Networking for RHEL Virtual Machines on Hyper-V

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Hyper-V, SR-IOV, Networking, Virtualization, Performance, Linux

Description: Enable Single Root I/O Virtualization (SR-IOV) for RHEL VMs on Hyper-V to bypass the virtual switch and achieve near-native network performance.

---

SR-IOV (Single Root I/O Virtualization) allows a physical network adapter to present multiple virtual functions (VFs) directly to VMs. This bypasses the Hyper-V virtual switch for data-plane traffic, significantly reducing latency and CPU overhead while increasing throughput.

## Prerequisites

- Physical NIC that supports SR-IOV (Intel X710, Mellanox ConnectX, etc.)
- SR-IOV enabled in the server BIOS/UEFI
- Hyper-V host running Windows Server 2016 or later
- RHEL 8 or RHEL Generation 2 VM

## Enable SR-IOV on the Hyper-V Host

```powershell
# Verify the physical NIC supports SR-IOV
Get-NetAdapterSriov

# Enable SR-IOV on the Hyper-V virtual switch
# First, check if the existing switch supports SR-IOV
Get-VMSwitch | Format-List Name, SwitchType, IovEnabled

# If you need to create a new switch with SR-IOV
New-VMSwitch -Name "SRIOV-Switch" `
  -NetAdapterName "Ethernet1" `
  -EnableIov $true
```

## Enable SR-IOV on the VM Network Adapter

```powershell
# Stop the VM
Stop-VM -Name "RHEL9-Server"

# Enable SR-IOV on the VM network adapter
Set-VMNetworkAdapter -VMName "RHEL9-Server" `
  -IovWeight 100

# Optionally set the maximum number of VFs for this adapter
Set-VMNetworkAdapter -VMName "RHEL9-Server" `
  -IovQueuePairsRequested 4

# Start the VM
Start-VM -Name "RHEL9-Server"
```

## Verify SR-IOV in the RHEL Guest

```bash
# Check if a VF device is present
lspci | grep -i "virtual function"

# Check network interfaces - you should see both the synthetic
# adapter (eth0) and the VF adapter
ip link show

# Check which driver the VF is using
ethtool -i eth0

# For Intel NICs, the VF driver is typically iavf or ixgbevf
# For Mellanox NICs, the VF driver is mlx5_core
lsmod | grep -E "iavf|ixgbevf|mlx5"
```

## Verify SR-IOV is Active

```bash
# Check the network adapter status from the Hyper-V host
Get-VMNetworkAdapter -VMName "RHEL9-Server" | Format-List `
  Name, IovWeight, IovUsage, IovQueuePairsRequested
```

From the RHEL guest:

```bash
# The VF should be handling traffic - check interface statistics
ip -s link show eth0

# Test network performance with iperf3
# On a remote server:
iperf3 -s

# On the RHEL VM:
iperf3 -c <server-ip> -t 30 -P 4
```

## Failover Behavior

SR-IOV on Hyper-V uses a "teaming" approach where the synthetic adapter (netvsc) acts as a failover path. If SR-IOV is temporarily unavailable (during live migration, for example), traffic falls back to the synthetic adapter seamlessly.

```bash
# You can verify this failover path exists
ethtool -i eth0
# The netvsc driver manages the failover

# Check the bonding/teaming status
cat /proc/net/dev
```

## Troubleshooting

```bash
# If no VF appears in the guest, check:
# 1. SR-IOV is enabled in BIOS
# 2. The NIC driver on the host supports SR-IOV
# 3. IovWeight is set to a non-zero value on the VM adapter

# Check dmesg for VF initialization messages
dmesg | grep -i "virtual function\|vf\|sriov"

# Verify the VF driver is available in the kernel
modinfo iavf
```

SR-IOV provides the best network performance for RHEL VMs on Hyper-V, making it essential for latency-sensitive or bandwidth-intensive workloads.
