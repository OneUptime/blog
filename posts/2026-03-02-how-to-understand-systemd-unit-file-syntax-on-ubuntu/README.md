# How to Understand systemd Unit File Syntax on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, systemd, Linux, Service, Administration

Description: Learn the structure and syntax of systemd unit files on Ubuntu, covering the Unit, Service, Install, and other sections with practical examples for common service configurations.

---

systemd unit files are the configuration files that define services, timers, targets, and other managed resources. They follow a consistent INI-style format, but the number of options and their interactions can be confusing at first. Understanding the syntax makes reading and writing unit files straightforward.

## Where Unit Files Live

systemd looks for unit files in several locations, in order of precedence:

1. `/etc/systemd/system/` - Local administrator configuration (highest priority)
2. `/run/systemd/system/` - Runtime-generated units
3. `/lib/systemd/system/` - Package-installed units (lowest priority)

Files in `/etc/systemd/system/` override those in `/lib/systemd/system/`. When you install a package on Ubuntu, its service units go to `/lib/systemd/system/`. When you customize a service, you either edit a copy in `/etc/systemd/system/` or use a drop-in file.

```bash
# List all loaded unit files and their paths
systemctl list-unit-files

# Show where a specific unit file is loaded from
systemctl cat nginx.service
```

## The Basic Unit File Structure

Unit files have sections separated by `[Section]` headers. Each section contains `Key=Value` pairs:

```ini
[Unit]
Description=My Service
After=network.target

[Service]
Type=simple
ExecStart=/usr/local/bin/myservice
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

Three sections appear in nearly every unit file: `[Unit]`, `[Service]` (or the type-specific section), and `[Install]`.

## The [Unit] Section

The `[Unit]` section contains metadata and dependency information. It is common to all unit types.

```ini
[Unit]
# Human-readable description shown in systemctl status
Description=PostgreSQL Database Server

# URL for documentation (informational only)
Documentation=https://www.postgresql.org/docs/ man:postgresql(5)

# Ordering: start after these units, if they are started
# This does not add a dependency - the listed units may not start
After=network.target syslog.target

# Ordering: start before these units
Before=myapp.service

# Hard dependency: this unit fails if postgresql.service fails
Requires=postgresql.service

# Soft dependency: try to start with this unit, but don't fail if it's not available
Wants=optional-cache.service

# If the listed unit stops, this unit also stops
BindsTo=device.service

# Conflict: cannot be active at the same time as these units
Conflicts=shutdown.target emergency.service

# Only activate when this condition is true
ConditionPathExists=/etc/myapp/config.yaml
ConditionFileNotEmpty=/etc/myapp/config.yaml

# Assert: fail unit activation if condition not met
AssertPathExists=/usr/local/bin/myapp
```

### Dependency Keywords

| Keyword | Meaning |
|---------|---------|
| `Requires=` | Hard dependency. If required unit fails, this unit also fails. |
| `Wants=` | Soft dependency. If wanted unit fails, this unit continues. |
| `After=` | Start after the listed units. No dependency added. |
| `Before=` | Start before the listed units. No dependency added. |
| `BindsTo=` | If listed unit stops, this unit also stops. |
| `PartOf=` | If listed unit stops or restarts, so does this unit. |
| `Conflicts=` | Cannot be active simultaneously. |

`After=` and `Before=` only control ordering, not activation. `Requires=` and `Wants=` control activation. These are often used together:

```ini
# Start after network AND require network (will not start if network is not available)
After=network-online.target
Requires=network-online.target

# Or use the shortcut
Wants=network-online.target
After=network-online.target
```

## The [Service] Section

The `[Service]` section is specific to service units and controls how the process runs.

### Service Types

```ini
[Service]
# Type controls how systemd considers the service started

# simple: ExecStart process is the main service. Default if Type not set.
Type=simple

# forking: Process forks and exits. Systemd considers the forked child as the main process.
# Use PIDFile= to tell systemd where the child's PID file is.
Type=forking
PIDFile=/run/myservice.pid

# oneshot: Process runs to completion and exits. Good for scripts.
Type=oneshot

# notify: Like simple, but the service signals when it is ready using sd_notify()
Type=notify

# dbus: Service registers a D-Bus name when ready
Type=dbus
BusName=org.example.MyService

# idle: Like simple but waits until all other jobs are dispatched
Type=idle
```

### Process Execution

```ini
[Service]
# The command to start the service
ExecStart=/usr/bin/myapp --config /etc/myapp/config.yaml

# Commands to run before ExecStart (can appear multiple times)
ExecStartPre=/usr/local/bin/check-config.sh
ExecStartPre=-/usr/bin/mkdir -p /run/myapp   # - prefix: ignore failures

# Commands to run after ExecStart completes (not if start fails)
ExecStartPost=/usr/local/bin/register-service.sh

# Command to reload configuration without restarting
ExecReload=/bin/kill -HUP $MAINPID

# Command to stop the service (if not specified, SIGTERM is sent)
ExecStop=/usr/bin/myapp --stop

# Command to run after the service stops
ExecStopPost=/usr/local/bin/cleanup.sh

# Working directory for ExecStart and other commands
WorkingDirectory=/var/lib/myapp

# Run as this user and group
User=myapp
Group=myapp

# Environment variables
Environment="LOG_LEVEL=info" "DATA_DIR=/var/lib/myapp"

