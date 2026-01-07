# How to Manage Ubuntu Servers with systemd

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Linux, systemd, DevOps, Server Administration

Description: Master systemd on Ubuntu for managing services, creating timers, using journald for logging, and troubleshooting system issues.

---

## Introduction

systemd is the default init system and service manager for Ubuntu (and most modern Linux distributions). It replaced the traditional SysVinit system and provides a unified way to manage services, handle system startup, configure logging, and control system resources. Understanding systemd is essential for any DevOps engineer or system administrator working with Ubuntu servers.

In this comprehensive guide, we will cover everything you need to know about managing Ubuntu servers with systemd, from basic service management to creating custom units, configuring timers, analyzing logs with journald, and troubleshooting failed services.

## Table of Contents

1. [Understanding systemd Architecture](#understanding-systemd-architecture)
2. [Essential systemctl Commands](#essential-systemctl-commands)
3. [Creating Custom Service Units](#creating-custom-service-units)
4. [Service Dependencies and Ordering](#service-dependencies-and-ordering)
5. [systemd Timers vs Cron](#systemd-timers-vs-cron)
6. [journald and journalctl](#journald-and-journalctl)
7. [Resource Limits with cgroups](#resource-limits-with-cgroups)
8. [Troubleshooting Failed Services](#troubleshooting-failed-services)
9. [Best Practices](#best-practices)
10. [Conclusion](#conclusion)

---

## Understanding systemd Architecture

systemd is more than just an init system. It is a suite of tools that manages various aspects of a Linux system. The core components include:

- **systemd**: The main daemon that manages the system and services
- **systemctl**: The command-line tool for controlling systemd
- **journald**: The logging daemon that collects and manages logs
- **logind**: Session management daemon
- **networkd**: Network configuration daemon
- **resolved**: DNS resolver daemon

### Unit Types

systemd uses "units" to represent system resources. The most common unit types are:

| Unit Type | Extension | Purpose |
|-----------|-----------|---------|
| Service | `.service` | Manages daemons and processes |
| Timer | `.timer` | Schedules tasks (like cron) |
| Socket | `.socket` | Manages IPC and network sockets |
| Target | `.target` | Groups units for synchronization |
| Mount | `.mount` | Controls filesystem mount points |
| Path | `.path` | Monitors filesystem paths |
| Slice | `.slice` | Manages resource allocation |

### Unit File Locations

Unit files are stored in several directories with different priorities:

```bash
# System unit files installed by packages (lowest priority)
/lib/systemd/system/

# Administrator-created unit files (higher priority)
/etc/systemd/system/

# Runtime unit files (highest priority, temporary)
/run/systemd/system/
```

---

## Essential systemctl Commands

`systemctl` is the primary command for interacting with systemd. Here are the most important commands every administrator should know.

### Viewing Service Status

Check the current status of a service including its state, PID, memory usage, and recent logs:

```bash
# Check the detailed status of a service
systemctl status nginx

# Check if a service is active (running)
systemctl is-active nginx

# Check if a service is enabled (starts on boot)
systemctl is-enabled nginx

# Check if a service has failed
systemctl is-failed nginx
```

### Starting and Stopping Services

Control the runtime state of services:

```bash
# Start a service immediately
sudo systemctl start nginx

# Stop a running service
sudo systemctl stop nginx

# Restart a service (stop then start)
sudo systemctl restart nginx

# Reload service configuration without full restart (if supported)
sudo systemctl reload nginx

# Reload configuration or restart if reload is not supported
sudo systemctl reload-or-restart nginx
```

### Enabling and Disabling Services

Control whether services start automatically at boot:

```bash
# Enable a service to start at boot
sudo systemctl enable nginx

# Disable a service from starting at boot
sudo systemctl disable nginx

# Enable and start a service in one command
sudo systemctl enable --now nginx

# Disable and stop a service in one command
sudo systemctl disable --now nginx

# Mask a service to prevent it from being started
sudo systemctl mask nginx

# Unmask a previously masked service
sudo systemctl unmask nginx
```

### Listing Units

View information about units on the system:

```bash
# List all active units
systemctl list-units

# List all units including inactive ones
systemctl list-units --all

# List only service units
systemctl list-units --type=service

# List failed units
systemctl list-units --failed

# List all installed unit files
systemctl list-unit-files

# List unit files filtered by state
systemctl list-unit-files --state=enabled
```

### System State Commands

Manage the overall system state:

```bash
# View the default target (runlevel equivalent)
systemctl get-default

# Set the default target
sudo systemctl set-default multi-user.target

# Switch to a different target immediately
sudo systemctl isolate rescue.target

# Reboot the system
sudo systemctl reboot

# Shut down the system
sudo systemctl poweroff

# Suspend the system
sudo systemctl suspend
```

---

## Creating Custom Service Units

Creating custom service units allows you to manage your applications using systemd. Here is how to create a robust service unit file.

### Basic Service Unit Structure

Create a unit file for a simple web application:

```ini
# /etc/systemd/system/myapp.service
# This unit file manages a Node.js web application

[Unit]
# Human-readable description of the service
Description=My Node.js Web Application

# Documentation links for reference
Documentation=https://github.com/myorg/myapp

# Start after network is available
After=network.target

# Optional: Start after database is ready
After=postgresql.service

[Service]
# Type of service startup behavior
# simple: default, process started is the main process
# forking: traditional daemon that forks
# oneshot: process exits after completing task
# notify: uses sd_notify() to signal readiness
Type=simple

# User and group to run the service as
User=www-data
Group=www-data

# Working directory for the service
WorkingDirectory=/opt/myapp

# Environment variables for the service
Environment=NODE_ENV=production
Environment=PORT=3000

# Alternative: load environment from file
EnvironmentFile=/opt/myapp/.env

# The command to start the service
ExecStart=/usr/bin/node /opt/myapp/server.js

# Optional: commands to run before and after the main process
ExecStartPre=/opt/myapp/scripts/pre-start.sh
ExecStartPost=/opt/myapp/scripts/post-start.sh

# Command to reload configuration
ExecReload=/bin/kill -HUP $MAINPID

# Restart policy: always, on-failure, on-abnormal, on-abort, on-watchdog
Restart=on-failure

# Time to wait before restarting
RestartSec=10

# Number of restart attempts within a time window
StartLimitBurst=5
StartLimitIntervalSec=60

# Standard output and error handling
StandardOutput=journal
StandardError=journal

# Syslog identifier for log messages
SyslogIdentifier=myapp

[Install]
# Target that should include this service
WantedBy=multi-user.target
```

### Service Types Explained

Different service types handle process management differently:

```ini
# Type=simple (default)
# The process started by ExecStart is the main process
# systemd considers the service started immediately
[Service]
Type=simple
ExecStart=/usr/bin/python3 /opt/app/main.py

# Type=forking
# Traditional daemon behavior, forks to background
# Requires PIDFile directive to track the main process
[Service]
Type=forking
PIDFile=/run/myapp.pid
ExecStart=/opt/myapp/start.sh

# Type=oneshot
# Process completes a task and exits
# Good for initialization scripts
[Service]
Type=oneshot
RemainAfterExit=yes
ExecStart=/opt/myapp/initialize.sh

# Type=notify
# Service sends notification when ready using sd_notify()
# Best for services that need initialization time
[Service]
Type=notify
ExecStart=/opt/myapp/server --notify
NotifyAccess=main
```

### Installing and Managing Custom Units

After creating a unit file, register it with systemd:

```bash
# Create the unit file
sudo nano /etc/systemd/system/myapp.service

# Reload systemd to recognize the new unit
sudo systemctl daemon-reload

# Enable the service to start on boot
sudo systemctl enable myapp

# Start the service
sudo systemctl start myapp

# Verify the service is running
systemctl status myapp
```

### Template Units

Template units allow you to create multiple instances of a service:

```ini
# /etc/systemd/system/myapp@.service
# Template unit for running multiple instances
# The @ symbol indicates this is a template

[Unit]
Description=My Application Instance %i
After=network.target

[Service]
Type=simple
User=www-data
# %i is replaced with the instance name
WorkingDirectory=/opt/myapp
Environment=INSTANCE=%i
Environment=PORT=300%i
ExecStart=/usr/bin/node /opt/myapp/server.js
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

Using template units to run multiple instances:

```bash
# Start instance 1 on port 3001
sudo systemctl start myapp@1

# Start instance 2 on port 3002
sudo systemctl start myapp@2

# Enable both instances to start on boot
sudo systemctl enable myapp@1 myapp@2

# Check status of a specific instance
systemctl status myapp@1
```

---

## Service Dependencies and Ordering

Proper dependency management ensures services start in the correct order and handle failures gracefully.

### Ordering Directives

Control when a service starts relative to others:

```ini
[Unit]
Description=Application that depends on database

# Start this service after the specified units
# Does NOT create a dependency, only affects ordering
After=postgresql.service redis.service

# Start this service before the specified units
Before=nginx.service

# Requires these units to be active
# If any required unit fails, this unit will also stop
Requires=postgresql.service

# Like Requires, but also orders this unit after the required units
BindsTo=postgresql.service

# Weaker than Requires - tries to start these units
# but won't fail if they can't start
Wants=redis.service

# If any of these units are stopped or restarted,
# this unit will also be stopped or restarted
PartOf=myapp.target
```

### Understanding Requires vs Wants

Here is the difference between Requires and Wants:

```ini
# Using Requires: strict dependency
# If postgresql fails to start, myapp will not start
# If postgresql stops, myapp will also stop
[Unit]
Description=Critical Application
Requires=postgresql.service
After=postgresql.service

# Using Wants: soft dependency
# systemd will try to start redis, but myapp starts regardless
# If redis fails, myapp continues running
[Unit]
Description=Application with optional cache
Wants=redis.service
After=redis.service
```

### Conflict Resolution

Prevent conflicting services from running simultaneously:

```ini
[Unit]
Description=Application Server Version 2

# Ensure only one version runs at a time
Conflicts=myapp-v1.service

# This service cannot run alongside the conflicting service
# Starting this will stop the conflicting service
```

### Target Dependencies

Create custom targets to group related services:

```ini
# /etc/systemd/system/myapp.target
# Custom target that groups application services

[Unit]
Description=My Application Stack
Requires=myapp-web.service myapp-worker.service myapp-scheduler.service
After=myapp-web.service myapp-worker.service myapp-scheduler.service

[Install]
WantedBy=multi-user.target
```

Managing the application stack with a custom target:

```bash
# Start all application services
sudo systemctl start myapp.target

# Stop all application services
sudo systemctl stop myapp.target

# Check status of all services in the target
systemctl list-dependencies myapp.target
```

---

## systemd Timers vs Cron

systemd timers are the modern replacement for cron jobs. They offer better logging, dependency management, and more flexible scheduling.

### Creating a Timer Unit

Timers require two files: a timer unit and a service unit:

```ini
# /etc/systemd/system/backup.service
# Service unit that performs the actual backup

[Unit]
Description=Daily Database Backup

[Service]
Type=oneshot
User=backup
ExecStart=/opt/scripts/backup-database.sh
StandardOutput=journal
StandardError=journal
```

```ini
# /etc/systemd/system/backup.timer
# Timer unit that schedules when the backup runs

[Unit]
Description=Run database backup daily

[Timer]
# Run daily at 2:00 AM
OnCalendar=*-*-* 02:00:00

# Add randomized delay up to 30 minutes to prevent thundering herd
RandomizedDelaySec=1800

# If the system was off during scheduled time, run on next boot
Persistent=true

# Accuracy of the timer (default is 1 minute)
AccuracySec=1s

[Install]
WantedBy=timers.target
```

### Timer Types and Scheduling

Different ways to schedule timer execution:

```ini
[Timer]
# Calendar-based scheduling (like cron)
# Format: DayOfWeek Year-Month-Day Hour:Minute:Second
OnCalendar=Mon..Fri *-*-* 09:00:00   # Weekdays at 9 AM
OnCalendar=*-*-01 00:00:00           # First day of each month
OnCalendar=hourly                      # Every hour
OnCalendar=daily                       # Every day at midnight
OnCalendar=weekly                      # Every Monday at midnight
OnCalendar=monthly                     # First of each month

# Monotonic timers (relative to events)
OnBootSec=15min                        # 15 minutes after boot
OnStartupSec=30s                       # 30 seconds after systemd starts
OnActiveSec=1h                         # 1 hour after timer activation
OnUnitActiveSec=30min                  # 30 min after unit last activated
OnUnitInactiveSec=1h                   # 1 hour after unit became inactive
```

### Managing Timers

Commands for working with timers:

```bash
# Enable and start the timer
sudo systemctl enable backup.timer
sudo systemctl start backup.timer

# List all active timers with next run time
systemctl list-timers

# List all timers including inactive ones
systemctl list-timers --all

# Check timer status
systemctl status backup.timer

# Manually trigger the associated service
sudo systemctl start backup.service

# View logs from timer executions
journalctl -u backup.service
```

### Migrating from Cron to systemd Timer

Here is an example of converting a cron job to a systemd timer:

```bash
# Original cron entry
# 0 */6 * * * /opt/scripts/cleanup.sh >> /var/log/cleanup.log 2>&1
```

Equivalent systemd timer configuration:

```ini
# /etc/systemd/system/cleanup.service
[Unit]
Description=Cleanup old files

[Service]
Type=oneshot
ExecStart=/opt/scripts/cleanup.sh
# journald handles logging automatically
```

```ini
# /etc/systemd/system/cleanup.timer
[Unit]
Description=Run cleanup every 6 hours

[Timer]
# Run every 6 hours
OnCalendar=*-*-* 00/6:00:00
Persistent=true

[Install]
WantedBy=timers.target
```

### Advantages of systemd Timers over Cron

| Feature | systemd Timer | Cron |
|---------|--------------|------|
| Logging | Integrated with journald | Manual logging required |
| Dependencies | Full unit dependency support | None |
| Resource limits | cgroups integration | None |
| Missed runs | Persistent=true option | Lost |
| Randomized delay | RandomizedDelaySec | Not available |
| Status monitoring | systemctl status | Limited |

---

## journald and journalctl

journald is the systemd logging daemon that collects logs from services, the kernel, and system messages. journalctl is the tool to query these logs.

### Basic Log Viewing

Common commands for viewing logs:

```bash
# View all logs (oldest first)
journalctl

# View logs in reverse order (newest first)
journalctl -r

# Follow logs in real-time (like tail -f)
journalctl -f

# Show only the last 100 lines
journalctl -n 100

# View logs since last boot
journalctl -b

# View logs from previous boot
journalctl -b -1

# View logs from two boots ago
journalctl -b -2

# List all recorded boots
journalctl --list-boots
```

### Filtering Logs

Filter logs by various criteria:

```bash
# Logs for a specific service
journalctl -u nginx.service

# Logs for multiple services
journalctl -u nginx.service -u php-fpm.service

# Logs with a specific priority (0=emerg to 7=debug)
journalctl -p err           # Only errors and above
journalctl -p warning..err  # Warnings through errors

# Logs by time range
journalctl --since "2024-01-01 00:00:00"
journalctl --until "2024-01-01 23:59:59"
journalctl --since "1 hour ago"
journalctl --since "yesterday"
journalctl --since "2024-01-01" --until "2024-01-02"

# Logs from a specific process
journalctl _PID=1234

# Logs from a specific user
journalctl _UID=1000

# Logs from a specific binary
journalctl /usr/bin/sshd

# Kernel messages only
journalctl -k
```

### Output Formats

Different ways to display log output:

```bash
# Short format (default)
journalctl -u nginx

# Verbose format with all fields
journalctl -u nginx -o verbose

# JSON format for parsing
journalctl -u nginx -o json

# JSON pretty-printed
journalctl -u nginx -o json-pretty

# Export format (binary, for backup)
journalctl -u nginx -o export > nginx-logs.export

# Show only the message without metadata
journalctl -u nginx -o cat
```

### Log Persistence and Configuration

Configure journald behavior in `/etc/systemd/journald.conf`:

```ini
# /etc/systemd/journald.conf
# Configure journald logging behavior

[Journal]
# Storage options: volatile, persistent, auto, none
# persistent: store on disk in /var/log/journal
# volatile: store only in memory
# auto: store on disk if /var/log/journal exists
Storage=persistent

# Compress logs larger than this threshold
Compress=yes

# Maximum disk space for logs
SystemMaxUse=1G

# Maximum size for a single log file
SystemMaxFileSize=100M

# Keep logs for this long
MaxRetentionSec=1month

# Maximum memory for runtime logs
RuntimeMaxUse=100M

# Forward to syslog
ForwardToSyslog=no

# Forward to console
ForwardToConsole=no

# Maximum log level to store
MaxLevelStore=debug

# Rate limiting: max messages per interval
RateLimitIntervalSec=30s
RateLimitBurst=10000
```

Apply configuration changes:

```bash
# Restart journald to apply changes
sudo systemctl restart systemd-journald

# Verify current disk usage
journalctl --disk-usage

# Rotate logs manually
sudo journalctl --rotate

# Vacuum logs older than 7 days
sudo journalctl --vacuum-time=7d

# Vacuum logs to reach target size
sudo journalctl --vacuum-size=500M
```

### Structured Logging

View and filter by structured log fields:

```bash
# Show all available fields in logs
journalctl -o verbose -n 1

# Filter by custom fields
journalctl CONTAINER_NAME=mycontainer
journalctl _SYSTEMD_UNIT=docker.service CONTAINER_NAME=web

# Show unique values for a field
journalctl -F _SYSTEMD_UNIT
journalctl -F CONTAINER_NAME
```

---

## Resource Limits with cgroups

systemd uses cgroups (control groups) to manage and limit resources for services. This is crucial for preventing runaway processes from affecting system stability.

### Memory Limits

Control memory usage for services:

```ini
[Service]
# Hard limit on memory usage
# Service is killed (OOM) if it exceeds this
MemoryMax=1G

# Soft limit - system will try to keep usage below this
MemoryHigh=800M

# Minimum guaranteed memory
MemoryMin=256M

# Low memory threshold before system reclamation
MemoryLow=512M

# Limit swap usage
MemorySwapMax=500M
```

### CPU Limits

Control CPU allocation for services:

```ini
[Service]
# CPU quota as percentage of one CPU
# 100% = 1 full CPU, 200% = 2 CPUs
CPUQuota=50%

# Relative CPU weight (1-10000, default 100)
# Higher weight = more CPU time when contending
CPUWeight=50

# Pin service to specific CPUs
AllowedCPUs=0-3

# Limit CPUs under heavy load
CPUWeight=idle   # Only run when CPUs are idle
```

### IO Limits

Control disk I/O for services:

```ini
[Service]
# IO weight relative to other services (1-10000, default 100)
IOWeight=50

# Limit read bandwidth (bytes per second)
IOReadBandwidthMax=/dev/sda 10M

# Limit write bandwidth
IOWriteBandwidthMax=/dev/sda 5M

# Limit IOPS
IOReadIOPSMax=/dev/sda 1000
IOWriteIOPSMax=/dev/sda 500
```

### Process and Task Limits

Control process creation:

```ini
[Service]
# Maximum number of tasks (processes/threads)
TasksMax=100

# Limit open files
LimitNOFILE=65536

# Limit core dump size
LimitCORE=infinity

# Limit maximum file size
LimitFSIZE=1G

# Limit address space
LimitAS=4G

# Limit number of processes
LimitNPROC=100
```

### Complete Resource-Limited Service Example

A production-ready service with comprehensive resource limits:

```ini
# /etc/systemd/system/myapp.service
# Production service with resource limits

[Unit]
Description=Production Web Application
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/myapp
ExecStart=/usr/bin/node /opt/myapp/server.js

# Memory limits
MemoryMax=2G
MemoryHigh=1500M
MemorySwapMax=500M

# CPU limits
CPUQuota=150%
CPUWeight=100

# IO limits
IOWeight=100
IOWriteBandwidthMax=/dev/sda 50M

# Task limits
TasksMax=200

# File descriptor limits
LimitNOFILE=65536

# Restart behavior
Restart=on-failure
RestartSec=10

# Security hardening
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

### Viewing Resource Usage

Monitor resource consumption:

```bash
# View resource usage for a service
systemctl status myapp.service

# Show detailed cgroup information
systemd-cgtop

# View cgroup hierarchy
systemd-cgls

# Show resource limits for a service
systemctl show myapp.service | grep -E "(Memory|CPU|Tasks)"

# View cgroup properties
cat /sys/fs/cgroup/system.slice/myapp.service/memory.max
```

---

## Troubleshooting Failed Services

When services fail to start or crash, systemd provides powerful tools for diagnosis.

### Checking Service Status

Start with the status command for an overview:

```bash
# Get detailed status including recent logs
systemctl status myapp.service

# Check if the service is in a failed state
systemctl is-failed myapp.service

# List all failed services
systemctl --failed

# Get the exit code of the main process
systemctl show myapp.service --property=ExecMainStatus
```

### Analyzing Service Logs

Dig deeper into logs for error messages:

```bash
# View all logs for the service
journalctl -u myapp.service

# View only error-level logs
journalctl -u myapp.service -p err

# Follow logs in real-time during troubleshooting
journalctl -u myapp.service -f

# View logs around the time of failure
journalctl -u myapp.service --since "10 minutes ago"

# View logs from the last failed start attempt
journalctl -u myapp.service -b -n 50
```

### Common Failure Causes and Solutions

#### Exit Code Analysis

Interpret exit codes to understand failures:

```bash
# View the main process exit status
systemctl show myapp.service --property=ExecMainStatus

# Common exit codes:
# 0: Success
# 1: General errors
# 2: Misuse of shell command
# 126: Command invoked cannot execute
# 127: Command not found
# 128+N: Fatal error signal N (e.g., 137 = killed by SIGKILL)
# 203: Failed to execute command
# 217: Failed to change user/group
```

#### Permission Issues

Fix common permission problems:

```bash
# Check if the user exists
id www-data

# Check file permissions
ls -la /opt/myapp/

# Check if the executable has correct permissions
ls -la /opt/myapp/server.js

# Test running the command as the service user
sudo -u www-data /usr/bin/node /opt/myapp/server.js

# Check SELinux or AppArmor status
getenforce  # SELinux
aa-status   # AppArmor
```

#### Dependency Failures

Diagnose dependency issues:

```bash
# Check if dependencies are running
systemctl status postgresql.service

# List dependencies of a service
systemctl list-dependencies myapp.service

# Show reverse dependencies
systemctl list-dependencies --reverse myapp.service

# Check if a required service is masked
systemctl is-enabled postgresql.service
```

### Service Recovery Options

Configure automatic recovery in the unit file:

```ini
[Service]
# Restart on failure
Restart=on-failure
RestartSec=10

# Limit restart attempts
StartLimitBurst=5
StartLimitIntervalSec=300

# Action after exceeding restart limit
# Options: none, reboot, reboot-force, reboot-immediate, poweroff, exit
StartLimitAction=none

# Optional: notify external monitoring on failure
ExecStopPost=/opt/scripts/notify-failure.sh
```

### Debugging a Service

Run a service interactively for debugging:

```bash
# Show the exact command systemd will run
systemctl show myapp.service --property=ExecStart

# Run the service in foreground mode for debugging
sudo -u www-data /usr/bin/node /opt/myapp/server.js

# Check environment variables
systemctl show myapp.service --property=Environment

# Verify the working directory exists and is accessible
ls -la /opt/myapp/

# Check for port conflicts
ss -tlnp | grep 3000

# Verify required files exist
test -f /opt/myapp/.env && echo "Env file exists"
```

### Resetting Failed State

Clear failed state to allow restart:

```bash
# Reset the failed state of a specific service
sudo systemctl reset-failed myapp.service

# Reset all failed states
sudo systemctl reset-failed

# Force reload of unit configuration
sudo systemctl daemon-reload
```

---

## Best Practices

Follow these best practices for managing services with systemd.

### Security Hardening

Apply security restrictions to services:

```ini
[Service]
# Run as non-root user
User=www-data
Group=www-data

# Prevent privilege escalation
NoNewPrivileges=true

# Restrict filesystem access
ProtectSystem=strict
ProtectHome=true
PrivateTmp=true

# Additional restrictions
ProtectKernelTunables=true
ProtectKernelModules=true
ProtectControlGroups=true

# Restrict capabilities
CapabilityBoundingSet=CAP_NET_BIND_SERVICE
AmbientCapabilities=CAP_NET_BIND_SERVICE

# Network restrictions
RestrictAddressFamilies=AF_INET AF_INET6 AF_UNIX
PrivateNetwork=false

# System call filtering
SystemCallFilter=@system-service
SystemCallArchitectures=native
```

### Unit File Organization

Keep unit files organized and maintainable:

```bash
# Use drop-in directories for customizations
sudo mkdir -p /etc/systemd/system/nginx.service.d/

# Create an override file
sudo nano /etc/systemd/system/nginx.service.d/override.conf
```

```ini
# /etc/systemd/system/nginx.service.d/override.conf
# Override specific settings without modifying the original unit

[Service]
# Increase memory limit for this installation
MemoryMax=4G

# Add custom environment variable
Environment=CUSTOM_VAR=value
```

### Monitoring and Alerting

Set up monitoring for service health:

```bash
# Create a health check script that integrates with monitoring
#!/bin/bash
# /opt/scripts/service-health-check.sh

SERVICES=("nginx" "postgresql" "myapp")

for service in "${SERVICES[@]}"; do
    if ! systemctl is-active --quiet "$service"; then
        echo "CRITICAL: $service is not running"
        # Send alert to monitoring system
        curl -X POST "https://monitoring.example.com/alert" \
            -d "service=$service&status=down"
    fi
done
```

### Documentation in Unit Files

Document your unit files for future maintainers:

```ini
# /etc/systemd/system/myapp.service
#
# This service runs the main application server.
#
# Dependencies:
#   - PostgreSQL database (postgresql.service)
#   - Redis cache (redis.service)
#
# Configuration:
#   - Environment file: /opt/myapp/.env
#   - Logs: journalctl -u myapp.service
#
# Maintenance:
#   - Restart after config changes: systemctl restart myapp
#   - View status: systemctl status myapp

[Unit]
Description=My Application - Main Web Server
Documentation=https://wiki.example.com/myapp
After=network.target postgresql.service redis.service
Wants=redis.service
Requires=postgresql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/myapp
EnvironmentFile=/opt/myapp/.env
ExecStart=/usr/bin/node /opt/myapp/server.js
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

---

## Conclusion

systemd is a powerful and flexible system for managing Ubuntu servers. By mastering systemctl commands, creating well-structured service units, implementing proper dependencies, using timers for scheduling, leveraging journald for logging, and applying resource limits, you can build robust and maintainable server infrastructure.

Key takeaways from this guide:

1. **Use systemctl** for all service management operations - it provides consistent and powerful control over your services
2. **Create proper unit files** with appropriate types, restart policies, and dependencies for reliable service management
3. **Prefer systemd timers over cron** for better logging, dependency management, and monitoring capabilities
4. **Leverage journald** for centralized logging with powerful filtering and analysis capabilities
5. **Apply resource limits** using cgroups to prevent resource exhaustion and ensure fair allocation
6. **Follow troubleshooting procedures** systematically when services fail, using status, logs, and diagnostic commands
7. **Implement security hardening** in your unit files to minimize attack surface

With these skills, you are well-equipped to manage any Ubuntu server environment effectively using systemd.
