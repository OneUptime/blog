# How to Write Firewalld Rich Rules for Fine-Grained Access Control on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, firewalld, Rich Rules, Security, Linux

Description: How to use firewalld rich rules on RHEL for granular traffic control, including source-based filtering, rate limiting, logging, and complex allow/deny patterns.

---

Standard firewalld services and port rules apply to all traffic hitting a zone. When you need more control, like allowing a service only from specific IP addresses, rate limiting connections, or logging certain traffic, rich rules are the answer.

## Rich Rule Syntax

Rich rules use a structured language that reads almost like English:

```bash
rule [family="ipv4|ipv6"]
  [source address="address[/mask]" [invert="true"]]
  [destination address="address[/mask]" [invert="true"]]
  [service name="service"]
  [port port="port" protocol="protocol"]
  [forward-port port="port" protocol="protocol" to-port="port" [to-addr="address"]]
  [log [prefix="prefix"] [level="level"] [limit value="rate/duration"]]
  [audit]
  [accept|reject|drop|mark]
```

## Basic Rich Rule Examples

### Allow SSH from a Specific Subnet

```bash
# Allow SSH only from the 10.0.1.0/24 network
firewall-cmd --zone=public --add-rich-rule='rule family="ipv4" source address="10.0.1.0/24" service name="ssh" accept' --permanent
firewall-cmd --reload
```

### Block a Specific IP Address

```bash
# Drop all traffic from a specific IP
firewall-cmd --zone=public --add-rich-rule='rule family="ipv4" source address="192.168.1.100" drop' --permanent
firewall-cmd --reload
```

### Allow a Port from a Specific Source

```bash
# Allow port 3306 (MySQL) only from the app server
firewall-cmd --zone=public --add-rich-rule='rule family="ipv4" source address="10.0.1.50" port port="3306" protocol="tcp" accept' --permanent
firewall-cmd --reload
```

## Rich Rules with Logging

### Log and Accept

```bash
# Log and allow HTTP traffic from a specific subnet
firewall-cmd --zone=public --add-rich-rule='rule family="ipv4" source address="10.0.1.0/24" service name="http" log prefix="HTTP-ALLOWED: " level="info" accept' --permanent
firewall-cmd --reload
```

### Log and Drop with Rate Limiting

```bash
# Log dropped packets from a specific IP, limit to 5 log entries per minute
firewall-cmd --zone=public --add-rich-rule='rule family="ipv4" source address="192.168.1.200" log prefix="DROPPED: " level="warning" limit value="5/m" drop' --permanent
firewall-cmd --reload
```

Logs go to the kernel log and can be viewed with:

```bash
# View firewall log entries
journalctl -k | grep "DROPPED:"
```

## Rate Limiting Connections

```bash
# Limit SSH connections to 3 per minute from any source
firewall-cmd --zone=public --add-rich-rule='rule service name="ssh" accept limit value="3/m"' --permanent
firewall-cmd --reload
```

This helps prevent brute-force attacks without blocking legitimate users.

## Multiple Rich Rules Example: Database Server

Here is a realistic setup for a database server:

```bash
# Allow MySQL from app servers only
firewall-cmd --zone=public --add-rich-rule='rule family="ipv4" source address="10.0.1.10" port port="3306" protocol="tcp" accept' --permanent
firewall-cmd --zone=public --add-rich-rule='rule family="ipv4" source address="10.0.1.11" port port="3306" protocol="tcp" accept' --permanent

# Allow monitoring from the monitoring subnet
firewall-cmd --zone=public --add-rich-rule='rule family="ipv4" source address="10.0.2.0/24" port port="9100" protocol="tcp" accept' --permanent

# Allow SSH from the admin jump box only
firewall-cmd --zone=public --add-rich-rule='rule family="ipv4" source address="10.0.0.5" service name="ssh" accept' --permanent

# Remove the default SSH service (we are using a rich rule instead)
firewall-cmd --zone=public --remove-service=ssh --permanent

# Log and drop everything else (for auditing)
firewall-cmd --zone=public --add-rich-rule='rule family="ipv4" log prefix="DB-DROPPED: " level="info" limit value="10/m" drop' --permanent

firewall-cmd --reload
```

## Rich Rules with Port Forwarding

```bash
# Forward port 8080 to port 80 on the same host
firewall-cmd --zone=public --add-rich-rule='rule family="ipv4" forward-port port="8080" protocol="tcp" to-port="80"' --permanent

# Forward port 8080 to port 80 on a different host
firewall-cmd --zone=public --add-rich-rule='rule family="ipv4" forward-port port="8080" protocol="tcp" to-port="80" to-addr="10.0.1.100"' --permanent

firewall-cmd --reload
```

## Listing Rich Rules

```bash
# List all rich rules in the public zone
firewall-cmd --zone=public --list-rich-rules

# Show everything including rich rules
firewall-cmd --zone=public --list-all
```

## Removing Rich Rules

You need to specify the exact rule to remove it:

```bash
# Remove a specific rich rule (use the exact same syntax as when you added it)
firewall-cmd --zone=public --remove-rich-rule='rule family="ipv4" source address="10.0.1.0/24" service name="ssh" accept' --permanent
firewall-cmd --reload
```

## Rich Rules with Reject (vs Drop)

The difference between reject and drop:
- **drop**: Silently discards the packet. The sender gets no response.
- **reject**: Sends back an ICMP error. The sender knows the connection was refused.

```bash
# Reject with ICMP unreachable (default)
firewall-cmd --zone=public --add-rich-rule='rule family="ipv4" source address="192.168.1.0/24" reject' --permanent

# Reject with a specific ICMP type
firewall-cmd --zone=public --add-rich-rule='rule family="ipv4" source address="192.168.1.0/24" reject type="icmp-admin-prohibited"' --permanent
```

## Rich Rules for ICMP

```bash
# Allow ping from a specific subnet
firewall-cmd --zone=public --add-rich-rule='rule family="ipv4" source address="10.0.1.0/24" icmp-type name="echo-request" accept' --permanent

# Block ping from everywhere else
firewall-cmd --zone=public --add-rich-rule='rule family="ipv4" icmp-type name="echo-request" drop' --permanent

firewall-cmd --reload
```

## Verifying Rich Rules Are Working

```bash
# Check the underlying nftables rules generated by firewalld
nft list ruleset | grep -A5 "rich"

# Test from a client
# From an allowed IP:
nc -zv 10.0.1.50 3306

# From a blocked IP:
nc -zv 10.0.1.50 3306
```

## Summary

Rich rules are firewalld's answer to complex filtering requirements. Use them when you need source-based access control, rate limiting, logging, or any combination. The syntax is verbose but readable. Always use `--permanent` and `--reload`, and test from both allowed and blocked sources. For simple "allow this service" rules, stick with standard zone services. Reach for rich rules when you need to control who can access what.
