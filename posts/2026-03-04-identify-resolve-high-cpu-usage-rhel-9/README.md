# How to Identify and Resolve High CPU Usage on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, CPU, Performance, Troubleshooting, Linux, Monitoring

Description: Learn how to identify the causes of high CPU usage on RHEL and resolve them using system monitoring and analysis tools.

---

High CPU usage can degrade application performance and system responsiveness. On RHEL, several tools help you identify which processes consume the most CPU and determine whether the issue is in user space, kernel space, or caused by I/O wait.

## Prerequisites

- A RHEL system
- Root or sudo access

## Step 1: Check Overall CPU Usage

Start with a quick overview:

```bash
uptime
```

The load average values show system load over 1, 5, and 15 minutes. A load average higher than the number of CPU cores indicates the system is overloaded.

Check CPU count:

```bash
nproc
```

## Step 2: Identify CPU-Hungry Processes

Use top sorted by CPU:

```bash
top -bn1 -o %CPU | head -20
```

Or use ps:

```bash
ps aux --sort=-%cpu | head -15
```

Key fields to examine:

- **%CPU** - Percentage of CPU used
- **TIME+** - Cumulative CPU time
- **STAT** - Process state (R = running, D = disk wait)

## Step 3: Determine CPU Usage Type

Check where CPU time is spent:

```bash
mpstat -P ALL 2 5
```

Key columns:

- **%usr** - User space (application code)
- **%sys** - Kernel space (system calls, drivers)
- **%iowait** - Waiting for I/O
- **%irq** - Hardware interrupts
- **%soft** - Software interrupts
- **%steal** - Stolen by hypervisor (VMs)

### High %usr

Application code is consuming CPU. Profile the application:

```bash
sudo perf top -p $(pgrep my-app | head -1)
```

### High %sys

Kernel is consuming CPU. Check for excessive system calls:

```bash
sudo perf record -ag -e syscalls:sys_enter_* -- sleep 10
perf report --stdio
```

### High %iowait

CPU is waiting for disk I/O:

```bash
iostat -xz 2 5
```

Check for processes in uninterruptible sleep:

```bash
ps aux | awk '$8 ~ /D/'
```

### High %steal

The hypervisor is stealing CPU time. Contact your cloud provider or check VM resource allocation.

## Step 4: Profile the CPU-Intensive Process

Record a profile of the process:

```bash
sudo perf record -g -p $(pgrep my-app | head -1) -- sleep 30
perf report
```

Check for busy loops or inefficient code paths.

## Step 5: Check for Runaway Processes

Look for processes that have accumulated excessive CPU time:

```bash
ps aux --sort=-time | head -10
```

## Step 6: Resolve Common Issues

### Kill a Runaway Process

```bash
kill $(pgrep runaway-process)
```

Force kill if it does not respond:

```bash
kill -9 $(pgrep runaway-process)
```

### Limit CPU Usage with cgroups

Create a CPU-limited cgroup:

```bash
sudo mkdir -p /sys/fs/cgroup/cpu-limited
echo "50000 100000" | sudo tee /sys/fs/cgroup/cpu-limited/cpu.max
```

Move a process into the cgroup:

```bash
echo $PID | sudo tee /sys/fs/cgroup/cpu-limited/cgroup.procs
```

### Lower Process Priority

```bash
sudo renice 19 -p $PID
```

### Use nice for New Processes

```bash
nice -n 19 ./my-background-task
```

## Step 7: Set Up Alerts

Configure PCP or a monitoring tool to alert on high CPU:

```bash
pmval -t 5sec kernel.all.cpu.idle
```

If idle consistently drops below 10%, investigate.

## Conclusion

Resolving high CPU usage on RHEL starts with identifying whether the issue is in user space, kernel space, or I/O related. Use top and ps to find the offending process, mpstat to categorize the CPU usage, and perf to profile the code path. Apply cgroups or process priority adjustments to limit impact.
