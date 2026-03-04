# How to Synchronize Time with chrony on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Chrony, NTP, Time Synchronization, System Administration

Description: Install and configure chrony on Ubuntu for accurate time synchronization with NTP servers, replacing systemd-timesyncd for better accuracy and flexibility in production environments.

---

Accurate time synchronization is critical for distributed systems, log correlation, SSL certificate validation, and database operations. Ubuntu ships with `systemd-timesyncd` for basic time synchronization, but `chrony` is a more capable alternative that handles intermittent network connectivity better, synchronizes faster after boot, and provides more configuration options for production use.

## chrony vs systemd-timesyncd

Ubuntu 20.04 and later use `systemd-timesyncd` by default. chrony is worth installing when you need:

- Faster initial synchronization after boot
- Better performance on systems with unstable network connectivity
- Support for hardware reference clocks
- Ability to serve time to other clients (as an NTP server)
- More detailed monitoring and statistics
- Better handling of large clock offsets

## Installing chrony

```bash
# Stop and disable systemd-timesyncd first
sudo systemctl stop systemd-timesyncd
sudo systemctl disable systemd-timesyncd

# Install chrony
sudo apt update
sudo apt install chrony

# Enable and start chrony
sudo systemctl enable chrony
sudo systemctl start chrony
sudo systemctl status chrony
```

## Basic Configuration

The main configuration file is `/etc/chrony/chrony.conf`:

```bash
sudo nano /etc/chrony/chrony.conf
```

```bash
# /etc/chrony/chrony.conf

# NTP servers to synchronize with
# Use pool.ntp.org for general use
pool 0.ubuntu.pool.ntp.org iburst
pool 1.ubuntu.pool.ntp.org iburst
pool 2.ubuntu.pool.ntp.org iburst
pool 3.ubuntu.pool.ntp.org iburst

# Or use specific NTP servers
# server time.cloudflare.com iburst prefer
# server time.google.com iburst
# server time1.google.com iburst
# server time2.google.com iburst

# Record drift to speed up synchronization after reboot
driftfile /var/lib/chrony/chrony.drift

# Log to /var/log/chrony
logdir /var/log/chrony
log measurements statistics tracking

# Stop updating system time after this many seconds
makestep 1.0 3
# "1.0 3" means: adjust clock immediately if offset > 1 second
# but only for the first 3 clock updates

# Allow stepping on first three updates
makestep 1.0 3

# Enable hardware timestamping where available
# hwtimestamp *

# Use NTP timestamps from kernel where available
rtcsync

# Require at least 3 sources for synchronization
minsources 2
```

After editing:

```bash
sudo systemctl restart chrony
```

## Checking Synchronization Status

```bash
# Show tracking statistics
chronyc tracking

# Example output:
# Reference ID    : A29FC201 (162.159.200.1)
# Stratum         : 3
# Ref time (UTC)  : Mon Mar 02 14:30:00 2026
# System time     : 0.000023456 seconds fast of NTP time
# Last offset     : +0.000023456 seconds
# RMS offset      : 0.000015234 seconds
# Frequency       : 25.678 ppm fast
# Residual freq   : -0.014 ppm
# Skew            : 0.234 ppm
# Root delay      : 0.054823456 seconds
# Root dispersion : 0.001234567 seconds
# Update interval : 64.2 seconds
# Leap status     : Normal
```

Key fields to understand:
- **System time** - how far off from NTP time (should be very small)
- **Stratum** - distance from a reference clock (lower is better; 1 = atomic clock)
- **Frequency** - clock drift rate being corrected
- **Leap status** - Normal is correct

```bash
# Show all configured NTP sources and their status
chronyc sources -v

# Output shows:
# * = currently selected source
# + = acceptable alternative
# - = not being used
# ? = unreachable

# Show source statistics (offset history)
chronyc sourcestats -v

# Show activity statistics
chronyc activity
```

## Selecting NTP Servers

Choose NTP servers appropriate for your environment:

```bash
sudo nano /etc/chrony/chrony.conf
```

```bash
# Public NTP pool (good default)
pool pool.ntp.org iburst minpoll 6 maxpoll 10

# Cloudflare time service (high accuracy, free)
server time.cloudflare.com iburst

# Google NTP (good reliability)
server time.google.com iburst
server time1.google.com iburst
server time2.google.com iburst
server time3.google.com iburst
server time4.google.com iburst

# AWS NTP (use on AWS instances)
server 169.254.169.123 prefer iburst

# Azure NTP (use on Azure instances)
server time.windows.com iburst

# Local NTP server (for internal networks)
server ntp.internal.example.com iburst prefer
```

The `iburst` option sends several packets on the initial connection for faster synchronization. The `prefer` option marks a preferred source.

## Configuring for Cloud Environments

