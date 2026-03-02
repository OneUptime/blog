# How to Allow and Deny Specific Ports with UFW on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, UFW, Firewall, Security, Networking

Description: Manage UFW firewall rules on Ubuntu to allow and deny specific TCP and UDP ports, including port ranges, protocols, and application-specific profiles.

---

After getting UFW up and running with basic defaults, the day-to-day task is managing which ports are open and closed. UFW provides a straightforward syntax for this, but the details matter - the difference between allowing a port on TCP vs UDP, applying rules to specific interfaces, and the order rules are evaluated all affect how traffic flows.

## Basic Port Allow and Deny Syntax

The simplest form allows or denies a port for all traffic, all sources, on all interfaces:

```bash
# Allow a port (defaults to both TCP and UDP)
sudo ufw allow 8080

# Allow only TCP
sudo ufw allow 8080/tcp

# Allow only UDP
sudo ufw allow 5353/udp

# Deny a port
sudo ufw deny 23/tcp      # Deny Telnet
sudo ufw deny 135/tcp     # Deny Windows RPC
```

When you allow a port without specifying a protocol, UFW creates rules for both TCP and UDP. For services like web servers that only use TCP, it's cleaner to be explicit.

## Allowing Port Ranges

To open a range of consecutive ports:

```bash
# Allow a range of ports on TCP
sudo ufw allow 8000:8100/tcp

# Allow a range for UDP
sudo ufw allow 60000:61000/udp  # Common range for passive FTP data

# Deny a range
sudo ufw deny 6000:6007/tcp   # X11 forwarding ports - often a security concern
```

Note that when specifying a range, the protocol must be specified. `sudo ufw allow 8000:8100` without a protocol won't work.

## Allowing Services by Name

UFW knows about common services from `/etc/services`:

```bash
# Allow services by name
sudo ufw allow ssh       # Port 22
sudo ufw allow http      # Port 80
sudo ufw allow https     # Port 443
sudo ufw allow ftp       # Port 21
sudo ufw allow smtp      # Port 25
sudo ufw allow dns       # Port 53

# Check what port a service name maps to
grep "^ssh" /etc/services
grep "^https" /etc/services
```

Service names are convenient but be aware they map to standard ports. If your SSH is on port 2222, `sudo ufw allow ssh` opens port 22, not 2222.

## Viewing and Numbering Rules

The numbered view is essential for managing existing rules:

```bash
sudo ufw status numbered
```

```
Status: active

     To                         Action      From
     --                         ------      ----
[ 1] 22/tcp                     ALLOW IN    Anywhere
[ 2] 80/tcp                     ALLOW IN    Anywhere
[ 3] 443/tcp                    ALLOW IN    Anywhere
[ 4] 8080/tcp                   ALLOW IN    Anywhere
[ 5] 3306/tcp                   DENY IN     Anywhere
[ 6] 22/tcp (v6)                ALLOW IN    Anywhere (v6)
[ 7] 80/tcp (v6)                ALLOW IN    Anywhere (v6)
[ 8] 443/tcp (v6)               ALLOW IN    Anywhere (v6)
[ 9] 8080/tcp (v6)              ALLOW IN    Anywhere (v6)
[10] 3306/tcp (v6)              DENY IN     Anywhere (v6)
```

## Deleting Rules

There are two ways to delete rules:

```bash
# Delete by rule content
sudo ufw delete allow 8080/tcp
sudo ufw delete deny 23/tcp

# Delete by rule number (from 'ufw status numbered')
sudo ufw delete 4
```

When you delete a numbered rule, the numbers shift, so if you're deleting multiple rules by number, delete from the highest number downward.

## Insert Rules at Specific Positions

UFW evaluates rules in order. By default, `ufw allow` adds rules at the end. The `ufw insert` command places a rule at a specific position:

```bash
# Insert a rule at position 1 (highest priority)
sudo ufw insert 1 deny from 203.0.113.0/24

# Insert after the first rule
sudo ufw insert 2 allow 8080/tcp
```

This matters when you have both allow and deny rules for the same port from different sources. The first matching rule wins.

## Denying vs Rejecting

UFW supports two ways to block traffic:

```bash
# DENY: silently drops the packet (attacker doesn't know if port is filtered or closed)
sudo ufw deny 23/tcp

# REJECT: sends a connection refused message (faster failure for legitimate tools)
sudo ufw reject 23/tcp
```

