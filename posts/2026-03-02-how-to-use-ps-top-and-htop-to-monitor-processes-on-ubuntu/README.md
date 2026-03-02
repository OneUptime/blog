# How to Use ps, top, and htop to Monitor Processes on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Process Management, System Monitoring, Linux Administration

Description: A practical guide to monitoring running processes on Ubuntu using ps, top, and htop, including how to filter, sort, and interpret process information.

---

Understanding what is running on your Ubuntu system is a fundamental sysadmin skill. Three tools dominate process monitoring: `ps` for snapshot views and scripting, `top` for real-time terminal monitoring, and `htop` for an enhanced interactive experience. Each has strengths that make it the right choice in different situations.

## ps - Snapshot Process Information

`ps` (process status) takes a snapshot of running processes at the moment you run it. It is non-interactive and produces output you can filter and script with.

### Basic ps Usage

```bash
# Show your own processes in the current terminal
ps

# Show all processes for all users
ps aux

# Show all processes in full format
ps -ef

# Show processes in a tree view (shows parent-child relationships)
ps axjf
# Or: ps --forest -eo pid,ppid,cmd
```

### Understanding ps aux Output

```bash
ps aux
```

```
USER       PID  %CPU %MEM    VSZ    RSS TTY      STAT START   TIME COMMAND
root         1   0.0  0.1 167988  9428 ?        Ss   Mar01   0:05 /sbin/init
root         2   0.0  0.0      0     0 ?        S    Mar01   0:00 [kthreadd]
nginx     1234   0.1  0.3  85432 12345 ?        S    10:00   0:01 nginx: worker process
postgres  2345   0.2  1.5 234567 62345 ?        Ss   Mar01   2:34 postgres: main process
```

Column meanings:
- **USER**: Username of the process owner
- **PID**: Process ID
- **%CPU**: CPU usage percentage (can exceed 100% on multi-core)
- **%MEM**: Physical memory usage percentage
- **VSZ**: Virtual memory size in kilobytes
- **RSS**: Resident Set Size - actual physical RAM used
- **TTY**: Terminal the process is attached to (`?` means no terminal)
- **STAT**: Process state (S=sleeping, R=running, Z=zombie, D=disk wait)
- **START**: When the process started
- **TIME**: Total CPU time consumed
- **COMMAND**: The command that started the process

### Filtering ps Output

```bash
# Show processes by a specific user
ps aux | grep nginx
ps -u nginx

# Show a specific process by name
ps -C nginx

# Show a process by PID
ps -p 1234

# Show process tree for a specific PID
ps --ppid 1234  # Show children of PID 1234

# Sort by CPU usage (highest first)
ps aux --sort=-%cpu | head -10

# Sort by memory usage
ps aux --sort=-%mem | head -10

# Show specific columns
ps -eo pid,ppid,user,cmd,%cpu,%mem --sort=-%cpu | head -20
```

### Custom ps Output Formats

```bash
# Show PID, parent PID, user, CPU, memory, and command
ps -eo pid,ppid,user,%cpu,%mem,cmd

# Show process start time and elapsed time
ps -eo pid,lstart,etime,cmd

# Show resource limits for a process
ps -p 1234 -o pid,rlimit

# Useful one-liner: show top CPU consumers with their user
ps -eo user,pid,%cpu,%mem,cmd --sort=-%cpu | head -15
```

## top - Real-Time Process Monitoring

`top` shows a continuously updating view of system processes. It combines system-wide statistics (load, CPU, memory) with a process list.

```bash
# Start top
top

# Start top showing a specific user's processes
top -u nginx

# Start top with a specific update interval (seconds)
top -d 2

# Run top for a fixed number of iterations and exit
top -b -n 1  # Batch mode, one iteration (good for scripting)
```

### Reading the top Header

```
top - 10:35:22 up 2 days,  4:12,  2 users,  load average: 0.23, 0.18, 0.15
Tasks: 234 total,   1 running, 233 sleeping,   0 stopped,   0 zombie
%Cpu(s):  2.3 us,  0.8 sy,  0.0 ni, 96.7 id,  0.2 wa,  0.0 hi,  0.0 si,  0.0 st
MiB Mem :   7854.8 total,   1234.5 free,   3456.7 used,   3163.6 buff/cache
MiB Swap:   2048.0 total,   2047.5 free,      0.5 used.   3876.4 avail Mem
```

- **load average**: Average number of runnable processes over 1, 5, and 15 minutes
- **us**: User space CPU time
- **sy**: System (kernel) CPU time
- **ni**: Nice (low-priority processes) CPU time
- **id**: Idle CPU time
- **wa**: Waiting for I/O
- **buff/cache**: Memory used for buffers and cache (can be reclaimed by processes)
- **avail Mem**: Memory available for starting new processes

