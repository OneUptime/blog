# How to Configure SCHED_FIFO for Real-Time Processes on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Real-Time, SCHED_FIFO, Scheduling, Performance

Description: Learn how to use SCHED_FIFO real-time scheduling policy on Ubuntu to give critical processes guaranteed CPU time and predictable execution order.

---

Linux offers several scheduling policies. The default `SCHED_OTHER` (also called `SCHED_NORMAL`) is a fair-share time-slicing scheduler optimized for throughput. `SCHED_FIFO` is a real-time policy that operates differently: a SCHED_FIFO process runs until it either voluntarily yields, blocks waiting for I/O, or is preempted by a higher-priority SCHED_FIFO process. There is no time-slicing between processes at the same priority. This makes SCHED_FIFO ideal for processes that need deterministic, uninterrupted execution windows.

## Prerequisites

- Ubuntu 22.04 or newer
- PREEMPT_RT kernel recommended for best results
- Root or sudo access (regular users need explicit permissions)

## Understanding Linux Scheduling Policies

```text
Policy          Class       Use Case
--------        -----       --------
SCHED_OTHER     Normal      General purpose - most applications
SCHED_BATCH     Normal      CPU-intensive background work
SCHED_IDLE      Idle        Very low priority background jobs
SCHED_FIFO      Real-time   Deterministic, uninterrupted execution
SCHED_RR        Real-time   Real-time with time slicing between equal-priority tasks
SCHED_DEADLINE  Real-time   Deadline-based scheduling (CBS algorithm)
```

Real-time priorities range from 1 (lowest) to 99 (highest). SCHED_FIFO and SCHED_RR share this priority range.

**Important**: A runnable SCHED_FIFO process at any priority level will preempt ALL `SCHED_OTHER` processes. This means a misbehaving RT process can starve the entire system. Use SCHED_FIFO carefully.

## Checking Current Process Scheduling

```bash
# View scheduling policy and priority of a process
chrt -p <PID>

# Check all running processes with their scheduling class
ps -eo pid,class,rtprio,ni,pri,comm | head -30

# Legend:
# TS = SCHED_OTHER (time-sharing)
# FF = SCHED_FIFO
# RR = SCHED_RR
# IDL = SCHED_IDLE
# DLN = SCHED_DEADLINE

# View system-wide scheduler statistics
cat /proc/schedstat
```

## Setting SCHED_FIFO Using chrt

### Running a New Process with SCHED_FIFO

```bash
# Start a process with SCHED_FIFO at priority 50
sudo chrt -f 50 /path/to/my-rt-app

# Common priority levels:
# 99 - Highest RT priority (avoid using this - can make system unresponsive)
# 80-90 - High priority real-time apps
# 50-70 - Normal RT applications
# 20-40 - Lower RT, still preempts all SCHED_OTHER

# Combine with CPU pinning for full RT setup
sudo taskset -c 2 chrt -f 80 /path/to/my-rt-app
```

### Changing Priority of an Existing Process

```bash
# Change the scheduling policy of a running process
sudo chrt -f -p 60 <PID>

# Lower the RT priority of a process
sudo chrt -f -p 40 <PID>

# Restore to normal scheduling
sudo chrt -o -p 0 <PID>  # Switch back to SCHED_OTHER

# Check the change took effect
chrt -p <PID>
```

## Configuring Permissions for Non-Root Users

Real-time scheduling requires `CAP_SYS_NICE` or appropriate resource limits. For production, configure limits rather than running everything as root.

### Using /etc/security/limits.conf

```bash
# Allow the 'audio' group to use real-time scheduling
sudo tee /etc/security/limits.d/realtime.conf > /dev/null <<'EOF'
# Real-time scheduling limits
# Syntax: <domain> <type> <item> <value>

# Allow the 'realtime' group to use RT scheduling up to priority 95
@realtime   -   rtprio    95
@realtime   -   memlock   unlimited

# Allow a specific user
myapp_user  -   rtprio    80
myapp_user  -   memlock   unlimited
EOF

# Create a group for RT users
sudo groupadd realtime

# Add users to the group
sudo usermod -aG realtime $USER

# Log out and back in to apply
# Test the limits
ulimit -r  # Should show 95
```

### Using systemd Service with RT Scheduling

The preferred way to run production RT services is via systemd:

```bash
sudo tee /etc/systemd/system/my-rt-app.service > /dev/null <<'EOF'
[Unit]
Description=My Real-Time Application
After=network.target

[Service]
Type=simple
User=myapp_user
Group=realtime

# Set SCHED_FIFO at priority 80
CPUSchedulingPolicy=fifo
CPUSchedulingPriority=80

# Pin to CPU 2
CPUAffinity=2

# Lock memory to prevent page faults during RT execution
LimitMEMLOCK=infinity

# Prevent OOM killer from targeting this process
OOMScoreAdjust=-900

ExecStart=/usr/local/bin/my-rt-app

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now my-rt-app

# Verify the service is using RT scheduling
systemctl show my-rt-app | grep -i cpu
ps -o pid,class,rtprio,comm -p $(systemctl show -p MainPID my-rt-app | cut -d= -f2)
```

