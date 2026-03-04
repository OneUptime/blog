# How to Use systemd-run for Transient Service Execution on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, systemd, systemd-run, Services, Linux

Description: Use systemd-run to execute commands as transient systemd services on Ubuntu with resource limits, logging, and isolation without writing unit files.

---

`systemd-run` executes a command as a transient systemd service or scope unit. Unlike permanent unit files that persist in `/etc/systemd/system/`, transient units exist only for the duration of the command. This makes `systemd-run` useful for running jobs with resource limits, capturing output in the journal, and isolating processes without the overhead of writing and managing unit files.

## Basic Usage

```bash
# Run a command as a transient service
systemd-run -- /usr/bin/mycommand --arg1 --arg2

# Run with a custom name
systemd-run --unit=mybackup -- /usr/local/bin/backup.sh

# Run as a specific user
systemd-run --uid=1000 -- /path/to/command

# Check the status while it's running
systemctl status run-12345.service
```

When you run `systemd-run`, it creates a service unit with a name like `run-PID.service`, starts it, and returns. The service runs in the background and the journal captures its output.

## Service vs Scope Units

`systemd-run` can create two types of transient units:

- **Service** (`--unit=*.service`) - The command runs as a child of systemd (PID 1). Useful for background jobs, isolated execution, scheduled tasks.
- **Scope** (`--scope`) - The command is your shell's child, but systemd manages the cgroup. Useful for resource-limiting interactive processes.

```bash
# Default: create a service (runs as systemd child)
systemd-run -- long-running-job.sh

# Create a scope (runs as your shell's child)
# Useful when you need the process in the foreground
systemd-run --scope -- resource-hungry-command
```

## Watching Output in Real Time

```bash
# Run and immediately follow the output
systemd-run --wait --collect -- /path/to/script.sh

# Or follow the journal for the unit
systemd-run --unit=myjob -- /path/to/script.sh
journalctl -u myjob.service -f
```

The `--wait` flag blocks until the service exits and prints the exit status.

## Resource Limits Without Unit Files

This is one of the most practical uses: running a command with specific resource constraints without writing a permanent unit file.

### CPU Limits

```bash
# Limit to 50% of one CPU core
systemd-run --property=CPUQuota=50% -- cpu-intensive-task.sh

# Limit to 1.5 CPU cores (150% quota)
systemd-run --property=CPUQuota=150% -- parallel-workload.sh
```

### Memory Limits

```bash
# Limit memory to 512MB - SIGKILL if exceeded
systemd-run --property=MemoryMax=512M -- memory-hungry-job.py

# Soft limit - reclaim memory from this job first
systemd-run --property=MemoryHigh=400M --property=MemoryMax=512M -- job.py

# Limit swap usage
systemd-run \
    --property=MemoryMax=1G \
    --property=MemorySwapMax=256M \
    -- data-processing.sh
```

### Disk I/O Limits

```bash
# Limit read bandwidth to 10 MB/s on /dev/sda
systemd-run --property=IOReadBandwidthMax="/dev/sda 10M" -- backup.sh

# Limit write bandwidth
systemd-run --property=IOWriteBandwidthMax="/dev/sda 50M" -- data-import.sh

# Set I/O weight (relative priority)
systemd-run --property=IOWeight=10 -- low-priority-job.sh
```

### Process Count Limits

```bash
# Limit the number of processes/threads
systemd-run --property=TasksMax=50 -- spawns-many-processes.sh
```

### Combining Multiple Limits

```bash
# A batch job with comprehensive resource limits
systemd-run \
    --unit=weekly-report \
    --property=CPUQuota=25% \
    --property=MemoryMax=2G \
    --property=IOWeight=20 \
    --property=TasksMax=100 \
    --property=Nice=15 \
    -- /opt/scripts/generate-weekly-report.sh
```

## Running as a Different User

```bash
# Run as a specific user
systemd-run --uid=nobody --gid=nogroup -- /path/to/isolated-task

# Run as www-data (common for web app tasks)
systemd-run --uid=www-data -- php /var/www/html/cron.php

# Run with a specific HOME environment
systemd-run --uid=1001 --property=Environment="HOME=/home/jobuser" -- /path/to/job.sh
```

## Environment Variables

