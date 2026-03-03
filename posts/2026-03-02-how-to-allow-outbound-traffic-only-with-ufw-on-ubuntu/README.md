# How to Allow Outbound Traffic Only with UFW on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, UFW, Firewall, Security, Networking

Description: Configure UFW on Ubuntu to allow only outbound traffic while blocking all inbound connections, ideal for workstations, containers, and servers that initiate connections but don't accept them.

---

The typical server firewall setup blocks most incoming traffic while allowing all outgoing traffic. But there are scenarios where you want the opposite - or want to tightly control outgoing traffic in addition to incoming. This covers both patterns: the strict outbound-only setup and the locked-down server that controls what connections it initiates.

## Understanding Default UFW Policies

UFW's default policies determine what happens to traffic that doesn't match any explicit rule:

```bash
# View current defaults
sudo ufw status verbose | grep Default
```

The two most common configurations:

1. **Standard server**: `deny incoming, allow outgoing` - blocks uninitiated inbound connections, allows all outbound
2. **Locked-down**: `deny incoming, deny outgoing` - must explicitly allow everything in both directions

## Scenario 1: Pure Outbound Server (No Incoming Services)

Some servers don't accept any direct connections - they only make outgoing connections to other services. Examples include worker processes that pull from a job queue, scraper services, or build agents.

```bash
# Set strict defaults
sudo ufw default deny incoming
sudo ufw default deny outgoing
sudo ufw default deny forward

# Enable UFW
sudo ufw enable
```

Now add only the outbound connections this server actually needs:

```bash
# Allow outbound DNS (needed for hostname resolution)
sudo ufw allow out 53/udp
sudo ufw allow out 53/tcp

# Allow outbound HTTP and HTTPS (for API calls, package updates)
sudo ufw allow out 80/tcp
sudo ufw allow out 443/tcp

# Allow outbound SMTP (if this server sends email)
sudo ufw allow out 587/tcp

# Allow outbound to a specific database server
sudo ufw allow out to 192.168.1.60 port 5432 proto tcp

# Allow outbound to a message broker
sudo ufw allow out to 192.168.1.70 port 5672 proto tcp

# Allow NTP for time synchronization
sudo ufw allow out 123/udp
```

Verify the setup:

```bash
sudo ufw status verbose
```

```text
Status: active
Logging: on (low)
Default: deny (incoming), deny (outgoing), deny (forwarded)

To                         Action      From
--                         ------      ----
53/udp                     ALLOW OUT   Anywhere
53/tcp                     ALLOW OUT   Anywhere
80/tcp                     ALLOW OUT   Anywhere
443/tcp                    ALLOW OUT   Anywhere
587/tcp                    ALLOW OUT   Anywhere
5432/tcp                   ALLOW OUT   192.168.1.60
5672/tcp                   ALLOW OUT   192.168.1.70
123/udp                    ALLOW OUT   Anywhere
```

Test that it works:

```bash
# Test outbound HTTP
curl -s https://api.ipify.org

# Test that inbound is actually blocked from another host
# (from another machine)
nc -zv this-server-ip 80  # Should fail - connection timeout
```

## Scenario 2: Standard Server with Controlled Outbound

For servers that do accept incoming connections but you also want to control what outbound connections they make:

```bash
# Set defaults
sudo ufw default deny incoming
sudo ufw default deny outgoing

# Allow incoming services
sudo ufw allow in 22/tcp    # SSH
sudo ufw allow in 80/tcp    # HTTP
sudo ufw allow in 443/tcp   # HTTPS

# Allow essential outbound
sudo ufw allow out 53/udp   # DNS
sudo ufw allow out 53/tcp
sudo ufw allow out 123/udp  # NTP
sudo ufw allow out 80/tcp   # HTTP (for apt, etc.)
sudo ufw allow out 443/tcp  # HTTPS

# Allow related/established traffic (critical for stateful rules)
# This ensures reply traffic for outbound-initiated connections is allowed
sudo ufw allow out on eth0 to any port 0:65535 proto tcp

sudo ufw enable
```

### The Established Connections Problem

When you deny all outgoing traffic and then try to allow specific ports, you might find that even allowed outbound connections don't work. This is because TCP connections have both outgoing SYN packets (the initial connection) and incoming ACK/data packets (the response).

The UFW default incoming deny handles incoming traffic, but when you also deny all outgoing, you can accidentally block the ACK packets for established connections.

UFW handles this through the `before.rules` file, which allows established and related connections:

```bash
sudo cat /etc/ufw/before.rules | grep ESTABLISHED
```

You should see rules allowing established connections:

```text
-A ufw-before-input -m state --state ESTABLISHED,RELATED -j ACCEPT
-A ufw-before-output -m state --state ESTABLISHED,RELATED -j ACCEPT
```

