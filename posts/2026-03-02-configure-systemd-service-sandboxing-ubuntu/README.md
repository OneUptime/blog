# How to Configure systemd Service Sandboxing on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Systemd, Security, Sandboxing, System Administration

Description: Harden systemd services on Ubuntu using sandboxing directives to restrict system calls, file system access, network access, and kernel capabilities, reducing attack surface.

---

Every service running on an Ubuntu system has, by default, the same access to the system as the user it runs as. A web server running as `www-data` can read files that `www-data` can access, make network connections, and execute arbitrary code. If the service is compromised, the attacker inherits all of those capabilities.

systemd provides a set of sandboxing directives that let you explicitly define what a service is allowed to do - and deny everything else. This is defense in depth: even if the service has a vulnerability, the sandbox limits what an attacker can accomplish.

This guide covers the most useful sandboxing directives and how to apply them without breaking service functionality.

## Assessing Current Security

systemd provides an analysis tool that rates a service's security posture:

```bash
# Analyze a service's security configuration
systemd-analyze security nginx.service

# Example output (EXPOSURE is a 0-10 scale, lower is better):
# nginx.service                                    EXPOSURE
#   PrivateNetwork                               0.5 OK
#   PrivateTmp                                   OK
#   PrivateDevices                               OK
#   PrivateUsers                                 MEDIUM
#   ProtectSystem                                MEDIUM
#   ...
#   Overall exposure level for nginx.service: 3.1 OK
```

Use this tool to understand what protections are missing and to verify that changes improve the score without breaking functionality.

## Applying Sandboxing to an Existing Service

Instead of editing the original service file (which gets overwritten on package updates), use a drop-in override:

```bash
# Create override directory
sudo mkdir -p /etc/systemd/system/myservice.service.d/

# Create the sandbox configuration
sudo nano /etc/systemd/system/myservice.service.d/sandbox.conf
```

After adding directives, reload and restart:

```bash
sudo systemctl daemon-reload
sudo systemctl restart myservice
```

Test that the service still works, then check the security score:

```bash
systemd-analyze security myservice.service
```

## Filesystem Restrictions

### ProtectSystem

`ProtectSystem` mounts parts of the filesystem read-only for the service:

```ini
[Service]
# strict: makes /usr, /boot, /efi read-only AND makes /etc read-only
# full: makes /usr, /boot, /efi read-only but /etc remains writable
# true: makes /usr and /boot read-only
ProtectSystem=strict
```

Most services should use `strict`. Services that need to write to `/etc` should use `full`.

### ProtectHome

`ProtectHome` prevents the service from accessing home directories:

```ini
[Service]
# true: make /home, /root, /run/user inaccessible
# read-only: mount those directories read-only
# tmpfs: replace those directories with empty tmpfs mounts
ProtectHome=true
```

Services should not need access to home directories. Set this to `true` unless there is a specific reason.

### ReadWritePaths and ReadOnlyPaths

When using `ProtectSystem=strict`, explicitly grant write access to required directories:

```ini
[Service]
ProtectSystem=strict
ProtectHome=true

# Allow writing to specific paths
ReadWritePaths=/var/lib/myservice
ReadWritePaths=/var/log/myservice
ReadWritePaths=/run/myservice

# Explicitly restrict read access to sensitive paths
InaccessiblePaths=/etc/shadow
InaccessiblePaths=/proc/kcore
```

### PrivateTmp

Creates a private, isolated `/tmp` and `/var/tmp` for the service:

```ini
[Service]
PrivateTmp=true
```

Without this, a service's temporary files are visible to other processes in `/tmp`. Enabling it gives the service its own isolated temp space.

## Device Restrictions

### PrivateDevices

Removes access to physical hardware devices:

```ini
[Service]
PrivateDevices=true
```

This replaces `/dev/` with a minimal set of safe pseudo-devices (`/dev/null`, `/dev/zero`, `/dev/random`, etc.) and denies access to disk, audio, GPU, and other devices. Most network services do not need hardware device access.

### DeviceAllow

If a service needs specific device access, explicitly list allowed devices:

```ini
[Service]
PrivateDevices=true

# Allow read/write access to a specific device
DeviceAllow=/dev/sda rw

# Allow only read access
DeviceAllow=/dev/ttyUSB0 r
```

## Network Restrictions

### PrivateNetwork

Completely isolates the service from all network interfaces:

```ini
[Service]
PrivateNetwork=true
```

This creates a new network namespace with only a loopback interface. Use for services that should not have network access (batch jobs, local processors).

### RestrictAddressFamilies

Limit which address families the service can use:

```ini
[Service]
# Allow only IPv4 and IPv6
RestrictAddressFamilies=AF_INET AF_INET6

# Allow only Unix domain sockets (no network)
RestrictAddressFamilies=AF_UNIX

# Deny all network sockets
RestrictAddressFamilies=none
```

For a service that only needs to listen on TCP/UDP:

```ini
RestrictAddressFamilies=AF_INET AF_INET6 AF_UNIX
```

## User and Privilege Restrictions

### PrivateUsers

Creates a new user namespace where the service cannot see or interact with system users:

```ini
[Service]
PrivateUsers=true
```

### NoNewPrivileges

Prevents the service from gaining additional privileges through setuid binaries or capabilities:

```ini
[Service]
NoNewPrivileges=true
```

This is one of the most important security directives and should be enabled for almost all services. It prevents privilege escalation even if the service executes a setuid-root binary.

### CapabilityBoundingSet

Limit which Linux capabilities the service can use:

```ini
[Service]
# Remove all capabilities
CapabilityBoundingSet=

# Allow only the capabilities a web server needs
# CAP_NET_BIND_SERVICE: bind to ports below 1024
CapabilityBoundingSet=CAP_NET_BIND_SERVICE

# Example for a network service that needs to bind and set socket options
CapabilityBoundingSet=CAP_NET_BIND_SERVICE CAP_NET_RAW
```

Common capabilities and their uses:

| Capability | Use |
|-----------|-----|
| CAP_NET_BIND_SERVICE | Bind to ports < 1024 |
| CAP_NET_RAW | Raw socket access (ping, etc.) |
| CAP_DAC_OVERRIDE | Override file permissions |
| CAP_SYS_ADMIN | Wide-ranging admin operations |
| CAP_CHOWN | Change file ownership |

### AmbientCapabilities

Grant specific capabilities to a service even when running as a non-root user:

```ini
[Service]
User=myservice
AmbientCapabilities=CAP_NET_BIND_SERVICE
CapabilityBoundingSet=CAP_NET_BIND_SERVICE
```

This allows a service to bind port 80 as a non-root user.

## System Call Filtering

`SystemCallFilter` allows or denies specific Linux system calls:

```ini
[Service]
# Deny a list of dangerous syscalls
SystemCallFilter=~@privileged @resources

# Or whitelist only the syscalls needed
# Use predefined groups (@basic-io, @network-io, @process, etc.)
SystemCallFilter=@system-service
```

systemd provides predefined system call groups:

```bash
# List available system call groups
man systemd.exec | grep "@" | head -40
```

Common groups:
- `@system-service` - syscalls for typical service operation
- `@network-io` - network-related syscalls
- `@basic-io` - basic file I/O
- `@privileged` - privilege-related syscalls (usually deny these with `~`)
- `@resources` - resource limit manipulation

To see which syscalls are in a group:

```bash
systemd-analyze syscall-filter @privileged
```

## Kernel Feature Restrictions

### ProtectKernelTunables

Prevents the service from modifying kernel parameters via `/proc/sys/` and `/sys/`:

```ini
[Service]
ProtectKernelTunables=true
```

### ProtectKernelModules

Prevents the service from loading or unloading kernel modules:

```ini
[Service]
ProtectKernelModules=true
```

### ProtectKernelLogs

Prevents read access to kernel logs:

```ini
[Service]
ProtectKernelLogs=true
```

### ProtectControlGroups

Prevents writing to the cgroup hierarchy:

```ini
[Service]
ProtectControlGroups=true
```

## A Complete Sandbox Example

Here is a comprehensive sandbox configuration for a typical web application service:

```ini
# /etc/systemd/system/webapp.service.d/sandbox.conf

[Service]
# Run as dedicated user
User=webapp
Group=webapp

# Prevent privilege escalation
NoNewPrivileges=true

# Filesystem protection
ProtectSystem=strict
ProtectHome=true
PrivateTmp=true
ReadWritePaths=/var/lib/webapp /var/log/webapp /run/webapp

# Device protection
PrivateDevices=true

# Network restriction (allow only TCP/IP)
RestrictAddressFamilies=AF_INET AF_INET6 AF_UNIX

# Capability restriction
CapabilityBoundingSet=

# User namespace
PrivateUsers=true

# Kernel protection
ProtectKernelTunables=true
ProtectKernelModules=true
ProtectKernelLogs=true
ProtectControlGroups=true

# System call filtering
SystemCallFilter=@system-service
SystemCallArchitectures=native

# Limit access to /proc and /sys
ProtectProc=invisible
ProcSubset=pid
```

After applying, verify the service works and check the security score:

```bash
sudo systemctl daemon-reload
sudo systemctl restart webapp
systemd-analyze security webapp.service
```

## Summary

systemd sandboxing directives provide a layered defense for services running on Ubuntu. Start with the most impactful directives - `NoNewPrivileges`, `ProtectSystem=strict`, `ProtectHome=true`, `PrivateTmp=true`, and `PrivateDevices=true` - then add capability restrictions and system call filters. Use `systemd-analyze security` to measure the security posture before and after changes, and test each directive incrementally to catch any that conflict with the service's operation. Drop-in override files keep these changes separate from the package-managed unit file, ensuring they persist across package updates.
