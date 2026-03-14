# How to Use nice and renice to Manage Process Priorities on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Processes, Nice, Renice, Priority, Performance, Linux

Description: Learn how to use nice and renice on RHEL to manage process scheduling priorities and balance system resources.

---

The `nice` and `renice` commands on RHEL let you adjust the scheduling priority of processes. Higher priority processes get more CPU time, while lower priority processes yield to others. This is useful for balancing critical applications with background tasks.

## Prerequisites

- A RHEL system
- Root or sudo access (for increasing priority)

## Understanding Nice Values

Nice values range from -20 to 19:

- **-20** - Highest priority (most CPU time)
- **0** - Default priority
- **19** - Lowest priority (least CPU time)

A "nicer" process (higher nice value) is more generous to other processes by yielding CPU time.

## Viewing Process Nice Values

See the nice value of running processes:

```bash
ps -eo pid,ni,comm --sort=-ni | head -20
```

The `NI` column shows the nice value. Check a specific process:

```bash
ps -o pid,ni,comm -p $(pgrep httpd | head -1)
```

In top, the `NI` column shows nice values. Press `r` to renice a process interactively.

## Starting a Process with nice

Launch a command with a specific nice value:

```bash
# Low priority (nice to other processes)
nice -n 19 ./my-backup-script.sh

# Default nice (10)
nice ./my-script.sh

# High priority (requires root)
sudo nice -n -10 ./my-critical-app
```

## Changing Priority with renice

Change the nice value of a running process:

```bash
# Lower priority
renice 15 -p 1234

# Higher priority (requires root)
sudo renice -5 -p 1234
```

Renice all processes for a user:

```bash
sudo renice 10 -u www-data
```

Renice all processes in a process group:

```bash
sudo renice 5 -g 5678
```

## Permission Rules

- Regular users can only increase the nice value (lower priority) of their own processes
- Regular users cannot set nice values below 0
- Root can set any nice value for any process
- Once a regular user increases the nice value, they cannot decrease it

## Practical Examples

### Background Backup with Low Priority

```bash
nice -n 19 tar czf /backup/data.tar.gz /data/
```

### High-Priority Database Process

```bash
sudo renice -10 -p $(pgrep mysqld | head -1)
```

### Low-Priority Compilation

```bash
nice -n 15 make -j$(nproc)
```

### Batch Job Processing

```bash
nice -n 10 find / -name "*.log" -mtime +30 -delete
```

## Setting Nice Values in systemd

For services managed by systemd, set the nice value in the unit file:

```bash
sudo systemctl edit myservice.service
```

Add:

```ini
[Service]
Nice=-10
```

Reload and restart:

```bash
sudo systemctl daemon-reload
sudo systemctl restart myservice
```

## Setting Default Nice Values with limits.conf

Set default nice value limits for users or groups:

```bash
sudo tee /etc/security/limits.d/nice.conf << 'CONF'
# Allow the realtime group to set nice values as low as -20
@realtime    -    nice    -20

# Limit regular users to nice values 0 and above
*            -    nice    0
CONF
```

## Monitoring Priority Effects

Watch how nice values affect CPU allocation:

```bash
# Terminal 1: Run a CPU-intensive task at low priority
nice -n 19 dd if=/dev/urandom of=/dev/null bs=1M &

# Terminal 2: Run a CPU-intensive task at normal priority
dd if=/dev/urandom of=/dev/null bs=1M &

# Terminal 3: Observe CPU distribution
top
```

The normal-priority task should get significantly more CPU time.

## Conclusion

nice and renice on RHEL provide a simple way to manage process scheduling priorities. Use high nice values for background tasks and low (negative) nice values for critical applications. For persistent settings, configure nice values in systemd unit files or limits.conf.
