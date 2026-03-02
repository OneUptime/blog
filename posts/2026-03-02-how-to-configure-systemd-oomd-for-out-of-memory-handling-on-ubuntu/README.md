# How to Configure systemd-oomd for Out-of-Memory Handling on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, systemd, Memory Management, OOM Killer, Linux

Description: Configure systemd-oomd to proactively handle out-of-memory conditions on Ubuntu, prevent system freezes, and protect critical services from OOM kills.

---

The Linux kernel's OOM killer is a last resort that activates when the system runs completely out of memory. By that point, the system has already been suffering for minutes under memory pressure - swap thrashing, response times measured in seconds, kernel subsystems starved. `systemd-oomd` is an early-warning OOM killer that acts before things get that bad, making targeted kills to relieve pressure while the system can still respond.

## The Problem with the Kernel OOM Killer

The kernel OOM killer has two well-known failure modes:

1. **Too late**: By the time the kernel invokes the OOM killer, the system has been unresponsive for a long time due to swap thrashing. The kill completes but the damage (failed requests, timed-out connections) is already done.

2. **Wrong process**: The kernel's OOM score heuristics can kill important processes or the wrong instance in a multi-process service.

`systemd-oomd` runs in userspace and monitors memory pressure through the kernel's pressure stall information (PSI) system. It can kill processes or entire cgroups before the system reaches true exhaustion.

## Prerequisites

PSI (Pressure Stall Information) must be enabled in the kernel. Most Ubuntu 20.04+ kernels include PSI:

```bash
# Check if PSI is available
cat /proc/pressure/memory

# You should see output like:
# some avg10=0.00 avg60=0.00 avg300=0.00 total=0
# full avg10=0.00 avg60=0.00 avg300=0.00 total=0

# If the file doesn't exist, enable PSI at boot
sudo nano /etc/default/grub
# Add: psi=1 to GRUB_CMDLINE_LINUX
sudo update-grub
sudo reboot
```

## Installing and Enabling systemd-oomd

```bash
# Install systemd-oomd
sudo apt update
sudo apt install systemd-oomd

# Enable and start the service
sudo systemctl enable --now systemd-oomd

# Check status
sudo systemctl status systemd-oomd
```

## How systemd-oomd Works

systemd-oomd monitors two metrics:
- **Memory pressure**: How often processes are stalled waiting for memory (from `/proc/pressure/memory`)
- **Swap usage**: How much of the swap space is consumed

When thresholds are exceeded, oomd looks for the cgroup with the highest "badness score" under the root slice and kills it. It kills at the cgroup level - meaning it can kill an entire service (all processes in `myapp.service`) rather than just one process.

## Configuring systemd-oomd

Edit `/etc/systemd/oomd.conf`:

```bash
sudo nano /etc/systemd/oomd.conf
```

```ini
[OOM]
# Swap utilization threshold to trigger OOM kills
# Default: 90%
SwapUsedLimitPercent=80

# Memory pressure threshold (percentage of time in 10-second window)
# Default: 100% (any pressure triggers)
DefaultMemoryPressureLimitPercent=60

# Duration the pressure must exceed the limit before acting
# Default: 30s
DefaultMemoryPressureDurationSec=20s

# Don't kill any unit below this memory threshold
# Prevents killing tiny processes
# DefaultMemoryPressureTargetSeconds
```

After editing:

```bash
sudo systemctl restart systemd-oomd
```

## Configuring Per-Service OOM Protection

Services can opt into or out of oomd management through their unit files. Two relevant directives:

### ManagedOOMSwap

Controls whether oomd considers this service for killing based on swap pressure:

```ini
[Service]
# Allow oomd to kill this service to relieve swap pressure
ManagedOOMSwap=kill

# Don't kill this service for swap pressure
ManagedOOMSwap=skip
```

### ManagedOOMMemoryPressure

Controls whether oomd considers this service for killing based on memory pressure:

```ini
[Service]
# Allow killing based on memory pressure
ManagedOOMMemoryPressure=kill

# Custom threshold for this specific service
ManagedOOMMemoryPressure=kill
ManagedOOMMemoryPressureLimit=90%

# Protect this service from oomd kills
ManagedOOMMemoryPressure=skip
```

### Protecting Critical Services

```bash
# Create an override for a critical service
sudo systemctl edit nginx.service
```

```ini
[Service]
# Don't let oomd kill nginx regardless of memory pressure
ManagedOOMSwap=skip
ManagedOOMMemoryPressure=skip
```

Apply:

```bash
sudo systemctl daemon-reload
```

### Marking Non-Critical Services for Early Killing

Services that can safely be killed and restarted should be marked for oomd management:

```bash
sudo systemctl edit worker.service
```

```ini
[Service]
# Allow oomd to kill this service first during memory pressure
ManagedOOMSwap=kill
ManagedOOMMemoryPressure=kill
# Lower preference value = higher chance of being killed
OOMPolicy=kill
```

## Setting Memory Limits on Services

oomd works best when services have explicit memory limits, as it uses these for its badness score calculation:

```ini
# /etc/systemd/system/myapp.service
[Service]
# Hard memory limit - process gets SIGKILL if exceeded
MemoryMax=512M

# Soft memory limit - system reclaims from this cgroup first
MemoryHigh=400M

# Swap limit for this cgroup
MemorySwapMax=256M

# oomd settings
ManagedOOMSwap=kill
ManagedOOMMemoryPressure=kill
```

```bash
sudo systemctl daemon-reload
sudo systemctl restart myapp.service

# Verify limits are applied
systemctl show myapp.service | grep -E "Memory|OOM"
```

## Monitoring oomd Activity

```bash
# View oomd logs
journalctl -u systemd-oomd -f

# Check for recent OOM kills by oomd
journalctl -u systemd-oomd | grep -i "killed\|pressure\|swap"

# oomd logs entries like:
# systemd-oomd[pid]: Killed user.slice/user-1000.slice/user@1000.service due to memory pressure
```

## Viewing Current Memory Pressure

```bash
# Current system-wide memory pressure
cat /proc/pressure/memory

# Current swap usage
free -h

# Per-cgroup memory pressure (if cgroupv2 is enabled)
cat /sys/fs/cgroup/user.slice/memory.pressure
cat /sys/fs/cgroup/system.slice/memory.pressure
```

## Configuring cgroup Memory Pressure

For oomd to work per-cgroup, cgroupv2 must be the active hierarchy (it is by default on Ubuntu 22.04+):

```bash
# Check cgroup version
mount | grep cgroup
# If you see "cgroup2" type, cgroupv2 is active

# Check specific service cgroup
systemctl show myapp.service | grep ControlGroup
# /system.slice/myapp.service

# View memory pressure for the service
cat /sys/fs/cgroup/system.slice/myapp.service/memory.pressure
```

## Setting Up swap Properly

oomd's swap-based killing requires swap to exist and for oomd to monitor it. Configure an appropriately sized swap:

```bash
# Check current swap
free -h
swapon --show

# Create a swap file if swap is small or absent
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Make permanent
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Check
free -h
```

## Tuning Swap Tendency

The kernel's `swappiness` parameter controls how aggressively the kernel swaps memory:

```bash
# Check current swappiness
cat /proc/sys/vm/swappiness
# Default: 60 on most systems

# For servers with lots of RAM, lower it
# This makes the kernel prefer keeping data in RAM
sudo sysctl vm.swappiness=20

# Make permanent
echo 'vm.swappiness=20' | sudo tee -a /etc/sysctl.conf
```

With lower swappiness, oomd triggers earlier (because swap fills up faster), making it more likely to act before the system becomes unresponsive.

## Comparing systemd-oomd and kernel OOM Killer

| Feature | Kernel OOM Killer | systemd-oomd |
|---------|-------------------|--------------|
| When it acts | After OOM | Before OOM (pressure-based) |
| Granularity | Per-process | Per-cgroup (whole service) |
| Configurability | Limited (score hints) | Extensive |
| Logging | dmesg | systemd journal |
| Restart policy | None | Respects Restart= |
| Speed | Reactive (slow) | Proactive (fast) |

## Testing oomd Behavior

To test that oomd is working, you need to create genuine memory pressure. A controlled test:

```bash
# Install stress-ng for controlled memory pressure testing
sudo apt install stress-ng

# Create memory pressure (allocate 90% of RAM)
# Adjust the value based on your system's RAM
MEM_90=$(free -m | awk '/Mem:/{print int($2*0.9)}')
stress-ng --vm 1 --vm-bytes "${MEM_90}M" --timeout 60s &

# Watch oomd logs in another terminal
journalctl -u systemd-oomd -f

# Kill stress-ng when done
kill %1
```

`systemd-oomd` addresses a long-standing pain point in Linux memory management. The kernel OOM killer has always been a blunt instrument; oomd gives administrators fine-grained control over which services get sacrificed during memory pressure events, and it acts early enough that the system remains responsive throughout.
