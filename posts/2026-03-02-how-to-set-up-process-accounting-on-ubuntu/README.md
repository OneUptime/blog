# How to Set Up Process Accounting on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Security, Auditing, System Administration, Monitoring

Description: Complete guide to enabling and using process accounting on Ubuntu with acct tools to track command history, resource usage, and detect unauthorized activity.

---

Process accounting records information about every command executed on a Linux system: who ran it, when, how long it ran, and how much CPU it used. Unlike bash history which is per-user and easily manipulated, process accounting happens at the kernel level and writes to a protected log file that regular users cannot modify.

On multi-user systems or servers where you need an audit trail of system activity, process accounting provides a reliable record that supplements other logging mechanisms.

## How Process Accounting Works

The Linux kernel has built-in support for process accounting. When enabled, the kernel writes a record to an accounting file every time a process exits. Each record contains:

- Command name (first 15 characters)
- User who ran it
- Terminal it ran on
- Start time and elapsed time
- CPU time (user and system)
- Exit status
- Memory usage

The `acct` package provides tools to enable kernel accounting and parse the binary log file.

## Installing acct

```bash
sudo apt-get update
sudo apt-get install -y acct

# The installation automatically enables the accounting daemon
# Check its status
sudo systemctl status acct

# Verify the accounting file exists
ls -la /var/log/account/pacct
```

## Enabling Process Accounting

If not already enabled:

```bash
# Enable accounting to the default log file
sudo accton /var/log/account/pacct

# Or enable via the service
sudo systemctl enable --now acct

# Verify accounting is active
# The /var/log/account/pacct file should be growing
ls -la /var/log/account/pacct
```

## Using sa - System Activity Statistics

The `sa` command summarizes process accounting data:

```bash
# Show summary of all processes since last accounting cycle
sudo sa

# Show per-user command statistics
sudo sa -u

# Show summary sorted by CPU usage
sudo sa -c

# Show command statistics including average CPU and memory
sudo sa -v

# Show a specific user's command history
sudo sa -U username
```

The output from `sa` looks like:

```text
       1237   1.00re  0.01cp    0avio  100k
       sa        3    0.00re   0.00cp    0avio    0k
       ls       15    0.00re   0.00cp    0avio    0k
       vim       8    0.02re   0.01cp    0avio    0k
...
```

Fields: number of executions, real time, CPU time, average I/O operations, mean core size.

## Using lastcomm - Last Commands

The `lastcomm` command shows recent command executions in reverse chronological order:

```bash
# Show the last commands executed (most recent first)
sudo lastcomm

# Show commands run by a specific user
sudo lastcomm --user username

# Show executions of a specific command
sudo lastcomm --command bash

# Show commands run on a specific terminal
sudo lastcomm --tty pts/0

# Filter by time (last 2 hours)
sudo lastcomm --forwards | tail -100

# Show detailed output including flags
sudo lastcomm -F
```

### Interpreting lastcomm Flags

The flags column in lastcomm output indicates process characteristics:

- `S` - Run by a superuser
- `F` - Ran after a fork without exec (could indicate unusual behavior)
- `C` - Command ran in a virtual machine
- `D` - Wrote to core file (crashed)
- `X` - Terminated by signal

```bash
# Find commands that ran as superuser (including via sudo)
sudo lastcomm | grep ' S '

# Find processes that crashed
sudo lastcomm | grep ' D '
```

## Security Use Cases

### Detecting Unauthorized Command Usage

```bash
# Check if anyone ran sensitive commands recently
sudo lastcomm | grep -E 'su$|sudo|passwd|adduser|useradd|visudo|iptables'

# Find all commands run by a specific user in the last session
sudo lastcomm --user suspicious-user

# Look for commands run at unusual hours
sudo lastcomm --forwards | awk '{print $1, $2, $5, $6, $7}' | \
  grep -E '0[0-9]:[0-9][0-9]|2[2-3]:[0-9][0-9]'
```

### Monitoring Privileged Commands

```bash
# List all commands run as root (S flag)
sudo lastcomm | grep ' S '

# Find recently used command interpreters (potential shell spawning)
sudo lastcomm | grep -E 'bash|sh|zsh|ksh|python|perl|ruby'

# Check for network tools being run unexpectedly
sudo lastcomm | grep -E 'nc$|ncat|netcat|nmap|wget|curl'
```

