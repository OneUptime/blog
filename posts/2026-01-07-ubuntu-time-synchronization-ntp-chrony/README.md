# How to Configure Time Synchronization on Ubuntu with NTP/Chrony

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Linux, NTP, Chrony, DevOps, Time Synchronization

Description: Configure accurate time synchronization on Ubuntu using NTP or Chrony for production servers, containers, and distributed systems.

---

## Introduction

Accurate time synchronization is one of the most critical yet often overlooked aspects of system administration. When your servers drift even a few seconds apart, the consequences can range from confusing log entries to complete system failures. In this guide, we will explore how to configure reliable time synchronization on Ubuntu using NTP (Network Time Protocol) and Chrony.

## Why Time Synchronization Matters

Before diving into configuration, let us understand why accurate time matters for your infrastructure.

### Log Correlation and Debugging

When investigating incidents across distributed systems, correlating logs from multiple servers requires accurate timestamps. A five-second drift between servers can make debugging nearly impossible.

```bash
# Example: Trying to correlate logs from two servers with time drift
# Server A (correct time): 2026-01-07 10:00:00 - User login request received
# Server B (5 seconds behind): 2026-01-07 09:59:55 - Authentication service responded
# This makes it appear the response came before the request!
```

### TLS/SSL Certificate Validation

Certificates have validity periods defined by timestamps. If your server clock is wrong, valid certificates may appear expired or not yet valid.

```bash
# A certificate valid from 2026-01-01 to 2027-01-01 will fail validation
# if your server thinks it is still December 2025 or already February 2027
```

### Distributed Systems and Databases

Distributed databases like Cassandra, CockroachDB, and Spanner rely on synchronized clocks for conflict resolution and consistency guarantees.

### Authentication Protocols

Kerberos and other time-sensitive authentication protocols typically allow only a five-minute clock skew. Larger deviations cause authentication failures.

### Scheduled Tasks and Cron Jobs

Jobs scheduled across multiple servers need synchronized clocks to run at the intended times.

---

## Understanding Ubuntu's Default: systemd-timesyncd

Ubuntu 16.04 and later use `systemd-timesyncd` as the default time synchronization daemon. It is a lightweight SNTP (Simple Network Time Protocol) client.

### Checking the Current Time Sync Status

Use timedatectl to view the current time synchronization status on your system.

```bash
timedatectl status
```

You will see output similar to:

```
               Local time: Tue 2026-01-07 10:30:45 UTC
           Universal time: Tue 2026-01-07 10:30:45 UTC
                 RTC time: Tue 2026-01-07 10:30:45
                Time zone: UTC (UTC, +0000)
System clock synchronized: yes
              NTP service: active
          RTC in local TZ: no
```

### Viewing systemd-timesyncd Status

Check if timesyncd is running and connected to NTP servers.

```bash
systemctl status systemd-timesyncd
```

### Viewing Detailed Sync Information

The timesync-status command shows detailed synchronization metrics.

```bash
timedatectl timesync-status
```

Example output showing server connection and sync quality:

```
       Server: 91.189.89.198 (ntp.ubuntu.com)
Poll interval: 34min 8s (min: 32s; max 34min 8s)
         Leap: normal
      Version: 4
      Stratum: 2
    Reference: 11FD1CFB
    Precision: 1us (-24)
Root distance: 27.735ms (max: 5s)
       Offset: +2.118ms
        Delay: 42.566ms
       Jitter: 1.210ms
 Packet count: 12
    Frequency: +14.293ppm
```

### Configuring systemd-timesyncd

Edit the timesyncd configuration to specify custom NTP servers.

```bash
sudo nano /etc/systemd/timesyncd.conf
```

Configure your preferred NTP servers:

```ini
[Time]
# Primary NTP servers (space-separated)
NTP=0.pool.ntp.org 1.pool.ntp.org 2.pool.ntp.org 3.pool.ntp.org

# Fallback servers if primary servers are unreachable
FallbackNTP=ntp.ubuntu.com time.google.com
```

Restart the service to apply changes:

```bash
sudo systemctl restart systemd-timesyncd
```

