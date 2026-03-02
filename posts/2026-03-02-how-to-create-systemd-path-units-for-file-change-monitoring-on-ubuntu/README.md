# How to Create Systemd Path Units for File Change Monitoring on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, systemd, Automation, File Monitoring, System Administration

Description: Learn how to use systemd path units to monitor files and directories for changes and automatically trigger services on Ubuntu, as an alternative to inotifywait scripts.

---

Systemd path units provide a native way to monitor files and directories for changes and trigger other units in response. Unlike shell scripts using `inotifywait`, path units are managed by systemd itself - they start at boot, restart on failure, and integrate with journald logging without any extra work.

Path units suit situations where you want to run a service in response to file system changes, especially when the response needs to be reliable and logged properly.

## How Path Units Work

A `.path` unit watches for changes using inotify (the same kernel mechanism as `inotifywait`). When a change occurs, systemd activates an associated `.service` unit with the same base name by default. So `myapp.path` activates `myapp.service` when its watched path changes.

The path unit watches but does not run the actual work. The service unit does the work.

## Basic Path Unit Structure

Path units live in `/etc/systemd/system/` like service units:

```ini
# /etc/systemd/system/example.path
[Unit]
Description=Watch /var/spool/incoming for new files
Documentation=man:systemd.path(5)

[Path]
# Monitor this path
PathExistsGlob=/var/spool/incoming/*

# What to activate when path condition is met
# Defaults to <unit-name>.service if not specified
Unit=process-incoming.service

[Install]
WantedBy=multi-user.target
```

## Path Condition Types

Systemd supports several conditions in the `[Path]` section:

```ini
# Activate when path exists
PathExists=/run/app.pid

# Activate when path does NOT exist
PathExistsGlob= (not a negation - use PathExists with a service that checks)

# Activate when files appear matching a glob pattern
PathExistsGlob=/var/spool/incoming/*.csv

# Activate when path is modified
PathModified=/etc/nginx/nginx.conf

# Activate when directory is modified (files created/deleted in it)
DirectoryNotEmpty=/var/spool/incoming/

# Multiple conditions can be listed - any match triggers activation
PathExistsGlob=/var/spool/incoming/*.csv
PathExistsGlob=/var/spool/incoming/*.json
```

The most commonly useful conditions:
- `PathModified` - watches for content or attribute changes on a file
- `DirectoryNotEmpty` - triggers when a directory has content (not empty)
- `PathExistsGlob` - triggers when any file matches a glob

## Example 1: Process Uploaded Files

This example processes CSV files dropped into a directory. The path unit watches for files to appear, and the service processes them.

```ini
# /etc/systemd/system/csv-processor.path
[Unit]
Description=Watch for CSV files in upload queue
After=local-fs.target

[Path]
PathExistsGlob=/var/spool/csv-uploads/*.csv
Unit=csv-processor.service
MakeDirectory=yes
DirectoryMode=0750

[Install]
WantedBy=multi-user.target
```

```ini
# /etc/systemd/system/csv-processor.service
[Unit]
Description=Process CSV files from upload queue
After=local-fs.target

[Service]
Type=oneshot
User=appuser
Group=appuser
ExecStart=/usr/local/bin/process_csv.sh
StandardOutput=journal
StandardError=journal
SyslogIdentifier=csv-processor
```

The processing script:

```bash
#!/bin/bash
# /usr/local/bin/process_csv.sh

UPLOAD_DIR="/var/spool/csv-uploads"
PROCESSED_DIR="/var/spool/csv-processed"
FAILED_DIR="/var/spool/csv-failed"

mkdir -p "$PROCESSED_DIR" "$FAILED_DIR"

for csv_file in "$UPLOAD_DIR"/*.csv; do
    # Safety check in case glob finds nothing
    [ -f "$csv_file" ] || continue

    filename=$(basename "$csv_file")
    echo "Processing: $filename"

    # Do your actual processing here
    # Example: import to database
    if python3 /usr/local/bin/import_csv.py "$csv_file"; then
        mv "$csv_file" "$PROCESSED_DIR/${filename%.csv}_$(date +%Y%m%d_%H%M%S).csv"
        echo "Success: $filename"
    else
        mv "$csv_file" "$FAILED_DIR/"
        echo "Failed: $filename" >&2
    fi
done
```

