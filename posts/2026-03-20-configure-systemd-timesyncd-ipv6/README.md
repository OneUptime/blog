# How to Configure systemd-timesyncd for IPv6 NTP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Systemd-timesyncd, NTP, IPv6, Time Synchronization, Systemd, Linux

Description: Configure systemd-timesyncd to synchronize system time over IPv6, pointing it to IPv6-capable NTP servers and verifying synchronization on modern systemd-based Linux systems.

---

systemd-timesyncd is a lightweight SNTP client built into systemd. It's the default time synchronization service on many modern Linux distributions and supports IPv6 natively when IPv6 NTP servers are configured.

## Understanding systemd-timesyncd

systemd-timesyncd is simpler than chrony or ntpd - it's an SNTP (Simple NTP) client only. It can synchronize time but cannot serve NTP to other machines. It's suitable for workstations and client systems.

```bash
# Check if timesyncd is active

sudo systemctl status systemd-timesyncd

# View current synchronization status
timedatectl status

# Show detailed synchronization information
timedatectl show-timesync --all
```

## Configuring IPv6 NTP Servers

Edit the timesyncd configuration file:

```bash
# /etc/systemd/timesyncd.conf

[Time]
# Primary NTP servers - specify IPv6 addresses or hostnames with AAAA records
NTP=2001:db8::1 time.google.com time.cloudflare.com

# Fallback NTP servers (used when primary is unreachable)
FallbackNTP=2606:4700:f1::1 pool.ntp.org

# RootDistanceMaxSec - maximum acceptable root distance
RootDistanceMaxSec=5

# PollIntervalMinSec/MaxSec - polling interval range
PollIntervalMinSec=32
PollIntervalMaxSec=2048
```

After editing, restart timesyncd:

```bash
# Restart timesyncd to apply new NTP server config
sudo systemctl restart systemd-timesyncd

# Check that it picked up the new configuration
timedatectl show-timesync --all
```

## Verifying IPv6 NTP Synchronization

```bash
# Check if time is synchronized
timedatectl status | grep "NTP synchronized"
# Expected: NTP synchronized: yes

# View the current NTP server being used
timedatectl show-timesync | grep ServerName
timedatectl show-timesync | grep ServerAddress

# Check detailed synchronization status
timedatectl timesync-status

# View timesyncd logs
sudo journalctl -u systemd-timesyncd -f
```

## Checking if timesyncd is Using IPv6

```bash
# Watch network connections to see which NTP server is used
sudo ss -unp | grep :123

# Monitor NTP traffic with tcpdump to see if IPv6 is used
sudo tcpdump -i eth0 -n udp port 123

# View DNS resolution used by timesyncd
# (timesyncd will use AAAA records if available)
dig AAAA time.google.com +short
```

## Enabling NTP Synchronization

If NTP synchronization is disabled:

```bash
# Enable NTP synchronization
sudo timedatectl set-ntp true

# Disable NTP synchronization (manual clock management)
sudo timedatectl set-ntp false

# Set timezone (important for correct local time display)
sudo timedatectl set-timezone UTC
# Or your local timezone:
sudo timedatectl set-timezone America/New_York
```

## IPv6-Only Environment Configuration

For systems on IPv6-only networks:

```bash
# /etc/systemd/timesyncd.conf

[Time]
# IPv6-only NTP servers
NTP=2001:db8::ntp1 2001:db8::ntp2

# IPv6 public NTP servers (when on public IPv6)
# Google's NTP: time.google.com (has AAAA records)
# Cloudflare: time.cloudflare.com (has AAAA records)
NTP=time.google.com time.cloudflare.com

FallbackNTP=pool.ntp.org
```

## Transitioning from timesyncd to chrony

For systems that need to serve NTP to other machines, transition to chrony:

```bash
# Disable timesyncd
sudo systemctl disable --now systemd-timesyncd

# Install chrony
sudo apt install chrony -y  # or dnf install chrony

# Start chrony (it automatically disables timesyncd if both are installed)
sudo systemctl enable --now chronyd

# Verify the switch
timedatectl status
# Should show "Network time service: active" via chrony
```

## Troubleshooting timesyncd IPv6 Issues

```bash
# Check timesyncd log for connection errors
sudo journalctl -u systemd-timesyncd --since "1 hour ago"

# Look for IPv6-specific errors
sudo journalctl -u systemd-timesyncd | grep -i "ipv6\|inet6\|network\|unreachable"

# Test manual DNS resolution of your NTP server
systemd-resolve time.google.com
systemd-resolve --type=AAAA time.google.com

# Force DNS refresh
sudo systemd-resolve --flush-caches

# Check if IPv6 is functional on the system
ip -6 addr show
ping6 -c 3 time.google.com
```

systemd-timesyncd provides a lightweight, zero-configuration time synchronization solution that uses IPv6 when configured with IPv6 NTP server addresses, making it ideal for client systems and containers in IPv6 networks.
