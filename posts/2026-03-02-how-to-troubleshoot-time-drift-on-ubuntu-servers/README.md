# How to Troubleshoot Time Drift on Ubuntu Servers

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, NTP, Time Synchronization, Troubleshooting, System Administration

Description: Diagnose and fix time drift issues on Ubuntu servers, covering NTP misconfiguration, VM clock drift, hardware clock problems, and network connectivity issues.

---

Time drift - where a server's clock gradually falls out of sync with actual time - causes subtle but serious problems: authentication failures, SSL certificate errors, database replication issues, distributed transaction failures, and misleading log timestamps. This guide covers systematic approaches to diagnosing and fixing time drift on Ubuntu servers.

## Understanding Time Drift

The system clock in a computer is based on a crystal oscillator that's not perfectly accurate. Without correction, clocks drift at different rates - typically a few seconds per day. Time synchronization via NTP (Network Time Protocol) continuously corrects this drift by comparing local time against accurate internet time sources and gradually adjusting the local clock.

Drift problems fall into several categories:

1. **NTP not running or misconfigured** - most common cause
2. **VM-specific drift** - virtual machine clocks drift more than physical hardware
3. **Network issues** - blocking NTP traffic or high latency causing poor sync
4. **Hardware RTC problems** - battery failure or bad hardware clock
5. **Large time jumps** - NTP refusing to correct a large offset
6. **Leap second handling** - rare but can cause momentary issues

## Diagnosing the Problem

### Check Current Time Status

```bash
# Quick overview of time status
timedatectl

# Key things to check:
# "System clock synchronized: yes" - NTP is working
# "NTP service: active" - NTP daemon is running
# If either shows "no" or "inactive", you have a problem

# For detailed NTP status (with timesyncd)
timedatectl timesync-status

# For detailed status (with chrony)
chronyc tracking
```

### Measure the Actual Drift

```bash
# Check current offset from NTP servers (with timesyncd)
timedatectl timesync-status | grep "Offset:"
# Small offset (< 100ms) is normal
# Large offset (> 1 second) indicates a problem

# With chrony
chronyc tracking | grep "System time"
# Shows current offset and drift rate

# Cross-check against a public time source
# Install: sudo apt install ntpdate
ntpdate -q pool.ntp.org
# Shows offset between your clock and pool servers

# Using curl (HTTP Date header)
curl -sI https://timeapi.io/api/time/current/zone?timeZone=UTC 2>/dev/null | grep -i date
date -u
# Compare the two timestamps

# Historical drift rate (with chrony)
cat /var/log/chrony/tracking.log 2>/dev/null | tail -20
```

### Check NTP Service Status

```bash
# Check which NTP service is running
systemctl list-units | grep -E "timesyncd|chrony|ntp|ntpd"

# Check systemd-timesyncd
systemctl status systemd-timesyncd
journalctl -u systemd-timesyncd -n 50

# Check chrony (if installed)
systemctl status chrony
journalctl -u chrony -n 50
chronyc sources -v

# Verify NTP is enabled
timedatectl | grep NTP
```

### Check Network Connectivity to NTP Servers

```bash
# Test connectivity to NTP servers
ping -c 5 pool.ntp.org
ping -c 5 time.google.com

# Check if UDP port 123 is open outbound
# Install: sudo apt install nmap
nmap -sU -p 123 pool.ntp.org 2>/dev/null

# Check firewall rules
sudo ufw status
sudo iptables -L OUTPUT | grep -i ntp

# Verify DNS resolves NTP hostnames
dig pool.ntp.org A
nslookup time.cloudflare.com

# Test NTP response (install: sudo apt install sntp)
sntp pool.ntp.org 2>/dev/null || ntpdate -q pool.ntp.org
```

## Fixing Common Drift Issues

### NTP Service Not Running

```bash
# Enable and start NTP (using systemd-timesyncd)
sudo timedatectl set-ntp true
sudo systemctl restart systemd-timesyncd

# Verify
timedatectl | grep NTP

# If timesyncd fails, try chrony
sudo apt install chrony
sudo systemctl stop systemd-timesyncd
sudo systemctl disable systemd-timesyncd
sudo systemctl enable chrony
sudo systemctl start chrony
```

### Large Clock Offset (NTP Won't Sync)

NTP refuses to step the clock if the offset is too large (to avoid disruption). Force an immediate correction:

```bash
# Force time step with chrony
sudo chronyc makestep

# Or with ntpdate (deprecated but still works)
sudo apt install ntpdate
sudo ntpdate -u pool.ntp.org

# Set time manually if NTP sources are unavailable
sudo timedatectl set-ntp false
sudo timedatectl set-time "$(date -u '+%Y-%m-%d %H:%M:%S')"  # Set approximate time
sudo timedatectl set-ntp true
```

### VM-Specific Clock Drift

Virtual machines have additional clock drift challenges because the hypervisor can pause VM execution (migrations, snapshots) causing the VM clock to fall behind:

```bash
# Check if running in a VM
systemd-detect-virt
# Output: vmware, kvm, microsoft (Hyper-V), xen, none, etc.

# For KVM/QEMU VMs: use the KVM clock
dmesg | grep -i "kvm-clock\|pvclock"
# If kvm-clock is shown, it's already using the hypervisor clock

# For VMware VMs: install vmware tools
# sudo apt install open-vm-tools
# open-vm-tools includes time synchronization

# For VirtualBox VMs:
# VBoxLinuxAdditions handles time sync

# Configure chrony to handle VM step clock scenarios
sudo nano /etc/chrony/chrony.conf
```

```bash
# In chrony.conf for VMs - allow large steps more readily
makestep 0.1 -1   # Step any time offset > 0.1 seconds is detected
                   # -1 = always allowed (not just first 3 updates)
```

