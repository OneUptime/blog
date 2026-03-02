# How to Configure /etc/logrotate.conf on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Logging, Log Rotation, Linux, System Administration

Description: A complete guide to configuring logrotate on Ubuntu, covering /etc/logrotate.conf syntax, per-application drop-in configs, compression options, and post-rotate scripts.

---

Logs left unchecked will fill your disk. On a busy server, `/var/log/` can grow to consume gigabytes within days if nothing manages the files. Logrotate is the standard solution on Ubuntu - it rotates, compresses, and deletes old log files on a schedule, and it's already installed and configured on every Ubuntu system. But the default configuration only covers system logs. Application logs, custom services, and anything you add to the system need their own logrotate configuration.

## How Logrotate Works

Logrotate is typically called once a day by a cron job in `/etc/cron.daily/logrotate`. When it runs, it reads the global configuration from `/etc/logrotate.conf` and all drop-in files from `/etc/logrotate.d/`. For each configured log file, it checks whether rotation criteria are met (size, age, etc.), and if so, it renames the current log, optionally compresses old logs, runs pre/post-rotation scripts, and deletes logs that exceed the retention limit.

## The Main Configuration File

```bash
cat /etc/logrotate.conf
```

A typical Ubuntu logrotate.conf:

```
# see "man logrotate" for details

# rotate log files weekly
weekly

# use the adm group by default, since this is the owning group
# of /var/log/.
su root adm

# keep 4 weeks worth of backlogs
rotate 4

# create new (empty) log files after rotating old ones
create

# use date as a suffix of the rotated file
dateext

# uncomment this if you want your log files compressed
#compress

# packages drop log rotation information into this directory
include /etc/logrotate.d

# system-specific logs may be also be configured here.
```

The directives in `logrotate.conf` set defaults that apply to all log files unless overridden in individual configuration sections.

## Core Directives

### Rotation Schedule

```
daily       # Rotate every day
weekly      # Rotate once a week (default)
monthly     # Rotate once a month
yearly      # Rotate once a year
size 100M   # Rotate when file exceeds 100MB (overrides schedule-based rotation)
minsize 1M  # Only rotate if file is at least 1MB, regardless of schedule
maxsize 500M # Rotate if file exceeds 500MB even if not at schedule time
```

### Retention

```
rotate 7    # Keep 7 old log files before deleting (with weekly, this is 7 weeks)
rotate 30   # Keep 30 old log files
```

### Compression

```
compress            # Compress old log files with gzip
nocompress          # Don't compress
delaycompress       # Compress on next rotation (not immediately) - useful for applications that keep files open
compresscmd /bin/bzip2   # Use bzip2 instead of gzip
compressext .bz2         # File extension to use with bzip2
compressoptions -9       # Compression level/options passed to compresscmd
```

### File Creation

```
create              # Create new empty log file after rotation (with default owner/permissions)
create 0644 root adm  # Create new file with specific permissions and owner
nocreate            # Don't create new log file (for apps that create it themselves)
copytruncate        # Copy log to rotated name, then truncate original (for apps that keep file handles open)
```

### Missing Files

```
missingok    # Don't error if log file is missing
nomissingok  # Error if log file is missing (default)
ifempty      # Rotate even if file is empty (default)
notifempty   # Don't rotate empty files
```

## Drop-in Configuration Files

The right place to configure application-specific log rotation is a file in `/etc/logrotate.d/`. Ubuntu packages install their configurations here automatically.

```bash
# List existing configurations
ls /etc/logrotate.d/

# View nginx log rotation config as an example
cat /etc/logrotate.d/nginx
```

A typical nginx configuration:

```
/var/log/nginx/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 0640 www-data adm
    sharedscripts
    postrotate
        if [ -f /var/run/nginx.pid ]; then
            kill -USR1 `cat /var/run/nginx.pid`
        fi
    endscript
}
```

## Writing Custom Log Rotation Configs

### Basic Custom Application Config

```bash
sudo nano /etc/logrotate.d/myapp
```

