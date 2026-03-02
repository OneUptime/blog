# How to Configure CPU Pinning for VMs on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, KVM, Performance, Virtualization

Description: Learn how to configure CPU pinning for KVM virtual machines on Ubuntu to improve performance and reduce latency by dedicating host CPU cores to specific VMs.

---

By default, KVM schedules VM vCPUs on any available host CPU core, and the Linux scheduler can move them around freely. For most workloads this is fine. For latency-sensitive applications - real-time audio processing, trading systems, network functions, or high-performance databases - CPU migrations cause cache misses and unpredictable latency spikes. CPU pinning assigns specific VM vCPUs to specific host CPU cores, keeping the CPU cache warm and reducing scheduling jitter.

## Understanding CPU Topology

Before pinning, understand your host's CPU topology:

```bash
# View CPU topology
lscpu

# Show NUMA node layout
lscpu | grep -E "NUMA|Socket|Core|Thread"

# Detailed topology per CPU
cat /sys/devices/system/cpu/cpu0/topology/core_id
cat /sys/devices/system/cpu/cpu0/topology/thread_siblings_list
cat /sys/devices/system/cpu/cpu0/topology/physical_package_id

# Best tool for topology visualization
sudo apt install hwloc
lstopo --output-format txt

# Show CPU to NUMA node mapping
numactl --hardware
```

A typical dual-core CPU with hyperthreading:
```
CPU 0: Physical core 0, thread 0 (NUMA node 0)
CPU 1: Physical core 0, thread 1 (NUMA node 0) <- sibling of CPU 0
CPU 2: Physical core 1, thread 0 (NUMA node 0)
CPU 3: Physical core 1, thread 1 (NUMA node 0) <- sibling of CPU 2
```

For performance-critical VMs, pin vCPUs to physical cores (avoid splitting hyperthreads across different VMs).

## Configuring CPU Pinning with virsh

### Simple vcpupin

```bash
# Check current vCPU affinity
virsh vcpuinfo myvm

# Pin each vCPU to a specific host CPU
virsh vcpupin myvm 0 2    # vCPU 0 -> host CPU 2
virsh vcpupin myvm 1 3    # vCPU 1 -> host CPU 3

# Pin vCPU to a range of CPUs (flexible pinning)
virsh vcpupin myvm 0 2-3   # vCPU 0 can run on host CPU 2 or 3

# Make pinning persistent (survives reboot)
virsh vcpupin myvm 0 2 --config
virsh vcpupin myvm 1 3 --config

# Verify pinning
virsh vcpuinfo myvm
```

### CPU Pinning in VM XML

For permanent configuration, edit the VM XML directly:

```bash
virsh edit myvm
```

Add the `<cputune>` section inside `<domain>`:

```xml
<domain type='kvm'>
  ...
  <cputune>
    <!-- Pin each vCPU to specific host CPU(s) -->
    <vcpupin vcpu='0' cpuset='2'/>
    <vcpupin vcpu='1' cpuset='3'/>
    <vcpupin vcpu='2' cpuset='4'/>
    <vcpupin vcpu='3' cpuset='5'/>

    <!-- Pin the emulator threads to other CPUs -->
    <!-- Keeps QEMU's housekeeping off your VM's cores -->
    <emulatorpin cpuset='0-1'/>

    <!-- If using IOTHREADS, pin them too -->
    <iothreadpin iothread='1' cpuset='0'/>
  </cputune>
  ...
  <cpu mode='host-passthrough'>
    <!-- Define NUMA topology matching host -->
    <topology sockets='1' dies='1' cores='2' threads='2'/>
    <numa>
      <cell id='0' cpus='0-3' memory='4096' unit='MiB'/>
    </numa>
  </cpu>
  ...
</domain>
```

## NUMA-Aware CPU Pinning

For servers with multiple NUMA nodes, keep all VM resources on the same node to avoid cross-node memory access penalties:

```bash
# Check NUMA topology
numactl --hardware
# Shows: nodes available, CPUs per node, memory per node

# Example NUMA system:
# node 0: cpus 0-11, memory 64GB
# node 1: cpus 12-23, memory 64GB
```

Pin a VM entirely to NUMA node 0:

```bash
# Check which CPUs are on node 0
cat /sys/devices/system/node/node0/cpulist
# Example: 0-11

# Pin all vCPUs to node 0 CPUs
virsh vcpupin myvm 0 2 --config
virsh vcpupin myvm 1 3 --config
virsh vcpupin myvm 2 4 --config
virsh vcpupin myvm 3 5 --config
```

In XML with NUMA awareness:

```xml
<cputune>
  <vcpupin vcpu='0' cpuset='2'/>
  <vcpupin vcpu='1' cpuset='3'/>
  <vcpupin vcpu='2' cpuset='4'/>
  <vcpupin vcpu='3' cpuset='5'/>
  <emulatorpin cpuset='0-1'/>
  <numatune>
    <memory mode='strict' nodeset='0'/>
  </numatune>
</cputune>
```

## Isolating Host CPUs for VMs

For truly dedicated CPU resources, isolate host CPU cores from the general scheduler:

```bash
# Add to GRUB_CMDLINE_LINUX_DEFAULT in /etc/default/grub
# isolcpus removes these CPUs from the scheduler
# nohz_full prevents tick interrupts on these CPUs
# rcu_nocbs offloads RCU callbacks from these CPUs
GRUB_CMDLINE_LINUX_DEFAULT="quiet splash isolcpus=2-5 nohz_full=2-5 rcu_nocbs=2-5"

sudo update-grub
sudo reboot
```

After isolation, CPUs 2-5 are no longer used for any host processes, making them fully available for your pinned VMs with minimal interference.

```bash
# Verify isolation
cat /sys/devices/system/cpu/isolated
# Should show: 2-5
```

## Configuring CPU Scheduler Policy

For real-time workloads, set the vCPU scheduler policy:

```bash
# Set vCPU scheduler to FIFO (real-time) for vCPU 0
virsh schedinfo myvm --set vcpu_scheduler_type=fifo vcpu_scheduler_priority=1

# Or in XML:
```

```xml
<cputune>
  <vcpupin vcpu='0' cpuset='2'/>
  <vcpusched vcpus='0' scheduler='fifo' priority='1'/>
  <vcpusched vcpus='1' scheduler='fifo' priority='1'/>
</cputune>
```

## Setting CPU Shares and Quotas

If you cannot dedicate CPUs, control relative CPU access:

```bash
# Set CPU shares (higher = more CPU time when contention exists)
virsh schedinfo myvm --set cpu_shares=2048  # Default is 1024

# Set CPU quota (microseconds per period)
# Limit to 50% of one CPU core:
virsh schedinfo myvm \
  --set cpu_quota=50000 \
  --set cpu_period=100000

# Remove CPU quota limit
virsh schedinfo myvm --set cpu_quota=-1

# Check current scheduler settings
virsh schedinfo myvm
```

## Benchmarking CPU Pinning Effectiveness

```bash
# Install benchmark tools
sudo apt install sysbench

# Inside VM - CPU benchmark before and after pinning
# Run this to compare latency
sysbench cpu --cpu-max-prime=20000 run

# Measure scheduling jitter with cyclictest (real-time analysis)
sudo apt install rt-tests
cyclictest -m -n -q -p 80 -t 1 -l 100000

# Compare results with and without CPU pinning:
# Maximum latency should be significantly lower with pinning
```

```bash
# Check CPU migrations (should decrease with pinning)
perf stat -e sched:sched_migrate_task -a sleep 10

# Monitor vCPU run queue depth
virsh domstats myvm --vcpu
```

## Real-World CPU Pinning Strategy

For a host with 2 sockets, 12 cores each (24 cores, 48 threads with HT):

```bash
# Reserve cores 0-1 for host (4 threads)
# Assign cores 2-11 to VMs on socket 0
# Assign cores 12-23 to VMs on socket 1

# Large VM with 8 vCPUs on socket 0:
# vCPU 0 -> host CPU 4 (core 2, thread 0)
# vCPU 1 -> host CPU 28 (core 2, thread 1) <- sibling
# vCPU 2 -> host CPU 6 (core 3, thread 0)
# vCPU 3 -> host CPU 30 (core 3, thread 1) <- sibling
# ... and so on

# Get sibling pairs
for cpu in $(seq 0 47); do
    siblings=$(cat /sys/devices/system/cpu/cpu${cpu}/topology/thread_siblings_list)
    echo "CPU $cpu: siblings $siblings"
done | sort -t' ' -k3
```

## Monitoring CPU Pinning in Production

```bash
# Check current vCPU placement
for vm in $(virsh list --name); do
    echo "=== $vm ==="
    virsh vcpuinfo "$vm" 2>/dev/null | grep -E "CPU:|Affinity"
done

# Check if vCPUs are staying on their pinned CPUs
# Use perf to check for migrations
perf kvm stat live -p $(pgrep -f "qemu.*$VM_NAME")

# View CPU usage per VM
virt-top -d 2 -x
```

CPU pinning has the most impact for workloads with tight latency requirements or heavy CPU-to-cache ratio. For typical web application VMs, the default scheduler behavior is perfectly adequate. Apply pinning when you have measured a problem it can solve, not as a default configuration for all VMs.
