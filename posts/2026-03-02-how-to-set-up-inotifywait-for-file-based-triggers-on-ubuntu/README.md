# How to Set Up inotifywait for File-Based Triggers on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Automation, Inotify, File Monitoring, Bash Scripting

Description: Learn how to use inotifywait on Ubuntu to watch files and directories for changes and trigger automated actions in response to file system events.

---

The Linux kernel's inotify subsystem lets userspace programs subscribe to file system events - file creation, modification, deletion, moves, and more. `inotifywait` is the command-line interface to this subsystem, and it is the simplest way to set up event-driven file watching on Ubuntu without running a full daemon.

Common use cases: triggering a build when source files change, running a script when a file is dropped into a directory, alerting when a configuration file is modified, or processing uploaded files as they arrive.

## Installing inotify-tools

```bash
# inotifywait is part of the inotify-tools package
sudo apt update
sudo apt install -y inotify-tools

# Verify installation
inotifywait --help
inotifywatch --help
```

## Basic Usage

```bash
# Wait for a single event on a file, then exit
inotifywait /etc/nginx/nginx.conf

# Wait for events on a directory
inotifywait /var/spool/incoming/

# Specify which events to watch for
inotifywait -e modify,create,delete /etc/nginx/nginx.conf

# Watch recursively (all subdirectories)
inotifywait -r -e modify,create,delete /var/www/html/

# Monitor continuously (don't exit after first event)
inotifywait -m -e modify,create /var/spool/uploads/
```

## Available Events

```text
access      - File was read
modify      - File was modified
attrib      - Metadata changed (permissions, timestamps)
close_write - File opened for writing was closed
close_nowrite - File opened for reading was closed
open        - File was opened
moved_to    - File was moved into watched directory
moved_from  - File was moved out of watched directory
move        - Either moved_to or moved_from
create      - File was created
delete      - File was deleted
delete_self - Watched file was deleted
unmount     - Filesystem was unmounted
```

## Practical Script Patterns

### Auto-Reload on Config Change

Automatically reload a service when its config file changes:

```bash
#!/bin/bash
# watch_nginx_config.sh - Reload nginx when config changes

WATCH_FILE="/etc/nginx/nginx.conf"
WATCH_DIR="/etc/nginx/sites-enabled/"

echo "Watching for nginx config changes..."

# -m = monitor continuously, -e = events to watch
inotifywait -m -e close_write,moved_to,create \
    "$WATCH_FILE" "$WATCH_DIR" |
while read -r directory events filename; do
    echo "$(date): Change detected - $directory$filename ($events)"

    # Test config before reloading
    if nginx -t 2>/dev/null; then
        echo "Config valid, reloading nginx..."
        systemctl reload nginx
        echo "Reload successful"
    else
        echo "Config invalid - not reloading"
        nginx -t  # Show the error
    fi
done
```

### Incoming File Processor

Process files as they are dropped into a directory (upload queue pattern):

```bash
#!/bin/bash
# process_uploads.sh - Process files dropped into /var/spool/uploads/

INCOMING_DIR="/var/spool/uploads/incoming"
PROCESSED_DIR="/var/spool/uploads/processed"
FAILED_DIR="/var/spool/uploads/failed"
LOG_FILE="/var/log/upload_processor.log"

# Create directories if they don't exist
mkdir -p "$INCOMING_DIR" "$PROCESSED_DIR" "$FAILED_DIR"

log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') $*" | tee -a "$LOG_FILE"
}

process_file() {
    local filepath="$1"
    local filename
    filename=$(basename "$filepath")

    log "Processing: $filename"

    # Wait for the file to finish writing
    # Check if file size stops changing
    local prev_size=-1
    local curr_size
    while true; do
        curr_size=$(stat -c%s "$filepath" 2>/dev/null || echo 0)
        if [ "$curr_size" -eq "$prev_size" ]; then
            break
        fi
        prev_size=$curr_size
        sleep 0.5
    done

    # Your processing logic here
    # Example: validate and move to processed
    if file "$filepath" | grep -q "text"; then
        # It's a text file - do something with it
        wc -l "$filepath" >> "$LOG_FILE"
        mv "$filepath" "$PROCESSED_DIR/"
        log "Processed successfully: $filename"
    else
        log "Unknown file type, moving to failed: $filename"
        mv "$filepath" "$FAILED_DIR/"
    fi
}

log "Starting file processor, watching $INCOMING_DIR"

# Use --format to get structured output
inotifywait -m -e close_write -e moved_to \
    --format '%w%f' \
    "$INCOMING_DIR" |
while read -r filepath; do
    # Skip if file no longer exists (race condition)
    [ -f "$filepath" ] || continue
    # Skip hidden files and temp files
    filename=$(basename "$filepath")
    [[ "$filename" == .* ]] && continue
    [[ "$filename" == *.tmp ]] && continue

    process_file "$filepath"
done
```

