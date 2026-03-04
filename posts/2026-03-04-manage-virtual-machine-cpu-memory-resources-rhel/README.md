# How to Manage Virtual Machine CPU and Memory Resources on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, KVM, CPU, Memory, Resource Management, Virtualization, Linux

Description: Learn how to configure and adjust CPU and memory allocation for KVM virtual machines on RHEL, including hot-plugging, pinning, and resource limits.

---

Proper CPU and memory allocation ensures your virtual machines perform well without starving other VMs or the host. RHEL supports both static configuration and runtime changes for CPU and memory resources.

## Viewing Current Resource Allocation

```bash
# Show CPU and memory for a VM
sudo virsh dominfo rhel9-vm

# View detailed CPU configuration
sudo virsh vcpuinfo rhel9-vm

# View memory statistics
sudo virsh dommemstat rhel9-vm
```

## Changing vCPU Count

```bash
# Set the maximum vCPU count (requires VM shutdown)
sudo virsh setvcpus rhel9-vm 4 --config --maximum

# Set the current vCPU count (can be done live if max allows it)
sudo virsh setvcpus rhel9-vm 4 --config

# Hot-add vCPUs to a running VM (VM must have max set higher)
# First, set a high maximum
sudo virsh setvcpus rhel9-vm 8 --config --maximum

# Then hot-add CPUs while running
sudo virsh setvcpus rhel9-vm 6 --live
```

## CPU Pinning

Pin vCPUs to specific physical CPUs to improve performance:

```bash
# Pin vCPU 0 to physical CPU 2
sudo virsh vcpupin rhel9-vm 0 2

# Pin vCPU 1 to physical CPUs 3-4
sudo virsh vcpupin rhel9-vm 1 3-4

# View current pinning
sudo virsh vcpupin rhel9-vm

# Make pinning persistent
sudo virsh vcpupin rhel9-vm 0 2 --config
```

## Changing Memory Allocation

```bash
# Set maximum memory (requires VM shutdown)
sudo virsh setmaxmem rhel9-vm 8G --config

# Set current memory
sudo virsh setmem rhel9-vm 4G --config

# Hot-add memory to a running VM (balloon)
# The VM must be configured with virtio-balloon driver
sudo virsh setmem rhel9-vm 6G --live
```

## Memory Balloon Configuration

The virtio-balloon driver allows dynamic memory adjustment:

```bash
# Check if balloon driver is active
sudo virsh dommemstat rhel9-vm | grep balloon

# Set memory using the balloon
sudo virsh setmem rhel9-vm 3G --live

# The guest OS releases memory back to the host
```

## CPU Topology Configuration

```bash
# Configure CPU topology (sockets, cores, threads)
sudo virsh edit rhel9-vm

# In the XML, set:
# <vcpu placement='static'>4</vcpu>
# <cpu>
#   <topology sockets='1' cores='2' threads='2'/>
# </cpu>
```

## Setting Resource Limits with cgroups

```bash
# Limit CPU usage to 50% of one core
sudo virsh schedinfo rhel9-vm --set vcpu_quota=50000

# The default period is 100000 microseconds (100ms)
# quota of 50000 = 50% of one core

# View current CPU scheduler settings
sudo virsh schedinfo rhel9-vm
```

## Monitoring Resource Usage

```bash
# Monitor CPU usage
sudo virt-top

# Watch memory usage over time
watch -n 2 'sudo virsh dommemstat rhel9-vm'
```

Start with conservative allocations and scale up based on monitoring data. Over-committing memory (allocating more memory to VMs than the host has) can lead to out-of-memory conditions and VM instability.