These rules ensure that reply traffic for connections you initiated (established state) is allowed even when the default outgoing policy is deny.

## Restricting Outbound to Specific Destinations

For environments requiring strict egress control:

```bash
# Only allow outbound HTTPS to specific IP ranges (e.g., your CDN)
sudo ufw allow out to 104.16.0.0/12 port 443 proto tcp  # Cloudflare
sudo ufw allow out to 13.32.0.0/15 port 443 proto tcp   # AWS CloudFront

# Allow outbound to internal services only
sudo ufw allow out to 10.0.0.0/8 port 443 proto tcp
sudo ufw allow out to 192.168.0.0/16

# Block outbound to everything else
# (handled by default deny outgoing)
```

## Restricting Outbound by Protocol

Block potentially dangerous outbound protocols:

```bash
# Deny outbound raw SMTP (prevents this server from being used as spam relay)
sudo ufw deny out 25/tcp

# Allow SMTP submission through authenticated relay only
sudo ufw allow out 587/tcp

# Block outbound Telnet
sudo ufw deny out 23/tcp

# Block IRC (often used by malware for C2)
sudo ufw deny out 6667/tcp
sudo ufw deny out 6668/tcp
sudo ufw deny out 6669/tcp
```

## Container and VM Outbound Control

For servers running Docker or LXC containers, outbound restriction is more complex because container traffic appears as forwarded traffic:

```bash
# Set forward policy to deny by default
sudo ufw default deny forward

# Allow forwarded traffic for containers to reach the internet
# This allows the docker0 bridge network to forward traffic
sudo ufw allow in on docker0
sudo ufw allow out on docker0

# Or more specifically, allow containers to reach only specific ports
sudo ufw route allow out on eth0 proto tcp to any port 443
sudo ufw route allow out on eth0 proto udp to any port 53
```

Note that Docker modifies iptables directly, which can interact with UFW rules in unexpected ways. See the Docker and UFW documentation for the specific interaction in your version.

## Monitoring Outbound Connections

With restrictive outbound rules, you need to monitor what's being blocked to ensure legitimate traffic isn't interrupted:

```bash
# Enable logging to catch blocked outbound attempts
sudo ufw logging medium

# Watch for blocked outbound traffic
sudo tail -f /var/log/ufw.log | grep "UFW BLOCK.*OUT="

# Check what's being blocked outbound
sudo grep "UFW BLOCK" /var/log/ufw.log | grep "OUT=eth0" | tail -20
```

When you see unexpected blocks, identify the process making the connection:

```bash
# Check what process is trying to connect to a destination
# First, find the destination IP from the log
# Then use ss to see current connections
sudo ss -tp | grep "192.168.1.100"

# Or use netstat
sudo netstat -tp | grep ESTABLISHED
```

## Practical Outbound-Only Configuration Example

A build server that pulls code, runs tests, and pushes artifacts - no incoming connections needed:

```bash
#!/bin/bash
# Configure UFW for a CI/CD build server
# No incoming connections allowed; outbound carefully controlled

# Set defaults
sudo ufw default deny incoming
sudo ufw default deny outgoing
sudo ufw default deny forward

# DNS - needed for everything
sudo ufw allow out 53/udp
sudo ufw allow out 53/tcp

# NTP - keep the clock accurate
sudo ufw allow out 123/udp

# Package management - for system updates
sudo ufw allow out to security.ubuntu.com port 80 proto tcp
sudo ufw allow out to security.ubuntu.com port 443 proto tcp
sudo ufw allow out to archive.ubuntu.com port 80 proto tcp

# HTTPS - for git operations, API calls, artifact upload
sudo ufw allow out 443/tcp

# Git over SSH (GitHub, GitLab)
sudo ufw allow out 22/tcp

# Internal artifact repository
sudo ufw allow out to 10.100.0.50 port 8081 proto tcp

# Internal container registry
sudo ufw allow out to 10.100.0.51 port 5000 proto tcp

sudo ufw enable
echo "Build server firewall configured"
sudo ufw status verbose
```

## Testing the Configuration

After applying outbound restrictions:

```bash
# Test that allowed outbound works
curl -s https://api.github.com | head -5  # Should work
curl -s http://example.com | head -5       # Should work

# Test that blocked outbound is blocked
telnet 192.168.1.100 6667  # Should fail (IRC blocked)

# Check for unexpected blocks in the log
sudo grep "UFW BLOCK.*OUT" /var/log/ufw.log | tail -20
```

Outbound restriction is a meaningful security control that limits the damage from a compromised server. Even if an attacker gains access, they can't easily exfiltrate data or establish command-and-control connections if outbound traffic is tightly controlled. It requires more maintenance than the default allow-all-outgoing policy, but the security benefit is significant for servers handling sensitive data.
