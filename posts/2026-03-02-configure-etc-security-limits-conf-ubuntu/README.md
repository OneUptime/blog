# How to Configure /etc/security/limits.conf on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Limits.conf, PAM, Resource Limits, System Administration

Description: Configure resource limits in /etc/security/limits.conf on Ubuntu to control open file descriptors, processes, memory, and other per-user and per-process limits.

---

`/etc/security/limits.conf` controls resource limits applied to users and processes at login time. These limits determine how many open files a process can have, how many processes a user can spawn, how much memory they can lock, and more. On busy servers, hitting default limits causes cryptic errors - "too many open files", OOM kills, or application crashes that have nothing to do with code bugs.

Understanding and configuring these limits is essential for database servers, web servers, and any application that handles many concurrent connections or files.

## How Limits Are Applied

Limits are enforced by the PAM (Pluggable Authentication Modules) system. When a user logs in, PAM's `pam_limits.so` module reads `/etc/security/limits.conf` and applies the configured limits to the user's session. All processes spawned from that session inherit the limits.

Check the PAM configuration:

```bash
grep pam_limits /etc/pam.d/common-session
grep pam_limits /etc/pam.d/sshd
```

You should see a line like:

```text
session required pam_limits.so
```

If this line is missing, limits won't be applied for that login method.

## File Format

Each line in `limits.conf` follows this format:

```text
<domain>  <type>  <item>  <value>
```