```bash
# Set environment variables
systemd-run \
    --property=Environment="DB_HOST=localhost" \
    --property=Environment="DB_PORT=5432" \
    --property=Environment="APP_ENV=production" \
    -- /opt/myapp/migrate.sh

# Load environment from a file
systemd-run \
    --property=EnvironmentFile=/etc/myapp/env \
    -- /opt/myapp/migrate.sh
```

## Working Directory

```bash
# Set the working directory
systemd-run \
    --working-directory=/opt/myapp \
    -- python3 process_data.py
```

## Security Isolation

systemd's sandboxing directives work with transient units too:

```bash
# Run with filesystem restrictions
systemd-run \
    --property=ProtectSystem=strict \
    --property=ProtectHome=yes \
    --property=PrivateTmp=yes \
    --property=NoNewPrivileges=yes \
    -- untrusted-tool.sh

# Run with private network namespace (no network access)
systemd-run \
    --property=PrivateNetwork=yes \
    -- /path/to/offline-task.sh

# Read-only access to everything except one directory
systemd-run \
    --property=ProtectSystem=strict \
    --property=ReadWritePaths=/var/data/output \
    -- data-processor.sh
```

## Scheduled Execution (Transient Timers)

Run commands at a specific time without cron:

```bash
# Run a command after a delay
systemd-run --on-active="10min" -- /path/to/deferred-task.sh

# Run at a specific calendar time
systemd-run --on-calendar="2026-03-02 22:00:00" -- /path/to/midnight-job.sh

# Run after a specific monotonic offset from boot
systemd-run --on-boot="5min" -- /path/to/post-boot-init.sh

# Run 30 minutes after a unit becomes active
systemd-run --on-unit-active="30min" --unit=postgresql -- /path/to/post-db-task.sh
```

These create transient timer units. List them:

```bash
systemctl list-timers
```

## Checking Transient Unit Status

```bash
# List currently running transient units
systemctl list-units --type=service | grep run-

# Check the status of a named unit
systemctl status mybackup.service

# View the generated unit configuration
systemctl cat mybackup.service

# Check the journal output
journalctl -u mybackup.service
```

## Waiting for Completion

```bash
# Block until the transient service completes and show exit code
systemd-run --wait -- /path/to/important-task.sh
echo "Exit code: $?"

# Also collect the unit after completion (clean up)
systemd-run --wait --collect -- /path/to/task.sh
```

Without `--collect`, the unit remains in a "failed" or "inactive" state after completion and must be manually cleaned up with `systemctl reset-failed` or `systemctl stop`.

## Practical Examples

### Backup with Resource Limits

```bash
#!/bin/bash
# backup.sh - Wrapper that uses systemd-run for the actual backup

systemd-run \
    --unit=daily-backup \
    --wait \
    --collect \
    --uid=backup \
    --working-directory=/opt/backup \
    --property=CPUQuota=50% \
    --property=IOWriteBandwidthMax="/dev/sda 50M" \
    --property=MemoryMax=1G \
    --property=Nice=15 \
    --property=EnvironmentFile=/etc/backup/credentials \
    -- /opt/backup/scripts/full-backup.sh

RESULT=$?
if [ $RESULT -eq 0 ]; then
    echo "Backup completed successfully"
else
    echo "Backup FAILED with exit code $RESULT"
    journalctl -u daily-backup.service --no-pager | tail -20
fi
```

### Data Processing Job

```bash
# Process a large file with memory and CPU limits
# so it doesn't impact other services
systemd-run \
    --unit=data-import-$(date +%Y%m%d) \
    --wait \
    --property=MemoryMax=4G \
    --property=CPUQuota=80% \
    --property=IOReadBandwidthMax="/dev/sdb 100M" \
    --working-directory=/data/import \
    -- python3 /opt/scripts/import_data.py --file=/data/import/export.csv
```

### Testing Untrusted Code

```bash
# Run a script with full sandboxing
systemd-run \
    --unit=sandboxed-test \
    --wait \
    --property=PrivateNetwork=yes \
    --property=PrivateTmp=yes \
    --property=ProtectHome=yes \
    --property=ProtectSystem=strict \
    --property=NoNewPrivileges=yes \
    --property=MemoryMax=512M \
    --property=CPUQuota=25% \
    -- /path/to/untrusted-script.sh
```

`systemd-run` is particularly valuable in environments where you want the resource management and logging infrastructure of systemd for ad-hoc tasks without the permanent unit file overhead. It makes cgroups and namespace isolation accessible without knowing the full systemd unit file syntax.