### AWS

```bash
# For AWS EC2 instances, use the AWS time sync service
# This is available via the link-local address
server 169.254.169.123 prefer iburst
```

### Azure

```bash
# For Azure VMs
server time.windows.com iburst
```

### GCP

```bash
# For Google Cloud VMs
server metadata.google.internal prefer iburst
```

## Forcing Time Synchronization

If the clock is significantly off, chrony may refuse to step it automatically. Force synchronization:

```bash
# Force immediate synchronization
sudo chronyc makestep

# Make chrony step the clock now (ignoring makestep limits)
sudo chronyc makestep 1 -1

# Check if it worked
chronyc tracking | grep "System time"
```

## Checking if Time is Synchronized

```bash
# Quick check via timedatectl (works even when using chrony)
timedatectl | grep "synchronized"

# Check chrony tracking
chronyc tracking | grep -E "Reference ID|System time|Leap status"

# Verify NTP service is active
timedatectl show --property=NTPSynchronized

# Check chronyd service
systemctl status chrony

# Watch tracking in real-time
watch -n 2 chronyc tracking
```

## Configuring makestep Behavior

The `makestep` directive controls when chrony steps vs. slews the clock:

```bash
# /etc/chrony/chrony.conf

# Step if offset > 1.0 seconds, but only in first 3 updates
# After that, only slew (gradually adjust)
makestep 1.0 3

# Never step the clock after startup (always slew)
# makestep 0.5 0  # Only step during first 0 updates (never after)

# Always step if offset > 0.1 seconds (useful for servers that may drift a lot)
makestep 0.1 -1   # -1 = always allow stepping

# For systems that may have large time differences at startup
makestep 1.0 3    # Standard server setting
```

## Restricting Access

If running chrony as an NTP client only:

```bash
# /etc/chrony/chrony.conf

# Deny all clients (client-only mode)
deny all

# Or allow specific networks if serving time to others
# allow 10.0.0.0/8
# allow 192.168.1.0/24
```

## Logging and Monitoring

```bash
# Enable detailed logging
sudo nano /etc/chrony/chrony.conf
```

```bash
# Log directory
logdir /var/log/chrony

# Enable specific logs
log measurements statistics tracking refclocks rtc
```

```bash
# View chrony logs
ls /var/log/chrony/
cat /var/log/chrony/tracking.log | tail -20
cat /var/log/chrony/statistics.log | tail -20

# View system log for chrony events
journalctl -u chrony -f
journalctl -u chrony --since "1 hour ago"

# Show chrony daemon statistics
chronyc -a ntpdata
```

## Comparing with systemd-timesyncd

If you need to switch back to systemd-timesyncd:

```bash
# Stop chrony
sudo systemctl stop chrony
sudo systemctl disable chrony

# Re-enable systemd-timesyncd
sudo systemctl enable systemd-timesyncd
sudo systemctl start systemd-timesyncd

# Check its status
timedatectl timesync-status
```

## Verifying Time Accuracy

```bash
# Check offset from internet time sources
chronyc tracking | grep "System time"

# Cross-check with an external source
# Install: sudo apt install ntpdate
ntpdate -q pool.ntp.org 2>/dev/null

# Use curl to get time from HTTP headers
curl -sI http://worldtimeapi.org/api/timezone/UTC | grep Date

# Python check
python3 -c "
import ntplib, time
c = ntplib.NTPClient()
response = c.request('pool.ntp.org')
offset = response.offset
print(f'NTP offset: {offset:.6f} seconds')
print(f'Stratum: {response.stratum}')
" 2>/dev/null || echo "ntplib not installed"
```

## Troubleshooting chrony

**chrony not synchronizing:**

```bash
# Check if NTP servers are reachable
ping -c 3 pool.ntp.org

# Check chrony sources
chronyc sources

# Check if firewall is blocking NTP
sudo ufw status
sudo ufw allow out 123/udp   # Allow outgoing NTP

# Check for conflicts with other NTP daemons
systemctl list-units | grep -E "ntp|timesyncd|chrony"

# Restart chrony with verbose logging
sudo journalctl -u chrony -f &
sudo systemctl restart chrony
```

**Large clock offset:**

```bash
# Force immediate step correction
sudo chronyc makestep

# Or temporarily allow large steps
sudo nano /etc/chrony/chrony.conf
# Change: makestep 1.0 3
# To: makestep 100 3  (allow stepping up to 100 seconds)
sudo systemctl restart chrony

# After sync, restore normal setting
```

chrony handles production time synchronization well, particularly in environments with intermittent connectivity or VMs that may experience time drift when paused or migrated. For most server deployments, the default Ubuntu configuration with pool servers is sufficient, but having chrony configured and monitored ensures you always have accurate time when you need it.
