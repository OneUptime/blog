# How to Create systemd Path Units for File Monitoring on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Systemd, Automation, Linux, Monitoring

Description: Use systemd path units on Ubuntu to monitor filesystem changes and automatically trigger services or scripts when files or directories are created, modified, or deleted.

---

systemd path units provide a built-in mechanism for watching filesystem events and triggering actions in response. This is the systemd equivalent of using `inotifywait` in a shell script loop, but with proper lifecycle management, automatic restart on failure, and integration with the rest of the systemd service infrastructure.

Path units work by pairing a `.path` unit with a `.service` unit. The path unit watches for changes and activates the service unit when a match occurs. The service unit does the actual work.

## How Path Units Work

When a path unit detects a filesystem event, it activates its associated service unit. By convention, the service unit has the same name as the path unit. A path unit named `process-uploads.path` activates `process-uploads.service`.

Events that can be watched:

- `PathExists`: Activates when a path appears (file or directory created)
- `PathExistsGlob`: Like PathExists but with glob matching
- `PathChanged`: Activates when a file is created, written to, or deleted
- `PathModified`: Like PathChanged but also triggers on `utimes()` calls
- `DirectoryNotEmpty`: Activates when a directory goes from empty to having content

## Basic Example: Watch for Uploaded Files

A common use case is processing files as they are uploaded or dropped into a directory.

### Create the Service Unit

First, create the service that does the processing:

```bash
sudo nano /etc/systemd/system/process-uploads.service
```

```ini
[Unit]
Description=Process uploaded files from the incoming directory
After=local-fs.target

[Service]
Type=oneshot
User=www-data
Group=www-data

# Script that processes the files
ExecStart=/usr/local/bin/process-uploads.sh

# Don't start another instance while one is running
# The path unit handles this through activation queuing
```

Create the processing script:

```bash
sudo nano /usr/local/bin/process-uploads.sh
```

```bash
#!/bin/bash
# Process all files in the incoming directory

INCOMING_DIR="/var/uploads/incoming"
PROCESSED_DIR="/var/uploads/processed"
LOG_FILE="/var/log/upload-processor.log"

echo "$(date): Starting upload processing" >> "$LOG_FILE"

# Process each file
for file in "${INCOMING_DIR}"/*; do
    # Skip if no files match (glob returns literal)
    [ -e "$file" ] || continue

    filename=$(basename "$file")
    echo "$(date): Processing ${filename}" >> "$LOG_FILE"

    # Your actual processing logic here
    # Example: move and rename with timestamp
    timestamp=$(date +%Y%m%d_%H%M%S)
    mv "$file" "${PROCESSED_DIR}/${timestamp}_${filename}"

    echo "$(date): Processed ${filename}" >> "$LOG_FILE"
done

echo "$(date): Processing complete" >> "$LOG_FILE"
```

```bash
sudo chmod +x /usr/local/bin/process-uploads.sh
sudo mkdir -p /var/uploads/incoming /var/uploads/processed
sudo chown -R www-data:www-data /var/uploads/
```

### Create the Path Unit

```bash
sudo nano /etc/systemd/system/process-uploads.path
```

```ini
[Unit]
Description=Watch for new files in the uploads directory

[Path]
# Activate the service when the directory is not empty
DirectoryNotEmpty=/var/uploads/incoming

# The service to activate - defaults to same name with .service
Unit=process-uploads.service

[Install]
WantedBy=multi-user.target
```

### Enable and Start

```bash
# Reload systemd to recognize new units
sudo systemctl daemon-reload

# Enable both units to start at boot
sudo systemctl enable process-uploads.path
sudo systemctl enable process-uploads.service

# Start the path monitor
sudo systemctl start process-uploads.path

# Verify the path unit is active
sudo systemctl status process-uploads.path
```

## Testing the Path Unit

Drop a file into the watched directory:

```bash
# Create a test file
echo "test content" | sudo -u www-data tee /var/uploads/incoming/test.txt

# Watch if the service was triggered
sudo journalctl -u process-uploads.service -f &

# Wait a moment, then check
sleep 2
ls /var/uploads/processed/
```

