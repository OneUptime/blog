# How to Fix 'Too Many Open Files' (ulimit) Errors on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Ulimit, File Descriptors, Troubleshooting, Performance

Description: Fix 'too many open files' errors on RHEL by increasing file descriptor limits for specific users, services, or system-wide.

---

The "Too many open files" error occurs when a process reaches its file descriptor limit. Each open file, socket, and pipe counts as a file descriptor. Busy applications like databases and web servers often need higher limits.

## Check Current Limits

```bash
# Check limits for your current session
ulimit -n
# Default is usually 1024

# Check limits for a running process
cat /proc/$(pgrep nginx | head -1)/limits | grep "open files"

# Check the system-wide limit
cat /proc/sys/fs/file-nr
# Shows: allocated  free  maximum
# Example: 5120  0  1048576

# Check the system-wide maximum
cat /proc/sys/fs/file-max
```

## Increase Limits for a Specific User

Edit `/etc/security/limits.conf`:

```bash
sudo vi /etc/security/limits.conf

# Add lines for the user or group
# <user>  <type>  <item>  <value>
nginx    soft    nofile  65536
nginx    hard    nofile  65536

# For all users
*        soft    nofile  65536
*        hard    nofile  65536
```

Or create a file in `/etc/security/limits.d/`:

```bash
sudo tee /etc/security/limits.d/99-nofile.conf << 'CONF'
# Increase open file limits
*    soft    nofile    65536
*    hard    nofile    65536
root soft    nofile    65536
root hard    nofile    65536
CONF
```

## Increase Limits for a systemd Service

For services managed by systemd, edit the unit file:

```bash
# Create an override for the service
sudo systemctl edit nginx.service

# Add the following:
[Service]
LimitNOFILE=65536
```

```bash
# Reload and restart
sudo systemctl daemon-reload
sudo systemctl restart nginx.service

# Verify the new limit
cat /proc/$(pgrep nginx | head -1)/limits | grep "open files"
```

## Increase the System-Wide Limit

```bash
# Increase the kernel maximum for all processes
sudo sysctl -w fs.file-max=2097152

# Make it persistent
echo "fs.file-max = 2097152" | sudo tee /etc/sysctl.d/99-file-max.conf
sudo sysctl -p /etc/sysctl.d/99-file-max.conf
```

## Verify the Changes

```bash
# Log out and log back in (for user limits)
# Then check
ulimit -n

# For systemd services, restart the service and check
sudo systemctl restart nginx
cat /proc/$(pgrep nginx | head -1)/limits | grep "open files"
```

## Monitor File Descriptor Usage

```bash
# Check how many file descriptors a process is using
ls -la /proc/$(pgrep nginx | head -1)/fd | wc -l

# Find processes using the most file descriptors
for pid in /proc/[0-9]*; do
  echo "$(ls $pid/fd 2>/dev/null | wc -l) $pid $(cat $pid/comm 2>/dev/null)"
done | sort -rn | head -10
```

## Quick Reference

| Scope | Configuration File | Restart Required |
|-------|-------------------|-----------------|
| User login sessions | /etc/security/limits.conf | Logout/login |
| systemd services | Unit file override (LimitNOFILE) | Service restart |
| System-wide kernel max | /etc/sysctl.d/*.conf | sysctl -p |

Set limits based on your application's actual needs. For databases and web servers, 65536 is a common starting point.
