# How to Monitor and Reduce Context Switches on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Performance Tuning, Linux, System Administration, CPU

Description: Learn how to monitor context switches on Ubuntu using vmstat, pidstat, and perf, understand voluntary vs involuntary switches, and reduce excessive context switching for better performance.

---

A context switch happens when the CPU stops executing one process or thread and starts executing another. The kernel saves the state of the outgoing thread (registers, stack pointer, program counter) and loads the state of the incoming thread. This takes time - typically 1-10 microseconds - and invalidates CPU caches, which adds more cost.

Some context switching is normal and necessary. But when context switch rates become very high - hundreds of thousands per second - the overhead becomes measurable and you start to see degraded application performance that doesn't have an obvious cause.

## Understanding Context Switch Types

There are two types:

**Voluntary context switches** (`cswch` in pidstat): The process gave up the CPU because it was waiting for something - an I/O operation, a lock, a sleep call, network data. This is expected and healthy behavior.

**Involuntary context switches** (`nvcswch` in pidstat): The scheduler forcibly removed the process from the CPU because its time slice expired. High values suggest more threads are competing for CPU than the hardware can service.

## Monitoring System-Wide Context Switches

### vmstat

```bash
# Watch context switches system-wide
vmstat 1

# The 'cs' column shows context switches per second
# Also watch 'in' for interrupts per second
```

Sample output:

```text
procs -----------memory---------- ---swap-- -----io---- -system-- ------cpu-----
 r  b   swpd   free   buff  cache   si   so    bi    bo   in   cs us sy id wa st
 4  0      0 2048576  81920 4194304   0    0     5    12 5234 45678  35  15  48  2   0
```

The `cs` value of 45,678 means 45,678 context switches per second. Whether that's problematic depends on the workload - a busy web server handling many concurrent requests might legitimately have high values.

### perf stat

```bash
# System-wide context switch count for 10 seconds
sudo perf stat -e context-switches,cpu-migrations -a sleep 10
```

Output:

```text
Performance counter stats for 'system wide':

         4,567,890      context-switches
            12,345      cpu-migrations

      10.000234567 seconds time elapsed
```

CPU migrations (when a thread moves from one core to another) are expensive because they cause cache invalidation.

### sar

For historical context switch data:

```bash
# Context switches history from today
sar -w 1

# Historical data
sar -w -f /var/log/sysstat/sa$(date +%d)
```

## Per-Process Context Switches with pidstat

```bash
# Show context switches per process, update every 1 second
pidstat -w 1

# For a specific process
pidstat -w -p $(pgrep nginx | head -1) 1
```

Output:

```text
Linux 5.15.0-91-generic    03/02/2026    _x86_64_

14:23:45      UID       PID   cswch/s nvcswch/s  Command
14:23:45     1000     12345     123.45     45.67  myapp
14:23:45     1000     12346      45.23      8.91  myapp-worker
```

- High `cswch/s` with low `nvcswch/s` - process is doing a lot of I/O or lock contention (voluntary waits)
- High `nvcswch/s` - process is being preempted; too many threads competing for CPU

## Finding Processes with High Context Switches

```bash
# Sort by total context switches
pidstat -w 1 | sort -k4 -rn | head -10

# Watch a specific application's context switches
watch -n 1 "pidstat -w -C myapp 1 1 | tail -5"
```

## Using /proc for Detailed Per-Thread Stats

For deep per-thread analysis:

```bash
#!/bin/bash
# show-thread-csw.sh - show context switches for each thread of a process

PID=$(pgrep $1 | head -1)

echo "Thread context switches for PID $PID ($1):"
echo "TID          voluntary   involuntary"

for tid in /proc/$PID/task/*/status; do
    tid_num=$(echo $tid | cut -d/ -f6)
    vol=$(grep "voluntary_ctxt_switches" $tid | awk '{print $2}')
    invol=$(grep "nonvoluntary_ctxt_switches" $tid | awk '{print $2}')
    echo "$tid_num    $vol    $invol"
done | sort -k2 -rn
```

Usage:

```bash
./show-thread-csw.sh nginx
```

## Common Causes and Solutions

### Too Many Threads

The most common cause of high involuntary context switches is having more threads than CPU cores:

