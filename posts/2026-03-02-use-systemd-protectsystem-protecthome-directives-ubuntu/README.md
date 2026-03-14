# How to Use systemd ProtectSystem and ProtectHome Directives on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Systemd, Security, System Administration, Hardening

Description: A detailed guide to systemd's ProtectSystem and ProtectHome directives on Ubuntu, explaining how to use them to restrict service filesystem access and protect sensitive directories.

---

Two of the most impactful security directives in systemd are `ProtectSystem` and `ProtectHome`. Together they enforce read-only access to critical system directories and deny access to user home directories, dramatically limiting what a compromised service can do to the system it runs on.

Understanding the exact scope of each option and how to combine them with `ReadWritePaths` for exceptions is essential for applying them effectively without breaking service functionality.

## What ProtectSystem Does

`ProtectSystem` remounts parts of the filesystem as read-only for the service's mount namespace. This does not affect other processes - only the service sees the restricted view.

### ProtectSystem=true

Mounts `/usr` and `/boot` as read-only:

```ini
[Service]
ProtectSystem=true
```

This prevents the service from:
- Modifying system binaries in `/usr/bin`, `/usr/lib`, etc.
- Altering kernel images or boot files in `/boot`

`/etc`, `/var`, and home directories remain writable.

### ProtectSystem=full

Mounts `/usr`, `/boot`, and `/etc` as read-only:

```ini
[Service]
ProtectSystem=full
```

This is a significant upgrade over `true`. With `/etc` read-only:
- The service cannot modify configuration files
- It cannot alter PAM settings, sudo rules, SSH authorized keys
- It cannot create new users by modifying `/etc/passwd`

Use `full` when the service does not need to write to `/etc`. This covers the majority of application services.

### ProtectSystem=strict

Mounts the entire filesystem as read-only with the exception of explicitly listed paths:

```ini
[Service]
ProtectSystem=strict
```

Under `strict`, the service cannot write anywhere unless you explicitly permit it with `ReadWritePaths`. This is the most restrictive and recommended setting for well-designed services.

The only writable locations by default are:
- `/proc/self/` - the service's own process information
- `/tmp` and `/var/tmp` (when `PrivateTmp=true`)
- Paths listed in `ReadWritePaths`
- Runtime directory at `/run/<service>` (when `RuntimeDirectory` is set)

## What ProtectHome Does

`ProtectHome` controls service access to home directories and user-specific paths.

### ProtectHome=true

Makes `/home`, `/root`, and `/run/user` inaccessible:

```ini
[Service]
ProtectHome=true
```

With this setting, the service cannot:
- Read files in any user's home directory
- Access root's home directory
- Read user runtime directories (which may contain credentials and sockets)

This is appropriate for virtually all system services. A web server, database, or monitoring agent has no legitimate reason to read home directories.

### ProtectHome=read-only

Mounts `/home`, `/root`, and `/run/user` as read-only:

```ini
[Service]
ProtectHome=read-only
```

This allows reading but not writing to home directories. Use this only when the service genuinely needs to read user data (e.g., a backup service that reads home directories) but should not modify it.

### ProtectHome=tmpfs

Replaces `/home`, `/root`, and `/run/user` with empty, writable tmpfs mounts:

```ini
[Service]
ProtectHome=tmpfs
```

This is an unusual setting. The service sees an empty `/home` and can write to it, but changes are lost when the service restarts. It is useful for services that might try to create files in home directories and you want to prevent that while still allowing the attempts to succeed.

## Combining ProtectSystem=strict with ReadWritePaths

When using `ProtectSystem=strict`, explicitly list every directory the service needs to write to:

```bash
sudo nano /etc/systemd/system/myapp.service
```

```ini
[Unit]
Description=My Application Service
After=network.target

[Service]
Type=simple
User=myapp
Group=myapp

# Lock down the filesystem
ProtectSystem=strict
ProtectHome=true

# Grant write access to specific paths only
# Data directory
ReadWritePaths=/var/lib/myapp

# Log directory
ReadWritePaths=/var/log/myapp

# PID file location
ReadWritePaths=/run/myapp

# Configuration that changes at runtime (if needed)
# ReadWritePaths=/etc/myapp/runtime.conf

ExecStart=/usr/local/bin/myapp
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

### Using RuntimeDirectory

The `RuntimeDirectory` directive creates a directory under `/run` automatically and grants write access:

```ini
[Service]
ProtectSystem=strict
ProtectHome=true

