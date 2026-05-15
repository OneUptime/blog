# How to Use the cpu-partitioning TuneD Profile for Low-Latency Workloads on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, TuneD, CPU Partitioning, Low Latency, Performance, Linux

Description: Learn how to use the cpu-partitioning TuneD profile on RHEL to isolate CPUs for low-latency and real-time workloads.

---

The `cpu-partitioning` TuneD profile on RHEL isolates specific CPUs for dedicated workloads by moving general work and interrupts to housekeeping CPUs and enabling full dynticks on the isolated CPUs. This is useful for low-latency and real-time applications.

## Prerequisites

- A RHEL system with multiple CPU cores
- TuneD installed and running
- Root or sudo access

## Installing the Profile

The cpu-partitioning profile is available as a TuneD profile package:

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

# Isolated CPUs without the kernel scheduler load balancing (optional, subset of isolated_cores)
# no_balance_cores=6,7
CONF
```

This isolates CPUs 2 through 7, leaving CPUs 0 and 1 as housekeeping cores. With only `isolated_cores` set, scheduler load balancing remains enabled among the isolated CPUs. Set `no_balance_cores` for isolated CPUs that must be pinned individually without scheduler load balancing.

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
nohz_full=2-7 rcu_nocbs=2-7 tuned.non_isolcpus=...
```

If you configured `no_balance_cores`, you should also see an `isolcpus=` parameter for those CPUs.

Check that isolated CPUs are not in the allowed CPU list for the current shell:

```bash
cat /proc/self/status | grep Cpus_allowed_list
```

This should show only the housekeeping CPUs, such as `0-1`.

To see the affinity of all processes, use:

```bash
ps -ae -o pid= | xargs -n 1 taskset -cp
```

Most process affinity lists should be limited to CPUs 0 and 1, although TuneD cannot move every kernel process.

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

This measures timer latency on CPU 2 for 60 seconds. Expected latency depends on the hardware, firmware, kernel, and workload; a properly isolated system should show lower and more consistent maximum latencies than an untuned baseline.

## Conclusion

The cpu-partitioning TuneD profile on RHEL provides a systematic way to isolate CPUs for low-latency workloads. Combined with taskset and real-time scheduling, it can reduce latency variation for demanding applications.
