# How to Fix 'Too Many Open Files' Ulimit Error on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, ulimit, File Descriptors, Troubleshooting, Performance

Description: Fix 'Too many open files' errors on RHEL by increasing file descriptor limits for users, services, and the system.

---

The "Too many open files" error occurs when a process reaches its file descriptor limit. This is common with databases, web servers, and applications that handle many concurrent connections.

## Checking Current Limits

```bash
# Check the current soft and hard limits for your user
ulimit -Sn   # soft limit (current effective limit)
ulimit -Hn   # hard limit (maximum the soft limit can be raised to)

# Check limits for a running process
cat /proc/$(pgrep -f httpd | head -1)/limits | grep "open files"

# Count how many file descriptors a process has open
ls /proc/$(pgrep -f httpd | head -1)/fd | wc -l
```

## Fix 1: Increase Limits for User Sessions

```bash
# Edit the PAM limits configuration
sudo vi /etc/security/limits.conf
```

Add these lines:

```bash
# Increase file descriptor limits
# <domain>  <type>  <item>  <value>
*           soft    nofile  65536
*           hard    nofile  131072
apache      soft    nofile  65536
apache      hard    nofile  131072
```

```bash
# Or create a separate file (recommended)
sudo tee /etc/security/limits.d/99-nofile.conf << 'LIMITS'
*    soft    nofile    65536
*    hard    nofile    131072
LIMITS
```

## Fix 2: Increase Limits for systemd Services

For services managed by systemd, PAM limits may not apply.

```bash
# Set the limit for a specific service
sudo systemctl edit httpd.service
```

```ini
[Service]
LimitNOFILE=65536
```

```bash
# Apply the change
sudo systemctl daemon-reload
sudo systemctl restart httpd

# Verify the new limit
cat /proc/$(pgrep -f httpd | head -1)/limits | grep "open files"
```

## Fix 3: Increase the System-Wide Limit

```bash
# Check the system-wide maximum
cat /proc/sys/fs/file-max

# Increase it if needed
sudo sysctl -w fs.file-max=2097152
echo "fs.file-max = 2097152" | sudo tee /etc/sysctl.d/99-file-max.conf
sudo sysctl -p /etc/sysctl.d/99-file-max.conf

# Check current system-wide file descriptor usage
cat /proc/sys/fs/file-nr
# Output: <allocated> <free> <max>
```

## Fix 4: Increase the Default systemd Limit

```bash
# Edit the systemd default configuration
sudo vi /etc/systemd/system.conf

# Set the default for all services
# DefaultLimitNOFILE=65536

# Apply
sudo systemctl daemon-reexec
```

## Verifying the Fix

```bash
# Log out and back in for user limit changes to take effect
# Then verify
ulimit -n

# For services, restart and check
sudo systemctl restart httpd
cat /proc/$(pgrep -f httpd | head -1)/limits | grep "open files"
```

Start by identifying which process is hitting the limit, then increase the limit at the appropriate level (user, service, or system-wide).
