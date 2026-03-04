# How to Fix 'A Start Job Is Running for...' Hanging at Boot on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Boot, systemd, Troubleshooting, Startup

Description: Fix RHEL systems that hang at boot with 'A start job is running for...' messages by identifying and resolving stalled systemd units.

---

When RHEL displays "A start job is running for..." during boot and hangs, a systemd unit is taking longer than expected to start. The default timeout is 90 seconds, but some units can block the boot process entirely.

## Identifying the Stuck Service

The boot message tells you which unit is stalling:

```
A start job is running for /dev/disk/by-uuid/xxxx-xxxx (30s / 1min 30s)
```

## Common Cause 1: Missing Filesystem in /etc/fstab

```bash
# Boot into emergency mode:
# At GRUB, press 'e' and add to the linux line:
# systemd.unit=emergency.target

# Once in emergency mode, check fstab
cat /etc/fstab

# Look for entries referencing disks that no longer exist
# Comment out or remove the problematic entry
vi /etc/fstab

# For non-critical mounts, add the nofail option
# /dev/sdb1  /data  xfs  defaults,nofail  0 0

# Reboot
systemctl reboot
```

## Common Cause 2: Network Dependency at Boot

```bash
# If the message mentions a network service
# Check for services that require network before it is ready

# In emergency mode:
systemctl list-dependencies multi-user.target | grep network

# Disable the wait-online service if it is causing delays
systemctl disable NetworkManager-wait-online.service

# Or reduce its timeout
mkdir -p /etc/systemd/system/NetworkManager-wait-online.service.d/
cat > /etc/systemd/system/NetworkManager-wait-online.service.d/timeout.conf << 'CONF'
[Service]
ExecStart=
ExecStart=/usr/bin/nm-online -s -q --timeout=30
CONF
```

## Common Cause 3: Slow Storage Device

```bash
# Increase the timeout for a specific mount
sudo systemctl edit dev-sdb1.mount
```

```ini
[Mount]
TimeoutSec=300
```

## Reducing Default Timeouts

```bash
# Edit the system-wide default timeout
sudo vi /etc/systemd/system.conf

# Reduce the default start timeout
# DefaultTimeoutStartSec=90s
# Change to:
# DefaultTimeoutStartSec=30s

# Apply the change
sudo systemctl daemon-reexec
```

## Diagnosing After Boot

```bash
# Check which services took the longest to start
systemd-analyze blame | head -20

# View the critical chain (boot bottleneck)
systemd-analyze critical-chain

# Check for failed services
systemctl --failed

# View the log for a specific slow service
journalctl -u <service-name> -b
```

## Emergency Mode Workaround

If you cannot wait for the timeout:

```bash
# At the GRUB menu, press 'e'
# Add to the linux line: systemd.unit=emergency.target
# Press Ctrl+X to boot

# Fix the issue, then reboot normally
systemctl default
```

The most common fix is adding `nofail` to fstab entries for non-critical filesystems, which allows boot to continue even if the mount fails.
