# How to Fix 'System Clock Wrong' Issues on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, NTP, System Clock, Troubleshooting, Administration

Description: Fix incorrect system clock issues on Ubuntu including NTP synchronization problems, hardware clock mismatches, timezone errors, and virtual machine clock drift.

---

An incorrect system clock causes a surprising range of failures: SSL certificate validation errors, log correlation problems, Kerberos authentication failures, database replication issues, and more. Clock problems on Ubuntu stem from a few distinct root causes, each with different fixes.

## Checking Current Clock Status

Start by understanding the current state:

```bash
# Show system clock, hardware clock, and NTP status
timedatectl status

# Example output:
#                Local time: Mon 2026-03-02 10:30:00 UTC
#            Universal time: Mon 2026-03-02 10:30:00 UTC
#                  RTC time: Mon 2026-03-02 10:30:00
#                 Time zone: UTC (UTC, +0000)
# System clock synchronized: yes
#               NTP service: active
#           RTC in local TZ: no

# Check if timesyncd is running
systemctl status systemd-timesyncd

# Check current NTP sources and sync status
timedatectl show-timesync --all
```

Key things to look for:
- `System clock synchronized: yes` - clock is actively being synced
- `NTP service: active` - the NTP daemon is running
- Large offset between "Local time" and "RTC time" indicates hardware clock issues

## Fix 1: Enable NTP Synchronization

The most common cause is NTP simply not being enabled:

```bash
# Enable NTP synchronization
sudo timedatectl set-ntp true

# Verify it's active
timedatectl status | grep "NTP service"

# Restart timesyncd if needed
sudo systemctl restart systemd-timesyncd

# Force an immediate sync
sudo systemctl restart systemd-timesyncd
# Wait a moment, then check
timedatectl status
```

## Fix 2: Configure NTP Servers

Ubuntu uses `systemd-timesyncd` by default, which syncs from the configured NTP servers. Configure it with reliable servers:

```bash
sudo nano /etc/systemd/timesyncd.conf
```

```ini
# /etc/systemd/timesyncd.conf
[Time]
# Primary NTP servers (space-separated for fallback)
NTP=time1.google.com time2.google.com time3.google.com time4.google.com
# Fallback servers
FallbackNTP=0.ubuntu.pool.ntp.org 1.ubuntu.pool.ntp.org 2.ubuntu.pool.ntp.org

# Or use Cloudflare's NTP
# NTP=time.cloudflare.com
```

Apply the configuration:

```bash
sudo systemctl restart systemd-timesyncd
# Check sync status
timedatectl show-timesync --all
```

## Fix 3: Force a Clock Correction for Large Offsets

If the system clock is significantly wrong (minutes or hours off), `timesyncd` may not correct it automatically because it steps the clock gradually to avoid breaking running processes. Force a correction:

```bash
# Stop timesyncd
sudo systemctl stop systemd-timesyncd

# Manually set the time via ntpdate (install if needed)
sudo apt-get install -y ntpdate
sudo ntpdate -u time.google.com

# Or use chronyc for an immediate step
sudo apt-get install -y chrony
sudo systemctl stop systemd-timesyncd
sudo systemctl enable --now chronyd
sudo chronyc makestep

# Restart timesyncd (or leave chrony running)
sudo systemctl start systemd-timesyncd
```

Note: You should only have one NTP daemon running. Either use `systemd-timesyncd` or `chrony`, not both.

## Fix 4: Timezone Configuration

An incorrect timezone makes the local time display wrong even when UTC is correct:

```bash
# Show current timezone
timedatectl | grep "Time zone"

# List available timezones
timedatectl list-timezones | grep -i "America/New"

# Set timezone
sudo timedatectl set-timezone America/New_York

# Or for UTC (recommended for servers)
sudo timedatectl set-timezone UTC

# Verify
timedatectl
date
```

If applications are showing the wrong timezone after you change it, restart them - they inherit the timezone at startup:

```bash
# Restart affected services after timezone change
sudo systemctl restart cron
sudo systemctl restart rsyslog
# Restart application-specific services
```

## Fix 5: Hardware Clock (RTC) Mismatch

The hardware clock (RTC - Real Time Clock) is the battery-backed clock that runs when the system is off. When Ubuntu boots, it reads the hardware clock to set the system clock.

```bash
# Read the hardware clock
sudo hwclock --show

# Read with verbose output
sudo hwclock --show --verbose

# Compare with system time
date

# If they differ significantly, sync hardware clock FROM system time
# (After you've fixed the system clock via NTP)
sudo hwclock --systohc

# Or sync system clock FROM hardware clock
sudo hwclock --hctosys

# Set hardware clock explicitly
sudo hwclock --set --date "2026-03-02 10:30:00"
```

### UTC vs Local Time in RTC

Linux expects the hardware clock to be set in UTC. Windows sets it to local time. If dual-booting with Windows, the clocks fight each other:

```bash
# Check how Linux reads the RTC
timedatectl | grep "RTC in local TZ"
# "RTC in local TZ: no" means Linux reads RTC as UTC (correct for Linux-only)
# "RTC in local TZ: yes" means Linux reads RTC as local time (needed for dual-boot with Windows)

# For dual-boot, set Ubuntu to read RTC as local time
sudo timedatectl set-local-rtc 1

# For Linux-only systems (preferred)
sudo timedatectl set-local-rtc 0
```

