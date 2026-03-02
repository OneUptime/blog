# How to Set Up Watchdog Timer on Ubuntu Server

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Reliability, Hardware, System Administration

Description: Configure hardware and software watchdog timers on Ubuntu Server to automatically recover from system hangs, kernel panics, and unresponsive states.

---

A watchdog timer is a countdown mechanism that reboots the system if it is not periodically reset by a functioning process. The idea is simple: healthy systems can kick the watchdog; stuck systems cannot. If the watchdog is not kicked within its timeout period, it forces a hard reset. This is essential for servers that need to recover automatically from hangs, kernel panics, or catastrophic software failures without human intervention.

On physical hardware, the watchdog is often a dedicated circuit on the motherboard. On virtual machines, hypervisors typically provide a software-emulated watchdog. Either way, Ubuntu handles both through the same software stack.

## Types of Watchdogs on Ubuntu

### Hardware Watchdog

Most server motherboards include an Intel TCO (Timer Counter Output) watchdog or similar circuit, exposed as `/dev/watchdog` or `/dev/watchdog0`. This is the most reliable option because it survives kernel hangs.

### Software Watchdog (softdog)

The `softdog` kernel module provides a software-only watchdog. It is less reliable than hardware watchdogs (a completely frozen kernel cannot kick it), but it works in environments without hardware watchdog support, including many virtual machines.

### Virtual Machine Watchdogs

Common VM watchdog devices:

- **VMware**: No native watchdog; use softdog or configure a QEMU watchdog in KVM VMs
- **KVM/QEMU**: Supports i6300esb watchdog device
- **AWS EC2**: No hardware watchdog; use softdog or third-party tools
- **Google Cloud**: Provides a watchdog via guest agent

## Checking for Hardware Watchdog Support

```bash
# Check if /dev/watchdog exists
ls -la /dev/watchdog*

# Check which kernel modules provide watchdog support
lsmod | grep -i watch
find /lib/modules/$(uname -r) -name "*watch*" -o -name "*wdt*" 2>/dev/null | head -20

# Check dmesg for watchdog messages
dmesg | grep -i watchdog

# Check for Intel TCO watchdog (common on Intel server boards)
dmesg | grep -i tco
```

## Loading the Watchdog Driver

### For Systems Without Hardware Watchdog

Load the software watchdog module:

```bash
# Load softdog kernel module
sudo modprobe softdog

# Verify it loaded
lsmod | grep softdog

# Check the device
ls -la /dev/watchdog
```

Make the module load automatically at boot:

```bash
echo "softdog" | sudo tee /etc/modules-load.d/softdog.conf
```

### For KVM Virtual Machines

If your VM has the i6300esb watchdog device configured:

```bash
# Load the driver
sudo modprobe i6300esb

# Check for the device
ls -la /dev/watchdog*
```

On the KVM host side, add the watchdog device to the VM:

```xml
<!-- Add to VM XML configuration -->
<watchdog model='i6300esb' action='reset'/>
```

## Installing and Configuring watchdog Daemon

The `watchdog` package provides a daemon that periodically kicks the hardware watchdog and can perform health checks:

```bash
sudo apt update
sudo apt install watchdog -y
```

Configure the watchdog daemon:

```bash
sudo nano /etc/watchdog.conf
```

```ini
# /etc/watchdog.conf - watchdog daemon configuration

# Path to the watchdog device
watchdog-device = /dev/watchdog

# How often to kick the watchdog (in seconds)
# Must be less than the watchdog timeout
interval = 10

# Watchdog hardware timeout (seconds)
# The hardware resets if not kicked within this time
watchdog-timeout = 60

# Maximum load average before triggering a reset
# 1-minute, 5-minute, 15-minute load averages
max-load-1 = 24
max-load-5 = 18
max-load-15 = 12

# Minimum free memory in pages (4096 bytes each)
# min-memory = 1
# Set to protect against OOM situations
# 64MB free minimum
min-memory = 16384

# Maximum temperature (in Celsius * 1000)
# max-temperature = 90

# Files to test for writes (test that filesystem is not read-only)
# file = /var/log/watchdog-test
# change = 1407

# Test script to run - reset if it returns non-zero
# test-binary = /usr/local/bin/watchdog-test.sh
# test-timeout = 60

# Ping test - reset if this host is unreachable
# ping = 8.8.8.8

# Interface to check for activity
# interface = eth0

# Repair binary - run before reboot, give it a chance to fix things
# repair-binary = /usr/local/bin/watchdog-repair.sh
# repair-timeout = 60

# Log additional messages
verbose = yes

# Realtime priority for the watchdog process
realtime = yes
priority = 1
```

Enable and start the watchdog daemon:

```bash
sudo systemctl enable watchdog
sudo systemctl start watchdog
sudo systemctl status watchdog
```

## Using systemd's Built-in Watchdog

systemd has native watchdog integration. Services can notify systemd that they are healthy using `sd_notify()`, and systemd kicks the hardware watchdog when it receives these notifications.

Enable systemd watchdog in `/etc/systemd/system.conf`:

```bash
sudo nano /etc/systemd/system.conf
```

```ini
[Manager]
# How often to check if watchdog needs kicking (in microseconds)
RuntimeWatchdogSec=30

# Watchdog timeout before forced reboot
RuntimeWatchdogPreGoalSec=10s

# Reboot timeout watchdog
RebootWatchdogSec=10min

# Optional: hardware watchdog device
WatchdogDevice=/dev/watchdog
```

