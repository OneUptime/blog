# How to Understand /etc/sysctl.conf on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Sysctl, Kernel, System Tuning, Linux

Description: A thorough guide to /etc/sysctl.conf on Ubuntu - what it controls, how to use it safely, and practical tuning parameters for networking, memory, and security.

---

`/etc/sysctl.conf` is the configuration file for kernel parameters on Linux. The kernel exposes hundreds of tunable settings through the `/proc/sys/` virtual filesystem, and sysctl provides a structured way to read and write them. Parameters configured in `/etc/sysctl.conf` are applied at boot time, ensuring your custom settings persist across reboots.

Understanding how to read, modify, and apply these settings is a core skill for Linux system administration on Ubuntu.

## How sysctl Works

The `/proc/sys/` filesystem is a virtual filesystem maintained by the running kernel. Each file under it corresponds to a kernel parameter:

```
/proc/sys/net/core/rmem_max  ->  net.core.rmem_max (in sysctl notation)
/proc/sys/kernel/hostname    ->  kernel.hostname
/proc/sys/vm/swappiness      ->  vm.swappiness
```

The dot-separated sysctl name maps directly to the `/proc/sys/` path by replacing dots with slashes.

You can read any parameter:

```bash
cat /proc/sys/net/core/rmem_max
sysctl net.core.rmem_max  # Same thing
```

And write any parameter (as root):

```bash
echo 26214400 > /proc/sys/net/core/rmem_max
sysctl -w net.core.rmem_max=26214400  # Equivalent
```

Changes via `sysctl -w` or direct `/proc/sys/` writes are **temporary** - they reset at reboot. `/etc/sysctl.conf` makes them permanent.

## File Structure and Location

```bash
# View the default sysctl.conf
cat /etc/sysctl.conf
```

The default Ubuntu `/etc/sysctl.conf` is mostly commented out. Actual settings go here or in the drop-in directory:

```bash
# Drop-in directory (preferred on modern Ubuntu)
ls /etc/sysctl.d/

# Ubuntu-provided settings
cat /etc/sysctl.d/10-magic-sysrq.conf
cat /etc/sysctl.d/10-network-security.conf
```

The drop-in directory (`/etc/sysctl.d/`) is processed alphabetically, then `/etc/sysctl.conf` last. Using numbered drop-in files (e.g., `10-network.conf`, `90-custom.conf`) is the clean way to organize settings.

## Applying Changes

```bash
# Apply all settings from /etc/sysctl.conf and /etc/sysctl.d/
sudo sysctl -p

# Apply a specific file
sudo sysctl -p /etc/sysctl.d/99-custom.conf

# Apply all drop-in files (systemd path)
sudo sysctl --system
```

## Useful sysctl Parameters by Category

### Memory Management

```ini
# /etc/sysctl.d/10-memory.conf

# Reduce swappiness (0-100, lower = use swap less)
# Default 60, use 10 for servers with plenty of RAM
vm.swappiness = 10

# Percentage of memory that can be dirty before writeback starts
vm.dirty_ratio = 15

# Background writeback threshold
vm.dirty_background_ratio = 5

# Virtual memory overcommit
# 0 = heuristic (default), 1 = always allow, 2 = never overcommit
vm.overcommit_memory = 0

# Minimum free memory the kernel tries to maintain
# Increase if you see OOM kills under high memory pressure
vm.min_free_kbytes = 65536

# Transparent Huge Pages hint (0=never, 1=madvise, 2=always)
# Set to 1 for databases (they manage their own memory)
vm.nr_hugepages = 0
```

### Network Performance

```ini
# /etc/sysctl.d/10-network.conf

# Maximum socket receive buffer (bytes)
# Increase for high-throughput servers
net.core.rmem_max = 134217728

# Maximum socket send buffer
net.core.wmem_max = 134217728

# Default socket receive buffer
net.core.rmem_default = 65536

# Default socket send buffer
net.core.wmem_default = 65536

# TCP receive buffer: min, default, max
net.ipv4.tcp_rmem = 4096 87380 134217728

# TCP send buffer: min, default, max
net.ipv4.tcp_wmem = 4096 65536 134217728

# Number of outstanding SYN requests the server will allow
net.ipv4.tcp_max_syn_backlog = 4096

# Maximum number of connections in TIME_WAIT state
net.ipv4.tcp_max_tw_buckets = 262144

# Queue length for connections to apps (listen backlog)
net.core.somaxconn = 65535

# Maximum receive queue size before dropping packets
net.core.netdev_max_backlog = 5000

# Enable TCP window scaling
net.ipv4.tcp_window_scaling = 1

# Enable TCP selective acknowledgments
net.ipv4.tcp_sack = 1

# Reuse TIME_WAIT sockets (safe for client-side connections)
net.ipv4.tcp_tw_reuse = 1

# TCP keepalive settings
net.ipv4.tcp_keepalive_time = 60     # Start keepalives after 60s idle
net.ipv4.tcp_keepalive_intvl = 10    # Retry every 10s
net.ipv4.tcp_keepalive_probes = 6    # Close after 6 failed probes

# Local port range for outbound connections
net.ipv4.ip_local_port_range = 1024 65535
```

### Security Parameters

