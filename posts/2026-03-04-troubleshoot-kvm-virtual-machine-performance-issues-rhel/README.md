# How to Troubleshoot KVM Virtual Machine Performance Issues on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, KVM, Performance, Troubleshooting, Virtualization, Monitoring, Linux

Description: Learn how to diagnose and resolve KVM virtual machine performance issues on RHEL, covering CPU, memory, disk, and network bottlenecks.

---

VM performance problems on RHEL can stem from CPU contention, memory pressure, disk I/O bottlenecks, or network saturation. Systematic diagnosis starting from the host and drilling into the guest helps identify the root cause.

## Host-Level Monitoring

Start by checking if the host itself is overloaded:

```bash
# Overall system load
uptime
top -bn1 | head -20

# Monitor all VMs at once
sudo virt-top

# Check CPU usage per VM
sudo virsh cpu-stats rhel9-vm

# Check memory usage
free -h
sudo virsh dommemstat rhel9-vm
```

## Diagnosing CPU Issues

```bash
# Check if VMs are stealing CPU time from each other
# High "steal" time inside the guest indicates host CPU contention
# Inside the guest:
top
# Look at the "st" (steal) column

# On the host, check QEMU process CPU usage
top -p $(pgrep -d, -f qemu)

# Check if vCPU pinning is set appropriately
sudo virsh vcpupin rhel9-vm

# Check for CPU overcommitment
# Total vCPUs across all VMs vs physical cores
echo "Physical CPUs: $(nproc)"
for vm in $(sudo virsh list --name); do
    echo "$vm: $(sudo virsh vcpucount $vm --current) vCPUs"
done
```

## Diagnosing Memory Issues

```bash
# Check if the host is swapping (bad for VM performance)
vmstat 1 5
# Look at si/so (swap in/swap out) columns

# Check KSM (Kernel Same-page Merging) activity
cat /sys/kernel/mm/ksm/pages_shared
cat /sys/kernel/mm/ksm/pages_sharing

# Check balloon driver status inside the VM
sudo virsh dommemstat rhel9-vm | grep balloon

# Check for memory overcommitment
echo "Host total: $(free -h | awk '/Mem:/{print $2}')"
for vm in $(sudo virsh list --name); do
    echo "$vm: $(sudo virsh dominfo $vm | grep 'Max memory')"
done
```

## Diagnosing Disk I/O Issues

```bash
# Check disk I/O statistics for a VM
sudo virsh domblkstat rhel9-vm vda

# Monitor disk I/O in real time on the host
iostat -x 2 5

# Check if the VM is using virtio (much faster than IDE)
sudo virsh dumpxml rhel9-vm | grep -A3 '<disk' | grep bus

# Check disk cache mode
sudo virsh dumpxml rhel9-vm | grep -A5 '<driver' | grep cache
# Recommended: cache='none' or cache='writeback' for best performance

# Inside the guest, check I/O wait
top
# High "wa" (I/O wait) indicates disk bottleneck
```

## Diagnosing Network Issues

```bash
# Check network throughput for a VM
sudo virsh domifstat rhel9-vm vnet0

# Verify the VM uses virtio-net (not e1000 or rtl8139)
sudo virsh dumpxml rhel9-vm | grep 'model type'

# Test network bandwidth from inside the guest
iperf3 -c <target-ip>

# Check for packet drops
sudo virsh domifstat rhel9-vm vnet0 | grep drop
```

## Quick Performance Fixes

```bash
# Apply the virtual-host tuned profile on the hypervisor
sudo tuned-adm profile virtual-host

# Apply virtual-guest profile inside VMs
sudo tuned-adm profile virtual-guest

# Enable I/O threading for the VM
sudo virsh edit rhel9-vm
# Add: <iothreads>2</iothreads>
# Map disks to iothreads for better I/O performance
```

Always check the host first before investigating inside the guest. An overloaded host affects all VMs. Use virtio drivers, proper tuned profiles, and avoid overcommitting resources beyond what your workload can tolerate.