- **domain**: Username, group (`@groupname`), wildcard (`*`), or process UID range
- **type**: `hard` or `soft`
  - `soft`: Current default limit (user can raise up to hard limit)
  - `hard`: Absolute maximum (root can lower, non-root can't raise above it)
  - `-`: Sets both hard and soft to the same value
- **item**: The resource being limited (see list below)
- **value**: Numeric value or `unlimited`

## Limit Types (Items)

| Item | Description | Default |
|------|-------------|---------|
| `nofile` | Maximum open file descriptors | 1024 |
| `nproc` | Maximum number of processes | OS-dependent |
| `memlock` | Maximum locked memory (KB) | 64 |
| `stack` | Maximum stack size (KB) | 8192 |
| `fsize` | Maximum file size (KB) | unlimited |
| `core` | Maximum core dump size (KB) | 0 |
| `rss` | Maximum resident set size (KB) | unlimited |
| `cpu` | CPU time limit (minutes) | unlimited |
| `as` | Address space (virtual memory) limit (KB) | unlimited |
| `maxlogins` | Maximum concurrent logins | unlimited |
| `priority` | Process scheduling priority (nice value) | 0 |
| `rtprio` | Maximum real-time scheduling priority | 0 |
| `sigpending` | Maximum pending signals | OS-dependent |
| `msgqueue` | Maximum bytes in POSIX message queues | OS-dependent |

## Checking Current Limits

```bash
# Check limits for current session
ulimit -a

# Check specific limits
ulimit -n  # Open files (nofile)
ulimit -u  # Max processes (nproc)
ulimit -l  # Locked memory (memlock)
ulimit -s  # Stack size

# Check limits for a running process
cat /proc/$(pgrep nginx | head -1)/limits
```

## Common Configurations

### Increasing Open File Descriptors

The most common limit issue on servers. The default of 1024 is far too low for nginx, MySQL, or any application handling many connections:

```bash
sudo nano /etc/security/limits.conf
```

```text
# Increase file descriptor limit for web servers
www-data        soft    nofile    65536
www-data        hard    nofile    65536

# Increase for MySQL
mysql           soft    nofile    65536
mysql           hard    nofile    65536

# Global settings for all users
*               soft    nofile    65536
*               hard    nofile    131072

# Root typically needs higher limits
root            soft    nofile    65536
root            hard    nofile    131072
```

After editing, the new limits apply on next login. For running services managed by systemd, see the systemd section below.

### Process Limits for Build Systems

```text
# Allow build users to spawn many processes
*               soft    nproc     65536
*               hard    nproc     65536
```

### Memory Lock for Databases

Databases like Elasticsearch and Redis need to lock memory to prevent swapping:

```text
# Allow elasticsearch to lock all its memory
elasticsearch   soft    memlock   unlimited
elasticsearch   hard    memlock   unlimited

# Allow redis to lock memory
redis           soft    memlock   unlimited
redis           hard    memlock   unlimited
```

### Core Dumps for Debugging

```text
# Allow all users to create unlimited core dumps
*               soft    core      unlimited
*               hard    core      unlimited

# Or restrict core dumps to a specific user
developer       soft    core      unlimited
developer       hard    core      unlimited
```

## Drop-In Directory

Modern Ubuntu uses `/etc/security/limits.d/` for additional limit files, processed before `limits.conf`:

```bash
# Create a service-specific limits file
sudo nano /etc/security/limits.d/nginx.conf
```

```text
www-data        soft    nofile    65536
www-data        hard    nofile    131072
```

This is cleaner than editing the main file directly - your customizations are separate from the system defaults.

```bash
# View all limit files
ls /etc/security/limits.d/
```

## systemd Services and Limits

PAM limits apply to interactive sessions. Services managed by systemd use a different mechanism - the `LimitNOFILE` and related directives in service unit files.

### Setting Limits in a Service Unit

```bash
sudo systemctl edit nginx
```

This opens an override file. Add:

```ini
[Service]
LimitNOFILE=65536
LimitNPROC=65536
# For database memory locking:
LimitMEMLOCK=infinity
```

Save and reload:

```bash
sudo systemctl daemon-reload
sudo systemctl restart nginx

# Verify the limits applied
cat /proc/$(pgrep nginx | head -1)/limits
```

### Systemd Default Limits

Set default limits for all systemd services in `/etc/systemd/system.conf`:

```bash
sudo nano /etc/systemd/system.conf
```

```ini
[Manager]
DefaultLimitNOFILE=65536
DefaultLimitNPROC=65536
```

```bash
sudo systemctl daemon-reload
```

This affects services started after the change.

## Verifying Limits Are Applied

### For Interactive Sessions

```bash
# Login as the affected user (or su -l)
su -l www-data -s /bin/bash
ulimit -n
```

### For System Services

```bash
# Check limits of a running process
sudo cat /proc/$(pgrep -o nginx)/limits

# Or use prlimit
sudo prlimit --pid $(pgrep -o nginx)
```

Expected output for nofile:

```text
RESOURCE   DESCRIPTION              SOFT      HARD UNITS
NOFILE     max number of open files 65536    65536 files
```

## Practical Example: Configuring MySQL Limits

MySQL on a busy server needs increased file descriptors, process limits, and memory lock:

```bash
sudo nano /etc/security/limits.d/mysql.conf
```

```text
# MySQL resource limits
mysql           soft    nofile    65536
mysql           hard    nofile    65536
mysql           soft    nproc     65536
mysql           hard    nproc     65536
mysql           soft    memlock   unlimited
mysql           hard    memlock   unlimited
```

And for systemd (MySQL is typically started by systemd, not PAM):

```bash
sudo systemctl edit mysql
```

```ini
[Service]
LimitNOFILE=65536
LimitNPROC=65536
LimitMEMLOCK=infinity
```

```bash
sudo systemctl daemon-reload
sudo systemctl restart mysql

# Verify
mysql -e "SHOW VARIABLES LIKE 'open_files_limit';"
```

## System-Wide File Descriptor Limit

Even with per-process limits increased, the system-wide maximum must be higher:

```bash
# Check current system-wide max
cat /proc/sys/fs/file-max

# Increase it if needed
sudo sysctl -w fs.file-max=2097152

# Make permanent
echo "fs.file-max = 2097152" | sudo tee /etc/sysctl.d/10-file-max.conf
sudo sysctl -p /etc/sysctl.d/10-file-max.conf
```

Per-user `nofile` limits can't exceed the system-wide `fs.file-max`.

## Common Errors and Solutions

**"Too many open files":**

```bash
# Check current usage vs limit
lsof -p $(pgrep nginx) | wc -l
cat /proc/$(pgrep -o nginx)/limits | grep "Max open files"

# If usage is near the limit, increase nofile in limits.conf
# and the service's systemd unit
```

**Limits not applying after editing limits.conf:**

Remember that PAM limits apply at login time. For already-running services, you need systemd unit overrides AND a service restart.

```bash
# Confirm PAM loads limits module
grep pam_limits /etc/pam.d/common-session
```

**"Operation not permitted" when trying to increase a limit:**

You're trying to raise above the hard limit. Either increase the hard limit in limits.conf (as root) first, or use systemd's `LimitNOFILE` for services.

## Finding Applications Hitting Limits

```bash
# Check system-wide open file count
cat /proc/sys/fs/file-nr
# Output: current_open  0  max_possible

# Find processes with most open files
sudo lsof | awk '{print $2}' | sort | uniq -c | sort -rn | head -20

# Check if a process is near its limit
PID=$(pgrep mysql)
CURRENT=$(ls /proc/$PID/fd | wc -l)
MAX=$(cat /proc/$PID/limits | grep "Max open files" | awk '{print $4}')
echo "MySQL: $CURRENT/$MAX file descriptors used"
```

## Summary

`/etc/security/limits.conf` is the configuration point for per-user resource limits applied through PAM at login time. For servers running databases, web servers, or any high-concurrency application, the default limits - especially `nofile` at 1024 - are almost always too low. Raising them requires updates to both `limits.conf` (for PAM-based sessions) and systemd unit files (for services managed by systemd). The combination covers all the ways a service might start, ensuring the limits actually take effect.
