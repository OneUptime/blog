# How to Set CPU Affinity for Processes with taskset on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Performance Tuning, Linux, System Administration

Description: Learn how to use taskset on Ubuntu to pin processes to specific CPU cores, reduce cache thrashing, and improve performance of latency-sensitive workloads.

---

CPU affinity controls which processor cores a process is allowed to run on. By default, the Linux scheduler can move processes between cores freely. In most cases this is fine, but for latency-sensitive applications, real-time workloads, or scenarios where CPU cache efficiency matters significantly, pinning processes to specific cores can make a measurable difference.

`taskset` is the standard tool for managing CPU affinity on Linux. It's part of the `util-linux` package and is available on all Ubuntu systems by default.

## Understanding CPU Affinity

Modern servers often have complex topologies - multiple sockets, NUMA nodes, cores, and hyperthreads. When a process migrates between cores, it loses the data it had cached in the L1/L2 cache of the previous core. For workloads that are cache-sensitive, this migration cost adds latency.

By pinning a process to one or more cores:
- The process always uses the same cache
- NUMA locality can be maintained (process stays on the same memory node as its data)
- Other processes can be kept off those cores, reducing interference

## Checking Current CPU Affinity

Before changing affinity, see what a process is currently configured for:

```bash
# Check CPU affinity of a process by PID
taskset -p 1234
```

Output:

```
pid 1234's current affinity mask: ff
```

The mask `ff` in hex is `11111111` in binary, meaning the process can run on all 8 cores (cores 0-7).

```bash
# Show affinity as a list instead of hex mask
taskset -cp 1234
```

Output:

```
pid 1234's current affinity list: 0-7
```

## Setting CPU Affinity for a New Process

Pin a command to specific cores when launching it:

```bash
# Run myapp on CPU core 0 only
taskset -c 0 myapp

# Run on cores 2 and 3
taskset -c 2,3 myapp

# Run on cores 0 through 3
taskset -c 0-3 myapp

# Run on cores 0, 2, and 4 (skipping hyperthreads)
taskset -c 0,2,4 myapp
```

## Changing Affinity of a Running Process

For already-running processes, use `-p` with the PID:

```bash
# Pin PID 5678 to core 0
sudo taskset -cp 0 5678

# Pin to cores 4-7
sudo taskset -cp 4-7 5678

# Pin to cores 0 and 1
sudo taskset -cp 0,1 5678
```

You need root privileges to change the affinity of processes you don't own.

## Using the Hex Mask Format

The original format uses hex bitmasks where each bit represents a CPU:

```bash
# Bit mask: 0x1 = core 0 only (binary: 0001)
taskset 0x1 myapp

# 0x3 = cores 0 and 1 (binary: 0011)
taskset 0x3 myapp

# 0xf = cores 0-3 (binary: 00001111)
taskset 0xf myapp

# 0xff = all 8 cores (binary: 11111111)
taskset 0xff myapp
```

The `-c` flag with a list is generally more readable and less error-prone.

## Finding Your CPU Topology

Before pinning processes, understand your CPU layout:

```bash
# Show CPU topology
lscpu

# Show detailed per-core info including NUMA nodes
cat /proc/cpuinfo | grep -E "^processor|^core id|^physical id"

# Visual CPU topology
lstopo --no-graphics  # requires hwloc package
```

For a machine with 2 sockets, 8 cores each, and hyperthreading:
- Socket 0, cores 0-7 might map to logical CPUs 0-7 and 16-23
- Socket 1, cores 0-7 might map to logical CPUs 8-15 and 24-31

Pinning a process to CPUs 0-7 keeps it on socket 0, maintaining NUMA locality.

## Practical Use Cases

### Isolating a Real-Time Process

For a process that needs consistent low latency:

```bash
# Pin real-time process to core 3 (isolated from other workloads)
taskset -c 3 ./realtime_processor &

# Optionally also set real-time priority
taskset -c 3 chrt -f 50 ./realtime_processor
```

### Separating Application and I/O Threads

A common pattern is to run application logic on some cores and keep network interrupt handling on others:

```bash
# Set IRQ affinity for a NIC (e.g., eth0 queue 0 on core 0)
echo 1 > /proc/irq/$(cat /sys/class/net/eth0/device/msi_irqs/$(ls /sys/class/net/eth0/device/msi_irqs | head -1))/smp_affinity

# Pin application to cores 2-7
taskset -cp 2-7 $(pgrep myapp)
```

### CPU Benchmarking

When benchmarking, you want consistent results:

```bash
# Pin benchmark to a single core for repeatability
taskset -c 2 sysbench cpu --cpu-max-prime=20000 run
```

### Pinning Multiple Related Processes

For a multi-process application, pin all workers to a set of cores:

```bash
# Pin all workers of an application
for pid in $(pgrep -f "worker"); do
    sudo taskset -cp 4-7 $pid
done
```

## Persisting CPU Affinity Across Service Restarts

For systemd services, use the `CPUAffinity` directive:

```bash
# Edit the service file
sudo systemctl edit myservice
```

Add:

```ini
[Service]
CPUAffinity=0 1 2 3
```

Or create a drop-in file:

```bash
# Create drop-in directory and file
sudo mkdir -p /etc/systemd/system/myservice.service.d/
sudo tee /etc/systemd/system/myservice.service.d/cpu-affinity.conf << 'EOF'
[Service]
CPUAffinity=0-3
EOF

sudo systemctl daemon-reload
sudo systemctl restart myservice
```

Verify:

```bash
# Check the affinity after restart
taskset -cp $(pgrep -f myservice | head -1)
```

## Isolating CPUs at Boot

For the most aggressive isolation, use `isolcpus` kernel parameter to prevent the scheduler from using certain cores at all:

```bash
# Edit GRUB configuration
sudo nano /etc/default/grub
```

Add `isolcpus=4-7` to `GRUB_CMDLINE_LINUX`:

```
GRUB_CMDLINE_LINUX="isolcpus=4-7"
```

```bash
# Apply and reboot
sudo update-grub
sudo reboot
```

After reboot, cores 4-7 won't be used by any other processes. You can then explicitly pin your critical process to them with `taskset`.

## Verifying Affinity Is Working

Confirm affinity is enforced:

```bash
# Watch which CPU a process runs on
watch -n 0.5 "ps -o pid,psr,comm -p $(pgrep myapp)"
```

The `psr` column shows the current CPU the process is running on. If pinned correctly, it should only show the core(s) you specified.

You can also use `pidstat` to see CPU usage per core:

```bash
pidstat -u -p $(pgrep myapp) 1
```

CPU affinity is a low-level but powerful tool. Used correctly, it can reduce tail latencies significantly for time-sensitive workloads - the kind of gains that are hard to achieve through application-level optimization alone.