For internet-facing servers, `deny` (DROP) is generally preferred for security. The silent drop gives nothing away to scanners. For internal networks, `reject` provides faster feedback to legitimate tools that try the wrong port.

## Allowing Specific Port and Protocol Combinations

Some services use both TCP and UDP on the same port:

```bash
# DNS uses both TCP and UDP on port 53
sudo ufw allow 53/tcp
sudo ufw allow 53/udp

# Or allow both at once
sudo ufw allow 53

# OpenVPN typically uses UDP 1194
sudo ufw allow 1194/udp

# WireGuard uses UDP 51820
sudo ufw allow 51820/udp
```

## Restricting by Direction

UFW distinguishes between incoming, outgoing, and forwarded traffic:

```bash
# Allow incoming on port 80 (default direction is incoming)
sudo ufw allow in 80/tcp

# Allow outgoing SMTP (to send mail)
sudo ufw allow out 25/tcp

# Block outgoing to a specific port (prevent this server from making certain connections)
sudo ufw deny out 25/tcp   # Block this server from sending raw SMTP (anti-spam measure)
```

The default for `ufw allow PORT` is to apply to incoming traffic. Outgoing traffic follows the default outgoing policy unless explicitly set.

## Interface-Specific Rules

For servers with multiple network interfaces, restrict rules to specific interfaces:

```bash
# Allow port 5432 (PostgreSQL) only on the private interface
sudo ufw allow in on eth1 to any port 5432 proto tcp

# Allow port 80 only on the public interface
sudo ufw allow in on eth0 to any port 80 proto tcp

# Block traffic coming in on a specific interface
sudo ufw deny in on eth0 to any port 3306 proto tcp
```

This is useful when `eth0` faces the internet and `eth1` is a private network - you can allow database ports on `eth1` while keeping them blocked on `eth0`.

## Setting Up a Practical Server Profile

A typical web server running Nginx with PHP-FPM, listening on a custom SSH port, with a private database:

```bash
# Custom SSH port
sudo ufw allow 2222/tcp

# Web traffic
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Block default SSH to prevent confusion (optional if using 2222)
sudo ufw deny 22/tcp

# Block database ports from public interface
sudo ufw deny in on eth0 port 3306/tcp  # MySQL
sudo ufw deny in on eth0 port 5432/tcp  # PostgreSQL
sudo ufw deny in on eth0 port 6379/tcp  # Redis

# Allow database from private network
sudo ufw allow from 10.0.0.0/8 to any port 3306 proto tcp
sudo ufw allow from 10.0.0.0/8 to any port 5432 proto tcp
sudo ufw allow from 10.0.0.0/8 to any port 6379 proto tcp

# Allow ICMP (ping) - useful for monitoring
# UFW doesn't have a direct ping command; edit /etc/ufw/before.rules instead
```

## Allowing Ping (ICMP)

ICMP (ping) is handled differently in UFW - it's controlled through the rules files, not the command line:

```bash
sudo nano /etc/ufw/before.rules
```

To allow ping, these lines should be present (they are by default):

```
# Allow ICMP
-A ufw-before-input -p icmp --icmp-type echo-request -j ACCEPT
```

To block ping:

```bash
# In /etc/ufw/before.rules, comment out or remove the ICMP ACCEPT rule
# Then reload UFW
sudo ufw reload
```

## Verifying Rules Are Working

Test from another machine using `nc` (netcat) or `nmap`:

```bash
# Test from a remote machine
nc -zv server-ip 80     # Should succeed
nc -zv server-ip 3306   # Should fail (connection refused or timeout)

# Scan with nmap
nmap -p 22,80,443,3306,5432 server-ip

# Check UFW logs to see blocked connection attempts
sudo tail -f /var/log/ufw.log
```

## Saving and Restoring Rules

UFW rules persist across reboots automatically when UFW is enabled. But you can export and import them for documentation or migration:

```bash
# Rules are stored in these files
ls /etc/ufw/

# user.rules - IPv4 rules you've added
# user6.rules - IPv6 rules
# before.rules, after.rules - system rules that apply before/after your rules
# before6.rules, after6.rules - IPv6 equivalents

# Back up rules
sudo cp /etc/ufw/user.rules /etc/ufw/user.rules.backup
sudo cp /etc/ufw/user6.rules /etc/ufw/user6.rules.backup
```

Port management with UFW is a balance between security and functionality. The principle of least privilege applies: only open ports that are actively needed, and be as specific as possible about which source IPs can reach sensitive ports.