```bash
# Count threads per process
ps -eo pid,comm,nlwp --sort=-nlwp | head -20
```

If an application has 200 threads on a 4-core server, each core is context-switching between 50 threads. The solution is usually to reduce thread pool sizes in the application.

For Nginx:

```bash
# Set worker_processes to match CPU count
grep worker_processes /etc/nginx/nginx.conf
# Should be: worker_processes auto; or worker_processes 4; (for 4 cores)
```

For Java thread pools:

```ini
# Tomcat example - limit threads to something reasonable
server.tomcat.max-threads=50
```

### Lock Contention

High voluntary context switches combined with high lock waits often indicates lock contention:

```bash
# Check lock contention with perf
sudo perf stat -e lock:contention_begin,lock:contention_end \
  -p $(pgrep myapp) sleep 10
```

Application-level solutions:
- Reduce lock granularity
- Use lock-free data structures where possible
- Batch operations to reduce the frequency of acquiring locks

### Interrupt Handling

High interrupt rates translate to context switches:

```bash
# Watch interrupts per CPU
cat /proc/interrupts

# Watch interrupt rates
watch -n 1 "cat /proc/interrupts | head -30"
```

If one CPU is handling all interrupts, distribute them with IRQ affinity:

```bash
# Spread NIC interrupts across all CPUs
# For a NIC with multiple queues (e.g., eth0 with 4 queues):
for i in 0 1 2 3; do
    irq=$(cat /sys/class/net/eth0/device/msi_irqs/$(ls /sys/class/net/eth0/device/msi_irqs/ | sed -n "$((i+1))p"))
    echo $((1 << i)) > /proc/irq/$irq/smp_affinity
done
```

### Excessive Timers

Applications that use many short-interval timers generate high rates of voluntary context switches:

```bash
# Find processes generating many wakeups
sudo perf record -e sched:sched_switch -a sleep 5
sudo perf report --stdio | grep -A 5 "sched_switch" | head -30
```

## CPU Isolation to Reduce Scheduler Interference

For real-time or latency-sensitive processes, isolate CPUs from the scheduler:

```bash
# In /etc/default/grub, add isolcpus to isolate cores 2-3
GRUB_CMDLINE_LINUX="isolcpus=2,3"
sudo update-grub
```

After reboot, pin the critical process to isolated cores:

```bash
taskset -c 2,3 ./realtime_process
```

No other processes will be scheduled on cores 2-3, eliminating context switches from other workloads.

## NUMA and Context Switches

On NUMA systems, scheduler decisions can cause processes to run on a different NUMA node than their memory:

```bash
# Check NUMA topology
numactl --hardware

# Run process with NUMA affinity
numactl --cpunodebind=0 --membind=0 ./myapp
```

Keeping process and memory on the same NUMA node reduces memory latency and can also reduce context switches because the process is less likely to be migrated.

## Kernel Preemption Model

The preemption model affects how frequently involuntary context switches occur:

```bash
# Check current preemption model
grep CONFIG_PREEMPT /boot/config-$(uname -r)
```

- `CONFIG_PREEMPT_NONE` - Desktop preemption, fewer context switches, higher throughput
- `CONFIG_PREEMPT_VOLUNTARY` - Voluntary kernel preemption
- `CONFIG_PREEMPT` - Full preemption, better latency, more context switches

Ubuntu's default server kernel typically uses `PREEMPT_VOLUNTARY`. You can compile a custom kernel with different preemption settings, but this is rarely necessary.

## Setting Realistic Expectations

Context switch overhead is usually around 1-5 microseconds per switch. At 50,000 switches per second on a 4-core system:
- Total overhead: ~50,000 * 3μs = 150ms per second per core
- As a percentage: 15% CPU overhead just from context switching

That's significant. At 200,000 switches per second, context switching itself becomes a major CPU consumer.

But context switches below 20,000-30,000 per second on a reasonably loaded server are generally not the cause of performance problems - look elsewhere first.

```bash
# Quick diagnostic: is context switching a problem?
vmstat 1 5 | awk 'NR>2 {cs_sum += $12; n++} END {print "Avg cs/s:", cs_sum/n}'
```

If the average is above 100,000 on a server that's not doing something legitimately parallel-intensive, start investigating which process is responsible.
