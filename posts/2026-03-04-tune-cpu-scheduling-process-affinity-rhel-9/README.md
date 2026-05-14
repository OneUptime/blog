# How to Tune CPU Scheduling and Process Affinity on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, CPU, Scheduling, Process Affinity, Performance, Linux, Tuning

Description: Learn how to tune CPU scheduling policies and process affinity on RHEL to optimize performance for critical workloads.

---

CPU scheduling determines how the kernel allocates processor time to processes. On RHEL, you can tune the scheduling policy, priority, and CPU affinity to ensure critical processes get the resources they need.

## Prerequisites

- A RHEL system
- Root or sudo access

## Understanding CPU Scheduling Policies

Linux supports several scheduling policies:

- **SCHED_OTHER** (CFS) - Default time-sharing policy
- **SCHED_FIFO** - Real-time first-in-first-out
- **SCHED_RR** - Real-time round-robin
- **SCHED_BATCH** - Batch processing for CPU-intensive, non-interactive workloads
- **SCHED_IDLE** - Very low priority policy for jobs that should only run when higher-priority work does not need the CPU
- **SCHED_DEADLINE** - Deadline-based scheduling

View a process's current scheduling policy:

```bash
chrt -p $(pgrep httpd | head -1)
```

## Setting Real-Time Scheduling

Set a process to SCHED_FIFO with priority 50:

```bash
sudo chrt -f -p 50 $(pgrep my-app | head -1)
```

Set to SCHED_RR:

```bash
sudo chrt -r -p 30 $(pgrep my-app | head -1)
```

Launch a new process with real-time scheduling:

```bash
sudo chrt -f 50 ./my-application
```

## Setting Batch Scheduling

For background processing tasks that should not compete with interactive processes:

```bash
sudo chrt -b -p 0 $(pgrep batch-job | head -1)
```

## Viewing CPU Affinity

Check which CPUs a process can run on:

```bash
taskset -p $(pgrep httpd | head -1)
```

The output shows a hexadecimal CPU mask. For human-readable output:

```bash
taskset -cp $(pgrep httpd | head -1)
```

## Setting CPU Affinity

Pin a process to specific CPUs:

```bash
# Pin to CPU 0 and 1
sudo taskset -cp 0,1 $(pgrep my-app | head -1)
```

Launch a process on specific CPUs:

```bash
taskset -c 2,3 ./my-application
```

Use a bitmask:

```bash
# CPU 0 and 2 (binary: 0101 = hex 5)
taskset 0x5 ./my-application
```

## Tuning CFS Scheduler Parameters

On RHEL 9, use TuneD's `scheduler` plugin to tune CFS scheduler parameters because recent kernels moved several scheduler runtime tunables from `/proc/sys/kernel` to debugfs:

```bash
sudo dnf install tuned
sudo systemctl enable --now tuned
sudo mkdir -p /etc/tuned/low-latency-scheduler
```

Create `/etc/tuned/low-latency-scheduler/tuned.conf`:

```ini
[main]
summary=Custom scheduler latency tuning
include=throughput-performance

[scheduler]
sched_latency_ns=6000000
sched_min_granularity_ns=750000
```

Apply the profile:

```bash
sudo tuned-adm profile low-latency-scheduler
```

## Using systemd for CPU Affinity

Set CPU affinity for a systemd service:

```bash
sudo systemctl edit myservice.service
```

Add:

```ini
[Service]
CPUAffinity=0 1 2 3
CPUSchedulingPolicy=fifo
CPUSchedulingPriority=50
```

Reload and restart:

```bash
sudo systemctl daemon-reload
sudo systemctl restart myservice
```

## Isolating CPUs

Isolate CPUs from the general scheduler so only assigned processes run on them. Add to the kernel command line:

```bash
sudo grubby --update-kernel=ALL --args="isolcpus=2,3"
```

Reboot for the change to take effect. After isolation, CPUs 2 and 3 are removed from general scheduler load balancing, and you can move processes onto or off those CPUs with CPU affinity tools such as `taskset` or cpusets.

## Conclusion

Tuning CPU scheduling and process affinity on RHEL gives you fine-grained control over how processes share CPU resources. Use real-time scheduling for latency-sensitive workloads and CPU pinning to reduce cache misses and context switches.
