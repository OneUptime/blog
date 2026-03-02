# How to Set Up iptables Rate Limiting on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, iptables, Security, Networking, DDoS Protection

Description: Configure iptables rate limiting on Ubuntu to protect services from brute force attacks and connection floods using the limit, hashlimit, and recent modules.

---

Rate limiting with iptables protects your services from brute force attacks, connection floods, and denial-of-service attempts without needing additional software. The kernel handles the rate limiting directly in the packet path, making it extremely efficient. This guide covers the three main approaches: the simple `limit` module, the per-IP `hashlimit` module, and the `recent` module for tracking connection history.

## Understanding the Limit Module

The `limit` module uses a token bucket algorithm. It allows a burst of packets but then enforces a maximum rate. This is the simplest form of rate limiting.

```bash
# Allow ICMP (ping) but limit to 5 per second with a burst of 10
sudo iptables -A INPUT -p icmp -m limit --limit 5/second --limit-burst 10 -j ACCEPT

# Drop ICMP that exceeds the limit
sudo iptables -A INPUT -p icmp -j DROP
```

The `--limit` value sets the sustained rate, and `--limit-burst` is the maximum number of packets allowed before the rate kicks in. Once the burst is consumed, packets are allowed at exactly the sustained rate.

Rate formats you can use:

```bash
# Per second
--limit 10/second
--limit 10/s

# Per minute
--limit 60/minute
--limit 60/min

# Per hour
--limit 100/hour

# Per day
--limit 1000/day
```

## Limiting SSH Brute Force Attempts

SSH is a common target for brute force attacks. Rate limiting new SSH connections is a standard defense:

```bash
# Allow SSH but limit to 3 new connection attempts per minute per source IP
# First, allow established connections (so active sessions are not interrupted)
sudo iptables -A INPUT -p tcp --dport 22 -m state --state ESTABLISHED -j ACCEPT

# Log connections that exceed the rate limit
sudo iptables -A INPUT -p tcp --dport 22 -m state --state NEW \
  -m limit --limit 3/minute --limit-burst 3 \
  -j LOG --log-prefix "SSH-BRUTE-FORCE: " --log-level 4

# Drop connections that exceed the rate limit
sudo iptables -A INPUT -p tcp --dport 22 -m state --state NEW \
  -m limit --limit 3/minute --limit-burst 3 -j ACCEPT

# Any NEW SSH connection that did NOT match the above (exceeded limit) gets dropped
sudo iptables -A INPUT -p tcp --dport 22 -m state --state NEW -j DROP
```

Note the ordering: the limit rule with ACCEPT passes packets that are within the rate. Packets exceeding the rate fall through to the DROP rule.

## Per-IP Rate Limiting with hashlimit

The `limit` module applies a global rate. If you want per-source-IP limiting (which is what you usually want for brute force protection), use `hashlimit`:

```bash
# Limit each IP to 10 new connections per minute on port 443
sudo iptables -A INPUT -p tcp --dport 443 -m state --state NEW \
  -m hashlimit \
  --hashlimit-name https-ratelimit \
  --hashlimit-above 10/minute \
  --hashlimit-burst 20 \
  --hashlimit-mode srcip \
  -j DROP

# The same for SSH - 3 attempts per minute per source IP
sudo iptables -A INPUT -p tcp --dport 22 -m state --state NEW \
  -m hashlimit \
  --hashlimit-name ssh-ratelimit \
  --hashlimit-above 3/minute \
  --hashlimit-burst 5 \
  --hashlimit-mode srcip \
  -j DROP
```

Key hashlimit options:

```bash
# Mode options - what to track
--hashlimit-mode srcip          # Per source IP
--hashlimit-mode srcip,dstport  # Per source IP and destination port
--hashlimit-mode srcip,srcport  # Per source IP and source port

# The hashlimit table is viewable here
ls /proc/net/ipt_hashlimit/
cat /proc/net/ipt_hashlimit/ssh-ratelimit
```

## Using the recent Module for Connection Tracking

The `recent` module tracks IP addresses and when they last sent packets. It is very powerful for detecting and blocking repeated connection attempts:

```bash
# Block IPs that have made more than 5 new SSH connections in 60 seconds
# First rule: record the source IP in the "SSH" list
sudo iptables -A INPUT -p tcp --dport 22 -m state --state NEW \
  -m recent --set --name SSH --rsource

# Second rule: if the IP has hit the port more than 5 times in 60 seconds, drop
sudo iptables -A INPUT -p tcp --dport 22 -m state --state NEW \
  -m recent --update --seconds 60 --hitcount 5 --name SSH --rsource \
  -j DROP
```

View the recent tracking table:

```bash
# See what IPs are in the SSH tracking list
cat /proc/net/xt_recent/SSH

# Clear the entire recent list
echo clear | sudo tee /proc/net/xt_recent/SSH

# Remove a specific IP from the list
echo -192.168.1.100 | sudo tee /proc/net/xt_recent/SSH
```

## Protecting Against SYN Floods

SYN flood attacks send many TCP SYN packets to exhaust server resources. Multiple defenses work together:

