# How to Use the watch Command for Repeated Commands on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Command Line, Linux, Monitoring, Productivity

Description: Learn to use the watch command on Ubuntu to repeatedly run commands and monitor their output in real-time, with highlighting, intervals, and practical monitoring examples.

---

The `watch` command runs another command repeatedly at a set interval and displays the output, refreshing the terminal each time. It turns any command that produces output into a live-updating display - without writing a single line of a script.

## Basic Usage

```bash
# Run a command every 2 seconds (default interval)
watch df -h

# Run every 5 seconds
watch -n 5 df -h

# Run every 0.5 seconds (sub-second intervals)
watch -n 0.5 free -m
```

Press `Ctrl+C` to stop `watch`.

The display shows the command being run, the current timestamp, and how long ago the output was generated.

## Highlighting Changes

The `-d` flag highlights differences between the current and previous output. This is extremely useful for spotting what changed.

```bash
# Highlight any output that changed since the last update
watch -d free -m

# Highlight changes, keep them highlighted until they change back
watch -d=cumulative netstat -an | grep ESTABLISHED
```

When output changes, the changed portion appears in reverse video (usually white-on-black or bright text). This makes it trivial to notice a counter incrementing or a new connection appearing.

## Common Monitoring Use Cases

### Disk Space

```bash
# Monitor disk usage across all filesystems
watch -n 10 df -h

# Watch a specific directory growing
watch -n 5 du -sh /var/log/

# Monitor inode usage (important for directories with many small files)
watch -n 30 df -i
```

### Memory and Swap

```bash
# Watch memory usage refresh every 2 seconds
watch -n 2 free -m

# Combine with a specific process
watch -n 2 'ps aux | grep postgres | grep -v grep'
```

### Network Connections

```bash
# Watch active TCP connections
watch -n 2 'ss -tn | grep ESTABLISHED | wc -l'

# Watch listening ports
watch -n 5 ss -tlnp

# Monitor connections to a specific port
watch -n 2 'ss -tn dst :443'
```

### Process Monitoring

```bash
# Watch a specific process
watch -n 1 'ps aux | grep nginx | grep -v grep'

# Watch process count
watch -n 2 'pgrep -c php-fpm'

# Monitor load average
watch -n 5 'uptime'
```

### Log File Tailing Alternative

```bash
# Watch the last 20 lines of a log (use tail -f for live streaming instead)
watch -n 1 'tail -20 /var/log/syslog'

# Count error occurrences in a log file
watch -n 5 'grep -c "ERROR" /var/log/app/application.log'
```

### File System Changes

```bash
# Watch a directory's contents
watch ls -la /tmp/

# Watch for specific files appearing
watch 'ls -la /var/spool/mail/'
```

## Using Shell Features Inside watch

`watch` passes the command to `sh -c`, which means you can use shell features but you need to quote them properly.

```bash
# Pipe inside watch - requires quoting
watch 'ps aux | sort -k3 -rn | head -10'

# Multiple commands with semicolon
watch 'date; echo "---"; uptime'

# Command substitution
watch 'echo "Active connections: $(ss -tn | grep ESTABLISHED | wc -l)"'
```

Note the single quotes around the entire command. This prevents the shell from expanding the pipe or subshell before passing it to `watch`.

## Beeping on Change

The `-b` flag triggers a terminal bell sound when the command exits non-zero (useful for failure detection):

```bash
# Beep if the command fails
watch -b systemctl is-active nginx
```

The `-e` flag exits and reports an error when the command's exit status changes:

```bash
# Stop watching and report if nginx goes down
watch -e systemctl is-active nginx
```

## Practical Monitoring Scenarios

### Watching a Deployment

```bash
# During a rolling deployment, watch pod status
watch -n 2 'kubectl get pods -n production'

# Watch container restarts
watch -d 'docker ps --format "table {{.Names}}\t{{.Status}}"'
```

### Database Monitoring

```bash
# Watch PostgreSQL connection count
watch -n 5 'psql -U postgres -c "SELECT count(*) FROM pg_stat_activity;"'

# Watch MySQL process list
watch -n 3 'mysql -u root -e "SHOW PROCESSLIST;" 2>/dev/null | wc -l'
```

### Build and Test Watching

```bash
# Watch test results as you edit code
watch -n 3 'python -m pytest tests/ --tb=no -q 2>&1 | tail -5'

# Watch compilation errors
watch -n 2 'make 2>&1 | grep -E "error:|warning:" | wc -l'
```

### System Load During Load Testing

```bash
# Composite system view during a load test
watch -n 1 'echo "=== CPU ===" && mpstat 1 1 | tail -3; echo "=== Memory ==="; free -m; echo "=== Load ==="; uptime'
```

## Controlling the Header

The `-t` flag removes the header (the line showing the command and timestamp). Useful when you want clean output for parsing or recording:

```bash
# No header - just the output
watch -t -n 5 'df -h | grep /dev/sda1'
```

## Differences from Other Approaches

`watch` is simpler than alternatives for interactive monitoring:

```bash
# These are equivalent but watch is cleaner
while true; do clear; df -h; sleep 5; done
watch -n 5 df -h

# For actual log streaming, tail -f is better
tail -f /var/log/syslog

# For complex monitoring, consider tools like htop, glances, or netdata
```

## watch vs. tail -f

`tail -f` streams new lines as they appear - good for log files. `watch` re-runs a command entirely and replaces the screen - good for commands whose output changes (like `free`, `df`, `ss`). They serve different purposes.

## Quick Reference

```bash
# Default (2 second interval)
watch command

# Custom interval
watch -n SECONDS command

# Highlight changes
watch -d command

# Highlight and keep cumulative changes
watch -d=cumulative command

# No header
watch -t command

# Exit on non-zero command exit
watch -e command

# Beep on non-zero exit
watch -b command

# Complex command (use quotes)
watch -n 5 'command1 | command2'
```

`watch` is one of those tools you use every day once you discover it. Any time you find yourself manually re-running a command to check on something, `watch` is the answer.