### Limitations of systemd-timesyncd

While adequate for basic use cases, timesyncd has limitations:

- Cannot act as an NTP server for other machines
- No hardware clock (RTC) discipline
- Less accurate than full NTP implementations
- Limited monitoring and statistics
- No support for authentication

For production environments, consider Chrony or NTP daemon instead.

---

## Installing and Configuring Chrony

Chrony is the recommended time synchronization solution for modern Linux systems. It offers better accuracy, faster synchronization, and works well in environments with intermittent connectivity.

### Why Choose Chrony Over NTP

Chrony offers several advantages for production environments:

- Faster initial synchronization (seconds vs. minutes)
- Better performance on virtual machines
- Works with intermittent network connections
- Lower memory footprint
- Hardware timestamping support
- Can act as both client and server

### Installing Chrony

First, disable timesyncd to avoid conflicts, then install Chrony.

```bash
# Stop and disable timesyncd
sudo systemctl stop systemd-timesyncd
sudo systemctl disable systemd-timesyncd

# Install Chrony
sudo apt update
sudo apt install chrony -y
```

### Verifying Chrony Installation

Check that Chrony is running after installation.

```bash
sudo systemctl status chrony
```

### Understanding Chrony Configuration

The main configuration file is located at /etc/chrony/chrony.conf.

```bash
sudo nano /etc/chrony/chrony.conf
```

Here is a production-ready configuration with detailed comments:

```conf
# Pool servers provide multiple NTP servers through a single address
# The 'iburst' option sends multiple requests initially for faster sync
# The 'maxsources' limits how many servers to use from the pool
pool ntp.ubuntu.com iburst maxsources 4
pool 0.pool.ntp.org iburst maxsources 2
pool 1.pool.ntp.org iburst maxsources 2

# Specific server entries for known reliable time sources
# Google and Cloudflare provide highly accurate public NTP servers
server time.google.com iburst
server time.cloudflare.com iburst

# Keyfile for NTP authentication (optional but recommended for security)
keyfile /etc/chrony/chrony.keys

# Directory for drift file - stores frequency offset for faster sync after reboot
driftfile /var/lib/chrony/chrony.drift

# Log files for tracking sync behavior and issues
logdir /var/log/chrony
log tracking measurements statistics

# Maximum allowed offset for initial correction
# If offset is larger, Chrony steps the clock instead of slewing
maxupdateskew 100.0

# Enable RTC (Real Time Clock) synchronization
# Keeps hardware clock accurate for correct time on boot
rtcsync

# Step the clock if offset is larger than 1 second during first 3 updates
# This ensures fast initial sync without affecting long-running systems
makestep 1 3

# Allow local network to query this server (configure for your network)
# Comment out if this machine should not serve time to others
# allow 192.168.0.0/16
# allow 10.0.0.0/8

# Specify the leap seconds file for correct handling of leap seconds
leapsectz right/UTC
```

### Applying Configuration Changes

Restart Chrony to apply the new configuration.

```bash
sudo systemctl restart chrony
```

### Checking Chrony Sources

View the NTP sources Chrony is using and their status.

```bash
chronyc sources -v
```

Example output with explanation:

```
  .-- Source mode  '^' = server, '=' = peer, '#' = local clock.
 / .- Source state '*' = current best, '+' = combined, '-' = not combined,
| /             'x' = may be in error, '~' = too variable, '?' = unusable.
||                                                 .- xxxx [ yyyy ] +/- zzzz
||      Reachability register (octal) -.           |  xxxx = adjusted offset,
||      Log2(Polling interval) --.      |          |  yyyy = measured offset,
||                                \     |          |  zzzz = estimated error.
||                                 |    |           \
MS Name/IP address         Stratum Poll Reach LastRx Last sample
===============================================================================
^* time.google.com               1   6   377    34   +412us[ +498us] +/-   13ms
^+ time.cloudflare.com           3   6   377    35   -892us[-806us] +/-   28ms
^+ pugot.canonical.com           2   6   377    33  +1152us[+1237us] +/-   74ms
^+ alphyn.canonical.com          2   6   377    34  +2311us[+2396us] +/-   82ms
```

