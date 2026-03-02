# How to Configure systemd Service Hardening on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, systemd, Security, System Hardening, Linux

Description: Learn how to use systemd's built-in sandboxing and security directives to harden services on Ubuntu, limiting their access to the system and reducing attack surface.

---

systemd provides a rich set of security directives that let you sandbox individual services - restricting their filesystem access, system call permissions, network capabilities, and process privileges. Unlike external sandboxing tools, these controls are built directly into the service manager and apply automatically every time the service starts. A well-hardened systemd service can't read files outside its designated directories, can't call dangerous system calls, and can't escalate privileges even if the application is compromised.

## Checking Current Security Score

systemd includes an `analyze security` subcommand that scores services based on how many hardening options they've enabled:

```bash
# Check security exposure score for a specific service
sudo systemd-analyze security nginx

# Check all running services and sort by exposure
sudo systemd-analyze security | sort -k 2 -n

# Get verbose analysis showing which features are enabled/disabled
sudo systemd-analyze security --no-pager nginx
```

The score ranges from 0 (fully hardened) to 10 (no hardening). Most default services score 8-9, indicating significant hardening potential.

## Core Hardening Directives

Hardening is applied by creating a service override file. Never modify the base service file directly, as it gets overwritten on package updates.

```bash
# Create an override directory and file for a service
sudo mkdir -p /etc/systemd/system/nginx.service.d/
sudo nano /etc/systemd/system/nginx.service.d/hardening.conf

# Or use systemctl edit which opens the file automatically
sudo systemctl edit nginx
```

### Filesystem Restrictions

```ini
# /etc/systemd/system/nginx.service.d/hardening.conf
[Service]
# Make the entire filesystem read-only, then selectively allow writes
ProtectSystem=strict
# With strict, only /proc, /sys, /dev, and /run stay writable by default

# Make home directories inaccessible to the service
ProtectHome=yes
# Options: yes (makes /home, /root, /run/user inaccessible)
#          read-only (mounts them read-only)
#          tmpfs (replaces with empty tmpfs)

# Bind-mount specific directories as writable
ReadWritePaths=/var/log/nginx /var/cache/nginx

# Make additional paths read-only (beyond ProtectSystem)
ReadOnlyPaths=/etc/nginx

# Completely hide directories from the service
InaccessiblePaths=/home /root /boot /mnt /media /opt
```

### Private /tmp and /dev

```ini
[Service]
# Give the service its own private /tmp directory
# Prevents leaking data to/from other services via /tmp
PrivateTmp=yes

# Only expose a minimal subset of /dev devices
# (no raw disk access, no memory devices)
PrivateDevices=yes
```

### Network Restrictions

```ini
[Service]
# Deny access to network namespaces (prevents creating new network interfaces)
RestrictAddressFamilies=AF_INET AF_INET6 AF_UNIX
# Only allow IPv4, IPv6, and Unix sockets
# Remove AF_INET/AF_INET6 for services that don't need network access

# For services that need no network at all:
PrivateNetwork=yes
# Note: This prevents ALL network access including loopback
```

### User and Privilege Restrictions

```ini
[Service]
# Run the service as a non-privileged user and group
User=www-data
Group=www-data

# Prevent the service from gaining new privileges through setuid/setgid
NoNewPrivileges=yes

# Remove all capabilities the service doesn't need
# nginx only needs to bind to ports 80/443 (CAP_NET_BIND_SERVICE)
CapabilityBoundingSet=CAP_NET_BIND_SERVICE CAP_SETUID CAP_SETGID
AmbientCapabilities=CAP_NET_BIND_SERVICE

# Prevent writing to kernel variables
ProtectKernelTunables=yes

# Prevent loading or unloading kernel modules
ProtectKernelModules=yes

# Protect kernel logs from being read
ProtectKernelLogs=yes

# Restrict control group access
ProtectControlGroups=yes
```

### System Call Filtering

System call filtering is one of the most effective hardening measures. It prevents services from making system calls they don't need.

```ini
[Service]
# Filter system calls using seccomp
# @system-service is a predefined set appropriate for most services
SystemCallFilter=@system-service

# Remove specific dangerous calls from the allowed set
SystemCallFilter=~@debug @mount @swap @reboot @privileged

# For stricter filtering, specify exact allowed calls
# (too strict can break services - test thoroughly)
SystemCallFilter=read write close mmap mprotect munmap brk rt_sigaction

# Set the action when a filtered syscall is attempted
# kill: kill the process (harsh but effective)
# errno: return EPERM (service may handle it gracefully)
SystemCallErrorNumber=EPERM

# Filter by system call architecture
SystemCallArchitectures=native
```

## Complete Hardening Example: nginx

Here's a complete hardening configuration for nginx:

```ini
# /etc/systemd/system/nginx.service.d/hardening.conf
[Service]
# Filesystem restrictions
ProtectSystem=strict
ProtectHome=yes
PrivateTmp=yes
PrivateDevices=yes
ReadWritePaths=/var/log/nginx /var/cache/nginx /var/lib/nginx /run/nginx
ReadOnlyPaths=/etc/nginx /etc/ssl /var/www/html

# Hide paths nginx shouldn't see
InaccessiblePaths=/boot /mnt /media

# Privilege restrictions
NoNewPrivileges=yes
CapabilityBoundingSet=CAP_NET_BIND_SERVICE CAP_SETUID CAP_SETGID CAP_CHOWN
AmbientCapabilities=CAP_NET_BIND_SERVICE

# Kernel protections
ProtectKernelTunables=yes
ProtectKernelModules=yes
ProtectKernelLogs=yes
ProtectControlGroups=yes
ProtectClock=yes
ProtectHostname=yes

# Network
RestrictAddressFamilies=AF_INET AF_INET6 AF_UNIX

# System call filtering
SystemCallFilter=@system-service
SystemCallFilter=~@debug @mount @swap @reboot
SystemCallErrorNumber=EPERM
SystemCallArchitectures=native

# Misc restrictions
RestrictRealtime=yes
RestrictSUIDSGID=yes
LockPersonality=yes
MemoryDenyWriteExecute=yes
RemoveIPC=yes
```

After editing, reload and restart the service:

```bash
# Reload systemd to pick up changes
sudo systemctl daemon-reload

# Restart the service with new security settings
sudo systemctl restart nginx

# Check the service is running correctly
sudo systemctl status nginx

# Check logs for any permission errors
sudo journalctl -u nginx --since "1 minute ago"
```

## Hardening a Custom Application Service

Here's a hardening template for a typical web application:

```ini
# /etc/systemd/system/myapp.service
[Unit]
Description=My Application Server
After=network.target

[Service]
Type=simple
User=myapp
Group=myapp
WorkingDirectory=/opt/myapp

# Start command
ExecStart=/opt/myapp/bin/myapp --config /etc/myapp/config.yaml

# Auto-restart on failure
Restart=on-failure
RestartSec=5s

# Filesystem restrictions
ProtectSystem=strict
ProtectHome=yes
PrivateTmp=yes
PrivateDevices=yes
ReadWritePaths=/var/log/myapp /var/lib/myapp /run/myapp
ReadOnlyPaths=/etc/myapp /etc/ssl/certs

# Privilege restrictions
NoNewPrivileges=yes
CapabilityBoundingSet=
AmbientCapabilities=

# Kernel protections
ProtectKernelTunables=yes
ProtectKernelModules=yes
ProtectKernelLogs=yes
ProtectControlGroups=yes
ProtectClock=yes
ProtectHostname=yes

# Network (adjust based on what the app needs)
RestrictAddressFamilies=AF_INET AF_INET6 AF_UNIX

# Syscall filtering
SystemCallFilter=@system-service
SystemCallFilter=~@debug @mount @swap @reboot @privileged
SystemCallErrorNumber=EPERM
SystemCallArchitectures=native

# Additional restrictions
RestrictRealtime=yes
RestrictSUIDSGID=yes
LockPersonality=yes
MemoryDenyWriteExecute=yes
RemoveIPC=yes

# Resource limits
LimitNOFILE=65536
LimitNPROC=512
MemoryLimit=512M
CPUQuota=200%

[Install]
WantedBy=multi-user.target
```

## Troubleshooting Hardening Issues

When a service fails after adding hardening directives, the issue is usually a permission denied error caused by a directive that's too restrictive.

```bash
# Check recent service errors
sudo journalctl -u myapp.service --since "5 minutes ago" -p err

# Look for specific syscall violations
sudo journalctl -k | grep "audit: type=1326" | tail -20

# Check for file permission denials
sudo ausearch -m AVC,USER_AVC -ts recent 2>/dev/null | grep myapp
```

### Gradually Adding Restrictions

Add hardening directives incrementally rather than all at once:

```bash
# Start with the safest options and verify the service works
# Then progressively add stricter options

# Step 1: Add basic protections
ProtectSystem=full
PrivateTmp=yes
NoNewPrivileges=yes

# Verify: systemctl restart myapp && systemctl status myapp

# Step 2: Add capability restrictions
CapabilityBoundingSet=

# Verify again...

# Step 3: Add syscall filtering
SystemCallFilter=@system-service
```

## Checking the Results

After hardening, recheck the security score:

```bash
# Compare before and after hardening
sudo systemd-analyze security nginx

# Good target is MEDIUM (score 4-6) or better for most services
# Critical services should target SAFE (0-3)
```

The combination of `ProtectSystem=strict`, `ProtectHome=yes`, `PrivateTmp=yes`, `NoNewPrivileges=yes`, and `SystemCallFilter=@system-service` provides substantial protection for most services with minimal configuration effort and is a good baseline for any service you're deploying on Ubuntu.
