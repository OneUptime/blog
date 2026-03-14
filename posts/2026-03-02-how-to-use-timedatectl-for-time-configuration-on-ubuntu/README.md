# How to Use timedatectl for Time Configuration on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Timedatectl, Time Configuration, Systemd, System Administration

Description: Master timedatectl on Ubuntu to manage system time, timezone settings, NTP synchronization, and hardware clock configuration from a single command-line tool.

---

`timedatectl` is the unified command-line interface for managing time and date settings on systemd-based Ubuntu systems. It controls timezone configuration, NTP synchronization, hardware clock mode, and manual time setting. Understanding timedatectl gives you a consistent interface for time management across Ubuntu 16.04 and later.

## Basic Usage

Running timedatectl without arguments shows current status:

```bash
timedatectl

# Output:
#                Local time: Mon 2026-03-02 14:30:00 EST
#            Universal time: Mon 2026-03-02 19:30:00 UTC
#                  RTC time: Mon 2026-03-02 19:30:00
#                 Time zone: America/New_York (EST, -0500)
# System clock synchronized: yes
#               NTP service: active
#           RTC in local TZ: no
```

Understanding the output:
- **Local time** - current time in configured timezone
- **Universal time** - UTC time
- **RTC time** - hardware clock (Real Time Clock) value
- **Time zone** - configured timezone with current offset
- **System clock synchronized** - whether NTP synchronization is active
- **NTP service** - whether an NTP daemon is running
- **RTC in local TZ** - whether hardware clock stores local or UTC time

## Viewing Detailed Information

```bash
# Show all properties in key=value format (useful for scripts)
timedatectl show

# Show specific properties
timedatectl show --property=Timezone
timedatectl show --property=NTPSynchronized
timedatectl show --property=TimeUSec

# Get just the value (--value flag)
timedatectl show --property=Timezone --value
# Output: America/New_York

# Check if time is synchronized
timedatectl show --property=NTPSynchronized --value
# Output: yes

# Get current Unix timestamp
timedatectl show --property=TimeUSec --value
```

## Managing the Timezone

```bash
# Show current timezone
timedatectl | grep "Time zone"

# List all available timezones
timedatectl list-timezones

# List timezones for a region
timedatectl list-timezones | grep America
timedatectl list-timezones | grep Europe
timedatectl list-timezones | grep Asia/

# Search for a specific city
timedatectl list-timezones | grep -i "new_york\|chicago\|los_angeles"

# Set the timezone
sudo timedatectl set-timezone UTC
sudo timedatectl set-timezone America/New_York
sudo timedatectl set-timezone Europe/London
sudo timedatectl set-timezone Asia/Tokyo

# Verify the change
timedatectl | grep "Time zone"
date
```

## Setting the System Time Manually

When NTP is not available and you need to set the time manually:

```bash
# First, disable NTP synchronization (required before manual set)
sudo timedatectl set-ntp false

# Set date and time
# Format: "YYYY-MM-DD HH:MM:SS"
sudo timedatectl set-time "2026-03-02 14:30:00"

# Set only the date (time remains unchanged)
sudo timedatectl set-time "2026-03-02"

# Set only the time (date remains unchanged)
sudo timedatectl set-time "14:30:00"

# Verify
timedatectl
date

# Re-enable NTP after manual adjustment
sudo timedatectl set-ntp true
```

## Managing NTP Synchronization

```bash
# Check NTP status
timedatectl | grep NTP

# Enable NTP synchronization
sudo timedatectl set-ntp true

# Disable NTP synchronization
sudo timedatectl set-ntp false

# Check which NTP service is running
systemctl list-units | grep -E "timesyncd|chrony|ntpd"

# Check systemd-timesyncd status (default Ubuntu NTP client)
systemctl status systemd-timesyncd

# View timesyncd synchronization details
timedatectl timesync-status

# Example output of timesync-status:
#        Server: 91.189.91.157 (ntp.ubuntu.com)
# Poll interval: 1min 4s (min: 32s; max 34min 8s)
#          Leap: normal
#       Version: 4
#       Stratum: 2
#     Reference: 85F197A1
#     Precision: 1us (-20)
#  Root distance: 24.955ms (max: 5s)
#       Offset: -1.234ms
#        Delay: 35.678ms
#       Jitter: 2.345ms
#  Packet count: 5
#     Frequency: -12.345ppm
```

## Hardware Clock (RTC) Management

The Real Time Clock (RTC) is a battery-powered clock on the motherboard that runs even when the system is off:

