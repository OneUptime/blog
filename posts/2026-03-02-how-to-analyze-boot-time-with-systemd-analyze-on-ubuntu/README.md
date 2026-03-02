# How to Analyze Boot Time with systemd-analyze on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, systemd, Boot Time, Performance, Linux

Description: Use systemd-analyze to measure and optimize Ubuntu boot times, identify slow services, generate SVG boot charts, and diagnose startup issues.

---

Ubuntu's boot time is composed of firmware initialization, the bootloader, the kernel, and systemd's service startup phase. `systemd-analyze` gives you precise timing data for each of these phases and for individual services, making it possible to identify and fix slow boot sequences.

## Basic Boot Time Summary

```bash
# Show overall boot time
systemd-analyze time
```

Example output:

```
Startup finished in 3.156s (firmware) + 1.532s (loader) + 2.456s (kernel) + 8.234s (userspace) = 15.378s
graphical.target reached after 8.193s in userspace.
```

This breaks down as:
- **firmware**: UEFI/BIOS initialization time (nothing you can do about this)
- **loader**: GRUB/systemd-boot time
- **kernel**: Kernel decompression and device initialization
- **userspace**: systemd service startup (this is where you can optimize)

On cloud instances and VMs, the firmware phase is often absent or minimal:

```
Startup finished in 1.234s (kernel) + 4.567s (userspace) = 5.801s
```

## Identifying Slow Services

```bash
# List services sorted by startup time (slowest first)
systemd-analyze blame
```

Example output:

```
          5.231s mysql.service
          3.456s snapd.service
          2.890s apt-daily-upgrade.service
          1.234s NetworkManager-wait-online.service
          1.100s plymouth-quit-wait.service
          0.890s docker.service
          0.456s ssh.service
          0.234s systemd-journal-flush.service
```

The services at the top are the ones consuming the most boot time. Some are expected to be slow (databases initializing), while others are candidates for optimization.

## Detailed Critical Path Analysis

The critical path is the chain of service dependencies that determines the minimum possible boot time:

```bash
# Show the critical path chain
systemd-analyze critical-chain

# For a specific target
systemd-analyze critical-chain graphical.target
systemd-analyze critical-chain multi-user.target
```

Example output:

```
The time when unit became active or started is printed after the "@" character.
The time the unit took to start is printed after the "+" character.

graphical.target @8.193s
└─multi-user.target @8.193s
  └─mysql.service @2.962s +5.231s
    └─network.target @2.930s
      └─NetworkManager.service @1.234s +1.696s
        └─dbus.service @1.200s +0.034s
          └─basic.target @1.198s
```

This shows that MySQL is on the critical path and is the main bottleneck. If MySQL didn't need to be ready before `multi-user.target`, removing it from the critical path would reduce boot time by over 5 seconds.

## Generating an SVG Boot Chart

For a visual representation of what's happening during boot:

```bash
# Generate an SVG chart of the boot process
systemd-analyze plot > boot-chart.svg

# Open in a browser
xdg-open boot-chart.svg
# Or copy to a machine with a browser
scp server:/tmp/boot-chart.svg ~/boot-chart.svg
```

The SVG chart shows a timeline with:
- When each unit started and how long it took
- Parallel startup chains
- Which services were waiting on others

## Analyzing Unit Dependencies

```bash
# Show the dependency tree for a specific service
systemd-analyze dot mysql.service | dot -Tsvg > mysql-deps.svg

# Show what must be started before a target is reached
systemd-analyze dot multi-user.target | dot -Tsvg > multi-user.svg
```

This requires `graphviz` to render:

```bash
sudo apt install graphviz
```

## Verifying Service Unit Files

Check for syntax errors and warnings in unit files:

```bash
# Verify a specific unit file
systemd-analyze verify /etc/systemd/system/myapp.service

# Verify all unit files (produces a lot of output)
systemd-analyze verify /etc/systemd/system/*.service

# Check for security vulnerabilities in unit files
systemd-analyze security myapp.service
```

The `security` subcommand scores your service unit's security posture:

