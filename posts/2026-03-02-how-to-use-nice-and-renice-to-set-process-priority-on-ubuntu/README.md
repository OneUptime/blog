# How to Use nice and renice to Set Process Priority on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Process Management, Performance, Linux Administration

Description: Learn how to use nice and renice on Ubuntu to control process scheduling priority, prevent background jobs from impacting system performance, and manage CPU allocation.

---

When you have compute-intensive tasks running on a server - backups, database exports, video encoding, large builds - they can starve other processes of CPU time and make the system feel sluggish. The `nice` and `renice` commands let you control the scheduling priority of processes, ensuring background work does not degrade foreground services.

## How Linux Process Priority Works

Linux uses two related but distinct priority systems:

- **Nice value**: A user-space hint to the scheduler, ranging from -20 (highest priority) to +19 (lowest priority). Default is 0.
- **Real-time priority**: Separate from nice, used for time-critical processes. Beyond the scope of this post.

A higher nice value means the process is "nicer" to others - it yields CPU more readily. A lower (more negative) nice value means the process is more aggressive about claiming CPU time.

Normal users can only set nice values from 0 to 19 (making processes lower priority). Only root can set negative nice values (increasing priority above normal).

## Checking the Current Nice Value

```bash
# View nice value in ps output
ps -o pid,ni,cmd -p 1234

# View nice values for all processes
ps -eo pid,ni,cmd | sort -k2 -n | head -20

# In top: the 'NI' column shows nice values
top

# In htop: configure columns to show NICE or PRIORITY
```

The nice value appears in the `NI` column in top and htop.

## Starting a Process with a Specific Nice Value

Use `nice` to start a new command with a non-default priority:

```bash
# Start a command with nice value 10 (lower priority)
nice -n 10 /usr/local/bin/my-cpu-intensive-task

# Same thing using the shorthand
nice -10 /usr/local/bin/my-cpu-intensive-task  # This means nice value 10, not -10

# Start with maximum low priority (nicest to other processes)
nice -n 19 /usr/local/bin/backup.sh

# Start with higher-than-normal priority (requires root)
sudo nice -n -5 /usr/local/bin/critical-task
```

Wait - the syntax can be confusing. The `-n` flag specifies the nice value to add to the current nice value (default 0). Without `-n`, nice adds 10 by default:

```bash
# These are equivalent - start with nice value 10
nice command
nice -n 10 command

# Start with nice value 19 (lowest priority)
nice -n 19 command

# Start with nice value -5 (higher than normal, root only)
sudo nice -n -5 command
```

## Changing Priority of Running Processes with renice

`renice` changes the priority of an already-running process:

```bash
# Set nice value of PID 1234 to 10
sudo renice -n 10 -p 1234

# Set nice value of PID 1234 to 15 (lower priority)
sudo renice 15 -p 1234

# Reduce priority of all processes owned by a user
sudo renice 10 -u username

# Reduce priority of all processes in a process group
sudo renice 10 -g groupid

# Increase priority (requires root)
sudo renice -5 -p 1234
```

As a normal user, you can only increase the nice value (lower the priority) of your own processes. You cannot decrease the nice value to give your processes more CPU unless you are root.

## Practical Use Cases

### Running Backups Without Impacting Production

```bash
# Run a backup at lowest possible priority
nice -n 19 /usr/local/bin/backup.sh

# Or for an already running backup job
PID=$(pgrep -f backup.sh)
renice 19 -p $PID
```

### Limiting Build Systems

Large builds (Rust, C++, Java) can saturate CPUs:

```bash
# Run make at reduced priority
nice -n 10 make -j4

# Or for an ongoing build
PID=$(pgrep -f make)
sudo renice 10 -p $PID

# For cargo (Rust builds)
nice -n 10 cargo build --release
```

### Database Exports and Large Queries

```bash
# Run a large MySQL dump at reduced priority
nice -n 15 mysqldump -u root mydb > /backup/mydb.sql

# Or pg_dump for PostgreSQL
nice -n 15 pg_dump mydb > /backup/mydb.dump

# Running a large PostgreSQL query at lower priority
# Set via session: ALTER ROLE username SET random_page_cost = 1; -- affects query planning
# For the process running psql:
nice -n 10 psql -c "SELECT * FROM large_table" mydb
```

### Encoding and Processing Tasks

```bash
# Video encoding at minimum priority
nice -n 19 ffmpeg -i input.mp4 -c:v libx264 output.mp4

# Image batch processing
nice -n 15 mogrify -resize 800x600 /var/uploads/*.jpg

# Log analysis
nice -n 10 /usr/local/bin/analyze-logs.py
```