# Creates /run/myapp and grants write access
RuntimeDirectory=myapp
RuntimeDirectoryMode=0750
```

The directory is created when the service starts and removed when it stops (unless `RuntimeDirectoryPreserve=yes` is set).

Similarly, `StateDirectory`, `CacheDirectory`, and `LogsDirectory` create and manage directories under `/var/lib`, `/var/cache`, and `/var/log` respectively:

```ini
[Service]
ProtectSystem=strict
ProtectHome=true

# Creates /var/lib/myapp (persists across restarts)
StateDirectory=myapp

# Creates /var/cache/myapp (may be cleared)
CacheDirectory=myapp

# Creates /var/log/myapp
LogsDirectory=myapp

# Creates /run/myapp (cleared on restart)
RuntimeDirectory=myapp
```

These directives work together with `ProtectSystem=strict` - the directories they create are automatically made writable.

## ReadOnlyPaths and InaccessiblePaths

For additional restrictions, explicitly make specific paths read-only or inaccessible even when they might otherwise be accessible:

```ini
[Service]
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/lib/myapp

# Make specific sensitive files inaccessible even if they would otherwise be readable
InaccessiblePaths=/etc/shadow
InaccessiblePaths=/etc/gshadow
InaccessiblePaths=/etc/sudoers
InaccessiblePaths=/proc/kcore

# Make a directory readable but not writable
# (useful within read-write paths to protect subdirectories)
ReadOnlyPaths=/var/lib/myapp/readonly-config
```

## Practical Example: Hardening Nginx

Nginx is a web server that typically runs as `www-data` and serves static files or proxies to application backends. Here is a realistic hardening configuration:

```bash
sudo mkdir -p /etc/systemd/system/nginx.service.d/
sudo nano /etc/systemd/system/nginx.service.d/hardening.conf
```

```ini
[Service]
# Filesystem protection
ProtectSystem=strict
ProtectHome=true

# Nginx needs to write to:
# - /var/log/nginx (access and error logs)
# - /var/lib/nginx (temporary files)
# - /run/nginx.pid (PID file)
ReadWritePaths=/var/log/nginx
ReadWritePaths=/var/lib/nginx
ReadWritePaths=/run

# Read-only access to web content (already the default with strict, but explicit is clear)
ReadOnlyPaths=/var/www
ReadOnlyPaths=/etc/nginx

# Private temp for upload processing
PrivateTmp=true

# No device access needed
PrivateDevices=true

# No privilege escalation
NoNewPrivileges=true
```

Apply and test:

```bash
sudo systemctl daemon-reload
sudo systemctl restart nginx

# Verify nginx serves content correctly
curl -I http://localhost/

# Check security score
systemd-analyze security nginx.service
```

## Practical Example: Hardening a Node.js Application

```ini
[Unit]
Description=Node.js API Server
After=network.target

[Service]
Type=simple
User=nodejs
Group=nodejs

ProtectSystem=strict
ProtectHome=true
PrivateTmp=true
PrivateDevices=true
NoNewPrivileges=true

# Use systemd-managed directories
StateDirectory=nodeapp
LogsDirectory=nodeapp
RuntimeDirectory=nodeapp

# Application needs to connect to postgres locally
RestrictAddressFamilies=AF_INET AF_INET6 AF_UNIX

Environment=NODE_ENV=production
Environment=DATABASE_URL=postgresql://localhost/mydb
Environment=PORT=3000

ExecStart=/usr/bin/node /opt/nodeapp/server.js
Restart=always
RestartSec=5s

[Install]
WantedBy=multi-user.target
```

## Diagnosing Permission Errors After Hardening

When a service breaks after applying these directives, the service attempts to write to a path that is now read-only or inaccessible:

```bash
# Check service logs for permission errors
sudo journalctl -u myapp.service -n 50

# Look for specific paths in error messages
sudo journalctl -u myapp.service | grep -E "Permission denied|Read-only|No such file"

# Use strace to see which paths the service tries to access
sudo strace -e openat,open,write -p $(systemctl show -p MainPID myapp.service | cut -d= -f2) 2>&1 | head -50
```

Add the problematic path to `ReadWritePaths` and restart:

```ini
ReadWritePaths=/the/path/that/was/missing
```

## Summary

`ProtectSystem=strict` combined with `ProtectHome=true` provides the strongest filesystem sandboxing available in systemd. The `strict` option makes everything read-only by default, and `ReadWritePaths` creates an explicit allowlist of writable locations. The `StateDirectory`, `LogsDirectory`, `CacheDirectory`, and `RuntimeDirectory` directives simplify this by automatically creating and managing the standard directories a service needs while keeping the rest of the filesystem protected. Start with `ProtectSystem=full` if `strict` is too disruptive, then tighten to `strict` once you have identified all the paths the service writes to.