### Checking Chrony Tracking

View detailed tracking information about the current synchronization.

```bash
chronyc tracking
```

Example output showing sync quality metrics:

```
Reference ID    : D8EF2308 (time.google.com)
Stratum         : 2
Ref time (UTC)  : Tue Jan 07 10:45:32 2026
System time     : 0.000000423 seconds fast of NTP time
Last offset     : +0.000000512 seconds
RMS offset      : 0.000001245 seconds
Frequency       : 14.293 ppm fast
Residual freq   : +0.001 ppm
Skew            : 0.124 ppm
Root delay      : 0.025412345 seconds
Root dispersion : 0.001234567 seconds
Update interval : 64.5 seconds
Leap status     : Normal
```

### Monitoring Chrony Statistics

View statistics about NTP server reliability.

```bash
chronyc sourcestats -v
```

---

## Setting Up an NTP Server with Chrony

You can configure Chrony to serve time to other machines on your network.

### Configuring Chrony as a Server

Edit the configuration to allow client connections.

```bash
sudo nano /etc/chrony/chrony.conf
```

Add these lines to enable server functionality:

```conf
# Allow clients from your local network to sync time
# Adjust the network range to match your infrastructure
allow 192.168.0.0/16
allow 10.0.0.0/8
allow 172.16.0.0/12

# Optionally, allow all clients (not recommended for public servers)
# allow all

# Set the stratum level for this server
# Stratum 10 indicates a less reliable source, adjust based on your setup
local stratum 10

# Rate limiting to prevent abuse
# Limit clients to 8 requests per second with a burst of 32
ratelimit interval 1 burst 8 leak 2
```

### Opening Firewall for NTP

Allow NTP traffic through the firewall on UDP port 123.

```bash
# Using UFW (Uncomplicated Firewall)
sudo ufw allow 123/udp
sudo ufw reload

# Verify the rule was added
sudo ufw status
```

### Configuring Clients to Use Your NTP Server

On client machines, point them to your NTP server.

```bash
sudo nano /etc/chrony/chrony.conf
```

Add your server as the primary time source:

```conf
# Your internal NTP server
server ntp.internal.example.com iburst prefer

# Fallback to public pools if internal server is unavailable
pool 0.pool.ntp.org iburst maxsources 2
pool 1.pool.ntp.org iburst maxsources 2
```

---

## Hardware Clock Synchronization

The hardware clock (RTC - Real Time Clock) maintains time when the system is powered off. Proper synchronization ensures correct time on boot.

### Understanding System Time vs. Hardware Time

Linux maintains two clocks: the system clock (in memory) and the hardware clock (RTC). Understanding the difference is crucial.

```bash
# View system time (maintained by kernel)
date

# View hardware clock time
sudo hwclock --show
```

### Synchronizing Hardware Clock with System Time

Manually sync the hardware clock to match the current system time.

```bash
# Write system time to hardware clock
sudo hwclock --systohc

# Verify the hardware clock was updated
sudo hwclock --show
```

### Setting Hardware Clock to UTC

Best practice is to keep the hardware clock in UTC to avoid timezone and DST issues.

```bash
# Set hardware clock to UTC
sudo timedatectl set-local-rtc 0

# Verify the setting
timedatectl status
```

The output should show "RTC in local TZ: no".

### Automatic Hardware Clock Sync with Chrony

Chrony can automatically keep the hardware clock synchronized. Ensure rtcsync is enabled in your configuration.

```conf
# In /etc/chrony/chrony.conf
# This directive enables automatic RTC synchronization
rtcsync
```

### Handling Virtualized Environments

Virtual machines may have unreliable hardware clocks. Configure appropriately.

```conf
# For virtual machines, you may want to disable RTC sync
# and rely solely on NTP synchronization
# Comment out or remove: rtcsync

# Instead, add more aggressive time stepping for VMs
makestep 1 -1

# This allows stepping the clock anytime the offset exceeds 1 second
```

---