```
/var/log/myapp/*.log {
    # Rotate daily
    daily

    # Keep 30 days of logs
    rotate 30

    # Compress old logs
    compress

    # Compress on next cycle, not immediately
    # (in case the app still has the file open)
    delaycompress

    # Don't fail if log file doesn't exist
    missingok

    # Skip rotation if file is empty
    notifempty

    # Create new file with specific permissions
    create 0644 myapp myapp

    # Apply scripts to all logs as a group, not individually
    sharedscripts

    # Signal the app to reopen its log file after rotation
    postrotate
        systemctl reload myapp 2>/dev/null || true
    endscript
}
```

### Config for a Python/Gunicorn Application

Many Python web applications need a `copytruncate` approach because they don't support log file reopening:

```
/var/log/gunicorn/*.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    # Use copytruncate to avoid issues with apps that don't reopen log files
    copytruncate
    su www-data www-data
}
```

### Config With Size-Based Rotation and Date Extension

```
/var/log/highvolume-app/access.log {
    # Rotate when file hits 100MB
    size 100M

    # But also check daily so we don't accumulate too much
    daily

    # Keep 7 rotated files
    rotate 7

    compress
    delaycompress
    missingok
    notifempty

    # Use dates in rotated filenames instead of numbers
    dateext
    dateformat -%Y%m%d-%H%M%S

    create 0644 appuser appuser

    postrotate
        kill -HUP $(cat /var/run/highvolume-app.pid) 2>/dev/null || true
    endscript
}
```

### Multiple Log Files in One Block

```
/var/log/myapp/error.log
/var/log/myapp/debug.log
/var/log/myapp/access.log {
    weekly
    rotate 8
    compress
    delaycompress
    missingok
    notifempty
    sharedscripts
    postrotate
        systemctl reload myapp || true
    endscript
}
```

## Pre and Post Rotation Scripts

Logrotate supports four script hooks:

- `prerotate` / `endscript` - Runs before rotation (one log at a time unless `sharedscripts` is set)
- `postrotate` / `endscript` - Runs after rotation
- `firstaction` / `endscript` - Runs once before any logs are rotated (requires `sharedscripts`)
- `lastaction` / `endscript` - Runs once after all logs are rotated (requires `sharedscripts`)

```
/var/log/myapp/*.log {
    daily
    rotate 7
    compress
    sharedscripts

    # Flush any buffered log data before rotation
    prerotate
        /usr/local/bin/myapp --flush-logs
    endscript

    # Tell the app to reopen log files after rotation
    postrotate
        systemctl reload myapp || true
    endscript
}
```

## Testing and Debugging

### Dry Run

Always test your configuration before relying on it:

```bash
# Check syntax and show what would happen without actually rotating
sudo logrotate --debug /etc/logrotate.conf

# Test a specific configuration file
sudo logrotate --debug /etc/logrotate.d/myapp

# Force rotation immediately (useful for testing)
sudo logrotate --force /etc/logrotate.d/myapp
```

### Check Logrotate Status

Logrotate tracks what it has already rotated in `/var/lib/logrotate/status`:

```bash
cat /var/lib/logrotate/status | grep myapp
```

If logrotate isn't rotating a file even though you think it should, check this file to see when it last rotated it.

### Common Issues

**File rotated but application still writing to old inode:**
Use `postrotate` to signal the application, or switch to `copytruncate`.

**Rotation skipped because file is empty:**
Add `ifempty` to force rotation, or check whether your application is actually writing logs.

**Permission denied errors:**
Make sure the `su` directive matches the file owner:

```
/var/log/myapp/*.log {
    su myapp myapp
    daily
    rotate 7
    compress
}
```

**Wildcard not matching:**
If you use `*.log` and the directory is empty or the files have different extensions, add `missingok` to prevent errors.

## Running Logrotate Manually

```bash
# Run logrotate with all configurations
sudo logrotate /etc/logrotate.conf

# Run only a specific config file
sudo logrotate /etc/logrotate.d/myapp

# Force rotation regardless of schedule
sudo logrotate --force /etc/logrotate.conf
```

Logrotate is one of those tools that should be invisible when working correctly. Taking the time to write a proper configuration for each application's logs means you'll never get paged at 3am because `/var/log` filled up the disk.