# Environment file (one KEY=VALUE per line)
EnvironmentFile=/etc/myapp/environment
EnvironmentFile=-/etc/myapp/optional-env  # - = ignore if missing
```

### Restart Behavior

```ini
[Service]
# When to restart:
# no: Never restart (default)
# on-success: Only if exit code is 0
# on-failure: On non-zero exit, signal, timeout
# on-abnormal: On signal, timeout (not clean exit)
# on-abort: On SIGABRT or core dump
# always: Restart regardless of reason
Restart=on-failure

# Time to wait before restarting (default 100ms)
RestartSec=5s

# Time limit for starting
TimeoutStartSec=30s

# Time limit for stopping before SIGKILL is sent
TimeoutStopSec=30s

# Limit restart attempts
StartLimitIntervalSec=60
StartLimitBurst=5
# The above means: if the service restarts more than 5 times in 60 seconds, stop trying
```

### Security and Sandboxing

```ini
[Service]
# Filesystem access restrictions
ProtectSystem=strict          # Mount /usr, /boot, /etc as read-only
ProtectHome=yes               # Make /home, /root, /run/user inaccessible

# Capability restrictions
CapabilityBoundingSet=        # Remove all capabilities (most restrictive)
CapabilityBoundingSet=CAP_NET_BIND_SERVICE  # Allow only binding ports < 1024

# Network access restrictions
PrivateNetwork=yes            # Only loopback interface visible
RestrictAddressFamilies=AF_INET AF_INET6  # Only IPv4/IPv6

# Misc restrictions
NoNewPrivileges=yes           # Process cannot gain new privileges
PrivateTmp=yes                # Use private /tmp directory
ProtectKernelTunables=yes     # Cannot modify kernel variables (/proc/sys)
ProtectControlGroups=yes      # Cannot modify cgroup hierarchy
```

## The [Install] Section

The `[Install]` section controls how the unit integrates with system targets:

```ini
[Install]
# This unit becomes a dependency of multi-user.target when enabled
# (systemctl enable creates a symlink in multi-user.target.wants/)
WantedBy=multi-user.target

# For services that should also start in graphical mode
WantedBy=graphical.target

# For services that should be required by (not just wanted by) a target
RequiredBy=critical.target

# Create an alias for this unit
Alias=myapp-alias.service

# Mark this unit as the canonical implementation of a generic unit
Also=related.service  # also enable this unit when this one is enabled
```

Common `WantedBy` targets:
- `multi-user.target` - For server services (no GUI)
- `graphical.target` - For desktop services
- `network.target` - For network-dependent services
- `timers.target` - For systemd timers

## Using Drop-In Files to Modify Existing Units

Instead of editing package-provided unit files directly (which get overwritten on updates), use drop-in files:

```bash
# Create a drop-in directory for nginx
sudo mkdir -p /etc/systemd/system/nginx.service.d/

# Create a drop-in file
sudo nano /etc/systemd/system/nginx.service.d/custom.conf
```

```ini
# Drop-in: this file ADDS to or OVERRIDES settings in the main unit file
[Service]
# Reset the Restart value and set a new one
Restart=always

# Add an environment variable (lists are appended, not replaced)
Environment="EXTRA_VAR=value"

# Add a capability
CapabilityBoundingSet=CAP_NET_BIND_SERVICE
```

```bash
# Reload after changes
sudo systemctl daemon-reload

# Verify the drop-in applied
systemctl cat nginx.service
# Output shows the main file then merged drop-in files
```

## Special Characters and Variables

```ini
[Service]
# Specifiers expand at runtime:
# %n = unit name (e.g., myapp.service)
# %p = unit prefix (part before @)
# %i = instance name (part after @ for template units)
# %u = user running the service
# %H = hostname
# %h = home directory of service user
# %t = runtime directory path (/run)
# %S = state directory path (/var/lib)
# %C = cache directory path (/var/cache)
# %L = log directory path (/var/log)

ExecStart=/usr/bin/myapp --pid-file=/run/%p/%n.pid
StateDirectory=%p   # Creates /var/lib/myapp, sets $STATE_DIRECTORY
RuntimeDirectory=%p # Creates /run/myapp, sets $RUNTIME_DIRECTORY
LogsDirectory=%p    # Creates /var/log/myapp, sets $LOGS_DIRECTORY
```

## Template Units

Template units serve multiple instances from a single file using `@`:

```bash
# Template file: myapp@.service (note the @)
sudo nano /etc/systemd/system/myapp@.service
```

```ini
[Unit]
Description=My Application - Instance %i

[Service]
Type=simple
ExecStart=/usr/bin/myapp --instance %i --port %i
User=myapp
```

```bash
# Enable specific instances
sudo systemctl enable myapp@instance1.service
sudo systemctl enable myapp@instance2.service

# Start a specific instance
sudo systemctl start myapp@8080.service
# %i expands to "8080"
```

## Validating Unit Files

```bash
# Check syntax without loading
systemd-analyze verify /etc/systemd/system/myapp.service

# Check the effective configuration after drop-ins
systemctl cat myapp.service

# Show all properties of a running unit
systemctl show myapp.service

# Show specific properties
systemctl show myapp.service --property=Restart,ExecStart,User
```

Understanding these building blocks makes working with systemd much more productive. The unit file format is consistent across all unit types, so the same knowledge applies to services, timers, sockets, paths, mounts, and targets.