Enable and start both units:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now csv-processor.path

# The service is NOT enabled directly - the path unit starts it
# Check status
sudo systemctl status csv-processor.path
```

## Example 2: Config File Change Detection

Reload a service when its configuration changes:

```ini
# /etc/systemd/system/nginx-auto-reload.path
[Unit]
Description=Watch nginx configuration for changes

[Path]
PathModified=/etc/nginx/nginx.conf
PathModified=/etc/nginx/sites-enabled/
Unit=nginx-validate-reload.service

[Install]
WantedBy=multi-user.target
```

```ini
# /etc/systemd/system/nginx-validate-reload.service
[Unit]
Description=Validate and reload nginx configuration
After=nginx.service
Requires=nginx.service

[Service]
Type=oneshot
ExecStart=/bin/sh -c 'nginx -t && systemctl reload nginx'
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now nginx-auto-reload.path
```

## Example 3: Application Lock File Monitoring

Watch for a lock file to disappear (indicating a process completed) and trigger cleanup:

```ini
# /etc/systemd/system/app-cleanup.path
[Unit]
Description=Trigger cleanup when application finishes

[Path]
# Activate when this file STOPS existing
PathExists=/run/myapp/processing.lock
Unit=app-cleanup.service

[Install]
WantedBy=multi-user.target
```

Wait - `PathExists` activates when the file exists. To trigger when the file disappears, the service needs to check the condition itself, or use a different approach.

For cleanup-on-completion patterns, it is more reliable to have the application write a "done" file:

```ini
# Watch for the done marker
PathExistsGlob=/run/myapp/done.marker
Unit=app-cleanup.service
```

## Controlling Service Restart Behavior

By default, systemd will not start the service again if it is already running. This means if files arrive while the service is still processing, the new files are picked up on the next trigger or a polling loop in the service.

```ini
# csv-processor.service with more options
[Service]
Type=oneshot

# Allow the service to be activated even if already running
# (each activation creates a new instance)
# Use this carefully - can lead to parallel runs
# RemainAfterExit=no (default for oneshot)

# Restart if the service fails
Restart=on-failure
RestartSec=10

ExecStart=/usr/local/bin/process_csv.sh
```

For high-volume scenarios where files arrive faster than they are processed, use a service type of `simple` with an internal loop rather than `oneshot`.

## Debugging Path Units

```bash
# Check if the path unit is active
systemctl status csv-processor.path

# View detailed information about the unit
systemctl show csv-processor.path

# Watch journal in real-time for path unit events
journalctl -u csv-processor.path -f

# Watch journal for both path and service units together
journalctl -u "csv-processor.*" -f

# Check if inotify watches are set up correctly
# (systemd uses inotify internally)
cat /proc/sys/fs/inotify/max_user_watches
```

## Comparing Path Units to inotifywait Scripts

| Aspect | systemd Path Units | inotifywait Scripts |
|--------|-------------------|---------------------|
| Boot startup | Automatic via WantedBy | Manual or cron |
| Logging | Integrated with journald | Custom or syslog |
| Restart on failure | Built-in with Restart= | Wrapper script needed |
| Dependencies | Expressed in unit files | Script logic |
| Complexity | Two files needed | One script |
| Flexibility | Limited to systemd capabilities | Full shell flexibility |

For simple, production-grade file watching that needs reliability, path units are the better choice. For complex multi-step pipelines or when you need full programmatic control, an inotifywait-based script running as a service may be more suitable.

## Checking Current Watches

```bash
# List all active path units
systemctl list-units --type=path

# See which paths are monitored
systemctl show -p Paths csv-processor.path
```

Path units are a clean, system-native way to add file-triggered automation to Ubuntu servers without maintaining custom daemon scripts.