## Monitoring Time Drift

Monitoring time synchronization is essential for production systems. Drift can indicate network issues or failing hardware.

### Creating a Time Drift Monitoring Script

This script checks time drift and alerts if it exceeds thresholds.

```bash
#!/bin/bash
# Filename: /usr/local/bin/check-time-drift.sh
# Purpose: Monitor NTP time drift and alert if threshold exceeded

# Configuration
THRESHOLD_MS=100  # Alert if drift exceeds 100 milliseconds
LOG_FILE="/var/log/time-drift.log"
ALERT_EMAIL="admin@example.com"

# Get current offset from Chrony in milliseconds
OFFSET=$(chronyc tracking | grep "System time" | awk '{print $4 * 1000}')
OFFSET_ABS=${OFFSET#-}  # Remove negative sign for comparison

# Log the current offset
echo "$(date '+%Y-%m-%d %H:%M:%S') - Time offset: ${OFFSET}ms" >> "$LOG_FILE"

# Check if offset exceeds threshold
if (( $(echo "$OFFSET_ABS > $THRESHOLD_MS" | bc -l) )); then
    MESSAGE="WARNING: Time drift of ${OFFSET}ms exceeds threshold of ${THRESHOLD_MS}ms on $(hostname)"
    echo "$MESSAGE" >> "$LOG_FILE"

    # Send alert email (requires mailutils)
    # echo "$MESSAGE" | mail -s "Time Drift Alert - $(hostname)" "$ALERT_EMAIL"

    # Or send to monitoring system via curl
    # curl -X POST "https://monitoring.example.com/alert" \
    #      -H "Content-Type: application/json" \
    #      -d "{\"message\": \"$MESSAGE\", \"severity\": \"warning\"}"

    exit 1
fi

exit 0
```

Make the script executable and add to cron:

```bash
# Make the script executable
sudo chmod +x /usr/local/bin/check-time-drift.sh

# Add to crontab to run every 5 minutes
(crontab -l 2>/dev/null; echo "*/5 * * * * /usr/local/bin/check-time-drift.sh") | crontab -
```

### Prometheus Metrics for Time Sync

Export time synchronization metrics for Prometheus monitoring.

```bash
#!/bin/bash
# Filename: /usr/local/bin/chrony-metrics.sh
# Purpose: Export Chrony metrics for Prometheus node_exporter textfile collector

METRICS_DIR="/var/lib/prometheus/node-exporter"
METRICS_FILE="${METRICS_DIR}/chrony.prom"

# Ensure the metrics directory exists
mkdir -p "$METRICS_DIR"

# Get tracking information from Chrony
TRACKING=$(chronyc -c tracking)

# Parse the CSV output from Chrony
REF_ID=$(echo "$TRACKING" | cut -d, -f1)
STRATUM=$(echo "$TRACKING" | cut -d, -f3)
SYSTEM_TIME=$(echo "$TRACKING" | cut -d, -f5)
LAST_OFFSET=$(echo "$TRACKING" | cut -d, -f6)
RMS_OFFSET=$(echo "$TRACKING" | cut -d, -f7)
FREQUENCY=$(echo "$TRACKING" | cut -d, -f8)
ROOT_DELAY=$(echo "$TRACKING" | cut -d, -f11)
ROOT_DISPERSION=$(echo "$TRACKING" | cut -d, -f12)

# Write metrics in Prometheus format
cat > "${METRICS_FILE}.tmp" << EOF
# HELP chrony_stratum Current stratum level
# TYPE chrony_stratum gauge
chrony_stratum $STRATUM

# HELP chrony_system_time_seconds Offset of system time from NTP time
# TYPE chrony_system_time_seconds gauge
chrony_system_time_seconds $SYSTEM_TIME

# HELP chrony_last_offset_seconds Offset of last NTP update
# TYPE chrony_last_offset_seconds gauge
chrony_last_offset_seconds $LAST_OFFSET

# HELP chrony_rms_offset_seconds RMS offset
# TYPE chrony_rms_offset_seconds gauge
chrony_rms_offset_seconds $RMS_OFFSET

# HELP chrony_frequency_ppm Frequency offset in ppm
# TYPE chrony_frequency_ppm gauge
chrony_frequency_ppm $FREQUENCY

# HELP chrony_root_delay_seconds Total round-trip delay to reference clock
# TYPE chrony_root_delay_seconds gauge
chrony_root_delay_seconds $ROOT_DELAY

# HELP chrony_root_dispersion_seconds Total dispersion to reference clock
# TYPE chrony_root_dispersion_seconds gauge
chrony_root_dispersion_seconds $ROOT_DISPERSION
EOF

# Atomically move the temp file to the final location
mv "${METRICS_FILE}.tmp" "$METRICS_FILE"
```