### Alerting on Sensitive File Changes

Watch security-sensitive files and alert when they change:

```bash
#!/bin/bash
# security_watch.sh - Alert on changes to sensitive files

ALERT_EMAIL="admin@example.com"
SENSITIVE_FILES=(
    "/etc/passwd"
    "/etc/shadow"
    "/etc/sudoers"
    "/etc/ssh/sshd_config"
    "/root/.ssh/authorized_keys"
)

send_alert() {
    local file="$1"
    local event="$2"
    local message="Security alert: $file was $event at $(date)"

    echo "$message" | mail -s "File System Security Alert" "$ALERT_EMAIL"
    logger -t security_watch "$message"
    echo "$message"
}

echo "Monitoring sensitive files..."

inotifywait -m -e modify,create,delete,attrib \
    --format '%w%f %e' \
    "${SENSITIVE_FILES[@]}" |
while read -r file event; do
    send_alert "$file" "$event"
done
```

### Build Trigger

Trigger a build when source files change:

```bash
#!/bin/bash
# dev_watch.sh - Auto-rebuild on source changes

SRC_DIR="/home/deploy/app/src"
BUILD_SCRIPT="/home/deploy/app/build.sh"

# Debounce: don't trigger if we triggered less than 2 seconds ago
LAST_TRIGGER=0
DEBOUNCE_SECS=2

rebuild() {
    local now
    now=$(date +%s)
    local elapsed=$(( now - LAST_TRIGGER ))

    if [ "$elapsed" -lt "$DEBOUNCE_SECS" ]; then
        return  # Too soon, skip this trigger
    fi

    LAST_TRIGGER=$now
    echo "$(date): Change detected, triggering build..."
    bash "$BUILD_SCRIPT" && echo "Build succeeded" || echo "Build failed"
}

inotifywait -m -r -e close_write,moved_to,create,delete \
    --exclude '\.git|node_modules|__pycache__|\.pyc$' \
    "$SRC_DIR" |
while read -r directory events filename; do
    rebuild
done
```

## Running inotifywait as a Service

For production use, run file watchers as systemd services so they start on boot and restart on failure.

```bash
# /etc/systemd/system/upload-processor.service
sudo tee /etc/systemd/system/upload-processor.service > /dev/null <<'EOF'
[Unit]
Description=Upload File Processor
After=network.target
Wants=network.target

[Service]
Type=simple
User=www-data
Group=www-data
ExecStart=/usr/local/bin/process_uploads.sh
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal
SyslogIdentifier=upload-processor

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now upload-processor
sudo systemctl status upload-processor
```

## Checking inotify Limits

The kernel limits how many watches can be active. On systems with many files to watch, you may hit these limits.

```bash
# Check current limits
cat /proc/sys/fs/inotify/max_user_watches
# Default: 8192

cat /proc/sys/fs/inotify/max_user_instances
# Default: 128

# Increase limits temporarily
sudo sysctl fs.inotify.max_user_watches=524288

# Make permanent
echo "fs.inotify.max_user_watches=524288" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

# Check how many watches are currently active
cat /proc/sys/fs/inotify/max_user_watches
```

If recursive watching a large directory tree, watch count can be high. Each subdirectory needs its own watch.

## Troubleshooting

```bash
# Test that inotifywait is seeing events
inotifywait -v -e create /tmp/test_dir/
# In another terminal:
touch /tmp/test_dir/newfile
# Should print: Setting up watches. Watches established.
#               /tmp/test_dir/ CREATE newfile

# If no events are seen, check if the filesystem supports inotify
# Most local filesystems (ext4, xfs, btrfs) do
# NFS and some network filesystems do NOT

# Check dmesg for inotify errors
dmesg | grep -i inotify
```

`inotifywait` is a lightweight and reliable tool for event-driven automation. For more complex workflows, consider pairing it with a proper job queue or looking at systemd path units, which integrate more tightly with the init system.
