# How to Troubleshoot Failed systemd Services on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Systemd, Troubleshooting, Linux Administration

Description: A practical guide to diagnosing and fixing failed systemd services on Ubuntu using journalctl, systemctl, and other diagnostic tools.

---

A service failing to start is one of the most common issues on Ubuntu systems. Whether it is a web server, database, or custom application, the process of diagnosing a failed systemd unit follows a consistent pattern. This post walks through that pattern with practical commands and examples.

## Getting an Overview of Failed Services

The first thing to do when you suspect something is wrong is check what is actually failing:

```bash
# Show all failed units
systemctl --failed

# Same output, slightly different format
systemctl list-units --state=failed
```

This gives you a list of units in the failed state along with a brief reason. Look at the LOAD, ACTIVE, and SUB columns - a failed service will show `loaded`, `failed`, and `failed` respectively.

## Getting Detailed Status Information

Once you identify the problematic service, get its full status:

```bash
# Replace nginx with your service name
sudo systemctl status nginx.service

# Show more lines of the log snippet
sudo systemctl status nginx.service -n 50
```

The status output includes:
- The unit file path
- Current state (active, failed, inactive)
- Main process PID
- Memory usage
- The last few lines of the journal

Pay close attention to the last section - it shows recent log entries and often contains the actual error message.

## Reading the Journal for the Service

`systemctl status` only shows a few lines. For the full picture, use `journalctl`:

```bash
# Show all logs for a service since the last boot
sudo journalctl -u nginx.service -b

# Show logs from the last boot in reverse order (newest first)
sudo journalctl -u nginx.service -b -r

# Follow logs in real time
sudo journalctl -u nginx.service -f

# Show logs from a specific time range
sudo journalctl -u nginx.service --since "2026-03-02 10:00:00" --until "2026-03-02 11:00:00"
```

Look for lines marked `ERROR`, `CRIT`, or `EMERG`. In many cases the service itself outputs a useful message before exiting.

## Common Failure Reasons and How to Identify Them

### Permission Errors

```bash
# Check journal for permission denied
sudo journalctl -u myapp.service -b | grep -i "permission\|denied\|cannot open"
```

If you see permission errors, check the service's `User=` and `Group=` settings and verify that user has access to the required files and directories:

```bash
# Check the service file for user settings
systemctl cat myapp.service | grep -i "user\|group"

# Check file ownership and permissions
ls -la /var/lib/myapp/
ls -la /etc/myapp/
```

### Port Already in Use

```bash
# Check if something else is using the port
sudo ss -tlnp | grep :8080

# Or use lsof
sudo lsof -i :8080
```

### Missing Files or Binaries

```bash
# Check the ExecStart line
systemctl cat nginx.service | grep ExecStart

# Verify the binary exists
which nginx
ls -la /usr/sbin/nginx
```

### Configuration File Errors

Many services validate their config before starting. The journal will show the config parsing error:

```bash
# For nginx, test the configuration directly
sudo nginx -t

# For MySQL/MariaDB
sudo mysqld --validate-config

# For Apache
sudo apachectl configtest
```

## Checking Service File Syntax

A malformed unit file will prevent the service from loading at all:

```bash
# Check if the unit file loads correctly
sudo systemd-analyze verify /etc/systemd/system/myapp.service

# Check for issues without starting the service
sudo systemctl daemon-reload
sudo journalctl -p err -b
```

After editing a unit file, always run `daemon-reload` before trying to start the service:

```bash
# Reload systemd configuration
sudo systemctl daemon-reload

# Try starting the service again
sudo systemctl start myapp.service

# Check status immediately
sudo systemctl status myapp.service
```

## Running the Service in the Foreground

Sometimes the cleanest debugging approach is to run the service command directly as the service user, bypassing systemd entirely:

```bash
# Get the ExecStart command
systemctl cat myapp.service | grep ExecStart

# Run it manually as the service user
sudo -u www-data /usr/bin/myapp --config /etc/myapp/config.yaml
```

This shows you exactly what the process outputs when it starts, without any systemd filtering.

## Analyzing Exit Codes

The journal shows the exit code when a service fails:

```bash
# Look for exit status in journal
sudo journalctl -u myapp.service -b | grep -i "exit\|status\|code"
```

Common exit codes:
- `1` - General error, check the service log
- `126` - Permission denied to execute the binary
- `127` - Binary not found
- `139` - Segmentation fault (application bug or memory issue)
- `143` - SIGTERM - service was killed intentionally
- `255` - Various error conditions, check the journal

## Checking Resource Limits

Services can fail if they hit resource limits:

```bash
# Check if OOM killer hit the service
sudo journalctl -b | grep -i "oom\|killed process\|out of memory"

# Check systemd's resource accounting for the service
sudo systemctl show myapp.service | grep -i "limit\|memory\|cpu"
```

If the service is being OOM killed, increase the `MemoryMax` limit in the unit file or reduce the application's memory usage.

## Debugging Start Ordering Issues

Sometimes a service fails because a dependency is not ready yet:

```bash
# Check what myapp.service requires and wants
systemctl show myapp.service -p Requires,Wants,After,Before

# See if dependencies are actually running
systemctl status postgresql.service redis.service
```

If a required service is not started before yours, add it to the `After=` and `Requires=` directives in your unit file.

## Resetting the Failed State

After you fix the underlying issue, systemd keeps the failed state. Clear it before trying to restart:

```bash
# Reset the failed state so you can try starting again
sudo systemctl reset-failed myapp.service

# Now start the service
sudo systemctl start myapp.service
```

## Setting Up Automatic Restarts

For services that fail intermittently, configure automatic restarts:

```bash
# Edit the service file
sudo systemctl edit myapp.service
```

Add the following in the override file:

```ini
[Service]
# Restart on failure, but not on clean exit
Restart=on-failure

# Wait 5 seconds before restarting
RestartSec=5

# Give up after 3 restart attempts within 60 seconds
StartLimitIntervalSec=60
StartLimitBurst=3
```

Reload and restart after making changes:

```bash
sudo systemctl daemon-reload
sudo systemctl restart myapp.service
```

## Checking for Dependency Failures

If a service fails due to a dependency, systemd may show it as failed even though the root cause is elsewhere:

```bash
# See the full dependency tree
systemctl list-dependencies myapp.service

# Check which dependencies failed
systemctl --failed
```

Track down the original failing service rather than just the one you noticed - fixing the root cause often resolves the visible failure.

## Summary

Troubleshooting failed systemd services follows a consistent workflow: check `systemctl --failed`, read `systemctl status`, dig deeper with `journalctl -u`, and verify the actual error by running the command manually. Keep `systemd-analyze verify` in mind for catching unit file syntax problems before they cause runtime failures. Most service failures fall into a small number of categories - missing files, permission errors, port conflicts, and configuration mistakes - and the journal almost always points you directly at the culprit.