### Grafana Dashboard Query Examples

Use these Prometheus queries in Grafana to visualize time sync:

```promql
# Current time offset in milliseconds
chrony_system_time_seconds * 1000

# Alert if offset exceeds 50ms
chrony_system_time_seconds > 0.05 or chrony_system_time_seconds < -0.05

# Stratum level (lower is better, 1 is directly connected to reference)
chrony_stratum

# Track frequency drift over time
rate(chrony_frequency_ppm[1h])
```

---

## Kubernetes and Container Considerations

Containers present unique challenges for time synchronization. Here is how to handle them properly.

### Understanding Container Time

Containers share the host kernel's clock. They cannot run their own NTP daemons effectively.

```bash
# Inside a container, time comes from the host kernel
# This command shows the same time as the host
docker run --rm alpine date

# Containers cannot modify system time (without privileges)
docker run --rm alpine ntpd -q
# This will fail with permission denied
```

### Best Practices for Container Time

Configure time sync on the host and ensure containers use it correctly.

```yaml
# Example Kubernetes DaemonSet to verify time sync on nodes
# Filename: time-sync-checker.yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: time-sync-checker
  namespace: kube-system
spec:
  selector:
    matchLabels:
      name: time-sync-checker
  template:
    metadata:
      labels:
        name: time-sync-checker
    spec:
      hostPID: true
      containers:
      - name: checker
        image: alpine:latest
        command:
        - /bin/sh
        - -c
        - |
          while true; do
            # Compare container time with external NTP server
            apk add --no-cache chrony
            OFFSET=$(chronyd -Q "server time.google.com iburst" 2>&1 | grep offset | awk '{print $3}')
            echo "Time offset from time.google.com: $OFFSET seconds"
            sleep 300
          done
        securityContext:
          privileged: true
```

### Configuring Host Time Sync for Kubernetes Nodes

Ansible playbook to configure Chrony on all Kubernetes nodes.

```yaml
# Filename: configure-time-sync.yaml
# Ansible playbook for Kubernetes node time synchronization
---
- name: Configure time synchronization on Kubernetes nodes
  hosts: kubernetes_nodes
  become: true
  vars:
    ntp_servers:
      - time.google.com
      - time.cloudflare.com
    internal_ntp_server: ntp.internal.example.com

  tasks:
    - name: Install Chrony
      apt:
        name: chrony
        state: present
        update_cache: yes

    - name: Stop and disable systemd-timesyncd
      systemd:
        name: systemd-timesyncd
        state: stopped
        enabled: no
      ignore_errors: yes

    - name: Configure Chrony
      template:
        src: chrony.conf.j2
        dest: /etc/chrony/chrony.conf
        owner: root
        group: root
        mode: '0644'
      notify: Restart Chrony

    - name: Start and enable Chrony
      systemd:
        name: chrony
        state: started
        enabled: yes

  handlers:
    - name: Restart Chrony
      systemd:
        name: chrony
        state: restarted
```

Chrony configuration template for Kubernetes nodes:

```conf
# Filename: chrony.conf.j2
# Chrony configuration for Kubernetes nodes

# Internal NTP server takes priority
server {{ internal_ntp_server }} iburst prefer

# Public NTP servers as fallback
{% for server in ntp_servers %}
server {{ server }} iburst
{% endfor %}

# Drift file for faster sync after reboot
driftfile /var/lib/chrony/chrony.drift

# Enable kernel synchronization of RTC
rtcsync

# Allow stepping the clock for initial sync
# Critical for Kubernetes nodes that may have significant drift after provisioning
makestep 1 3

# Log directory
logdir /var/log/chrony
log tracking measurements statistics

# Enable hardware timestamping if supported
# Improves accuracy on physical hardware
hwtimestamp *
```

### Docker Compose with Time Zone Configuration

Ensure containers have correct timezone configuration.

```yaml
# Filename: docker-compose.yaml
version: '3.8'

services:
  app:
    image: myapp:latest
    environment:
      # Set timezone environment variable
      - TZ=UTC
    volumes:
      # Mount host timezone and localtime for consistent time handling
      - /etc/timezone:/etc/timezone:ro
      - /etc/localtime:/etc/localtime:ro
    # Note: Actual time sync happens on the host, not in containers
```

### Kubernetes Pod Timezone Configuration

Configure timezone in Kubernetes pods properly.

```yaml
# Filename: app-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: time-sensitive-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: time-sensitive-app
  template:
    metadata:
      labels:
        app: time-sensitive-app
    spec:
      containers:
      - name: app
        image: myapp:latest
        env:
        # Set timezone via environment variable
        - name: TZ
          value: "UTC"
        volumeMounts:
        # Mount host timezone files (optional, depends on image)
        - name: tz-config
          mountPath: /etc/localtime
          readOnly: true
      volumes:
      - name: tz-config
        hostPath:
          path: /etc/localtime
          type: File
```

---

## Troubleshooting Common Issues

Here are solutions to common time synchronization problems.

### Chrony Not Synchronizing

Diagnose and fix connectivity issues with NTP servers.

```bash
# Check if Chrony can reach any NTP servers
chronyc sources

# If sources show '?' status, check network connectivity
ping -c 3 time.google.com

# Verify UDP port 123 is not blocked
sudo nc -zuv time.google.com 123

# Check firewall rules
sudo iptables -L -n | grep 123
sudo ufw status

# Verify DNS resolution
nslookup time.google.com

# Try forcing an immediate sync
sudo chronyc makestep
```

### Large Initial Time Offset

Handle systems with significant time drift on boot.

```bash
# Force immediate time step (use with caution on production)
sudo chronyc makestep

# Or configure aggressive stepping in chrony.conf
# makestep 1 -1
# This allows stepping anytime offset exceeds 1 second
```

### Time Drifting Between Syncs

Improve sync frequency for systems with unstable clocks.

```bash
# Check current polling interval
chronyc sources

# Reduce minimum polling interval in chrony.conf
# Add minpoll and maxpoll to server lines
# server time.google.com iburst minpoll 4 maxpoll 6
# This sets polling between 16 seconds (2^4) and 64 seconds (2^6)
```

### Conflict Between Chrony and Other NTP Services

Ensure only one time sync service is running.

```bash
# Check for running NTP services
systemctl list-units --type=service | grep -E "ntp|chrony|timesyncd"

# Stop and disable conflicting services
sudo systemctl stop systemd-timesyncd
sudo systemctl disable systemd-timesyncd

sudo systemctl stop ntp
sudo systemctl disable ntp

# Ensure only Chrony is running
sudo systemctl enable chrony
sudo systemctl start chrony
```

### Virtual Machine Time Issues

VMs often have clock drift issues due to CPU scheduling.

```bash
# Check if VM tools time sync is enabled (VMware)
vmware-toolbox-cmd timesync status

# Disable VM tools time sync if using Chrony
vmware-toolbox-cmd timesync disable

# For KVM/QEMU, check if kvm-clock is being used
dmesg | grep -i clock

# Add aggressive makestep for VMs in chrony.conf
# makestep 1 -1
```

---

## Security Considerations

Secure your NTP infrastructure against attacks and misuse.

### NTP Amplification Attack Prevention

Configure Chrony to prevent being used in DDoS attacks.

