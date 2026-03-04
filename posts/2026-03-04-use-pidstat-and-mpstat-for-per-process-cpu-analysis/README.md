# How to Use pidstat and mpstat for Per-Process CPU Analysis on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Performance, CPU, Linux

Description: Learn how to use pidstat and mpstat for Per-Process CPU Analysis on RHEL with step-by-step instructions, configuration examples, and best practices.

---

pidstat and mpstat provide per-process and per-CPU performance analysis. pidstat breaks down CPU, memory, and I/O usage for individual processes, while mpstat shows how each CPU core is performing.

## Prerequisites

- RHEL
- sysstat package installed

## Step 1: Install sysstat

```bash
sudo dnf install -y sysstat
sudo systemctl enable --now sysstat
```

## Step 2: Per-Process CPU Usage with pidstat

```bash
pidstat 1 5
```

This shows CPU usage per process, sampled every 1 second for 5 intervals.

Output columns:
- `%usr` - User-space CPU time
- `%system` - Kernel-space CPU time
- `%CPU` - Total CPU usage
- `CPU` - Which CPU core the process ran on

## Step 3: Filter pidstat by Process

```bash
pidstat -p $(pidof httpd) 1
```

Or by command name:

```bash
pidstat -C "httpd" 1
```

## Step 4: Per-Process Memory with pidstat

```bash
pidstat -r 1 5
```

This shows memory statistics:
- `minflt/s` - Minor page faults per second
- `majflt/s` - Major page faults per second
- `VSZ` - Virtual memory size
- `RSS` - Resident set size

## Step 5: Per-Process I/O with pidstat

```bash
pidstat -d 1 5
```

Shows read/write bytes per second for each process.

## Step 6: Per-CPU Analysis with mpstat

```bash
mpstat -P ALL 1 5
```

This shows utilization for every CPU core. Key columns:
- `%usr` - User-space time
- `%sys` - Kernel time
- `%iowait` - Waiting for I/O
- `%idle` - Idle time

## Step 7: Identify CPU Imbalance

```bash
mpstat -P ALL 1 | awk '/^[0-9]/ && $NF < 50 {print "CPU " $3 " is busy: " 100-$NF "% used"}'
```

If one core is at 100% while others are idle, your application may not be parallelized properly.

## Step 8: Combine pidstat and mpstat

Monitor both together:

```bash
pidstat -u -r -d 1 5
```

This shows CPU, memory, and I/O for all processes in one report.

## Conclusion

pidstat and mpstat from the sysstat package give you detailed per-process and per-CPU performance data on RHEL. Use pidstat to identify which processes consume the most resources and mpstat to spot CPU imbalances across cores.