```bash
# Enable SYN cookies at the kernel level
sudo sysctl -w net.ipv4.tcp_syncookies=1
echo "net.ipv4.tcp_syncookies = 1" | sudo tee -a /etc/sysctl.conf

# Limit SYN packets globally
sudo iptables -A INPUT -p tcp --syn \
  -m limit --limit 1000/second --limit-burst 3000 -j ACCEPT

# Drop SYN floods that exceed the limit
sudo iptables -A INPUT -p tcp --syn -j DROP

# Alternatively, use hashlimit per source IP
sudo iptables -A INPUT -p tcp --syn \
  -m hashlimit \
  --hashlimit-name syn-flood \
  --hashlimit-above 50/second \
  --hashlimit-burst 200 \
  --hashlimit-mode srcip \
  -j DROP
```

## Rate Limiting UDP Traffic

UDP-based services like DNS can be targets for amplification attacks:

```bash
# Limit DNS queries to 10 per second per source IP
sudo iptables -A INPUT -p udp --dport 53 \
  -m hashlimit \
  --hashlimit-name dns-ratelimit \
  --hashlimit-above 10/second \
  --hashlimit-burst 30 \
  --hashlimit-mode srcip \
  -j DROP

# Limit NTP to prevent NTP amplification
sudo iptables -A INPUT -p udp --dport 123 \
  -m hashlimit \
  --hashlimit-name ntp-ratelimit \
  --hashlimit-above 5/second \
  --hashlimit-burst 10 \
  --hashlimit-mode srcip \
  -j DROP
```

## Limiting Connection Count with connlimit

The `connlimit` module limits the number of simultaneous connections from a single IP:

```bash
# Limit each IP to a maximum of 20 simultaneous SSH connections
sudo iptables -A INPUT -p tcp --dport 22 \
  -m connlimit --connlimit-above 20 \
  -j REJECT --reject-with tcp-reset

# Limit HTTP to 100 simultaneous connections per IP
sudo iptables -A INPUT -p tcp --dport 80 \
  -m connlimit --connlimit-above 100 \
  -j REJECT --reject-with tcp-reset

# You can also limit by subnet (/24 means the whole /24 subnet counts together)
sudo iptables -A INPUT -p tcp --dport 80 \
  -m connlimit --connlimit-above 200 --connlimit-mask 24 \
  -j REJECT
```

## Building a Complete Rate Limiting Ruleset

Here is a complete ruleset combining multiple techniques:

```bash
#!/bin/bash
# Complete rate limiting setup

# Flush existing rules
iptables -F
iptables -X

# Default policies
iptables -P INPUT DROP
iptables -P FORWARD DROP
iptables -P OUTPUT ACCEPT

# Loopback
iptables -A INPUT -i lo -j ACCEPT

# Established and related connections
iptables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT

# Drop invalid packets
iptables -A INPUT -m state --state INVALID -j DROP

# Drop spoofed packets (SYN + FIN is invalid)
iptables -A INPUT -p tcp --tcp-flags SYN,FIN SYN,FIN -j DROP

# ICMP rate limiting
iptables -A INPUT -p icmp -m limit --limit 10/second --limit-burst 20 -j ACCEPT
iptables -A INPUT -p icmp -j DROP

# SSH rate limiting: 3 new connections per minute per IP
iptables -A INPUT -p tcp --dport 22 -m state --state NEW \
  -m hashlimit \
  --hashlimit-name ssh \
  --hashlimit-above 3/minute \
  --hashlimit-burst 5 \
  --hashlimit-mode srcip \
  -j LOG --log-prefix "SSH-RATELIMIT: "

iptables -A INPUT -p tcp --dport 22 -m state --state NEW \
  -m hashlimit \
  --hashlimit-name ssh \
  --hashlimit-above 3/minute \
  --hashlimit-burst 5 \
  --hashlimit-mode srcip \
  -j DROP

# Allow SSH within rate limit
iptables -A INPUT -p tcp --dport 22 -m state --state NEW -j ACCEPT

# HTTP/HTTPS with connection limits
iptables -A INPUT -p tcp --dport 80 \
  -m connlimit --connlimit-above 50 -j REJECT

iptables -A INPUT -p tcp --dport 443 \
  -m connlimit --connlimit-above 50 -j REJECT

iptables -A INPUT -p tcp --dport 80 -m state --state NEW -j ACCEPT
iptables -A INPUT -p tcp --dport 443 -m state --state NEW -j ACCEPT

echo "Rate limiting rules applied"
```

## Saving the Configuration

```bash
# Save rules permanently
sudo apt install iptables-persistent
sudo netfilter-persistent save

# Verify saved rules
cat /etc/iptables/rules.v4
```

## Monitoring Rate Limiting Effectiveness

```bash
# Watch drop counters update in real time
watch -n 1 'iptables -L INPUT -n -v | grep -E "DROP|REJECT|ratelimit"'

# Check hashlimit tables
ls /proc/net/ipt_hashlimit/
cat /proc/net/ipt_hashlimit/ssh

# Check recent module tables
ls /proc/net/xt_recent/
```

Rate limiting with iptables requires tuning for your specific traffic patterns. Start conservative (lower limits), monitor the effects, and adjust. Remember that legitimate users behind NAT share a single IP, so per-IP limits should be generous enough to accommodate small teams.
