# How to Block ICMP Ping Requests with iptables

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: iptables, ICMP, Linux, Security, Firewall, Ping

Description: Block or selectively allow ICMP ping requests using iptables to reduce reconnaissance exposure while maintaining necessary network diagnostics.

Blocking ICMP ping requests can reduce your server's visibility to simple ICMP-based host discovery, while selectively allowing ICMP from trusted sources preserves your own diagnostic ability.

## Understanding ICMP Types

Not all ICMP traffic is ping. Blocking all ICMP breaks networking:

```text
Type  Name                     Purpose
----  -----------------------  ----------------------------------
0     Echo Reply               Ping response
3     Destination Unreachable  Routing/port feedback (essential)
8     Echo Request             Ping request (the one to block)
11    Time Exceeded            TTL expired (traceroute)
12    Parameter Problem        Malformed packet notification
```

## Block All Incoming Ping Requests

```bash
# Drop all incoming ICMP echo-request (ping) packets

sudo iptables -A INPUT -p icmp --icmp-type echo-request -j DROP

# Or use REJECT to send ICMP unreachable back to sender
# (DROP is stealthier; REJECT is more informative for debugging)
sudo iptables -A INPUT -p icmp --icmp-type echo-request -j REJECT \
  --reject-with icmp-host-prohibited
```

## Block Ping But Allow from Trusted IPs

A better approach: allow ping from your own IPs, block from everywhere else:

```bash
# Allow ping from management network
sudo iptables -A INPUT -p icmp --icmp-type echo-request \
  -s 10.0.0.0/8 -j ACCEPT

# Allow ping from monitoring server
sudo iptables -A INPUT -p icmp --icmp-type echo-request \
  -s 192.168.1.50 -j ACCEPT

# Drop ping from all other sources
sudo iptables -A INPUT -p icmp --icmp-type echo-request -j DROP
```

## Allow Essential ICMP, Block Only Ping

The safest approach preserves routing functionality:

```bash
# Allow ICMP destination unreachable (critical for PMTUD)
sudo iptables -A INPUT -p icmp --icmp-type destination-unreachable -j ACCEPT

# Allow time exceeded (needed for traceroute)
sudo iptables -A INPUT -p icmp --icmp-type time-exceeded -j ACCEPT

# Allow parameter problem
sudo iptables -A INPUT -p icmp --icmp-type parameter-problem -j ACCEPT

# Allow echo-reply so this host can still ping other systems
sudo iptables -A INPUT -p icmp --icmp-type echo-reply -j ACCEPT

# Drop only echo-request (ping)
sudo iptables -A INPUT -p icmp --icmp-type echo-request -j DROP
```

## Rate Limit Instead of Blocking

Instead of dropping all pings, limit the rate to prevent flood while allowing diagnostics:

```bash
# Allow 2 pings per second, drop excess
sudo iptables -A INPUT -p icmp --icmp-type echo-request \
  -m limit --limit 2/second --limit-burst 5 -j ACCEPT
sudo iptables -A INPUT -p icmp --icmp-type echo-request -j DROP
```

## Block ICMP Outbound (Echo Replies)

To prevent your server from responding to IPv4 pings even if another rule accepts echo-request:

```bash
# Drop outbound echo-reply (your server won't answer IPv4 pings)
sudo iptables -A OUTPUT -p icmp --icmp-type echo-reply -j DROP
```

## Verify the Rules Are Working

```bash
# List current ICMP rules
sudo iptables -L INPUT -n -v | grep icmp

# Test from another host (DROP should time out; REJECT should fail immediately)
ping -c 3 your-server-ip

# Test from an allowed host (should succeed)
ping -c 3 your-server-ip  # from trusted IP range
```

## Kernel sysctl Alternative

You can also block IPv4 ping at the kernel level without iptables:

```bash
# Ignore all IPv4 ICMP echo requests via sysctl
echo 1 | sudo tee /proc/sys/net/ipv4/icmp_echo_ignore_all

# Make it permanent
echo "net.ipv4.icmp_echo_ignore_all = 1" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

# Verify
cat /proc/sys/net/ipv4/icmp_echo_ignore_all
# Output: 1
```

Blocking or rate-limiting ICMP echo requests reduces your server's visibility to automated network scanners while having minimal impact on legitimate operations.
