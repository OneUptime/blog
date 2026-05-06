# How to Configure chrony for IPv6 NTP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Chrony, NTP, IPv6, Time Synchronization, Linux, Chronyd

Description: Configure chronyd (chrony) to synchronize time over IPv6, serve NTP to IPv6 clients, and use IPv6-accessible NTP pool servers on Linux systems.

---

chrony is a modern NTP implementation widely used on Linux systems. It supports IPv6 and can synchronize time as both an NTP client and server.

## Installing chrony

```bash
# RHEL/CentOS/AlmaLinux/Fedora

sudo dnf install chrony -y

# Ubuntu/Debian
sudo apt install chrony -y

# Check installed version
chronyc --version
```

## Basic chrony IPv6 Configuration

```bash
# /etc/chrony.conf (RHEL-family) or /etc/chrony/chrony.conf (Debian/Ubuntu)

# Use an NTP Pool zone that can return IPv6 addresses
pool 2.pool.ntp.org iburst maxsources 4

# Or use specific IPv6 NTP servers
server 2001:db8:1234::1 iburst
server 2606:4700:f1::1 iburst
server time.cloudflare.com iburst

# Prefer IPv6 for time sources
# chronyd can use IPv6 addresses returned by DNS AAAA records
```

## Configuring chrony to Serve NTP to IPv6 Clients

```bash
# /etc/chrony.conf (RHEL-family) or /etc/chrony/chrony.conf (Debian/Ubuntu)

# Allow IPv6 clients from your subnet
allow 2001:db8::/32

# Allow all IPv6 (not recommended for public servers)
# allow ::/0

# Allow specific IPv6 host
allow 2001:db8::100/128

# Combine with IPv4 access
allow 10.0.0.0/8
allow 192.168.0.0/16

# Bind to a specific IPv6 address for serving NTP
bindaddress 2001:db8::1

# Or omit bindaddress to listen on all interfaces (default)
```

## Forcing IPv6 or IPv6-Only Operation

```bash
# /etc/chrony.conf (RHEL-family) or /etc/chrony/chrony.conf (Debian/Ubuntu)

# Force a source to use IPv6 addresses only
server time.cloudflare.com iburst ipv6

# Or do the same for an NTP pool source
pool 2.pool.ntp.org iburst maxsources 4 ipv6

# When chronyc connects to a named chronyd host, resolve it to IPv6 only
chronyc -6 -h localhost tracking

# To restrict chronyd to IPv6 only at daemon level,
# add -6 to the service options for your distribution
```

Create a systemd override to force IPv6:

```bash
# The exact unit name and ExecStart vary by distribution
systemctl cat chronyd 2>/dev/null || systemctl cat chrony

# Create a drop-in for the installed service
sudo systemctl edit chronyd    # Or chrony on Debian/Ubuntu

# In the editor, copy the current ExecStart and append -6

sudo systemctl daemon-reload
sudo systemctl restart chronyd # Or chrony on Debian/Ubuntu
```

## Verifying chrony IPv6 Operation

```bash
# Check chrony sources (should show IPv6 addresses)
chronyc -n sources -v

# Check tracking information
chronyc tracking

# Check if chronyd is listening on IPv6
sudo ss -ulnp | grep ':123'
# Look for [::]:123 in the output

# Query a remote chronyd instance over IPv6 (requires monitoring access)
chronyc -h 2001:db8::100 tracking

# Check NTP activity on network interface
sudo tcpdump -i eth0 -n ip6 and udp port 123
```

## chrony Access Control and Security

```bash
# /etc/chrony.conf (RHEL-family) or /etc/chrony/chrony.conf (Debian/Ubuntu)
# Security hardened configuration

# Upstream sources
pool 2.pool.ntp.org iburst maxsources 4

# Only allow NTP queries from trusted IPv6 subnets
allow 2001:db8:100::/48

# All other clients are denied by default

# Load symmetric keys if you use authenticated NTP sources or peers
# keyfile /etc/chrony.keys

# Rate limit clients to prevent amplification attacks
ratelimit interval 3 burst 8

# Log tracking and measurement data
logdir /var/log/chrony
log tracking measurements statistics
```

## Using chronyc for IPv6 Diagnostics

```bash
# List current NTP sources with IPv6 details
chronyc -n sources

# Check server clients (who is using this server)
sudo chronyc clients

# Manually trigger time step
sudo chronyc makestep

# Add a new NTP source at runtime
sudo chronyc add server 2001:db8:1234::10 iburst

# Check activity statistics
chronyc activity

# Verify time offset
chronyc -n tracking | grep "System time"
```

## Troubleshooting chrony IPv6 Issues

```bash
# Check chrony log for errors
sudo journalctl -u chronyd -f   # Use chrony on Debian/Ubuntu

# Look for IPv6-specific issues
sudo journalctl -u chronyd | grep -i "ipv6\|inet6\|resolve\|unreachable"  # Use chrony on Debian/Ubuntu

# Test DNS resolution of NTP pool to IPv6
dig AAAA 2.pool.ntp.org +short

# Manually test NTP response from an IPv6 server
chronyd -Q -t 10 'server 2001:db8:1234::1 iburst'

# Check system time synchronization status
timedatectl status
chronyc tracking
```

chrony is widely used on modern Linux systems and provides precise time synchronization over IPv6 for both NTP clients and servers.
