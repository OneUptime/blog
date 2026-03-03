# How to Set Up inotifywait for File Change Detection on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, inotifywait, File Monitoring, inotify, Automation

Description: Use inotifywait on Ubuntu to monitor files and directories for changes and trigger automated actions in response to create, modify, delete, and move events.

---

inotifywait is a command-line tool that watches files and directories using the Linux kernel's inotify subsystem and waits for (or reports) changes. When a file is created, modified, deleted, or moved, inotifywait captures the event and can trigger any action you need - running a script, sending a notification, syncing files, or triggering a build.

## Installing inotify-tools

```bash
sudo apt update
sudo apt install inotify-tools

# Verify
inotifywait --version
```

The package provides two tools:
- `inotifywait`: Wait for a single event or monitor continuously
- `inotifywatch`: Report statistics on file system events over time

## Basic Usage

### Wait for a Single Event

```bash
# Wait for any event in /tmp
inotifywait /tmp

# Wait for a specific event (file close after write)
inotifywait -e close_write /etc/nginx/nginx.conf
```

The command blocks until the event occurs, then exits.

### Monitor Continuously

```bash
# Watch a directory and print all events
inotifywait -m /var/www/html

# Recursive monitoring of a directory tree
inotifywait -m -r /etc/
```

Output format:

```text
/var/www/html/ CREATE index.html
/var/www/html/ MODIFY index.html
/var/www/html/ CLOSE_WRITE,CLOSE index.html
```

## Understanding inotify Events

| Event | Description |
|-------|-------------|
| `access` | File read |
| `modify` | File content changed |
| `attrib` | File attributes changed (permissions, timestamps) |
| `close_write` | File closed after writing (more reliable than `modify`) |
| `close_nowrite` | File closed without writing |
| `open` | File opened |
| `moved_from` | File moved out of watched directory |
| `moved_to` | File moved into watched directory |
| `create` | File or directory created |
| `delete` | File or directory deleted |
| `delete_self` | The watched file itself was deleted |
| `move_self` | The watched file itself was moved |

For detecting file saves, prefer `close_write` over `modify`. Editors often write to a temp file then rename it, so also watch `moved_to`.

## Practical Monitoring Scripts

### Auto-Reload nginx on Config Change

```bash
nano /usr/local/bin/watch-nginx-config.sh
```

```bash
#!/bin/bash
# Watch nginx config files and reload on change
# Run as: sudo bash /usr/local/bin/watch-nginx-config.sh

WATCH_DIR="/etc/nginx"
LOG="/var/log/nginx-autoreload.log"

echo "Watching $WATCH_DIR for configuration changes..."

inotifywait -m -r -e close_write,moved_to,create,delete \
    --format '%T %w %f %e' \
    --timefmt '%Y-%m-%d %H:%M:%S' \
    "$WATCH_DIR" | while read DATETIME DIRECTORY FILE EVENT; do

    echo "$DATETIME: Change detected - $DIRECTORY$FILE ($EVENT)" >> "$LOG"

    # Validate config before reloading
    if nginx -t 2>/dev/null; then
        systemctl reload nginx
        echo "$DATETIME: nginx reloaded successfully" >> "$LOG"
    else
        echo "$DATETIME: nginx config validation failed, reload skipped" >> "$LOG"
    fi
done
```

```bash
chmod +x /usr/local/bin/watch-nginx-config.sh
```

Run as a systemd service:

```bash
sudo nano /etc/systemd/system/nginx-config-watcher.service
```

```ini
[Unit]
Description=Watch nginx config and auto-reload
After=nginx.service

[Service]
Type=simple
ExecStart=/usr/local/bin/watch-nginx-config.sh
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable --now nginx-config-watcher
```

### Sync Files on Change

```bash
nano /usr/local/bin/watch-and-sync.sh
```

```bash
#!/bin/bash
# Sync directory to a remote server when files change

SOURCE="/var/www/html"
DEST="user@remote-server:/var/www/html/"
LOG="/var/log/autosync.log"

echo "Starting file sync watcher for $SOURCE"

inotifywait -m -r -e close_write,moved_to,create,delete \
    --format '%w%f' \
    "$SOURCE" | while read CHANGED_FILE; do

    echo "$(date): Syncing after change to $CHANGED_FILE" >> "$LOG"

    # Rsync the directory to remote
    rsync -azq --delete \
        "$SOURCE/" \
        "$DEST" >> "$LOG" 2>&1

    if [ $? -eq 0 ]; then
        echo "$(date): Sync completed" >> "$LOG"
    else
        echo "$(date): Sync FAILED" >> "$LOG"
    fi
done
```

```bash
chmod +x /usr/local/bin/watch-and-sync.sh
```

### Trigger Build on Source Code Change

```bash
nano /usr/local/bin/watch-and-build.sh
```

