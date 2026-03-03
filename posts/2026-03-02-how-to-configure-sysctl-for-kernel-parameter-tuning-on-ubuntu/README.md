# How to Configure sysctl for Kernel Parameter Tuning on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Kernel, Performance Tuning, Linux, System Administration

Description: Learn how to use sysctl on Ubuntu to view and modify kernel parameters, optimize system performance for different workloads, and make settings persistent across reboots.

---

Linux exposes hundreds of kernel parameters through the `/proc/sys` virtual filesystem. `sysctl` is the tool for reading and modifying these parameters at runtime. The right sysctl settings can dramatically affect network throughput, memory behavior, file system limits, and system stability. The wrong ones can cause crashes or security issues.

## Viewing Current Parameters

```bash
# Show all current kernel parameters
sysctl -a

# Show a specific parameter
sysctl net.core.somaxconn
sysctl vm.swappiness

# Show all parameters in a namespace
sysctl net.ipv4

# Show with descriptions (on newer kernels)
sysctl -a --pattern "net.ipv4.tcp"
```

You can also read parameters directly from the filesystem:

```bash
# Equivalent to sysctl vm.swappiness
cat /proc/sys/vm/swappiness

# The dot notation maps to directory structure
# vm.swappiness = /proc/sys/vm/swappiness
# net.ipv4.tcp_rmem = /proc/sys/net/ipv4/tcp_rmem
```

## Making Temporary Changes

Changes with `sysctl -w` take effect immediately but are lost on reboot:

```bash
# Set swappiness to 10
sudo sysctl -w vm.swappiness=10

# Enable IP forwarding (needed for routing/NAT)
sudo sysctl -w net.ipv4.ip_forward=1

# Increase maximum socket backlog
sudo sysctl -w net.core.somaxconn=65535
```

Useful for testing before committing settings permanently.

## Making Persistent Changes

Persist settings in `/etc/sysctl.conf` or preferably in `/etc/sysctl.d/`:

```bash
# Create a new configuration file
sudo nano /etc/sysctl.d/99-custom.conf
```

Add settings:

```ini
# Swappiness - prefer RAM over swap (lower = less swapping)
vm.swappiness = 10

# Network socket queue depth
net.core.somaxconn = 65535

# IP forwarding (set to 0 if this is not a router)
net.ipv4.ip_forward = 0
```

Apply without rebooting:

```bash
sudo sysctl --system

# Or apply a specific file
sudo sysctl -p /etc/sysctl.d/99-custom.conf
```

## Memory Management Parameters

### Swappiness

Controls how aggressively the kernel uses swap:

```bash
# Range: 0-100 (default: 60)
# 0 = avoid swap, only use when absolutely necessary
# 100 = swap aggressively
sudo sysctl -w vm.swappiness=10
```

For servers with plenty of RAM: 10. For database servers: 1-5. For general purpose: 30-40.

### Dirty Page Writeback

Controls when modified pages are flushed to disk:

```bash
# Percentage of RAM that can be "dirty" (awaiting writeback) before sync
# Default: 20 (20% of RAM)
sudo sysctl -w vm.dirty_ratio=15

# Percentage at which background writeback starts
# Default: 10
sudo sysctl -w vm.dirty_background_ratio=5

# Maximum time a dirty page can remain unflushed (hundredths of a second)
# Default: 3000 (30 seconds)
sudo sysctl -w vm.dirty_expire_centisecs=1500

# How often the writeback daemon runs
sudo sysctl -w vm.dirty_writeback_centisecs=500
```

For latency-sensitive workloads, reducing these values ensures data is flushed more frequently but at a cost of more I/O.

### Overcommit Behavior

```bash
# 0 = heuristic overcommit (default)
# 1 = always overcommit (allow any allocation)
# 2 = don't overcommit beyond limit
sudo sysctl -w vm.overcommit_memory=0

# With overcommit_memory=2, max commitment = RAM * ratio / 100 + swap
sudo sysctl -w vm.overcommit_ratio=80
```

## Network Performance Parameters

### Increasing Connection Limits

For high-traffic web servers:

```bash
# Maximum socket listen backlog
sudo sysctl -w net.core.somaxconn=65535

# TCP listen backlog
sudo sysctl -w net.ipv4.tcp_max_syn_backlog=65535

# Maximum number of connections waiting to be accepted
sudo sysctl -w net.core.netdev_max_backlog=65535
```

### TCP Buffer Sizes

```bash
# TCP read buffer (min, default, max) in bytes
sudo sysctl -w net.ipv4.tcp_rmem="4096 87380 16777216"

# TCP write buffer (min, default, max) in bytes
sudo sysctl -w net.ipv4.tcp_wmem="4096 65536 16777216"

# Core socket read buffer max
sudo sysctl -w net.core.rmem_max=16777216

# Core socket write buffer max
sudo sysctl -w net.core.wmem_max=16777216
```