## Watching for File Modifications

To trigger on configuration file changes:

```bash
sudo nano /etc/systemd/system/reload-config.path
```

```ini
[Unit]
Description=Watch application config for changes

[Path]
# Trigger when the file is modified
PathModified=/etc/myapp/config.json

Unit=reload-config.service

[Install]
WantedBy=multi-user.target
```

```bash
sudo nano /etc/systemd/system/reload-config.service
```

```ini
[Unit]
Description=Reload application configuration
After=myapp.service

[Service]
Type=oneshot
ExecStart=/usr/bin/systemctl reload myapp
```

## Watching Multiple Paths

A single path unit can watch multiple paths. Any match triggers the service:

```bash
sudo nano /etc/systemd/system/cert-watcher.path
```

```ini
[Unit]
Description=Watch TLS certificate files for changes

[Path]
PathModified=/etc/ssl/certs/server.crt
PathModified=/etc/ssl/private/server.key

Unit=nginx-reload.service

[Install]
WantedBy=multi-user.target
```

```bash
sudo nano /etc/systemd/system/nginx-reload.service
```

```ini
[Unit]
Description=Reload Nginx after certificate change

[Service]
Type=oneshot
ExecStart=/usr/bin/systemctl reload nginx
```

This is a practical way to automatically reload Nginx when certificates are renewed by certbot or another ACME client.

## Watching for File Creation

Watch for a lock file or PID file to appear:

```bash
sudo nano /etc/systemd/system/wait-for-ready.path
```

```ini
[Unit]
Description=Wait for application ready file

[Path]
# Activate when this file appears
PathExists=/var/run/myapp/ready

Unit=post-startup.service

[Install]
WantedBy=multi-user.target
```

## Glob Matching with PathExistsGlob

```bash
sudo nano /etc/systemd/system/watch-reports.path
```

```ini
[Unit]
Description=Watch for new report files

[Path]
# Match any .csv file in the reports directory
PathExistsGlob=/var/reports/*.csv

Unit=import-reports.service

[Install]
WantedBy=multi-user.target
```

Note: `PathExistsGlob` only activates when a path matching the glob appears, not when files are modified.

## Rate Limiting Service Activation

If many files arrive simultaneously, the path unit may trigger the service many times. To handle bursts, configure the service to process all available files in one run (as shown in the script above) rather than one file per invocation.

For services that need cooldown time, use systemd's rate limiting:

```ini
[Service]
Type=oneshot
ExecStart=/usr/local/bin/process-uploads.sh

# Rate limit - don't restart more than 5 times in 10 seconds
StartLimitIntervalSec=10
StartLimitBurst=5
```

## Verifying Path Unit Behavior

```bash
# Show path unit status
sudo systemctl status process-uploads.path

# List all active path units
systemctl list-units --type=path

# Show all path units including inactive
systemctl list-units --type=path --all

# View path unit file content
systemctl cat process-uploads.path

# Show path unit dependencies
systemd-analyze dot process-uploads.path | dot -Tpng > path-deps.png
```

## Debugging Path Units

```bash
# Show detailed status with recent log entries
sudo systemctl status process-uploads.path -l

# Follow service activation logs
sudo journalctl -u process-uploads.service -f

# Check if path unit is correctly watching
sudo systemctl show process-uploads.path | grep -E "Path|Watch|Active"
```

## Path Units vs inotifywait

Both achieve similar goals but have different characteristics:

| Feature | Path Unit | inotifywait loop |
|---|---|---|
| Process management | systemd handles it | Shell script responsibility |
| Crash recovery | Automatic | Manual |
| Resource limits | cgroup integration | Manual ulimit |
| Logging | journald | Custom |
| Boot integration | Native | Needs wrapper |

Path units are preferable when you need reliable, well-managed file watching that integrates with the rest of your service infrastructure. For quick prototyping or complex event filtering (specific event types, subdirectory tracking), `inotifywait` with shell scripting remains useful.

The combination of a path unit and a service unit is a clean pattern that fits well into Ubuntu's systemd-centric administration model.