```bash
#!/bin/bash
# Watch source directory and run build on change

SOURCE_DIR="/home/dev/myproject/src"
BUILD_CMD="cd /home/dev/myproject && npm run build"
DEBOUNCE=2  # Seconds to wait for additional changes before building

echo "Watching $SOURCE_DIR for changes..."

# Use a debounce approach - wait for changes to settle
LAST_BUILD=0
inotifywait -m -r -e close_write,moved_to,create,delete \
    --format '%w%f' \
    --include '\.js$|\.ts$|\.css$' \
    "$SOURCE_DIR" | while read CHANGED_FILE; do

    echo "Changed: $CHANGED_FILE"
    NOW=$(date +%s)
    ELAPSED=$((NOW - LAST_BUILD))

    # Only rebuild if it's been more than DEBOUNCE seconds since last build
    if [ $ELAPSED -ge $DEBOUNCE ]; then
        echo "$(date): Starting build..."
        eval "$BUILD_CMD"
        echo "$(date): Build complete"
        LAST_BUILD=$(date +%s)
    fi
done
```

### Monitor for Security Events

```bash
nano /usr/local/bin/watch-sensitive-files.sh
```

```bash
#!/bin/bash
# Alert when sensitive system files are modified

SENSITIVE_FILES=(
    "/etc/passwd"
    "/etc/shadow"
    "/etc/sudoers"
    "/etc/ssh/sshd_config"
    "/etc/hosts"
    "/etc/crontab"
)

# Build inotifywait argument list
WATCH_ARGS=""
for FILE in "${SENSITIVE_FILES[@]}"; do
    WATCH_ARGS="$WATCH_ARGS $FILE"
done

echo "Monitoring sensitive files for modifications..."

inotifywait -m -e attrib,modify,close_write,moved_to,delete \
    --format '%T %w%f %e' \
    --timefmt '%Y-%m-%dT%H:%M:%S' \
    $WATCH_ARGS | while read TIMESTAMP FILE EVENT; do

    MSG="SECURITY ALERT: $FILE was $EVENT at $TIMESTAMP"
    echo "$MSG"
    echo "$MSG" | logger -t security-monitor -p auth.warning

    # Optionally: send email or webhook notification
    # curl -s -X POST https://your-webhook-url -d "{\"text\": \"$MSG\"}"
done
```

## Excluding Files from Monitoring

```bash
# Exclude temp files and vim swap files
inotifywait -m -r /etc/nginx \
    --exclude '\.(swp|swx|tmp|~)$' \
    -e close_write,create,delete
```

## Controlling inotify Limits

By default, the kernel allows monitoring a limited number of files. For large directory trees:

```bash
# Check current limits
cat /proc/sys/fs/inotify/max_user_watches
cat /proc/sys/fs/inotify/max_user_instances
cat /proc/sys/fs/inotify/max_queued_events
```

Increase limits:

```bash
sudo nano /etc/sysctl.d/10-inotify.conf
```

```ini
# Increase inotify limits for large directory trees
fs.inotify.max_user_watches = 524288
fs.inotify.max_user_instances = 256
fs.inotify.max_queued_events = 32768
```

```bash
sudo sysctl -p /etc/sysctl.d/10-inotify.conf
```

## Using inotifywatch for Statistics

`inotifywatch` is useful for understanding which files change most frequently:

```bash
# Watch /var/log for 60 seconds and report event counts
sudo inotifywatch -v -e access,modify -t 60 /var/log/

# Recursive watch of a source tree
inotifywatch -v -r -t 30 /home/dev/project/
```

Output:

```text
Establishing watches...
Finished establishing watches, now collecting statistics.
total  modify  close_write  filename
42     15      27           /var/log/syslog
8      3       5            /var/log/auth.log
```

## Handling Race Conditions

A common issue with inotifywait scripts is that the file may not be fully written by the time your script runs. For `close_write` events, the file is complete - but for `create` events, a subsequent write may still be in progress.

For robustness, use `close_write` instead of `modify` or `create`:

```bash
# Prefer close_write for file completion detection
inotifywait -m -e close_write /path/to/watch
```

Or add a small delay before processing:

```bash
inotifywait -m -e create /watch/dir | while read DIR EVENT FILE; do
    sleep 0.5  # Brief wait for file to be fully written
    process_file "$DIR$FILE"
done
```

## Running inotifywait as a Non-Root User

inotifywait doesn't require root - it uses the kernel's inotify API which is available to all users. However, you can only watch files you have read permission for.

```bash
# Run as a specific user for security
sudo -u www-data inotifywait -m /var/www/html
```

## Troubleshooting

**"Failed to watch": No space left on device:**

This means you've hit the `max_user_watches` limit - increase it as shown above.

**Events not detected for files written by other processes:**

Check that the event type matches what the writing process does. Some editors use atomic writes (write to temp, rename) which generates `moved_to` events rather than `close_write`.

**Script running multiple times for one file save:**

Many editors trigger multiple events per save. Implement debouncing or use `close_write` which fires once when the file handle is closed.

## Summary

inotifywait provides a simple, reliable way to trigger actions based on filesystem events on Ubuntu. Its streaming output mode makes it straightforward to pipe into shell scripts that react to changes. For more complex scenarios with many watched paths or Python-based processing, consider Watchman or pyinotify - but for most automation needs, inotifywait and a shell script is all you need.
