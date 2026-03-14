# How to Use incron for Cron-Like File Monitoring on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Incron, File Monitoring, Inotify, Automation

Description: Configure incron on Ubuntu to monitor filesystem events using inotify and trigger commands in response to file changes, using familiar crontab-style syntax.

---

incron is an "inotify cron" - it lets you define filesystem event triggers using a syntax almost identical to crontab. Where cron triggers based on time, incron triggers based on filesystem events: file creation, modification, deletion, and more. If you want to run a command when a file changes but don't want to write and maintain shell scripts with inotifywait, incron provides a cleaner configuration approach.

## Installing incron

```bash
sudo apt update
sudo apt install incron
```

The package installs:
- `incrond`: The daemon that watches filesystem events
- `incrontab`: The tool for managing incron tables (like crontab)

## Starting the incron Daemon

```bash
# Enable and start the daemon
sudo systemctl enable --now incrond

# Verify it's running
sudo systemctl status incrond
```

## Understanding incron Table Syntax

The incron table format is:

```text
<path> <event_mask> <command>
```

Where:
- `<path>`: File or directory to watch
- `<event_mask>`: Comma-separated inotify events to watch for
- `<command>`: Command to execute (supports special variables)

### Special Variables in Commands

| Variable | Description |
|----------|-------------|
| `$$` | Literal dollar sign |
| `$@` | Watched filesystem path (the path specified) |
| `$#` | Event-related file name |
| `$%` | Event flags (text representation) |
| `$&` | Event flags (numeric) |

For example, `$@/$#` constructs the full path of the changed file.

### Available Events

| Event | Description |
|-------|-------------|
| `IN_ACCESS` | File read |
| `IN_MODIFY` | File modified |
| `IN_ATTRIB` | Attributes changed |
| `IN_CLOSE_WRITE` | File closed after writing |
| `IN_CLOSE_NOWRITE` | File closed without writing |
| `IN_OPEN` | File opened |
| `IN_MOVED_FROM` | File moved out |
| `IN_MOVED_TO` | File moved in |
| `IN_CREATE` | File created |
| `IN_DELETE` | File deleted |
| `IN_DELETE_SELF` | Watched path deleted |
| `IN_MOVE_SELF` | Watched path moved |
| `IN_ALL_EVENTS` | All events |

## Editing Your incrontab

```bash
# Edit your personal incrontab (runs commands as your user)
incrontab -e

# Edit incrontab for root
sudo incrontab -e

# List current incrontab entries
incrontab -l
```

The editor opens (defaults to nano or whatever $EDITOR is set to).

## Basic incron Examples

### Reload nginx When Config Changes

```text
/etc/nginx/nginx.conf IN_CLOSE_WRITE /usr/bin/systemctl reload nginx
```

This runs `systemctl reload nginx` every time nginx.conf is saved.

### Watch a Directory for New Files

```text
/var/incoming IN_CREATE /usr/local/bin/process-upload.sh $@/$#
```

This runs `process-upload.sh` with the full path of any new file created in `/var/incoming`.

### Log All Changes to a Directory

```text
/etc IN_ALL_EVENTS logger -t incron "$@ $# $%"
```

This logs every event in `/etc` to syslog using the `logger` command.

### Sync Files to Backup on Change

```text
/home/webmaster/public_html IN_CLOSE_WRITE rsync -azq /home/webmaster/public_html/ backup@backupserver:/backups/www/
```

### Monitor Configuration File and Restart Service

```text
/etc/myapp/config.yaml IN_CLOSE_WRITE /bin/bash -c "myapp --validate-config && systemctl restart myapp"
```

## Allowing Non-Root Users

By default, only root can use incron. To allow other users:

```bash
sudo nano /etc/incron.allow
```

Add usernames, one per line:

```text
deploy
webmaster
backup
```

If `/etc/incron.allow` exists, only listed users can use incrontab. If it doesn't exist but `/etc/incron.deny` exists, anyone not in deny can use it.

```bash
# Or use a deny list to block specific users
sudo nano /etc/incron.deny
```

## Practical Incron Configurations

### Auto-Convert Uploaded Images

When images are uploaded to a directory, automatically create resized versions:

```bash
# Create processing script
sudo nano /usr/local/bin/process-image.sh
```

```bash
#!/bin/bash
# Resize uploaded images
INPUT_FILE="$1"
FILENAME=$(basename "$INPUT_FILE")
THUMB_DIR="$(dirname $INPUT_FILE)/thumbs"

# Only process image files
case "${FILENAME##*.}" in
    jpg|jpeg|png|gif|webp)
        mkdir -p "$THUMB_DIR"
        convert "$INPUT_FILE" -resize 200x200\> "$THUMB_DIR/$FILENAME"
        echo "Thumbnail created: $THUMB_DIR/$FILENAME"
        ;;
esac
```

```bash
sudo chmod +x /usr/local/bin/process-image.sh
```

Add to root's incrontab:

```text
/var/www/uploads IN_CLOSE_WRITE /usr/local/bin/process-image.sh $@/$#
```

### Trigger CI Build on Code Push

When a post-receive hook deposits files in a directory, trigger a build:

```bash
sudo nano /usr/local/bin/trigger-build.sh
```

```bash
#!/bin/bash
# Triggered when new files appear in build trigger directory
TRIGGER_FILE="$1"
BUILD_LOG="/var/log/builds/$(date +%Y%m%d-%H%M%S).log"

mkdir -p /var/log/builds

echo "Build triggered by: $TRIGGER_FILE" > "$BUILD_LOG"
cd /opt/myproject && ./build.sh >> "$BUILD_LOG" 2>&1

if [ $? -eq 0 ]; then
    echo "Build succeeded" >> "$BUILD_LOG"
else
    echo "Build FAILED" >> "$BUILD_LOG"
    # Alert on failure
    mail -s "Build failed" admin@example.com < "$BUILD_LOG"
fi
```

```bash
sudo chmod +x /usr/local/bin/trigger-build.sh
```

incrontab entry:

```text
/var/build-triggers IN_CREATE /usr/local/bin/trigger-build.sh $@/$#
```

### Alert on Unauthorized File Changes

```bash
sudo nano /usr/local/bin/file-change-alert.sh
```

```bash
#!/bin/bash
FILE="$1"
EVENT="$2"
CHANGED_BY=$(ls -la "$FILE" 2>/dev/null | awk '{print $3}')

MSG="Security: $FILE was $EVENT (owned by: $CHANGED_BY)"
logger -t security "$MSG"

# Send email alert
echo "$MSG" | mail -s "File system alert" admin@example.com
```

incrontab entry:

```text
/etc/passwd IN_ATTRIB,IN_CLOSE_WRITE /usr/local/bin/file-change-alert.sh $@/$# $%
/etc/shadow IN_ATTRIB,IN_CLOSE_WRITE /usr/local/bin/file-change-alert.sh $@/$# $%
/etc/sudoers IN_ATTRIB,IN_CLOSE_WRITE /usr/local/bin/file-change-alert.sh $@/$# $%
```

## Avoiding Common Pitfalls

### Infinite Loops

If your command modifies the watched file, it will trigger itself infinitely. For example:

```text
# BAD - creates infinite loop
/var/myfile.txt IN_CLOSE_WRITE echo "changed" >> /var/myfile.txt
```

Avoid modifying the watched path in the triggered command.

### Use IN_CLOSE_WRITE Instead of IN_MODIFY

`IN_MODIFY` fires on every write syscall during a save operation. A single file save can trigger dozens of events. `IN_CLOSE_WRITE` fires once when the file is closed after writing - much more suitable for triggering actions.

```text
# Better
/etc/myconfig IN_CLOSE_WRITE /usr/local/bin/reload-service.sh

# Worse - fires many times during a single save
/etc/myconfig IN_MODIFY /usr/local/bin/reload-service.sh
```

### Escaping Special Characters

Commands in incrontab are executed by `/bin/sh`. Shell special characters need escaping or quoting:

```text
# Use quotes around variables
/var/watch IN_CREATE /usr/bin/logger "File created: $@/$#"
```

### Paths Must Exist

incron only watches paths that exist when the daemon starts. If you add a watch for a directory that doesn't exist yet, it won't work until after a restart.

## Viewing incron Logs

```bash
# incrond logs to syslog
grep incron /var/log/syslog

# Or via journald
journalctl -u incrond

# Follow logs in real time
journalctl -u incrond -f
```

## Debugging incron

```bash
# Check if incrontab is valid
incrontab -l

# Run incrond in foreground with debug output
sudo systemctl stop incrond
sudo incrond -n -f

# Check if inotify limits might be an issue
cat /proc/sys/fs/inotify/max_user_watches
```

Increase inotify watches if needed:

```bash
echo "fs.inotify.max_user_watches = 524288" | \
    sudo tee /etc/sysctl.d/10-inotify.conf
sudo sysctl -p /etc/sysctl.d/10-inotify.conf
```

## Limitations

- incron does not support recursive directory watching. Each directory must be listed separately.
- No built-in debouncing - rapid successive changes trigger the command multiple times.
- Commands run under the user's shell environment, not a login shell - environment variables may differ.
- Large numbers of watches can hit inotify kernel limits.

For recursive monitoring or debouncing requirements, inotifywait in a shell script gives more flexibility. For simple "run this when that file changes" automation, incron's crontab-like syntax is more readable and maintainable.

## Summary

incron fills a specific automation niche: triggering commands in response to filesystem events using a simple, crontab-style configuration file. It works well for straightforward cases - reload a service when its config changes, process uploads as they arrive, or alert when sensitive files are modified. The familiar syntax lowers the barrier to setting up file-triggered automation, making it practical for sysadmins who are comfortable with cron but want event-driven rather than time-driven execution.
