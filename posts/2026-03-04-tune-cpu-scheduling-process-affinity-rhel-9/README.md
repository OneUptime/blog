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
- **SCHED_BATCH** - Batch processing, lower priority than SCHED_OTHER
- **SCHED_IDLE** - Very low priority, runs only when system is idle
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

The Completely Fair Scheduler (CFS) has tunable parameters:

```bash
# Minimum granularity (time slice) in nanoseconds
cat /proc/sys/kernel/sched_min_granularity_ns

# Target latency for CFS scheduling period
cat /proc/sys/kernel/sched_latency_ns

# Wake-up granularity
cat /proc/sys/kernel/sched_wakeup_granularity_ns
```

Reduce latency for interactive workloads:

```bash
sudo sysctl -w kernel.sched_latency_ns=6000000
sudo sysctl -w kernel.sched_min_granularity_ns=750000
```

Make persistent:

```bash
echo "kernel.sched_latency_ns=6000000" | sudo tee -a /etc/sysctl.d/scheduler.conf
echo "kernel.sched_min_granularity_ns=750000" | sudo tee -a /etc/sysctl.d/scheduler.conf
sudo sysctl -p /etc/sysctl.d/scheduler.conf
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

Reboot for the change to take effect. After isolation, only processes explicitly assigned to CPUs 2 and 3 via taskset will run on them.

## Conclusion

Tuning CPU scheduling and process affinity on RHEL gives you fine-grained control over how processes share CPU resources. Use real-time scheduling for latency-sensitive workloads and CPU pinning to reduce cache misses and context switches.