```ini
# /etc/sysctl.d/10-security.conf

# Prevent IP spoofing
net.ipv4.conf.all.rp_filter = 1
net.ipv4.conf.default.rp_filter = 1

# Disable IP source routing
net.ipv4.conf.all.accept_source_route = 0
net.ipv4.conf.default.accept_source_route = 0

# Do not accept ICMP redirects (prevents routing attacks)
net.ipv4.conf.all.accept_redirects = 0
net.ipv4.conf.default.accept_redirects = 0
net.ipv6.conf.all.accept_redirects = 0

# Ignore ICMP broadcasts
net.ipv4.icmp_echo_ignore_broadcasts = 1

# Ignore bad ICMP error responses
net.ipv4.icmp_ignore_bogus_error_responses = 1

# Log suspicious packets
net.ipv4.conf.all.log_martians = 1

# Disable IPv6 if not used
# net.ipv6.conf.all.disable_ipv6 = 1

# Protect against SYN flood attacks
net.ipv4.tcp_syncookies = 1

# Restrict kernel pointer leaks in /proc
kernel.kptr_restrict = 1

# Restrict dmesg access to root
kernel.dmesg_restrict = 1

# Disable core dumps for SUID programs
fs.suid_dumpable = 0

# Enable ASLR (Address Space Layout Randomization)
kernel.randomize_va_space = 2

# Restrict ptrace (prevents some privilege escalation attacks)
kernel.yama.ptrace_scope = 1
```

### File System Parameters

```ini
# /etc/sysctl.d/10-filesystem.conf

# Maximum number of file handles
fs.file-max = 2097152

# inotify limits for large directory trees
fs.inotify.max_user_watches = 524288
fs.inotify.max_user_instances = 512
fs.inotify.max_queued_events = 32768

# Maximum bytes in a pipe
fs.pipe-max-size = 4194304
```

### Kernel Parameters

```ini
# /etc/sysctl.d/10-kernel.conf

# Set kernel panic behavior (0=hang, positive=reboot after N seconds)
kernel.panic = 10

# Panic on oops (kernel bug)
kernel.panic_on_oops = 1

# SysRq key behavior (for rescue operations)
# 1 = enable all, 0 = disable, 176 = enable sync, remount, reboot only
kernel.sysrq = 176

# Maximum number of PIDs
kernel.pid_max = 4194304
```

## Reading All Current Values

```bash
# Print all kernel parameters and their current values
sudo sysctl -a

# Search for specific parameters
sudo sysctl -a | grep tcp

# Read a specific parameter
sysctl vm.swappiness
sysctl net.ipv4.tcp_syncookies
```

## Safely Testing Changes

Before making permanent changes, test them with `sysctl -w`:

```bash
# Test a change live
sudo sysctl -w vm.swappiness=10

# Verify the change took effect
sysctl vm.swappiness

# If it causes issues, revert without rebooting
sudo sysctl -w vm.swappiness=60
```

Once you've verified the setting works correctly, add it to a file in `/etc/sysctl.d/`:

```bash
sudo nano /etc/sysctl.d/99-custom.conf
```

```ini
vm.swappiness = 10
```

```bash
sudo sysctl -p /etc/sysctl.d/99-custom.conf
```

## Finding What a Parameter Does

```bash
# Check the kernel documentation
man 5 sysctl.conf

# For proc parameters, the kernel docs are authoritative
# https://www.kernel.org/doc/html/latest/admin-guide/sysctl/

# Many parameters are documented in:
ls /usr/share/doc/linux-doc*/
```

## Checking Which Values Are Set

```bash
# See what's currently configured (from all sysctl files)
sudo sysctl --system --dry-run

# Compare running values to configured values
sudo sysctl -a > /tmp/current-values.txt
sudo sysctl --system --dry-run > /tmp/configured-values.txt
diff /tmp/current-values.txt /tmp/configured-values.txt
```

## Common Configurations for Different Server Types

### High-Traffic Web Server

```bash
sudo nano /etc/sysctl.d/20-web-server.conf
```

```ini
# High connection handling
net.core.somaxconn = 65535
net.ipv4.tcp_max_syn_backlog = 8192
net.ipv4.tcp_tw_reuse = 1
net.core.netdev_max_backlog = 5000

# Large buffer for high throughput
net.core.rmem_max = 134217728
net.core.wmem_max = 134217728
net.ipv4.tcp_rmem = 4096 87380 134217728
net.ipv4.tcp_wmem = 4096 65536 134217728
```

### Database Server

```bash
sudo nano /etc/sysctl.d/20-database.conf
```

```ini
# Reduce swappiness - keep DB data in RAM
vm.swappiness = 5

# Large dirty memory allowance for write-heavy workloads
vm.dirty_ratio = 80
vm.dirty_background_ratio = 5

# Increase file handles for many connections
fs.file-max = 2097152

# Higher local port range for many outbound connections
net.ipv4.ip_local_port_range = 1024 65535
```

## Troubleshooting sysctl Issues

**Parameter not applied after reboot:**

```bash
# Verify the file has correct syntax
sudo sysctl -p /etc/sysctl.d/99-custom.conf
# Any errors will be printed

# Check for duplicate settings in other files
grep -r "vm.swappiness" /etc/sysctl.d/ /etc/sysctl.conf
```

**"No such file or directory" error:**

The kernel parameter doesn't exist on your kernel version. Check with:

```bash
sysctl -a 2>/dev/null | grep partial-name
```

**Permission denied:**

Writing sysctl parameters requires root. Some parameters (like `kernel.kexec_load_disabled`) can only be written if certain security features aren't active.

## Summary

`/etc/sysctl.conf` and `/etc/sysctl.d/` provide the mechanism for tuning hundreds of Linux kernel behaviors - from network buffer sizes to security policies to virtual memory management. The key practices are: test changes live with `sysctl -w` before making them permanent, organize settings in named drop-in files under `/etc/sysctl.d/`, and apply changes with `sysctl -p` without rebooting. Understanding which parameters matter for your workload - high-traffic web server, database, security-focused server - is the difference between default performance and a well-tuned system.
