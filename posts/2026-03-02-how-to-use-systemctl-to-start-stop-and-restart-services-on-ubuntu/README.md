# How to Use systemctl to Start, Stop, and Restart Services on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, systemd, systemctl, Service, Linux

Description: Master systemctl commands on Ubuntu to manage services including starting, stopping, restarting, enabling, disabling, and checking service status with practical examples.

---

`systemctl` is the command-line interface to systemd, the init system and service manager used on Ubuntu. Nearly every administrative task involving services - starting, stopping, enabling at boot, viewing status - goes through `systemctl`. This guide covers the most used commands with practical context for each.

## Basic Service Management

### Checking Service Status

Before starting or stopping anything, check the current state:

```bash
# Show detailed status of a service
sudo systemctl status nginx

# The output includes:
# - Active state (active/inactive/failed/activating)
# - Process ID
# - Memory usage
# - Recent log lines from journald

# Check just whether a service is active (useful in scripts)
systemctl is-active nginx
# Returns "active" or "inactive", exit code 0 if active, non-zero otherwise

# Check if a service is enabled (starts at boot)
systemctl is-enabled nginx
# Returns "enabled", "disabled", "static", etc.

# Check if a service has failed
systemctl is-failed nginx
```

### Starting a Service

```bash
# Start a service (takes effect immediately, does not persist after reboot)
sudo systemctl start nginx

# Start multiple services
sudo systemctl start nginx postgresql redis

# Verify it started
sudo systemctl status nginx
```

### Stopping a Service

```bash
# Stop a service (sends SIGTERM, waits, then SIGKILL if it does not stop)
sudo systemctl stop nginx

# Stop multiple services
sudo systemctl stop nginx postgresql

# Check it stopped
systemctl is-active nginx  # should return "inactive"
```

### Restarting a Service

```bash
# Stop then start the service
sudo systemctl restart nginx

# Restart only if the service is already running (does nothing if it's stopped)
sudo systemctl try-restart nginx

# Reload configuration without fully restarting (if the service supports it)
sudo systemctl reload nginx

# Reload if possible, restart if not supported
sudo systemctl reload-or-restart nginx
```

The difference between `restart` and `reload` matters for production services. `reload` sends a signal (usually `SIGHUP`) that tells the process to re-read its configuration without stopping. Active connections are not dropped. `restart` fully stops and starts the process, dropping active connections briefly.

Not all services support `reload`. Check the unit file for `ExecReload`:

```bash
systemctl cat nginx | grep ExecReload
```

## Enabling and Disabling Services

Enabling a service makes it start automatically at boot. Disabling prevents that.

```bash
# Enable a service to start at boot (creates a symlink in the target directory)
sudo systemctl enable nginx

# Start it now AND enable it (common pattern)
sudo systemctl enable --now nginx

# Disable a service (removes the symlink, does not stop the running service)
sudo systemctl disable nginx

# Disable and stop in one command
sudo systemctl disable --now nginx

# Mask a service (prevents starting it manually or automatically)
# Use this to completely prevent a service from running
sudo systemctl mask postfix

# Unmask to allow it again
sudo systemctl unmask postfix
```

The difference between `disable` and `mask`:
- `disable`: The service will not start at boot, but can still be started manually
- `mask`: The service cannot be started at all (by anything). Points to `/dev/null`.

## Viewing All Services

```bash
# List all active units
systemctl list-units

# List all service units (filter by type)
systemctl list-units --type=service

# List all units including inactive
systemctl list-units --all

# List all unit files and their enable state
systemctl list-unit-files

# Filter by state
systemctl list-unit-files --state=enabled
systemctl list-unit-files --state=disabled

# Show failed services
systemctl --failed
```

## Reloading systemd Configuration

When you create or modify unit files, reload the systemd manager configuration before the changes take effect:

```bash
# Reload unit files without restarting running services
sudo systemctl daemon-reload

# This is required after:
# - Creating a new unit file
# - Modifying an existing unit file
# - Modifying a drop-in file

# Verify the unit loaded correctly
systemctl cat myapp.service
```

## Checking Service Dependencies

