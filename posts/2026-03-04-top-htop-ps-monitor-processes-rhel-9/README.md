# How to Use top, htop, and ps to Monitor System Processes on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Monitoring, Processes, top, htop, ps, Linux, System Administration

Description: Learn how to use top, htop, and ps to monitor system processes on RHEL and identify resource-consuming applications.

---

Process monitoring is essential for identifying performance bottlenecks on RHEL. The `top`, `htop`, and `ps` commands provide different views of running processes, CPU usage, memory consumption, and system load.

## Prerequisites

- A RHEL system
- Basic command line knowledge

## Using top

The `top` command provides a real-time, dynamic view of system processes.

Launch top:

```bash
top
```

### Understanding the top Header

The header shows:

- **Load average** - 1, 5, and 15 minute averages
- **Tasks** - Total, running, sleeping, stopped, zombie
- **CPU** - User, system, nice, idle, wait, hardware interrupt, software interrupt, steal
- **Memory** - Total, free, used, buff/cache
- **Swap** - Total, free, used, available memory

### Useful top Commands

While top is running:

- `1` - Toggle per-CPU display
- `M` - Sort by memory usage
- `P` - Sort by CPU usage
- `T` - Sort by cumulative time
- `k` - Kill a process (enter PID)
- `r` - Renice a process
- `f` - Select display fields
- `c` - Toggle full command path
- `H` - Toggle thread display
- `q` - Quit

### Running top in Batch Mode

For scripting and logging:

```bash
top -bn1 | head -20
```

Show specific processes:

```bash
top -bn1 -p 1234,5678
```

## Using htop

htop provides a more user-friendly, colorized interface with mouse support.

### Installing htop

```bash
sudo dnf install htop -y
```

### Running htop

```bash
htop
```

### htop Features

- Color-coded CPU and memory bars at the top
- Tree view showing process hierarchy (press `F5`)
- Easy process filtering (press `F4`)
- Search for processes (press `F3`)
- Sort by any column (press `F6`)
- Kill processes (press `F9`)
- Change priority (press `F7`/`F8`)

### htop Configuration

Press `F2` to access setup and customize:

- Display options (show threads, highlight programs)
- Column selection
- Color scheme
- Header meters (add CPU, memory, load, uptime)

### Filtering by User

Show processes for a specific user:

```bash
htop -u apache
```

## Using ps

The `ps` command shows a snapshot of processes at a point in time.

### Common ps Usage

Show all processes:

```bash
ps aux
```

Show processes in a tree format:

```bash
ps auxf
```

Show processes sorted by CPU usage:

```bash
ps aux --sort=-%cpu | head -20
```

Show processes sorted by memory usage:

```bash
ps aux --sort=-%mem | head -20
```

### Selecting Specific Columns

Display custom columns:

```bash
ps -eo pid,ppid,user,%cpu,%mem,vsz,rss,stat,start,time,comm --sort=-%cpu | head -20
```

### Filtering by Process Name

```bash
ps aux | grep httpd
```

Or use pgrep:

```bash
pgrep -a httpd
```

### Showing Process Threads

Display threads for a process:

```bash
ps -T -p $(pgrep httpd | head -1)
```

### Process States

The `STAT` column shows process states:

- `R` - Running
- `S` - Sleeping (interruptible)
- `D` - Disk sleep (uninterruptible)
- `Z` - Zombie
- `T` - Stopped
- `+` - Foreground process group
- `<` - High priority
- `N` - Low priority
- `l` - Multi-threaded

## Combining Tools for Analysis

Use ps for snapshots and top/htop for real-time monitoring:

```bash
# Find top 5 CPU consumers right now
ps aux --sort=-%cpu | head -6

# Watch them in real time
top -p $(ps aux --sort=-%cpu | awk 'NR>1 && NR<=6 {print $2}' | tr '\n' ',' | sed 's/,$//')
```

## Conclusion

Use `top` for quick real-time monitoring, `htop` for interactive exploration with a friendly interface, and `ps` for scriptable snapshots. Together, these tools give you complete visibility into process behavior on RHEL.