```bash
# Check RTC time
timedatectl | grep "RTC time"

# Check if RTC is in local time or UTC
timedatectl | grep "RTC in local TZ"

# Set RTC to use UTC (recommended for Linux systems)
# Local TZ in RTC can cause issues with dual-boot and DST
sudo timedatectl set-local-rtc 0

# Set RTC to use local time (not recommended unless dual-booting with Windows)
sudo timedatectl set-local-rtc 1

# Sync system clock to RTC
sudo hwclock --hctosys

# Sync RTC from system clock
sudo hwclock --systohc

# Read RTC directly
sudo hwclock --show
```

**Note on Windows dual-boot:** Windows stores local time in the RTC by default. If you're dual-booting with Windows, either:
1. Configure Windows to use UTC: `reg add HKLM\SYSTEM\CurrentControlSet\Control\TimeZoneInformation /v RealTimeIsUniversal /t REG_DWORD /d 1`
2. Or configure Linux to use local time in RTC: `sudo timedatectl set-local-rtc 1`

## Scripting with timedatectl

timedatectl's `show` command is designed for scripting:

```bash
#!/bin/bash
# Check time synchronization in a script

# Get NTP sync status
ntp_synchronized=$(timedatectl show --property=NTPSynchronized --value)

if [ "$ntp_synchronized" = "yes" ]; then
    echo "Time is synchronized via NTP"
else
    echo "WARNING: Time is not NTP synchronized!"
    exit 1
fi

# Get current timezone
current_tz=$(timedatectl show --property=Timezone --value)
echo "Current timezone: $current_tz"

# Check if it's UTC (for servers that should always be UTC)
if [ "$current_tz" != "UTC" ]; then
    echo "WARNING: Timezone is not UTC. Current: $current_tz"
fi
```

```bash
# Ensure correct timezone in an Ansible playbook or deployment script
REQUIRED_TZ="UTC"
CURRENT_TZ=$(timedatectl show --property=Timezone --value)

if [ "$CURRENT_TZ" != "$REQUIRED_TZ" ]; then
    echo "Setting timezone from $CURRENT_TZ to $REQUIRED_TZ"
    timedatectl set-timezone "$REQUIRED_TZ"
fi
```

## Checking Time Sources

```bash
# View timesyncd's current server and statistics
timedatectl timesync-status

# If using chrony instead of timesyncd
chronyc tracking
chronyc sources

# Check what's providing NTP
systemctl list-units --type=service | grep -E "chrony|ntp|timesync"

# See which service owns the NTP function
timedatectl show --property=NTPService
```

## Common timedatectl Operations

```bash
# Full system time audit
echo "=== System Time Configuration ==="
timedatectl
echo ""

echo "=== Hardware Clock ==="
sudo hwclock --show --verbose

echo ""
echo "=== NTP Details ==="
timedatectl timesync-status 2>/dev/null || chronyc tracking 2>/dev/null

echo ""
echo "=== Available Timezone Info ==="
date
date -u
echo "UTC offset: $(date +%z)"
```

## Integrating with systemd-timesyncd Configuration

timedatectl works with systemd-timesyncd. Configure timesyncd via:

```bash
sudo nano /etc/systemd/timesyncd.conf
```

```bash
[Time]
# Specify NTP servers
NTP=ntp1.internal.example.com ntp2.internal.example.com

# Fallback servers if primary unavailable
FallbackNTP=pool.ntp.org

# Root distance maximum (seconds)
RootDistanceMaxSec=5

# Poll interval limits
PollIntervalMinSec=32
PollIntervalMaxSec=2048
```

```bash
# Restart timesyncd after configuration change
sudo systemctl restart systemd-timesyncd

# Check the new server is being used
timedatectl timesync-status | grep Server
```

## Troubleshooting

**NTP shows inactive:**

```bash
# Check if NTP daemon is running
systemctl status systemd-timesyncd
systemctl status chrony 2>/dev/null

# Start it
sudo timedatectl set-ntp true

# Check for conflicts
systemctl list-units | grep -E "timesyncd|chrony|ntpd"
```

**System clock synchronized: no:**

```bash
# This can take a few minutes after enabling NTP
# Check timesyncd status
journalctl -u systemd-timesyncd -n 20

# Force immediate sync check
sudo systemctl restart systemd-timesyncd
# Wait a moment, then check
timedatectl
```

**Cannot set time manually:**

```bash
# Must disable NTP first
sudo timedatectl set-ntp false
sudo timedatectl set-time "2026-03-02 14:30:00"
# Then re-enable NTP
sudo timedatectl set-ntp true
```

**RTC time is wrong:**

```bash
# Sync system clock to hardware clock
sudo hwclock --systohc

# Or set hardware clock directly
sudo hwclock --set --date="2026-03-02 14:30:00"

# Verify
timedatectl | grep "RTC time"
```

timedatectl is the authoritative interface for time configuration on modern Ubuntu. For most operations - setting timezone, enabling NTP, checking synchronization status - it's the only tool you need. For more advanced NTP configuration and monitoring, pair it with chrony as described in the chrony configuration guides.
