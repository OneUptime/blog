# How to Profile System Bottlenecks with USE Method on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Performance, USE Method, Profiling, System Analysis

Description: Apply the USE Method (Utilization, Saturation, Errors) on Ubuntu to systematically identify system bottlenecks using standard Linux tools for CPU, memory, disk, and network analysis.

---

The USE Method is a performance analysis methodology developed by Brendan Gregg. For every resource in the system, check three metrics: **U**tilization (what percentage of time is the resource busy), **S**aturation (how much extra work is queued waiting for the resource), and **E**rrors (are there any error events). This systematic approach prevents the common mistake of fixing the wrong bottleneck because you started with a symptom (slow) rather than the root cause (disk at 95% utilization with a growing queue).

The beauty of USE is that it's a checklist: work through every resource type, collect the three metrics for each, and the bottleneck reveals itself.

## Resources to Check

The main resource categories:
1. CPUs (per-core and overall)
2. Memory
3. Network interfaces
4. Storage devices (per-device)
5. Storage controllers
6. Network controllers / PCIe buses

## CPU Analysis

### Utilization
```bash
# Per-CPU utilization
mpstat -P ALL 1 5

# Overall CPU utilization trend
vmstat 1 10
# %user + %system = utilization
# Target: <70% utilization for comfortable headroom

# Longer-term CPU history (if sar is installed)
sudo apt install sysstat -y
sar -u 1 10   # 10 samples, 1 second interval

# CPU utilization breakdown by process
top -b -n 1 | head -25
```

### Saturation
```bash
# Run queue length = number of threads waiting for CPU time
vmstat 1 5
# 'r' column = running + runnable tasks
# Rule: r > 2 * number of CPUs = saturated

# Detailed scheduler stats
cat /proc/schedstat  # Cumulative since boot

# Load average vs CPU count
uptime
nproc  # Number of CPUs
# If load average >> nproc, CPU is saturated

# Watch for CPU scheduling delays with perf
sudo perf sched latency 2>/dev/null | head -20
```

### Errors
```bash
# CPU hardware errors (machine check exceptions)
sudo mcelog --client 2>/dev/null || dmesg | grep -i "mce\|machine check" | tail -10

# Thermal throttling events
cat /sys/devices/system/cpu/cpu0/thermal_throttle/core_throttle_count
for cpu in /sys/devices/system/cpu/cpu*/thermal_throttle; do
    count=$(cat "$cpu/core_throttle_count" 2>/dev/null)
    [ "$count" != "0" ] && echo "$cpu: $count throttle events"
done

# Check dmesg for CPU errors
dmesg | grep -i "cpu\|mce\|nmi\|thermal" | grep -iv "info" | tail -20
```

## Memory Analysis

### Utilization
```bash
# Overall memory breakdown
free -h

# Detailed memory map
cat /proc/meminfo

# Memory utilization calculation (used = total - free - buffers - cache)
free | awk '/^Mem:/ {printf "Used: %.1f%% (%s/%s)\n", ($2-$4-$5-$6)/$2*100, $3, $2}'

# Per-process memory usage
ps aux --sort=-%mem | head -15
```

### Saturation
```bash
# Swap usage (if swap is being used, you're saturated)
vmstat 1 5
# 'si' and 'so' = pages swapped in/out per second
# Any non-zero si/so under normal load = memory pressure

# Page faults
cat /proc/vmstat | grep pgfault
# Major faults (disk reads) vs minor faults (page table only)

# OOM kill events
dmesg | grep -i "oom\|out of memory" | tail -10

# Memory pressure (Linux pressure stall info - kernel 4.20+)
cat /proc/pressure/memory
# "some" = any thread stalled on memory
# "full" = ALL threads stalled on memory

# swappiness and current swap behavior
cat /proc/sys/vm/swappiness
```

### Errors
```bash
# Hardware memory errors (requires edac or mcelog)
sudo apt install edac-utils -y
sudo edac-util -s 4

# Check for corrected/uncorrected memory errors
cat /sys/bus/edac/devices/*/edac*/ce_count 2>/dev/null  # Corrected errors
cat /sys/bus/edac/devices/*/edac*/ue_count 2>/dev/null  # Uncorrected errors

# DIMM status
sudo edac-util -v 2>/dev/null | head -20

dmesg | grep -i "memory error\|EDAC\|ECC" | tail -20
```

## Disk I/O Analysis

### Utilization
```bash
# Per-disk utilization (%util column)
iostat -xz 1 10
# %util = % of time disk was busy
# Target: <70% for latency-sensitive workloads
# 100% = fully utilized (saturated)

# Better view with column headers
iostat -xzh 2 5

# Which processes are doing the I/O
sudo iotop -b -n 5 -d 1
```

### Saturation
```bash
# avgqu-sz (average queue size) in iostat output
# Queue > 1 means I/O is backing up
iostat -x 1 5 | awk 'NR>3 {print $1, $9, $11, $16}'
# Field $9 = avgqu-sz (average queue size)
# Field $11 = await (average wait time)
# Field $16 = %util

# I/O pressure stall info
cat /proc/pressure/io
# "some" = some threads stalled on I/O
# "full" = all threads stalled on I/O

# Disk saturation via sar
sar -d 1 5
# %util and await indicate saturation
```