### Investigating Incidents

After a suspected compromise, process accounting data is invaluable:

```bash
# Look at what commands were run in the last hour
sudo lastcomm --forwards | tail -200

# Check specific timeframe
# Note: lastcomm does not support time filtering directly
# Process the raw data with date-aware tools

# Parse the accounting file directly for a time window
sudo accton off  # Stop accounting temporarily to get a clean snapshot
sudo accton /var/log/account/pacct

# Use dump-acct to get readable output with timestamps
sudo apt-get install -y tcsh  # Required for dump-acct on some versions
```

## Rotating the Accounting Log

The accounting log can grow very large on busy systems. Configure rotation:

```bash
# Check current log size
du -h /var/log/account/pacct

# The acct package includes a logrotate configuration
cat /etc/logrotate.d/acct
```

Customize the rotation:

```bash
sudo nano /etc/logrotate.d/acct
```

```text
/var/log/account/pacct {
    rotate 12       # Keep 12 rotated files
    monthly         # Rotate monthly
    compress        # Compress old logs
    delaycompress   # Delay compression one cycle
    missingok       # Do not error if log is missing
    postrotate
        # Restart accounting with the new log file
        if [ -f /var/run/acct.pid ]; then
            /usr/sbin/accton /var/log/account/pacct
        fi
    endscript
}
```

### Running sa Consolidation

The `sa` program can consolidate old accounting records into a summary file to reduce disk usage:

```bash
# Write summary to the usracct and savacct files
sudo sa -s

# This condenses detailed records into summary format
# Future sa commands use both the current log and the saved summary
```

## Extending Accounting with auditd

Process accounting gives you what ran, but the Linux Audit System (`auditd`) provides deeper visibility including arguments and file access:

```bash
# Install auditd
sudo apt-get install -y auditd audispd-plugins

sudo systemctl enable --now auditd

# Add audit rules for sensitive commands
sudo auditctl -a exit,always -F arch=b64 -S execve -F uid=0 -k root-commands

# View audit records for command execution
sudo ausearch -k root-commands --interpret | tail -50
```

Combined, `acct` gives you a lightweight permanent record and `auditd` gives you detailed forensic capability.

## Checking System Accounting Status

```bash
# Verify accounting is currently running
cat /proc/sys/kernel/acct

# Output: high_water low_water frequency
# e.g., 4 2 30 means:
# Start accounting when free space > 4%
# Stop accounting when free space < 2%
# Check disk space every 30 seconds

# View the current accounting file
sudo acctcom /var/log/account/pacct | head -20
```

The kernel automatically pauses accounting if disk space drops below the threshold defined in `/proc/sys/kernel/acct`. Adjust if needed:

```bash
# Set accounting to stop at 2% free space, start at 4%, check every 30 seconds
echo "4 2 30" | sudo tee /proc/sys/kernel/acct

# Make persistent
echo 'kernel.acct = 4 2 30' | sudo tee /etc/sysctl.d/99-acct.conf
```

## Creating Accounting Reports

For regular security reviews, a simple reporting script:

```bash
sudo tee /etc/cron.daily/accounting-report <<'SCRIPT'
#!/bin/bash
REPORT_FILE="/var/log/accounting-daily-$(date +%F).txt"

{
  echo "=== Daily Process Accounting Report ==="
  echo "Date: $(date)"
  echo ""
  echo "=== Top 20 Users by CPU Time ==="
  sa -u 2>/dev/null | sort -k3 -rn | head -20
  echo ""
  echo "=== Privileged Commands Run ==="
  lastcomm 2>/dev/null | grep ' S ' | head -50
  echo ""
  echo "=== Total Commands by User ==="
  lastcomm 2>/dev/null | awk '{print $2}' | sort | uniq -c | sort -rn
} > "$REPORT_FILE"

# Keep reports for 30 days
find /var/log/ -name 'accounting-daily-*.txt' -mtime +30 -delete
SCRIPT

sudo chmod 755 /etc/cron.daily/accounting-report
```

Process accounting is a lightweight, always-on record of system activity. The overhead is minimal (accounting adds microseconds per process exit), but the audit trail it provides can be critical for forensic investigation and compliance reporting.