### Firewall Blocking NTP

```bash
# Add NTP exception to UFW
sudo ufw allow out 123/udp comment "NTP time sync"

# Verify the rule
sudo ufw status | grep 123

# For iptables
sudo iptables -A OUTPUT -p udp --dport 123 -j ACCEPT
sudo iptables -A INPUT -p udp --sport 123 -j ACCEPT

# Test after adding rule
sudo ntpdate -q pool.ntp.org || chronyc tracking
```

### NTP Server Misconfiguration

```bash
# Check timesyncd configuration
cat /etc/systemd/timesyncd.conf

# If using default config, verify the servers are reachable
dig ntp.ubuntu.com

# Add reliable fallback servers
sudo nano /etc/systemd/timesyncd.conf
```

```bash
[Time]
# Primary servers
NTP=0.ubuntu.pool.ntp.org 1.ubuntu.pool.ntp.org

# Fallback servers
FallbackNTP=time.cloudflare.com time.google.com

# Don't synchronize if offset is too large (prevents bad server from corrupting time)
RootDistanceMaxSec=5
```

```bash
sudo systemctl restart systemd-timesyncd
timedatectl timesync-status
```

## Monitoring Drift Over Time

### Set Up Drift Logging

```bash
# With chrony, enable tracking log
sudo nano /etc/chrony/chrony.conf
```

```bash
# Add logging directives
logdir /var/log/chrony
log tracking measurements statistics
```

```bash
sudo systemctl restart chrony

# View drift history
tail -50 /var/log/chrony/tracking.log

# Fields: Date, Time, IP, Freq(ppm), Skew(ppm), Offset, RMS_offset
# freq ppm = how fast clock is running (positive = fast, negative = slow)
# A large ppm value indicates significant drift
```

### Automated Drift Monitoring Script

```bash
sudo nano /usr/local/bin/check-time-drift
```

```bash
#!/bin/bash
# Time drift monitoring script
# Exit codes: 0=OK, 1=Warning, 2=Critical

WARNING_OFFSET=0.5   # seconds
CRITICAL_OFFSET=2.0  # seconds

# Check if NTP is synchronized
ntp_sync=$(timedatectl show --property=NTPSynchronized --value 2>/dev/null)
if [ "$ntp_sync" != "yes" ]; then
    echo "CRITICAL: NTP is not synchronized!"
    exit 2
fi

# Get current offset using chrony if available
if command -v chronyc >/dev/null 2>&1; then
    # Extract offset from chrony tracking
    offset=$(chronyc tracking | grep "System time" | awk '{print $4}' | sed 's/[^0-9.]//g')

    if [ -z "$offset" ]; then
        echo "WARNING: Could not get offset from chrony"
        exit 1
    fi

    # Compare offset to thresholds
    if awk "BEGIN {exit !($offset > $CRITICAL_OFFSET)}"; then
        echo "CRITICAL: Time offset is ${offset}s (threshold: ${CRITICAL_OFFSET}s)"
        exit 2
    elif awk "BEGIN {exit !($offset > $WARNING_OFFSET)}"; then
        echo "WARNING: Time offset is ${offset}s (threshold: ${WARNING_OFFSET}s)"
        exit 1
    else
        echo "OK: Time offset is ${offset}s"
        exit 0
    fi
else
    echo "WARNING: chrony not available for drift measurement"
    exit 1
fi
```

```bash
sudo chmod +x /usr/local/bin/check-time-drift
sudo /usr/local/bin/check-time-drift
```

## Hardware Clock Issues

```bash
# Check hardware clock
sudo hwclock --show --verbose

# If RTC battery is dead, the clock resets to a wrong time on every boot
# Signs: system time is far in the past after a power cycle
# Solution: Replace CMOS battery

# If RTC is consistently wrong:
# Sync RTC from system clock
sudo hwclock --systohc

# Verify the sync
sudo hwclock --show
timedatectl | grep "RTC time"

# Check if RTC is set to local time or UTC
timedatectl | grep "RTC in local TZ"
# "no" = UTC (correct for most Linux systems)
```

## Analyzing Drift Patterns

```bash
# Plot drift over time (with chrony tracking log)
# Install gnuplot: sudo apt install gnuplot
awk 'NR > 1 {print $2, $5}' /var/log/chrony/tracking.log | \
    gnuplot -p -e "
    set xlabel 'Time';
    set ylabel 'Offset (seconds)';
    set title 'Time Drift';
    plot '-' using 1:2 with lines
    " 2>/dev/null || \
    awk 'NR > 1 {print $1, $2, $5}' /var/log/chrony/tracking.log | tail -20

# Check drift rate (ppm = parts per million, 1 ppm = 1 microsecond per second)
chronyc tracking | grep "Frequency"
# A value of 100 ppm would be 8.64 seconds per day
# Normal values are typically < 50 ppm
```

## When All Else Fails

```bash
# Nuclear option: manually set time, then re-enable NTP

# 1. Disable NTP
sudo timedatectl set-ntp false

# 2. Set time manually to close approximation
sudo timedatectl set-time "$(curl -s http://worldtimeapi.org/api/timezone/UTC | \
    python3 -c "import sys,json; d=json.load(sys.stdin); print(d['datetime'][:19].replace('T',' '))" 2>/dev/null || \
    date '+%Y-%m-%d %H:%M:%S')"

# 3. Re-enable NTP (will slew remaining offset)
sudo timedatectl set-ntp true

# 4. Force immediate sync
sudo chronyc makestep 2>/dev/null || true

# 5. Verify
timedatectl
chronyc tracking
```

Consistent, accurate time is infrastructure that most people only notice when it breaks. Running chrony with proper configuration and a simple monitoring script that alerts when drift exceeds a threshold catches these issues before they cause application failures or security anomalies.
