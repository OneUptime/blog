# How to Optimize RHEL for Real-Time and Low-Latency Workloads

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Real-Time, Low Latency, Performance, Tuning, Linux

Description: Learn how to optimize RHEL for real-time and low-latency workloads by configuring the kernel, scheduler, and hardware settings.

---

Real-time and low-latency workloads require deterministic response times. RHEL provides tools and kernel features to minimize latency jitter, including CPU isolation, IRQ affinity, and memory locking. This guide covers a comprehensive approach to latency optimization.

## Prerequisites

- A RHEL system with multiple CPU cores
- Root or sudo access
- Understanding of your latency requirements

## Installing Real-Time Tools

Install utilities for latency testing and tuning:

```bash
sudo dnf install tuned-profiles-cpu-partitioning rt-tests -y
```

## Step 1: Isolate CPUs

Isolate CPUs dedicated to your real-time application. Configure the cpu-partitioning profile:

```bash
sudo tee /etc/tuned/cpu-partitioning-variables.conf << 'CONF'
isolated_cores=2-7
CONF

sudo tuned-adm profile cpu-partitioning
```

Reboot to apply kernel-level isolation:

```bash
sudo reboot
```

Verify isolation:

```bash
cat /proc/cmdline | tr ' ' '\n' | grep -E "isolcpus|nohz_full|rcu_nocbs"
```

## Step 2: Configure IRQ Affinity

Move hardware interrupts to housekeeping CPUs:

```bash
# View current IRQ assignments
cat /proc/interrupts

# Move a specific IRQ to CPU 0
echo 1 | sudo tee /proc/irq/24/smp_affinity
```

Use irqbalance with a banned CPU list:

```bash
sudo tee /etc/sysconfig/irqbalance << 'CONF'
IRQBALANCE_BANNED_CPULIST=2-7
CONF

sudo systemctl restart irqbalance
```

## Step 3: Disable Transparent Huge Pages

THP can cause latency spikes during memory compaction:

```bash
echo never | sudo tee /sys/kernel/mm/transparent_hugepage/enabled
echo never | sudo tee /sys/kernel/mm/transparent_hugepage/defrag
```

## Step 4: Lock Memory

Configure your application to lock memory and prevent page faults. In C applications, use `mlockall()`. For systemd services:

```ini
[Service]
LimitMEMLOCK=infinity
```

Verify memory locking limits:

```bash
ulimit -l
```

Set unlimited for the user:

```bash
echo "rtuser  -  memlock  unlimited" | sudo tee -a /etc/security/limits.d/realtime.conf
```

## Step 5: Use Real-Time Scheduling

Run your application with SCHED_FIFO:

```bash
sudo chrt -f 80 taskset -c 2 ./my-realtime-app
```

## Step 6: Tune Kernel Parameters

Apply kernel parameters for low latency:

```bash
cat << 'SYSCTL' | sudo tee /etc/sysctl.d/realtime.conf
# Minimize scheduler latency
kernel.sched_min_granularity_ns=100000
kernel.sched_wakeup_granularity_ns=25000
kernel.sched_migration_cost_ns=5000000

# Disable watchdog on isolated CPUs
kernel.watchdog=0

# Reduce vmstat updates
vm.stat_interval=120

# Disable swap
vm.swappiness=0
SYSCTL
sudo sysctl -p /etc/sysctl.d/realtime.conf
```

## Step 7: Disable Power Management

Power management features (C-states, P-states) cause latency spikes:

```bash
# Disable deep C-states via kernel parameter
sudo grubby --update-kernel=ALL --args="processor.max_cstate=1 idle=poll"
```

## Step 8: Measure Latency

Use cyclictest to baseline your latency:

```bash
sudo cyclictest -m -p 80 -t 1 -a 2 -D 300s -h 100 -q
```

This runs a 5-minute test on CPU 2 and outputs a latency histogram.

Typical results on a well-tuned system:

```
Min: 1 us
Avg: 3 us
Max: 8 us
```

## Step 9: Stress Test Under Load

Generate system load while measuring latency:

```bash
# In one terminal, generate load on housekeeping CPUs
stress-ng --cpu 2 --io 2 --vm 2 --vm-bytes 1G --timeout 300s --taskset 0,1 &

# In another terminal, measure latency on isolated CPUs
sudo cyclictest -m -p 80 -t 1 -a 2 -D 300s -h 100 -q
```

Install stress-ng:

```bash
sudo dnf install stress-ng -y
```

## Conclusion

Optimizing RHEL for real-time workloads requires a multi-layered approach: CPU isolation, IRQ affinity, memory locking, real-time scheduling, and power management tuning. Use cyclictest to measure and validate your latency targets. Each optimization reduces a different source of latency jitter.
