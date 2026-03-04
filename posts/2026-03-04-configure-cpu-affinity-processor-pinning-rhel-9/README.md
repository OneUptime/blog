# How to Configure CPU Affinity and Processor Pinning on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, CPU, Affinity, Processor Pinning, Performance, Linux, Tuning

Description: Learn how to configure CPU affinity and processor pinning on RHEL to bind processes to specific CPUs for better performance.

---

CPU affinity determines which CPUs a process is allowed to run on. By pinning processes to specific CPUs, you can improve cache utilization, reduce context switches, and ensure predictable performance on RHEL.

## Prerequisites

- A RHEL system with multiple CPU cores
- Root or sudo access

## Understanding CPU Affinity

By default, the Linux scheduler can migrate processes between any available CPU. While this maximizes utilization, it can hurt performance because:

- CPU cache contents are lost when migrating
- NUMA-remote memory access increases latency
- Context switches between CPUs are more expensive

CPU pinning solves these issues by restricting a process to specific CPUs.

## Viewing CPU Topology

Check available CPUs:

```bash
lscpu
```

View CPU topology:

```bash
lscpu --extended
```

This shows CPU number, NUMA node, socket, and core relationships.

Check online CPUs:

```bash
cat /sys/devices/system/cpu/online
```

## Using taskset to Set CPU Affinity

### Check Current Affinity

```bash
taskset -p $(pgrep httpd | head -1)
```

Output shows a hexadecimal CPU mask. For readable format:

```bash
taskset -cp $(pgrep httpd | head -1)
```

### Pin a Running Process

Pin to CPUs 0 and 1:

```bash
sudo taskset -cp 0,1 $(pgrep my-app | head -1)
```

Pin to a range of CPUs:

```bash
sudo taskset -cp 4-7 $(pgrep my-app | head -1)
```

### Launch a Process with Affinity

```bash
taskset -c 2,3 ./my-application
```

Using a hexadecimal mask (CPU 0 and CPU 2 = 0101 binary = 0x5):

```bash
taskset 0x5 ./my-application
```

## Using numactl for NUMA-Aware Pinning

Bind a process to a NUMA node's CPUs and memory:

```bash
numactl --cpunodebind=0 --membind=0 ./my-application
```

This ensures both CPU and memory are on the same NUMA node.

List NUMA topology:

```bash
numactl --hardware
```

## Configuring CPU Affinity in systemd

Set CPU affinity for a service:

```bash
sudo systemctl edit myservice.service
```

Add:

```ini
[Service]
CPUAffinity=0 1 2 3
```

For NUMA node binding:

```ini
[Service]
CPUAffinity=numa:0
```

Reload and restart:

```bash
sudo systemctl daemon-reload
sudo systemctl restart myservice
```

## Setting System-Wide CPU Affinity Defaults

Configure the default CPU affinity for all processes in `/etc/systemd/system.conf`:

```bash
sudo vi /etc/systemd/system.conf
```

Uncomment and set:

```ini
CPUAffinity=0-3
```

This restricts all services to CPUs 0-3 by default.

## Using cgroups for CPU Pinning

Create a cgroup with restricted CPUs:

```bash
sudo mkdir -p /sys/fs/cgroup/pinned
echo "0-3" | sudo tee /sys/fs/cgroup/pinned/cpuset.cpus
echo "0" | sudo tee /sys/fs/cgroup/pinned/cpuset.mems
```

Add a process:

```bash
echo $PID | sudo tee /sys/fs/cgroup/pinned/cgroup.procs
```

## Setting IRQ Affinity

Pin hardware interrupts to specific CPUs:

```bash
# View current IRQ affinity
cat /proc/irq/24/smp_affinity_list

# Pin IRQ 24 to CPU 0
echo 0 | sudo tee /proc/irq/24/smp_affinity_list
```

Pin all interrupts for a device:

```bash
for irq in $(grep eth0 /proc/interrupts | awk '{print $1}' | tr -d ':'); do
    echo 0 | sudo tee /proc/irq/$irq/smp_affinity_list
done
```

## Best Practices

1. **Keep related processes on the same NUMA node** - Reduces memory access latency
2. **Pin worker threads to individual CPUs** - Maximizes cache utilization
3. **Leave some CPUs for housekeeping** - Kernel threads and interrupts need CPU time
4. **Match CPU affinity with memory binding** - Use numactl for both
5. **Test before and after** - Measure performance impact with benchmarks

## Verifying Affinity

Monitor which CPU each process is running on:

```bash
ps -eo pid,psr,comm | sort -k2 -n
```

The `PSR` column shows the current CPU.

Watch in real time:

```bash
watch -n 1 "ps -eo pid,psr,comm | grep my-app"
```

## Conclusion

CPU affinity and processor pinning on RHEL improve performance by keeping processes on specific CPUs, reducing cache misses and NUMA penalties. Use taskset for individual processes, systemd for services, and cgroups for groups of processes.