## Combining nice with Other Commands

### Using nice in Cron Jobs

For background tasks scheduled via cron that should not compete with production workloads:

```bash
# In crontab
0 2 * * * nice -n 19 /usr/local/bin/backup.sh >> /var/log/backup.log 2>&1

# Or use the fnice wrapper if available
0 3 * * * /usr/local/bin/low-priority-cleanup.sh
```

Inside a script you can also set the nice value of the script itself:

```bash
#!/bin/bash
# Set our own priority to low
renice -n 15 -p $$ > /dev/null 2>&1

echo "Starting low-priority processing..."
# rest of script
```

### Monitoring Nice Values in Real Time

```bash
# Watch nice values change
watch -n 1 'ps -eo pid,ni,cmd | sort -k2 -rn | head -20'

# Show all processes with non-default nice values
ps -eo pid,ni,cmd | awk '$2 != 0'
```

## ionice - Managing I/O Priority

For I/O-intensive tasks, `ionice` is the disk equivalent of `nice`. It controls I/O scheduling priority:

```bash
# Install util-linux (contains ionice, usually pre-installed)
dpkg -l | grep util-linux

# Classes:
# 1 = Real-time (highest, use carefully)
# 2 = Best-effort (default, uses priority 0-7)
# 3 = Idle (runs only when no other I/O is pending)

# Run a backup at idle I/O priority (least disruptive)
ionice -c 3 /usr/local/bin/backup.sh

# Set best-effort I/O with priority level 7 (lowest in best-effort)
ionice -c 2 -n 7 /usr/local/bin/sync.sh

# Set both CPU and I/O priority for maximum courtesy
nice -n 19 ionice -c 3 /usr/local/bin/intensive-task.sh

# Change I/O priority of running process
sudo ionice -c 3 -p 1234

# Check current I/O class of a process
ionice -p 1234
```

For disk-intensive background tasks like backups and large file copies, `ionice -c 3` is often more impactful than `nice` because the bottleneck is disk I/O rather than CPU.

## cpulimit - Percentage-Based CPU Limiting

For more precise CPU limiting (by percentage rather than priority), `cpulimit` is useful:

```bash
# Install cpulimit
sudo apt install cpulimit

# Limit a command to 50% CPU
cpulimit -l 50 /usr/local/bin/encoder.sh

# Limit an existing process to 30% CPU
cpulimit -p 1234 -l 30

# Limit all processes with a given name
cpulimit -e ffmpeg -l 40 &
```

Note that `cpulimit` works by sending SIGSTOP/SIGCONT signals rapidly to throttle the process, which is different from the scheduler-level approach of `nice`.

## systemd Resource Controls

For services managed by systemd, use service file directives instead of wrapping with `nice`:

```bash
sudo systemctl edit mybackup.service
```

```ini
[Service]
# Nice value
Nice=15

# I/O priority (0=default, 1=realtime, 2=best-effort, 3=idle)
IOSchedulingClass=idle

# CPU quota (percentage of one core)
CPUQuota=30%
```

These settings are more reliable than shell-level nice values because they persist and are managed by systemd.

## Checking if nice is Having an Effect

Nice values affect process priority under CPU contention. If the CPU is mostly idle, nice has little visible effect. Test the impact:

```bash
# Create CPU load for testing
stress --cpu 4 &  # Requires: sudo apt install stress

# Start two processes: one at normal priority, one at low
yes > /dev/null &          # Normal priority, PID stored in $!
NORMAL_PID=$!

nice -n 19 yes > /dev/null &  # Low priority
LOW_PID=$!

# Let them run for a few seconds
sleep 5

# Check CPU usage
ps -o pid,ni,%cpu,cmd -p $NORMAL_PID $LOW_PID

# Clean up
kill $NORMAL_PID $LOW_PID
kill %1  # Kill stress
```

You should see the normal-priority process consuming more CPU than the low-priority one.

## Summary

`nice` starts new processes with a specified scheduling priority, and `renice` changes the priority of running ones. Nice values range from -20 (highest, root only) to +19 (lowest, any user). For background tasks - backups, builds, data processing - running at nice 10-19 prevents them from competing with production services. Combine `nice` with `ionice -c 3` for disk-intensive tasks to minimize impact on system responsiveness. For systemd-managed services, the `Nice=` directive in the service file is cleaner than wrapping the command with `nice`.