## Setting SCHED_FIFO in Application Code

For C/C++ applications that need to set their own RT policy:

```c
/* rt_app.c - Example of setting SCHED_FIFO from within a program */
#include <sched.h>
#include <stdio.h>
#include <string.h>
#include <errno.h>
#include <sys/mman.h>

int set_realtime_priority(int priority) {
    struct sched_param param;

    /* Validate priority range */
    if (priority < 1 || priority > 99) {
        fprintf(stderr, "Priority must be between 1 and 99\n");
        return -1;
    }

    param.sched_priority = priority;

    /* Set the scheduling policy to SCHED_FIFO */
    if (sched_setscheduler(0, SCHED_FIFO, &param) != 0) {
        fprintf(stderr, "sched_setscheduler failed: %s\n", strerror(errno));
        return -1;
    }

    /* Lock all memory to prevent page faults during RT execution */
    if (mlockall(MCL_CURRENT | MCL_FUTURE) != 0) {
        fprintf(stderr, "mlockall failed: %s\n", strerror(errno));
        /* Non-fatal, continue anyway */
    }

    printf("Set to SCHED_FIFO priority %d\n", priority);
    return 0;
}

int main(void) {
    /* Set real-time scheduling before doing any RT work */
    if (set_realtime_priority(80) != 0) {
        /* Fall back to normal operation if RT setup fails */
        fprintf(stderr, "Warning: Could not set RT priority. Running without RT.\n");
    }

    /* Your real-time application code here */
    while (1) {
        /* Do RT work */
        /* Must call sched_yield() or block periodically to avoid starvation */
        sched_yield();
    }

    return 0;
}
```

Compile and run:

```bash
gcc -o rt_app rt_app.c
sudo ./rt_app
# Or as a non-root user in the realtime group:
./rt_app
```

## Watchdog and RT Throttling

Linux has a safety mechanism that limits how much of the CPU SCHED_FIFO processes can consume:

```bash
# Check the current RT throttling settings
cat /proc/sys/kernel/sched_rt_period_us   # Default: 1000000 (1 second)
cat /proc/sys/kernel/sched_rt_runtime_us  # Default: 950000 (0.95 seconds)

# This means RT tasks can use at most 95% of CPU time
# If RT tasks try to use more, they are throttled

# For systems where you trust your RT application, you can disable throttling:
# WARNING: Only do this if you are confident your RT app yields correctly
echo -1 | sudo tee /proc/sys/kernel/sched_rt_runtime_us

# Make permanent
echo "kernel.sched_rt_runtime_us = -1" | sudo tee /etc/sysctl.d/99-rt.conf
sudo sysctl -p /etc/sysctl.d/99-rt.conf
```

## Avoiding Priority Inversion

Priority inversion occurs when a low-priority process holds a resource needed by a high-priority process. Use priority-inheritance mutexes in your code:

```c
/* Initialize a mutex with priority inheritance */
pthread_mutexattr_t attr;
pthread_mutex_t mutex;

pthread_mutexattr_init(&attr);
/* PTHREAD_PRIO_INHERIT makes the low-priority thread temporarily
   inherit the priority of the highest-priority thread waiting for the mutex */
pthread_mutexattr_setprotocol(&attr, PTHREAD_PRIO_INHERIT);
pthread_mutex_init(&mutex, &attr);
pthread_mutexattr_destroy(&attr);
```

## Monitoring RT Processes

```bash
# Monitor RT processes in real time
watch -n 1 'ps -eo pid,class,rtprio,ni,pri,pcpu,comm | grep -E "FF|RR|DL"'

# Check scheduler statistics
cat /proc/sched_debug | head -50

# Monitor for RT throttling events
dmesg | grep -i "throttl"
# If you see RT throttling warnings, your RT process is monopolizing the CPU
```

## Testing Your RT Configuration

```bash
# Quick test: verify a process can get SCHED_FIFO
chrt -f 50 bash -c 'chrt -p $$ && sleep 5'

# Measure actual scheduling latency
sudo apt install -y rt-tests
sudo taskset -c 2 chrt -f 80 cyclictest \
  --mlockall \
  --interval=1000 \
  --threads=1 \
  --loops=10000 \
  --quiet

# The Max latency in microseconds is your worst-case scheduling jitter
```

SCHED_FIFO is a powerful but potentially dangerous tool. Used properly on an isolated CPU with appropriate priorities, it provides the deterministic execution guarantees that real-time applications require. Always pair it with CPU isolation and memory locking for a complete real-time setup.