```
NAME                 DESCRIPTION                             EXPOSURE
PrivateNetwork=      Service has access to the host's network    0.5
PrivateTmp=          Service has access to the host's temporary files 0.1
NoNewPrivileges=     Service processes may acquire new privileges  0.3
...
Overall exposure level for myapp.service: 5.2 MEDIUM
```

Higher scores mean more potential attack surface. This helps identify security hardening opportunities in unit files.

## Common Boot Time Optimizations

### Disable Unnecessary Services

```bash
# Find services that are enabled but you might not need
systemctl list-unit-files --state=enabled | grep -v generated

# Common candidates for disabling on servers
sudo systemctl disable snapd.service snapd.socket
sudo systemctl disable ModemManager.service
sudo systemctl disable bluetooth.service
sudo systemctl disable avahi-daemon.service
sudo systemctl disable cups.service

# Mask services to prevent them from being started at all
sudo systemctl mask snapd.service
```

### Fix NetworkManager-wait-online

`NetworkManager-wait-online` waits until all network interfaces have a carrier and address. On servers where you only need one interface up before continuing:

```bash
# Check if it's on the critical path
systemd-analyze critical-chain NetworkManager-wait-online.service

# Option 1: Disable it entirely (if services don't truly need network at boot)
sudo systemctl disable NetworkManager-wait-online.service

# Option 2: Configure it to succeed with any interface ready
sudo systemctl edit NetworkManager-wait-online.service
```

Add to the override file:

```ini
[Service]
# Timeout faster and accept any interface
ExecStart=
ExecStart=/usr/lib/NetworkManager/nm-wait-online --any --timeout 30
```

### Disable apt Auto-Update at Boot

The `apt-daily` and `apt-daily-upgrade` services run package list updates and upgrades at boot, which can cause significant delays:

```bash
# Disable the daily timer and socket
sudo systemctl disable apt-daily.timer apt-daily-upgrade.timer

# Instead, run apt updates on a custom schedule
sudo systemctl edit apt-daily.timer
```

```ini
[Timer]
# Run 20 minutes after boot, then daily
OnBootSec=20min
OnUnitActiveSec=24h
```

### Convert Services to Socket Activation

Services that are infrequently used can use socket activation - systemd opens the socket and only starts the service when a connection arrives:

```ini
# /etc/systemd/system/myapp.socket
[Unit]
Description=My App Socket

[Socket]
ListenStream=8080
Accept=no

[Install]
WantedBy=sockets.target
```

```ini
# /etc/systemd/system/myapp.service - add socket activation
[Unit]
Description=My App

[Service]
ExecStart=/opt/myapp/myapp
```

With socket activation, `myapp` only starts when something connects to port 8080.

## Comparing Boot Times

After making changes, compare boot times:

```bash
# After rebooting, check the new time
systemd-analyze time

# Show the last few boots
journalctl --list-boots

# Compare a specific boot
journalctl -b -1 | grep "Startup finished"
```

## Boot Time for Specific Targets

```bash
# Time to reach various targets
systemd-analyze time --no-pager 2>&1

# Check when a specific service was activated
systemctl show mysql.service | grep -E "ActiveEnterTimestamp|InactiveExitTimestamp"
```

## Analyzing systemd Journal for Boot Issues

When boot is slow due to errors rather than legitimate initialization:

```bash
# Show all messages from the current boot
journalctl -b

# Show only errors and warnings from boot
journalctl -b -p warning

# Check for timeout failures
journalctl -b | grep -i "timeout\|timed out\|failed"
```

## Expected Boot Times

Rough benchmarks for Ubuntu 22.04/24.04:

| System Type | Expected Boot Time |
|-------------|-------------------|
| Physical server (NVMe) | 5-15 seconds |
| Physical server (spinning disk) | 15-30 seconds |
| VM (optimized) | 3-8 seconds |
| VM (cloud instance) | 5-15 seconds |
| Container | <1 second |

If your physical server is taking 30+ seconds in userspace, there's almost certainly a service on the critical path that can be optimized.

`systemd-analyze` provides enough visibility into the boot process to track down specific bottlenecks and measure the impact of changes. Boot time optimization is often about finding the one or two services on the critical path - fix those and the whole boot sequence speeds up.