### TIME_WAIT Tuning

Servers handling many short-lived connections can exhaust ports due to TIME_WAIT:

```bash
# Enable TCP socket reuse for TIME_WAIT connections
sudo sysctl -w net.ipv4.tcp_tw_reuse=1

# Reduce TIME_WAIT timeout (not recommended for most cases)
sudo sysctl -w net.ipv4.tcp_fin_timeout=30

# Maximum number of TIME_WAIT sockets
sudo sysctl -w net.ipv4.tcp_max_tw_buckets=450000
```

### Keep-Alive Settings

```bash
# How long to keep idle connections before sending keep-alive probes
sudo sysctl -w net.ipv4.tcp_keepalive_time=300

# How many keep-alive probes before declaring the connection dead
sudo sysctl -w net.ipv4.tcp_keepalive_probes=5

# Interval between keep-alive probes
sudo sysctl -w net.ipv4.tcp_keepalive_intvl=15
```

## File System and Process Limits

```bash
# Maximum number of open file descriptors system-wide
sudo sysctl -w fs.file-max=1000000

# Maximum number of inotify watchers
sudo sysctl -w fs.inotify.max_user_watches=524288

# Maximum number of memory map areas per process
# (low default causes issues with JVMs and some databases)
sudo sysctl -w vm.max_map_count=262144
```

The `vm.max_map_count` setting is commonly needed for Elasticsearch and other JVM applications that fail with "max virtual memory areas vm.max_map_count [65530] is too low."

## Security Parameters

```bash
# Prevent IP spoofing
sudo sysctl -w net.ipv4.conf.all.rp_filter=1
sudo sysctl -w net.ipv4.conf.default.rp_filter=1

# Disable ICMP redirects
sudo sysctl -w net.ipv4.conf.all.accept_redirects=0
sudo sysctl -w net.ipv6.conf.all.accept_redirects=0

# Ignore ICMP ping broadcasts
sudo sysctl -w net.ipv4.icmp_echo_ignore_broadcasts=1

# Disable source routing
sudo sysctl -w net.ipv4.conf.all.accept_source_route=0

# Log martian packets (packets with impossible source addresses)
sudo sysctl -w net.ipv4.conf.all.log_martians=1

# Protect against SYN flood attacks
sudo sysctl -w net.ipv4.tcp_syncookies=1
```

## Production Configuration Example

A complete `/etc/sysctl.d/99-performance.conf` for a web server:

```ini
# /etc/sysctl.d/99-performance.conf
# Web server performance tuning

## Memory
vm.swappiness = 10
vm.dirty_ratio = 15
vm.dirty_background_ratio = 5
vm.max_map_count = 262144

## Network
net.core.somaxconn = 65535
net.core.netdev_max_backlog = 65535
net.ipv4.tcp_max_syn_backlog = 65535
net.ipv4.tcp_rmem = 4096 87380 16777216
net.ipv4.tcp_wmem = 4096 65536 16777216
net.core.rmem_max = 16777216
net.core.wmem_max = 16777216
net.ipv4.tcp_tw_reuse = 1
net.ipv4.tcp_fin_timeout = 30
net.ipv4.tcp_keepalive_time = 300
net.ipv4.tcp_keepalive_probes = 5
net.ipv4.tcp_keepalive_intvl = 15

## File Limits
fs.file-max = 1000000
fs.inotify.max_user_watches = 524288

## Security
net.ipv4.conf.all.rp_filter = 1
net.ipv4.tcp_syncookies = 1
net.ipv4.conf.all.accept_redirects = 0
net.ipv4.conf.all.accept_source_route = 0
```

Apply:

```bash
sudo sysctl -p /etc/sysctl.d/99-performance.conf
```

## Verifying Changes

After applying settings, confirm they took effect:

```bash
# Check specific values
sysctl vm.swappiness net.core.somaxconn fs.file-max

# Compare with expected values
sysctl -a | grep -E "swappiness|somaxconn|file-max"
```

## Checking Applied Order

The `/etc/sysctl.d/` files are applied in alphabetical order. Files in `/etc/sysctl.d/` override `/etc/sysctl.conf`. Use numbered prefixes to control order:

```text
/etc/sysctl.d/10-network.conf      # applied first
/etc/sysctl.d/50-security.conf     # applied second
/etc/sysctl.d/99-custom.conf       # applied last (wins if duplicated)
```

Documenting why each setting exists in comments is important - sysctl tuning creates institutional knowledge that's easy to lose when people leave:

```ini
# Reduce swappiness to keep application data in RAM
# Rationale: This is a PostgreSQL server with 64GB RAM - swapping harms query latency
vm.swappiness = 5
```

Sysctl tuning is cumulative - each setting you add should be based on an actual measured need or a well-understood workload characteristic, not cargo-culted from a blog post. Start with a baseline, measure, change one thing, measure again.