```bash
# Show what a service depends on
systemctl list-dependencies nginx

# Show what depends on a service
systemctl list-dependencies --reverse nginx

# Show dependencies in a tree view
systemctl list-dependencies --all nginx
```

## Working with Service Logs

```bash
# View logs for a service (journalctl is covered in detail in another guide)
sudo journalctl -u nginx

# Follow logs in real time
sudo journalctl -u nginx -f

# View logs since last boot
sudo journalctl -u nginx -b

# View logs from the last hour
sudo journalctl -u nginx --since "1 hour ago"

# View only the last 50 lines
sudo journalctl -u nginx -n 50
```

## Practical Scenarios

### Updating Configuration and Reloading

When you change a web server configuration:

```bash
# Test the new configuration first (nginx-specific)
sudo nginx -t

# If test passes, reload without dropping connections
sudo systemctl reload nginx

# Check that reload succeeded
sudo systemctl status nginx
```

### Service Fails to Start

```bash
# Check the service status for error messages
sudo systemctl status myapp.service

# View detailed logs including the reason for failure
sudo journalctl -u myapp.service -n 50

# Check the exit code
sudo journalctl -u myapp.service | grep "Main process exited"

# Common reasons for failure:
# - Missing dependencies (check After=/Requires=)
# - Port already in use
# - Missing files or permissions
# - Configuration errors in ExecStart command
```

### Temporarily Preventing Restarts

When debugging a failing service, its Restart= policy may restart it before you can investigate:

```bash
# Stop the service without triggering restart
sudo systemctl stop myapp.service

# Or use kill with SIGTERM to the unit
sudo systemctl kill myapp.service

# To prevent automatic restart, mask it temporarily
sudo systemctl mask myapp.service

# After debugging, unmask and re-enable
sudo systemctl unmask myapp.service
sudo systemctl enable myapp.service
```

### Changing a Service's Runtime Parameters

If you need to temporarily change a service's resource limits or environment without modifying the unit file:

```bash
# Set properties temporarily (until next restart)
sudo systemctl set-property nginx.service CPUQuota=50%
sudo systemctl set-property nginx.service MemoryMax=512M

# These can be made permanent with --permanent flag
sudo systemctl set-property --permanent nginx.service CPUQuota=50%
# Creates a drop-in file automatically
```

## Checking System Boot and Target Status

```bash
# Show the current target (runlevel equivalent)
systemctl get-default

# Change the default target
sudo systemctl set-default multi-user.target   # no GUI
sudo systemctl set-default graphical.target    # with GUI

# Switch to a different target immediately
sudo systemctl isolate rescue.target           # single-user rescue mode
sudo systemctl isolate multi-user.target       # return to normal

# Show all targets
systemctl list-units --type=target
```

## Scripting with systemctl

Use exit codes in scripts:

```bash
#!/bin/bash
# Ensure nginx is running before proceeding

if ! systemctl is-active --quiet nginx; then
    echo "nginx is not running, starting it..."
    sudo systemctl start nginx

    # Verify it started
    if ! systemctl is-active --quiet nginx; then
        echo "Failed to start nginx"
        exit 1
    fi
fi

echo "nginx is running"
```

```bash
# Check multiple services
for service in nginx postgresql redis; do
    if systemctl is-active --quiet "$service"; then
        echo "$service: running"
    else
        echo "$service: NOT running"
    fi
done
```

## Displaying Service Properties

```bash
# Show all properties of a service
systemctl show nginx.service

# Show specific properties
systemctl show nginx.service --property=ActiveState,SubState,MainPID

# Show the unit file content (including drop-ins)
systemctl cat nginx.service

# Show override drop-in files
systemctl edit nginx.service --no-editor   # shows existing overrides
```

## Resetting Failed State

After a service fails, it stays in "failed" state until explicitly reset:

```bash
# Check failed services
systemctl --failed

# Reset a specific service's failed state (allows restarting it)
sudo systemctl reset-failed myapp.service

# Reset all failed services
sudo systemctl reset-failed
```

`systemctl` covers nearly every aspect of service management. The commands above handle the vast majority of day-to-day tasks. For the less common operations - modifying cgroup resource limits, setting up service overrides, or managing socket activation - the unit file syntax and `systemd-analyze` tool complement what `systemctl` provides.
