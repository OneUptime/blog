# How to Configure ntpd to Listen on IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ntpd, NTP, IPv6, Time Synchronization, Linux, Network Configuration

Description: Configure the ntpd daemon to listen on IPv6 interfaces for time synchronization, including interface binding, access control, and verification steps.

---

By default, ntpd may not listen on IPv6 interfaces depending on your distribution and configuration. This guide covers how to explicitly configure ntpd to listen on IPv6 and serve NTP to IPv6 clients.

## Checking Current ntpd Listening State

Before making changes, check if ntpd is already listening on IPv6:

```bash
# Check all UDP sockets on port 123

ss -ulnp | grep :123

# Look for [::]:123 which indicates IPv6 listening
# Example output:
# UNCONN 0  0  0.0.0.0:123   0.0.0.0:*  users:(("ntpd",pid=1234))
# UNCONN 0  0  [::]:123      [::]:*     users:(("ntpd",pid=1234))
```

## Enabling IPv6 Listening in ntp.conf

The `interface` directive in ntp.conf controls which interfaces ntpd listens on:

```bash
# /etc/ntp.conf

# Option 1: Listen on ALL interfaces (default behavior - includes IPv6)
# Simply don't restrict interfaces:
# interface listen all  ← this is the default

# Option 2: Listen on a specific IPv6 address
interface listen 2001:db8::1

# Option 3: Listen on all IPv6 interfaces
interface listen ipv6

# Option 4: Explicitly disable IPv4, listen only on IPv6
interface ignore ipv4
interface listen ipv6

# Option 5: Dual-stack (explicit)
interface listen ipv4
interface listen ipv6
```

## Full ntp.conf Example for Dual-Stack

```bash
# /etc/ntp.conf - Full dual-stack configuration

# Upstream NTP servers
pool 0.pool.ntp.org iburst
pool 1.pool.ntp.org iburst

# Listen on all interfaces (IPv4 + IPv6)
interface listen all

# Disable wildcard interface to prevent ntpd from adding new addresses automatically
# interface ignore wildcard

# Access control
# Default: deny everything
restrict default kod limited nomodify notrap nopeer noquery

# Allow IPv4 localhost
restrict 127.0.0.1

# Allow IPv6 localhost
restrict ::1

# Allow your IPv6 network to query
restrict 2001:db8:1::/48 nomodify notrap nopeer

# Allow your IPv4 network
restrict 192.168.1.0 mask 255.255.255.0 nomodify notrap

# Drift file and statistics
driftfile /var/lib/ntp/drift
statsdir /var/log/ntpstats/
statistics loopstats peerstats clockstats
filegen loopstats file loopstats type day enable
```

## Enabling IPv6 at the OS Level for ntpd

Some systems disable IPv6 system-wide. Verify it's enabled:

```bash
# Check if IPv6 is disabled in kernel
sysctl net.ipv6.conf.all.disable_ipv6
# Should return 0 (enabled)

# If it's 1 (disabled), enable IPv6
sudo sysctl -w net.ipv6.conf.all.disable_ipv6=0
sudo sysctl -w net.ipv6.conf.default.disable_ipv6=0

# Make permanent
echo "net.ipv6.conf.all.disable_ipv6 = 0" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

## Starting ntpd and Verifying IPv6

```bash
# Install ntpd if not present
sudo apt install ntp -y  # Debian/Ubuntu
sudo dnf install ntp -y  # RHEL/CentOS

# Start and enable ntpd
sudo systemctl enable ntp
sudo systemctl start ntp

# Verify IPv6 listening
ss -ulnp | grep :123
# Should show [::]:123 in addition to 0.0.0.0:123

# Check ntpd status
ntpq -6 -p

# Test from a remote IPv6 host
ntpdate -q 2001:db8::1

# Check the current sources
ntpq -n -c peers
```

## Resolving Common ntpd IPv6 Issues

```bash
# Issue: ntpd not listening on [::]:123 despite config
# Solution: Check for -4 flag in startup script
cat /etc/default/ntp
# If NTPD_OPTS="-4", remove the -4 flag to allow IPv6

# Fix the startup options
sudo sed -i 's/NTPD_OPTS="-4"/NTPD_OPTS=""/' /etc/default/ntp
sudo systemctl restart ntp

# Issue: Permission denied binding to IPv6
# Solution: Check SELinux/AppArmor
sudo semanage permissive -a ntpd_t  # Temporarily permissive for testing
ausearch -c 'ntpd' --raw | audit2allow  # Generate policy
```

## Using ntpq to Monitor IPv6 Associations

```bash
# List all NTP peers with IPv6 details
ntpq -6 -n -p

# Query a specific IPv6 NTP server
ntpq -6 -p 2001:db8::1

# Get NTP system status
ntpq -6 -c rv

# Get NTP associations
ntpq -6 -c as
```

Configuring ntpd to listen on IPv6 ensures time synchronization reliability in dual-stack and IPv6-only environments, which is fundamental for secure Kerberos authentication, consistent log timestamps, and TLS certificate validation.
