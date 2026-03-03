# How to Use iotop to Identify Disk I/O Heavy Processes on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Performance Monitoring, Storage, Linux, System Administration

Description: Learn how to use iotop on Ubuntu to identify which processes are causing high disk I/O, monitor read and write rates per process, and troubleshoot disk performance issues.

---

`iostat` tells you the disk is saturated. `iotop` tells you which process is responsible. It works like `top` but shows I/O bandwidth usage per process, making it the right tool when you need to quickly identify what's hammering the disk.

## Installing iotop

```bash
sudo apt update
sudo apt install iotop -y
```

`iotop` requires root privileges because it reads per-process I/O statistics from the kernel.

## Basic Usage

```bash
# Start iotop (requires root)
sudo iotop
```

The display updates every second and shows:

```text
Total DISK READ:       12.34 M/s | Total DISK WRITE:      45.67 M/s
Current DISK READ:     12.34 M/s | Current DISK WRITE:    45.67 M/s
    TID    PRIO    USER    DISK READ    DISK WRITE    SWAPIN    IO>    COMMAND
   1234 be/4  postgres   0.00 B/s    42.56 M/s       0.00%   75.23% postgres: autovacuum
   5678 be/4  www-data   12.34 M/s    0.00 B/s       0.00%   12.45% nginx: worker process
    890 be/7  root        0.00 B/s    3.11 M/s       0.00%    5.23% rsync
```

Header rows:
- `Total DISK READ/WRITE` - Total I/O from all processes
- `Current DISK READ/WRITE` - Actual I/O rate from disk (may differ due to caching)

Per-process columns:
- `TID` - Thread ID (not PID when threads are shown separately)
- `PRIO` - I/O priority (be=best-effort, rt=real-time, idle)
- `DISK READ/WRITE` - I/O rate for this process
- `SWAPIN` - Percentage of time waiting for swap
- `IO>` - Percentage of time this process spent waiting for I/O
- `COMMAND` - Process name and arguments

## Keyboard Controls in Interactive Mode

| Key | Action |
|-----|--------|
| `r` | Reverse sort order |
| `o` | Show only processes doing I/O |
| `p` | Show processes instead of threads |
| `a` | Accumulate I/O totals (not just current rate) |
| `q` | Quit |
| `left/right` | Change sort column |

The `o` key is the most useful - it hides idle processes and shows only those currently doing disk I/O.

## Show Only Active I/O Processes

```bash
# Show only processes actually doing I/O
sudo iotop -o
```

This is the most practical mode for diagnosis. Silent processes disappear from the list and only I/O-active ones remain visible.

## Process vs Thread View

By default, iotop shows individual threads. To see processes instead:

```bash
# Show by process (PID), not thread (TID)
sudo iotop -P
```

Or press `p` in interactive mode.

## Non-Interactive / Batch Mode

For scripting or logging:

```bash
# Non-interactive mode, 1-second intervals, 10 samples
sudo iotop -b -n 10

# Non-interactive with 5-second interval
sudo iotop -b -d 5 -n 12

# Only show processes doing I/O, non-interactive
sudo iotop -b -o -n 5

# Save to file
sudo iotop -b -n 60 > /var/log/iotop_$(date +%Y%m%d_%H%M%S).log
```

## Showing Accumulated I/O

Instead of the current rate, see total I/O since iotop started:

```bash
sudo iotop -a
```

Or press `a` in interactive mode. This shows which process has done the most I/O since you started watching, which is useful for identifying long-running heavy I/O processes that may not be hammering the disk right now but have been doing so continuously.

## Monitoring a Specific Process

```bash
# Monitor only processes with name matching "postgres"
sudo iotop -p $(pgrep postgres | tr '\n' ',' | sed 's/,$//')
```

Or with `-p` for a specific PID:

```bash
sudo iotop -p 1234
```

## Combining iotop with Other Tools

The typical workflow when I/O utilization is high:

```bash
# Terminal 1: System-level view
iostat -x 1

# Terminal 2: Find which process is responsible
sudo iotop -o

# Terminal 3: Investigate that process further
strace -p <PID> -e trace=read,write,open 2>&1 | head -50
```

Once you have the PID from iotop, you can use `lsof -p PID` to see what files it has open, and `strace -p PID` to see exactly which files it's reading and writing.

## Understanding I/O Priority

The `PRIO` column shows the I/O scheduling class:

- `be/N` - Best effort, priority N (0=highest, 7=lowest). Default for most processes.
- `rt/N` - Real time. Guaranteed I/O bandwidth.
- `idle` - Only gets I/O when no other process needs it.

Change I/O priority of a process:

```bash
# Set a background process to idle I/O priority
sudo ionice -c 3 -p $(pgrep backupjob)

# Set real-time priority for a database
sudo ionice -c 1 -n 0 -p $(pgrep postgres | head -1)
```

## Common Scenarios

### High Write I/O

```bash
# Find who's writing the most
sudo iotop -o | grep -v "0.00 B/s.*0.00 B/s"
```

High write I/O is often caused by:
- Database checkpoints (PostgreSQL, MySQL)
- Log file rotation or rsyslog
- Backup jobs (rsync, tar)
- Compressed file operations
- Build system compilation

### High Read I/O

High read I/O often means working set doesn't fit in page cache:
- Cold start of a database
- Large file serving
- Search index building

After identifying the process with iotop:

```bash
# Check what files the process is reading
sudo lsof -p <PID> | grep REG

# Check if files are being cached
# (drop caches to simulate cold start, then watch iotop during recovery)
sudo sh -c "sync && echo 3 > /proc/sys/vm/drop_caches"
```

### Swap Activity

When `SWAPIN%` is high in iotop output, processes are fetching memory pages from swap - a sign of memory pressure causing I/O that wouldn't otherwise exist. Address with:

```bash
# Check memory situation
free -h
vmstat 1 5

# Find what's using memory
ps aux --sort=-%mem | head -10
```

## Logging I/O Events for Analysis

Capture I/O data during a load test or incident:

```bash
#!/bin/bash
# capture-iotop.sh - log I/O activity during a test

OUTPUT="/tmp/iotop_$(date +%Y%m%d_%H%M%S).log"
DURATION=60   # seconds
INTERVAL=2    # seconds between samples

echo "Capturing iotop data to $OUTPUT"
echo "Duration: ${DURATION}s, Interval: ${INTERVAL}s"

sudo iotop -b -o -d $INTERVAL -n $(( DURATION / INTERVAL )) > "$OUTPUT"

echo "Done. Top I/O consumers:"
grep -v "^Total\|^Current\|^TID" "$OUTPUT" | \
  awk '{read+=$4; write+=$6; cmd=$NF} END {print read, write, cmd}' | \
  sort -rn | head -10
```

## iotop vs pidstat for I/O Monitoring

Both tools show per-process I/O:

- `iotop -o` - Interactive, real-time view, easiest to spot the culprit quickly
- `pidstat -d 1` - Better for scripting, logging, and trending over time

For quick identification: use iotop. For logging over time: use pidstat.

## When iotop Shows High I/O but iostat Doesn't

This can happen because iotop counts I/O at the application layer, while iostat shows actual disk I/O. The difference is buffer cache:
- Process writes go to page cache first
- Page cache is flushed to disk by the kernel asynchronously
- iotop sees the write immediately; iostat sees it when the kernel decides to flush

This is normal behavior. A spike in iotop write activity may show up in iostat several seconds later as a large writeback burst.

`iotop` is simple but fills an important gap. When the disk is saturated and you need to know who to blame, a 10-second look at `sudo iotop -o` usually gives you the answer.
