# How to Use the cpu-partitioning TuneD Profile for Low-Latency Workloads on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, TuneD, CPU Partitioning, Low Latency, Performance, Linux

Description: Learn how to use the cpu-partitioning TuneD profile on RHEL to isolate CPUs for low-latency and real-time workloads.

---

The `cpu-partitioning` TuneD profile on RHEL isolates specific CPUs for dedicated workloads by removing them from the general scheduler, disabling timer ticks, and moving interrupts to housekeeping CPUs. This is essential for low-latency and real-time applications.

## Prerequisites

- A RHEL system with multiple CPU cores
- TuneD installed and running
- Root or sudo access

## Installing the Profile

The cpu-partitioning profile is included with TuneD:

```bash
sudo dnf install tuned-profiles-cpu-partitioning -y
```

Verify it is available:

```bash
tuned-adm list | grep cpu-partitioning
```

## Understanding CPU Partitioning

The profile divides CPUs into two groups:

- **Housekeeping CPUs** - Handle kernel threads, interrupts, and general tasks
- **Isolated CPUs** - Dedicated to your low-latency application, free from interference

## Configuring Isolated CPUs

Define which CPUs to isolate by editing the TuneD variables:

```bash
sudo tee /etc/tuned/cpu-partitioning-variables.conf << 'CONF'
# CPUs to isolate for low-latency workloads
isolated_cores=2-7

# CPUs that do not use nohz_full (optional, subset of isolated_cores)
# no_balance_cores=6,7
CONF
```

This isolates CPUs 2 through 7, leaving CPUs 0 and 1 as housekeeping cores.

## Activating the Profile

Apply the cpu-partitioning profile:

```bash
sudo tuned-adm profile cpu-partitioning
```

A reboot is required for full effect:

```bash
sudo reboot
```

## Verifying Isolation

After reboot, verify the kernel command line includes isolation parameters:

```bash
cat /proc/cmdline
```

You should see parameters like:

```bash
isolcpus=2-7 nohz_full=2-7 rcu_nocbs=2-7
```

Check that isolated CPUs are not running general tasks:

```bash
ps -eo pid,psr,comm | sort -k2 -n
```

Most processes should be on CPUs 0 and 1.

## Running Applications on Isolated CPUs

Use taskset to run your application on isolated CPUs:

```bash
taskset -c 2-7 ./my-latency-sensitive-app
```

Or use numactl:

```bash
numactl --physcpubind=2-7 ./my-latency-sensitive-app
```

## Verifying Timer Tick Isolation

Check that nohz_full is active on isolated CPUs:

```bash
cat /sys/devices/system/cpu/nohz_full
```

This should show `2-7`.

## Verifying Interrupt Migration

Check that interrupts are moved to housekeeping CPUs:

```bash
cat /proc/interrupts | head -20
```

Interrupt counts should be concentrated on CPUs 0 and 1.

## Combining with Real-Time Scheduling

For maximum latency reduction, combine cpu-partitioning with real-time scheduling:

```bash
sudo chrt -f 50 taskset -c 2 ./my-realtime-app
```

## Monitoring Latency

Use cyclictest to measure scheduling latency on isolated CPUs:

```bash
sudo dnf install rt-tests -y
sudo cyclictest -m -p 80 -t 1 -a 2 -D 60s
```

This measures timer latency on CPU 2 for 60 seconds. On properly isolated CPUs, you should see latencies under 10 microseconds.

## Conclusion

The cpu-partitioning TuneD profile on RHEL provides a systematic way to isolate CPUs for low-latency workloads. Combined with taskset and real-time scheduling, it can achieve consistent sub-10-microsecond latency for demanding applications.