## Fix 6: Virtual Machine Clock Drift

VMs are particularly prone to clock drift because the hypervisor controls the virtualized RTC and the VM may be paused/resumed or migrated between hosts.

### For KVM/QEMU VMs

Install the QEMU guest agent which helps the hypervisor synchronize the VM clock:

```bash
# Install qemu-guest-agent
sudo apt-get install -y qemu-guest-agent

# Enable and start it
sudo systemctl enable --now qemu-guest-agent

# Enable clock synchronization from hypervisor via KVM PTP clock
# Check if the kvm-clock module is loaded
lsmod | grep kvm
```

Configure `chrony` to use the KVM virtual clock source:

```bash
sudo apt-get install -y chrony

# Stop timesyncd to avoid conflicts
sudo systemctl disable --now systemd-timesyncd

# Configure chrony with VM-specific settings
sudo nano /etc/chrony/chrony.conf
```

```text
# /etc/chrony/chrony.conf
# Use public NTP servers
pool 2.ubuntu.pool.ntp.org iburst maxsources 4

# Also use the KVM PTP clock if available (refclock for physical clock inside VM)
refclock PHC /dev/ptp0 poll 3 dpoll -2 offset 0 trust prefer

# Allow larger adjustments for VMs that may have been paused
makestep 1.0 3

# Log clock adjustments
log measurements statistics tracking
```

```bash
sudo systemctl enable --now chronyd
sudo chronyc tracking
```

### For VMware VMs

VMware Tools provides clock synchronization:

```bash
# Install open-vm-tools
sudo apt-get install -y open-vm-tools

# VMware Tools can synchronize the clock automatically
# Configure it via vmware-toolsd settings
```

## Fix 7: chrony for High-Precision Time

For systems requiring accurate time (databases, distributed systems, Kerberos), replace `timesyncd` with `chrony`:

```bash
# Install chrony and disable timesyncd
sudo apt-get install -y chrony
sudo systemctl disable --now systemd-timesyncd

# Configure chrony
sudo nano /etc/chrony/chrony.conf
```

```text
# /etc/chrony/chrony.conf
# Multiple NTP servers for redundancy and accuracy
pool time.google.com iburst maxsources 4
pool time.cloudflare.com iburst maxsources 2

# Record the clock drift
driftfile /var/lib/chrony/drift

# Step the clock if offset is large, then maintain
# Step up to 3 times during first 3 clock updates
makestep 1.0 3

# Allow NTP client access from local network
allow 192.168.1.0/24

# Logging
logdir /var/log/chrony
log measurements statistics tracking
```

```bash
sudo systemctl enable --now chronyd

# Check synchronization status
chronyc tracking
chronyc sources -v
chronyc sourcestats -v
```

## Monitoring Clock Synchronization

Set up monitoring to alert when the clock drifts or NTP loses synchronization:

```bash
#!/bin/bash
# /usr/local/bin/check-ntp-sync.sh
# Check NTP sync status and alert if synchronization is lost

MAX_OFFSET_SECONDS=5  # Alert if offset exceeds 5 seconds

# Check if NTP is synchronized
if ! timedatectl show | grep -q "NTPSynchronized=yes"; then
    echo "CRITICAL: NTP is not synchronized"
    exit 2
fi

# Check offset (using chrony if available)
if command -v chronyc &>/dev/null; then
    OFFSET=$(chronyc tracking | grep "System time" | awk '{print $4}')
    OFFSET_ABS=$(echo "$OFFSET" | tr -d '-')

    # Compare offset (basic float comparison)
    if awk "BEGIN{exit !($OFFSET_ABS > $MAX_OFFSET_SECONDS)}"; then
        echo "WARNING: NTP offset is ${OFFSET}s (max: ${MAX_OFFSET_SECONDS}s)"
        exit 1
    fi

    echo "OK: NTP synchronized, offset: ${OFFSET}s"
    exit 0
fi

echo "OK: NTP synchronized"
```

```bash
chmod +x /usr/local/bin/check-ntp-sync.sh

# Run every 5 minutes
echo "*/5 * * * * root /usr/local/bin/check-ntp-sync.sh | logger -t ntp-check" \
    | sudo tee /etc/cron.d/ntp-monitor
```

## Summary

Clock issues on Ubuntu fall into these categories:

- **NTP not enabled**: Fix with `timedatectl set-ntp true`
- **NTP servers unreachable**: Configure accessible servers in `timesyncd.conf`
- **Large clock offset**: Force step correction with `chronyc makestep` or `ntpdate`
- **Wrong timezone**: Fix with `timedatectl set-timezone`
- **RTC/UTC mismatch**: Fix with `timedatectl set-local-rtc` and `hwclock --systohc`
- **VM clock drift**: Install guest tools and configure chrony with the virtual clock source

For production servers, use `chrony` instead of `timesyncd` - it handles clock corrections more gracefully and provides better monitoring tools.
