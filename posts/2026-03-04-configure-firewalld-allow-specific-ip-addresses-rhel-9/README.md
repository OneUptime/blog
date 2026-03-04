# How to Configure Firewalld to Allow Specific IP Addresses on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, firewalld, IP Whitelist, Security, Linux

Description: How to configure firewalld on RHEL to restrict service access to specific IP addresses and subnets using rich rules and source-based zone assignments.

---

Allowing a service in firewalld opens it to everyone in that zone. But most of the time, you want to restrict access to specific IP addresses or subnets. The database should only be reachable from the app servers. SSH should only come from the admin network. Monitoring ports should only be accessible to the monitoring server. Here is how to do IP-based access control with firewalld.

## Method 1: Rich Rules

Rich rules are the most flexible way to allow specific IPs:

### Allow SSH from a Specific IP

```bash
# Allow SSH only from the admin workstation
firewall-cmd --zone=public --add-rich-rule='rule family="ipv4" source address="10.0.1.5" service name="ssh" accept' --permanent

# Remove the general SSH allow (so only the rich rule applies)
firewall-cmd --zone=public --remove-service=ssh --permanent

firewall-cmd --reload
```

### Allow SSH from a Subnet

```bash
# Allow SSH from the entire admin network
firewall-cmd --zone=public --add-rich-rule='rule family="ipv4" source address="10.0.1.0/24" service name="ssh" accept' --permanent
firewall-cmd --reload
```

### Allow a Port from Multiple IPs

```bash
# Allow MySQL from two app servers
firewall-cmd --zone=public --add-rich-rule='rule family="ipv4" source address="10.0.1.10" port port="3306" protocol="tcp" accept' --permanent
firewall-cmd --zone=public --add-rich-rule='rule family="ipv4" source address="10.0.1.11" port port="3306" protocol="tcp" accept' --permanent
firewall-cmd --reload
```

## Method 2: Source-Based Zone Assignment

Instead of rich rules, you can assign source IPs to a zone:

```bash
# Add the monitoring server IP to the trusted zone
firewall-cmd --zone=trusted --add-source=10.0.2.10/32 --permanent
firewall-cmd --reload
```

Now all traffic from 10.0.2.10 matches the trusted zone (which allows everything). Source-based assignments take precedence over interface-based ones.

For more granularity, use a zone with specific services:

```bash
# Create or use the internal zone for admin access
firewall-cmd --zone=internal --add-source=10.0.1.0/24 --permanent
firewall-cmd --zone=internal --add-service=ssh --permanent
firewall-cmd --zone=internal --add-service=cockpit --permanent

# The public zone (interface-based) can have fewer services
firewall-cmd --zone=public --remove-service=ssh --permanent

firewall-cmd --reload
```

## Method 3: ipset for Many IPs

If you have many IPs to allow, use an ipset:

```bash
# Create an ipset
firewall-cmd --permanent --new-ipset=allowed-ssh --type=hash:ip

# Add IPs to the set
firewall-cmd --permanent --ipset=allowed-ssh --add-entry=10.0.1.5
firewall-cmd --permanent --ipset=allowed-ssh --add-entry=10.0.1.6
firewall-cmd --permanent --ipset=allowed-ssh --add-entry=10.0.1.7
firewall-cmd --permanent --ipset=allowed-ssh --add-entry=10.0.2.10

# Use the ipset in a rich rule
firewall-cmd --zone=public --add-rich-rule='rule source ipset="allowed-ssh" service name="ssh" accept' --permanent

# Remove the general SSH allow
firewall-cmd --zone=public --remove-service=ssh --permanent

firewall-cmd --reload
```

Managing the ipset:

```bash
# List entries in the ipset
firewall-cmd --permanent --ipset=allowed-ssh --get-entries

# Add a new IP later
firewall-cmd --permanent --ipset=allowed-ssh --add-entry=10.0.1.20
firewall-cmd --reload

# Remove an IP
firewall-cmd --permanent --ipset=allowed-ssh --remove-entry=10.0.1.5
firewall-cmd --reload
```

## Practical Example: Database Server

A database server that should only be accessible from specific sources:

```bash
# Remove all default services from public zone
firewall-cmd --zone=public --remove-service=ssh --permanent
firewall-cmd --zone=public --remove-service=dhcpv6-client --permanent

# Allow MySQL from app servers only
firewall-cmd --zone=public --add-rich-rule='rule family="ipv4" source address="10.0.1.10" port port="3306" protocol="tcp" accept' --permanent
firewall-cmd --zone=public --add-rich-rule='rule family="ipv4" source address="10.0.1.11" port port="3306" protocol="tcp" accept' --permanent

# Allow SSH from the admin jump box only
firewall-cmd --zone=public --add-rich-rule='rule family="ipv4" source address="10.0.0.5" service name="ssh" accept' --permanent

# Allow monitoring from Prometheus
firewall-cmd --zone=public --add-rich-rule='rule family="ipv4" source address="10.0.2.10" port port="9100" protocol="tcp" accept' --permanent

firewall-cmd --reload

# Verify
firewall-cmd --zone=public --list-all
```

## Blocking Specific IPs

The inverse: block specific IPs while allowing everyone else:

```bash
# Block a specific IP from all services
firewall-cmd --zone=public --add-rich-rule='rule family="ipv4" source address="203.0.113.50" drop' --permanent

# Block a subnet from a specific service
firewall-cmd --zone=public --add-rich-rule='rule family="ipv4" source address="192.168.100.0/24" service name="http" reject' --permanent

firewall-cmd --reload
```

## Using the drop Zone for Blocked IPs

```bash
# Add bad actors to the drop zone (all traffic silently dropped)
firewall-cmd --zone=drop --add-source=203.0.113.0/24 --permanent
firewall-cmd --zone=drop --add-source=198.51.100.50/32 --permanent
firewall-cmd --reload
```

## Verifying IP-Based Rules

```bash
# List all rich rules
firewall-cmd --zone=public --list-rich-rules

# Check active zones (including source-based)
firewall-cmd --get-active-zones

# List ipset contents
firewall-cmd --permanent --info-ipset=allowed-ssh

# Test from allowed and blocked IPs
# From allowed IP:
nc -zv your-server 3306

# From blocked IP:
nc -zv your-server 3306
```

## IPv6 Source Filtering

The same techniques work for IPv6:

```bash
# Allow SSH from an IPv6 address
firewall-cmd --zone=public --add-rich-rule='rule family="ipv6" source address="2001:db8:1::10" service name="ssh" accept' --permanent

# Allow a subnet
firewall-cmd --zone=public --add-rich-rule='rule family="ipv6" source address="2001:db8:1::/48" service name="http" accept' --permanent

firewall-cmd --reload
```

## Summary

Restricting services to specific IPs is one of the most important security measures you can apply. Use rich rules for straightforward IP-to-service mappings, source-based zone assignments for broader trust levels, and ipsets when you have many IPs to manage. Always remove the generic service allow when adding IP-specific rules, otherwise the generic rule still lets everyone in. Test from both allowed and denied IPs to verify your rules work as intended.