### Errors
```bash
# SMART errors (the most important disk errors)
sudo apt install smartmontools -y
sudo smartctl -H /dev/sda  # Quick health check
sudo smartctl -a /dev/sda | grep -E "SMART overall|Error|Sector|Reallocated|Pending|Uncorrectable"

# Kernel I/O errors
dmesg | grep -E "I/O error|blk_update_request|ata[0-9]|end_request" | tail -20

# Block device error counters
cat /sys/block/sda/stat | awk '{print "read_ios:"$1, "read_merges:"$2, "write_ios:"$5, "write_merges:"$6}'

# RAID array errors (if applicable)
cat /proc/mdstat
sudo mdadm --detail /dev/md0 2>/dev/null | grep -E "State|Failed|Error"
```

## Network Interface Analysis

### Utilization
```bash
# Network bandwidth utilization
# Install nload for real-time visualization
sudo apt install nload -y
nload eth0

# Or use sar
sar -n DEV 1 10
# rxkB/s and txkB/s - compare to NIC speed (1Gbps = 125MB/s)
# %util = (rxkB + txkB) / (NIC speed in kB/s) * 100

# Quick utilization check
ip -s link show eth0

# Nicstat for proper utilization percentage
sudo apt install nicstat -y
nicstat 1 10
```

### Saturation
```bash
# Receive queue drops (NIC dropping packets due to full queue)
ip -s link show eth0 | grep "RX:" -A 2
# "dropped" count is the key indicator

# More detailed NIC stats
sudo ethtool -S eth0 | grep -E "drop\|miss\|error" | grep -v ": 0"

# Socket receive buffer saturation
ss -tmpne | awk '$2 > 0 {print "Recv-Q:"$2, "PID:"$7}'
# Non-zero Recv-Q means the application can't read fast enough

# Network pressure
cat /proc/pressure/network 2>/dev/null || echo "Network pressure not available"
```

### Errors
```bash
# Interface error counters
ip -s link show eth0
# Errors in RX and TX are hardware or driver issues

# Detailed NIC error statistics
sudo ethtool -S eth0 | grep -v ": 0" | grep -i "err\|fail\|drop\|discard"

# Kernel network errors
netstat -s | grep -E "error|failed|retransmit|overflow" | grep -v "^$"

# TCP retransmits (application-level indicator of network problems)
ss -s | grep "retrans"
cat /proc/net/netstat | grep RetransSegs
```

## Building a USE Method Report

Automate the collection into a report:

```bash
#!/bin/bash
# use-method-report.sh - Generate a USE Method analysis report

echo "========================================="
echo "USE Method Performance Report"
echo "Host: $(hostname) - $(date)"
echo "========================================="

echo ""
echo "=== CPU ==="
echo "-- Utilization (last 1 second) --"
mpstat 1 1 | tail -1

echo "-- Saturation (run queue) --"
vmstat 1 3 | tail -1 | awk '{print "Run queue:", $1, "  Load avg:", $(NF-2), $(NF-1), $NF}'

echo "-- Errors --"
MCE=$(dmesg | grep -ic "machine check" 2>/dev/null || echo 0)
echo "Machine check errors in dmesg: $MCE"

echo ""
echo "=== Memory ==="
echo "-- Utilization --"
free -h | grep Mem

echo "-- Saturation --"
vmstat 1 1 | tail -1 | awk '{print "Swap-in:", $7, "Swap-out:", $8}'
cat /proc/pressure/memory 2>/dev/null

echo "-- Errors --"
dmesg | grep -ic "memory error" | xargs echo "Memory errors in dmesg:"

echo ""
echo "=== Disk I/O ==="
echo "-- Utilization & Saturation --"
iostat -xz 1 1 | awk 'NR>4 && $1!="" {printf "%-15s util=%.0f%% queue=%.1f await=%.1fms\n", $1, $NF, $9, $11}'

echo "-- Errors --"
dmesg | grep -c "I/O error" | xargs echo "I/O errors in dmesg:"

echo ""
echo "=== Network ==="
echo "-- Utilization & Saturation & Errors --"
for iface in $(ls /sys/class/net/ | grep -v lo); do
    ip -s link show "$iface" 2>/dev/null | awk -v iface="$iface" '
        /^[0-9]/ {next}
        /RX:/ {getline; rx_bytes=$1; rx_drop=$4}
        /TX:/ {getline; tx_bytes=$1; tx_drop=$4}
        END {
            printf "%-10s RX:%.1fGB TX:%.1fGB RX_drop:%s TX_drop:%s\n",
            iface, rx_bytes/1e9, tx_bytes/1e9, rx_drop, tx_drop
        }'
done
```

```bash
sudo chmod +x /usr/local/bin/use-method-report.sh
sudo /usr/local/bin/use-method-report.sh
```

## Reading the Results

After running the analysis, interpret the findings:

- **High CPU utilization (>80%) + high run queue** = CPU bottleneck. Add cores, optimize application code, or distribute load.
- **Memory utilization >90% + swap activity** = Memory bottleneck. Add RAM, tune application heap sizes, or optimize memory usage.
- **Disk %util >70% + queue >2 + high await** = Disk I/O bottleneck. Switch to faster storage, add caching (bcache), or optimize query patterns.
- **Network drops + errors** = NIC overrun or hardware issue. Increase ring buffers, check for cable/hardware faults.

The USE Method is most valuable when you run it first, before reaching for application-specific profiling tools. It tells you which subsystem to focus on, so you don't spend hours profiling application code when the real problem is a disk at 100% utilization.