```conf
# In /etc/chrony/chrony.conf

# Only allow specific networks to query this server
allow 192.168.0.0/16
allow 10.0.0.0/8

# Deny all other clients
deny all

# Enable rate limiting to prevent abuse
ratelimit interval 1 burst 8 leak 2

# Disable command port if not needed for remote management
cmdport 0
```

### NTP Authentication with Symmetric Keys

Set up authenticated NTP for trusted communication.

```bash
# Generate an NTP key
sudo bash -c 'echo "1 SHA1 $(head -c 32 /dev/urandom | base64)" > /etc/chrony/chrony.keys'
sudo chmod 640 /etc/chrony/chrony.keys
sudo chown root:_chrony /etc/chrony/chrony.keys
```

Configure the server to use the key:

```conf
# In /etc/chrony/chrony.conf on the server
keyfile /etc/chrony/chrony.keys

# Server configuration for authenticated clients
# allow 192.168.1.0/24 key 1
```

Configure clients to use authentication:

```conf
# In /etc/chrony/chrony.conf on clients
keyfile /etc/chrony/chrony.keys
server ntp.internal.example.com iburst key 1
```

### Network Time Security (NTS)

NTS provides authenticated and encrypted time synchronization (requires Chrony 4.0+).

```conf
# In /etc/chrony/chrony.conf
# Use NTS-enabled servers for secure time sync
server time.cloudflare.com iburst nts

# Specify where to store NTS keys
ntsdumpdir /var/lib/chrony

# Verify NTS is working
# chronyc -n sources -v
# Look for 'N' in the 'S' column indicating NTS is active
```

---

## Complete Production Configuration Example

Here is a comprehensive Chrony configuration for production servers.

```conf
# /etc/chrony/chrony.conf
# Production-ready Chrony configuration

# ============================================
# NTP Server Sources
# ============================================

# Primary: Internal NTP infrastructure
server ntp1.internal.example.com iburst prefer
server ntp2.internal.example.com iburst

# Secondary: Public NTP pools
pool 0.pool.ntp.org iburst maxsources 2
pool 1.pool.ntp.org iburst maxsources 2

# Tertiary: Reliable public servers with NTS
server time.cloudflare.com iburst nts

# ============================================
# Clock Discipline
# ============================================

# Store frequency offset for faster sync after reboot
driftfile /var/lib/chrony/chrony.drift

# Step clock if offset exceeds 1 second in first 3 updates
makestep 1 3

# Maximum rate of adjustment (ppm per second)
maxslewrate 500

# ============================================
# Hardware Clock
# ============================================

# Sync RTC with system time every 11 minutes
rtcsync

# ============================================
# Logging
# ============================================

logdir /var/log/chrony
log tracking measurements statistics

# ============================================
# Server Configuration (if serving time)
# ============================================

# Allow local network clients
allow 192.168.0.0/16
allow 10.0.0.0/8

# Rate limiting
ratelimit interval 1 burst 8 leak 2

# Local stratum if network is isolated
local stratum 10

# ============================================
# Security
# ============================================

# Authentication keys
keyfile /etc/chrony/chrony.keys

# NTS key storage
ntsdumpdir /var/lib/chrony

# ============================================
# Performance Tuning
# ============================================

# Enable hardware timestamping on all interfaces
hwtimestamp *

# Minimum and maximum polling intervals
# Adjust based on network conditions
# minpoll 4 = 16 seconds, maxpoll 10 = 1024 seconds

# ============================================
# Leap Second Handling
# ============================================

leapsectz right/UTC
```

---

## Summary

Proper time synchronization is fundamental to reliable system operation. Here are the key takeaways:

1. **Use Chrony** for production systems instead of the default systemd-timesyncd
2. **Configure multiple NTP sources** for redundancy
3. **Enable RTC synchronization** to maintain accurate time across reboots
4. **Monitor time drift** as part of your infrastructure monitoring
5. **Secure your NTP infrastructure** against attacks and misuse
6. **For Kubernetes**, sync time on host nodes rather than in containers

By following this guide, you will have reliable, accurate time synchronization across your infrastructure, ensuring proper log correlation, valid certificate handling, and correct operation of distributed systems.