```bash
sudo systemctl daemon-reexec
```

With this configuration, systemd itself kicks the watchdog, and if systemd crashes or hangs, the hardware watchdog triggers a reboot.

## Configuring Services to Use the Watchdog

For critical services, configure them to participate in the watchdog framework. Services that send `WATCHDOG=1` to systemd tell it "I am healthy":

```bash
sudo systemctl edit my-critical-service.service
```

```ini
[Service]
# Expect the service to send watchdog notifications every 30 seconds
WatchdogSec=30

# Restart the service if it misses watchdog notifications
Restart=always
RestartSec=5
```

For services written with watchdog support (those that use `sd_notify`), this causes automatic restart if the service hangs. For services that do not support `sd_notify`, you can use a wrapper.

## Writing a Custom Health Check Script

The `watchdog` daemon can run a test binary and reboot if it fails. Use this for application-specific health checks:

```bash
sudo nano /usr/local/bin/watchdog-health-check.sh
```

```bash
#!/bin/bash
# Watchdog health check script
# Return 0 for healthy, non-zero to trigger watchdog action

# Check that PostgreSQL is responding
if ! pg_isready -q -t 5; then
    echo "$(date): PostgreSQL not responding" >> /var/log/watchdog-health.log
    exit 1
fi

# Check that nginx is serving requests
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 http://127.0.0.1/health 2>/dev/null)
if [ "$HTTP_CODE" != "200" ]; then
    echo "$(date): Nginx health check failed (HTTP $HTTP_CODE)" >> /var/log/watchdog-health.log
    exit 1
fi

# Check disk space - alert if root filesystem is over 95% full
DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | tr -d '%')
if [ "$DISK_USAGE" -gt 95 ]; then
    echo "$(date): Root filesystem at ${DISK_USAGE}% - critical" >> /var/log/watchdog-health.log
    exit 1
fi

# All checks passed
exit 0
```

```bash
sudo chmod +x /usr/local/bin/watchdog-health-check.sh
```

Update `watchdog.conf` to use it:

```ini
test-binary = /usr/local/bin/watchdog-health-check.sh
test-timeout = 30
```

Restart the watchdog service:

```bash
sudo systemctl restart watchdog
```

## Using softdog with wd_keepalive

If you only want the watchdog hardware to be kept alive without the full watchdog daemon's health checks, `wd_keepalive` is a lighter-weight option:

```bash
# wd_keepalive is included in the watchdog package
# It just kicks /dev/watchdog without health checks
sudo systemctl enable wd_keepalive
sudo systemctl start wd_keepalive
```

This is useful for preventing spurious reboots during high-load periods when you want the hardware watchdog armed but do not need health check logic.

## Configuring Recovery Actions on KVM

For KVM-managed virtual machines, configure what action the hypervisor takes when the guest watchdog fires:

```xml
<!-- In the VM's XML definition -->
<watchdog model='i6300esb' action='reset'/>
```

Available actions:

| Action | Effect |
|--------|--------|
| `reset` | Hard reset the VM |
| `shutdown` | Graceful shutdown |
| `poweroff` | Force power off |
| `pause` | Pause the VM (for debugging) |
| `none` | No action (watchdog fires but nothing happens) |
| `dump` | Core dump then reset |

## Testing the Watchdog

Before relying on the watchdog in production, verify it actually reboots the system. Test in a non-production environment:

```bash
# WARNING: This will crash the system
# Trigger a kernel panic to test watchdog recovery
# Only run in a test environment

# Option 1: Kernel panic via sysrq
echo c | sudo tee /proc/sysrq-trigger

# Option 2: Stop the watchdog daemon and wait for timeout
sudo systemctl stop watchdog
# After 'watchdog-timeout' seconds, the system should reboot
```

To test without a hard crash, verify the watchdog device is being kicked regularly:

```bash
# Watch the watchdog daemon log
sudo journalctl -u watchdog -f

# Check that /dev/watchdog is being written to
sudo strace -e write -p $(pgrep watchdog) 2>&1 | grep watchdog
```

## Monitoring Watchdog Status

Integrate watchdog health with your monitoring platform. The watchdog daemon logs to syslog:

```bash
# View watchdog logs
sudo journalctl -u watchdog --since "24 hours ago"

# Check system reboot history - unexplained reboots may indicate watchdog firing
last reboot | head -20

# Check if system rebooted due to watchdog (look for kernel panic or watchdog in dmesg)
dmesg | grep -i "watchdog\|panic\|oops"
```

For production servers, track unexpected reboots through [OneUptime](https://oneuptime.com) uptime monitoring - a sudden transition from "down" to "up" after a brief outage may indicate the watchdog fired. Setting up a startup probe that fires immediately when the system comes back online can alert your team that an automatic recovery occurred.

## Summary

Watchdog timers on Ubuntu provide a hardware-level safety net for servers that need to self-recover from hangs and crashes. Enable the hardware watchdog driver, install and configure the `watchdog` daemon with appropriate load and memory thresholds, add application-specific health checks via test scripts, and verify the configuration actually triggers a reboot in a test environment before relying on it in production. Combined with monitoring and alerting, watchdog recovery events become visible incidents rather than silent automatic recoveries that go unnoticed.