### top Interactive Commands

While top is running, press these keys:

```
q       - Quit
h       - Help
M       - Sort by memory usage
P       - Sort by CPU usage
T       - Sort by time (total CPU time)
N       - Sort by PID
k       - Kill a process (prompts for PID)
r       - Renice a process (change priority)
u       - Show processes for a specific user
1       - Toggle per-CPU display
c       - Toggle between command and full path
d       - Change update delay
f       - Select which columns to show
W       - Write current config to file
```

### top in Batch Mode for Scripting

```bash
# Capture one snapshot of top output to a file
top -b -n 1 > /tmp/top-snapshot.txt

# Get just the process section (skip header)
top -b -n 1 | tail -n +8 > /tmp/processes.txt

# Get top 10 CPU consumers
top -b -n 1 -o %CPU | head -17 | tail -10
```

## htop - Enhanced Interactive Process Viewer

`htop` is a more user-friendly alternative to `top` with color, mouse support, and easier navigation.

```bash
# Install htop
sudo apt install htop

# Start htop
htop

# Start showing a specific user's processes
htop -u nginx

# Start with a specific sort column (percentage: 0=CPU, 1=MEM, etc.)
htop --sort-key PERCENT_CPU
```

### htop Interface Overview

htop shows:
- Per-CPU bars at the top (different colors for user/system/nice/IOWait)
- Memory and swap usage bars
- Task counts and uptime
- A color-coded process list

Color meanings in the process list:
- **Green**: Regular user processes
- **Blue**: Low priority (nice > 0) processes
- **Red**: Kernel threads
- **Yellow/Orange**: IRQ/softirq time

### htop Keyboard Shortcuts

```
F1     - Help
F2     - Setup (configure display options)
F3     - Search for a process by name
F4     - Filter processes (show only matching)
F5     - Toggle tree view (show process hierarchy)
F6     - Sort by column
F7     - Decrease priority (nice)
F8     - Increase priority (nice)
F9     - Kill process (choose signal)
F10    - Quit
/      - Search
Space  - Tag a process (for bulk operations)
U      - Untag all processes
I      - Toggle sort order
H      - Toggle display of user threads
K      - Toggle display of kernel threads
t      - Toggle tree view
```

### htop Configuration

htop stores its configuration in `~/.config/htop/htoprc`. You can configure it through the F2 menu:

- Add/remove columns
- Change sort column
- Set update interval
- Choose color scheme
- Configure which columns to display

### Using htop's Tree View

```bash
# Start in tree view mode
htop -t

# Or press F5 while htop is running
```

Tree view shows parent-child process relationships, making it easy to see which processes spawned which others.

## Comparing the Three Tools

| Feature | ps | top | htop |
|---------|-----|-----|------|
| Interactive | No | Yes | Yes |
| Real-time updates | No | Yes | Yes |
| Mouse support | No | No | Yes |
| Process tree view | Limited | No | Yes |
| Script-friendly | Yes | Limited | No |
| Color display | No | No | Yes |
| Per-CPU bars | No | Yes (with '1') | Yes |
| Search/filter | Via grep | Via 'u' | Built-in |

## Practical Monitoring Scenarios

### Finding What Is Using the Most CPU

```bash
# Quick snapshot with ps
ps aux --sort=-%cpu | head -10

# Real-time view with top
top -o %CPU  # Sort by CPU

# Or just open htop and press M for memory or P for CPU
htop
```

### Finding a Specific Process

```bash
# Find all nginx processes
ps aux | grep '[n]ginx'  # The bracket trick avoids matching grep itself

# Using pgrep for cleaner results
pgrep -l nginx
pgrep -a nginx  # Show full command line

# In htop: press / and type the process name
```

### Checking Memory Usage

```bash
# Show processes sorted by RSS (actual physical memory)
ps aux --sort=-rss | head -10

# Get memory details for a specific process
ps -p 1234 -o pid,rss,vsz,pmem,cmd

# In top: press M to sort by memory
```

### Monitoring Process CPU Over Time

```bash
# Take periodic snapshots with ps
while true; do
    echo "=== $(date) ==="
    ps aux --sort=-%cpu | head -5
    sleep 5
done
```

## Summary

Use `ps` when you need scriptable, point-in-time process information or want to filter output with grep and awk. Use `top` when you need a real-time overview and are used to its keyboard interface. Use `htop` for day-to-day interactive process monitoring - its visual interface and search capabilities make it the most user-friendly of the three. All three are valuable, and experienced sysadmins reach for each one in different situations.
