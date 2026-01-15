# How to Configure UFW for IPv6 on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: IPv6, UFW, Security, Ubuntu, Linux, Firewall

Description: Learn how to properly configure UFW (Uncomplicated Firewall) for IPv6 on Ubuntu to secure your server with dual-stack firewall protection.

---

## Introduction

As IPv6 adoption continues to grow globally, ensuring your Ubuntu server's firewall is properly configured to handle IPv6 traffic is essential for maintaining robust security. UFW (Uncomplicated Firewall) is Ubuntu's default firewall configuration tool, designed to simplify the process of managing iptables rules. While UFW supports IPv6 out of the box, it requires specific configuration to work correctly with IPv6 addresses and networks.

In this comprehensive guide, we will walk you through everything you need to know about configuring UFW for IPv6 on Ubuntu. From initial setup to advanced rule configurations, best practices, and troubleshooting, this guide covers all aspects of dual-stack firewall management.

## Prerequisites

Before diving into UFW IPv6 configuration, ensure you have the following:

- An Ubuntu server (18.04, 20.04, 22.04, or later)
- Root or sudo access to the server
- Basic understanding of networking concepts
- IPv6 connectivity configured on your server
- SSH access (preferably via IPv6 or IPv4)

### Checking Your Current IPv6 Configuration

First, verify that your server has IPv6 enabled and configured:

```bash
# Check if IPv6 is enabled on the system
cat /proc/sys/net/ipv6/conf/all/disable_ipv6
```

If the output is `0`, IPv6 is enabled. If it's `1`, IPv6 is disabled and you'll need to enable it first.

```bash
# View your current IPv6 addresses
ip -6 addr show
```

Example output:

```
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 state UNKNOWN qlen 1000
    inet6 ::1/128 scope host
       valid_lft forever preferred_lft forever
2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 state UP qlen 1000
    inet6 2001:db8:1234:5678::1/64 scope global
       valid_lft forever preferred_lft forever
    inet6 fe80::1234:5678:abcd:ef01/64 scope link
       valid_lft forever preferred_lft forever
```

```bash
# Test IPv6 connectivity
ping6 -c 4 ipv6.google.com
```

## Installing and Enabling UFW

UFW comes pre-installed on most Ubuntu distributions. If it's not installed, you can install it using:

```bash
# Update package lists
sudo apt update

# Install UFW
sudo apt install ufw -y
```

### Checking UFW Status

Before making any changes, check the current status of UFW:

```bash
# Check UFW status
sudo ufw status verbose
```

If UFW is inactive, you'll see:

```
Status: inactive
```

## Enabling IPv6 Support in UFW

By default, UFW should have IPv6 support enabled. However, it's crucial to verify and configure this properly.

### Step 1: Edit the UFW Default Configuration

Open the UFW default configuration file:

```bash
sudo nano /etc/default/ufw
```

Locate the `IPV6` parameter and ensure it's set to `yes`:

```
# /etc/default/ufw
#

# Set to yes to apply rules to support IPv6 (no means only IPv6 on loopback
# accepted). You will need to 'disable' and then 'enable' the firewall for
# the changes to take effect.
IPV6=yes
```

If you change this setting, you'll need to disable and re-enable UFW for the changes to take effect:

```bash
# Disable UFW
sudo ufw disable

# Re-enable UFW
sudo ufw enable
```

### Step 2: Verify IPv6 Configuration

After enabling IPv6 support, verify the configuration:

```bash
# Check the IPv6 setting
grep IPV6 /etc/default/ufw
```

Expected output:

```
IPV6=yes
```

## Setting Up Default Policies

Before adding specific rules, establish your default firewall policies. The recommended approach is to deny all incoming traffic and allow all outgoing traffic by default.

### Configuring Default Policies

```bash
# Set default policy to deny incoming connections
sudo ufw default deny incoming

# Set default policy to allow outgoing connections
sudo ufw default allow outgoing
```

These commands apply to both IPv4 and IPv6 traffic when IPv6 support is enabled.

### Viewing Current Default Policies

```bash
sudo ufw status verbose
```

Output:

```
Status: active
Logging: on (low)
Default: deny (incoming), allow (outgoing), disabled (routed)
New profiles: skip
```

## Adding IPv6 Firewall Rules

UFW supports various rule formats for IPv6. Let's explore the different ways to add IPv6-specific rules.

### Basic Rule Syntax

UFW can accept rules with explicit IPv6 addresses or apply rules to both protocols automatically.

#### Allow a Specific Port (Both IPv4 and IPv6)

```bash
# Allow SSH (port 22) for both IPv4 and IPv6
sudo ufw allow 22/tcp

# Allow HTTP (port 80)
sudo ufw allow 80/tcp

# Allow HTTPS (port 443)
sudo ufw allow 443/tcp
```

When you add a rule without specifying an IP version, UFW automatically creates rules for both IPv4 and IPv6.

#### Allow Specific IPv6 Address

```bash
# Allow a specific IPv6 address to access SSH
sudo ufw allow from 2001:db8:1234:5678::100 to any port 22

# Allow an IPv6 address to access any port
sudo ufw allow from 2001:db8:1234:5678::100
```

#### Allow IPv6 Subnet

```bash
# Allow an entire IPv6 subnet
sudo ufw allow from 2001:db8:1234::/48

# Allow a subnet to access a specific port
sudo ufw allow from 2001:db8:1234::/48 to any port 443
```

### Using Application Profiles

UFW comes with application profiles that simplify rule management:

```bash
# List available application profiles
sudo ufw app list
```

Example output:

```
Available applications:
  Apache
  Apache Full
  Apache Secure
  Nginx Full
  Nginx HTTP
  Nginx HTTPS
  OpenSSH
  Postfix
  Postfix SMTPS
  Postfix Submission
```

```bash
# Allow an application profile
sudo ufw allow 'OpenSSH'

# Allow Nginx Full (HTTP and HTTPS)
sudo ufw allow 'Nginx Full'
```

Application profiles automatically apply to both IPv4 and IPv6.

## Advanced IPv6 Rule Configurations

### Specifying Protocol and Port Ranges

```bash
# Allow a range of ports for TCP
sudo ufw allow 8000:8100/tcp

# Allow UDP port range
sudo ufw allow 10000:10100/udp

# Allow specific port for IPv6 only
sudo ufw allow from ::/0 to any port 8080
```

### Allowing Specific Services with IPv6

```bash
# Allow SSH from specific IPv6 network
sudo ufw allow from 2001:db8:abcd::/48 to any port 22 proto tcp

# Allow HTTPS from specific IPv6 address
sudo ufw allow from 2001:db8:1234:5678::1 to any port 443 proto tcp
```

### Denying Specific IPv6 Addresses

```bash
# Deny all traffic from a specific IPv6 address
sudo ufw deny from 2001:db8:bad::/48

# Deny a specific IPv6 address access to SSH
sudo ufw deny from 2001:db8:1234::dead to any port 22
```

### Rate Limiting with IPv6

UFW supports rate limiting to prevent brute force attacks:

```bash
# Enable rate limiting on SSH (applies to both IPv4 and IPv6)
sudo ufw limit ssh

# Rate limit with specific port
sudo ufw limit 22/tcp
```

Rate limiting allows 6 connections within 30 seconds from a single IP address. This applies to both IPv4 and IPv6 addresses.

### Logging Configuration

Configure logging to monitor firewall activity:

```bash
# Enable logging
sudo ufw logging on

# Set logging level (off, low, medium, high, full)
sudo ufw logging medium
```

View firewall logs:

```bash
# View UFW logs
sudo tail -f /var/log/ufw.log

# Filter for IPv6 related entries
sudo grep "SRC=2001" /var/log/ufw.log
```

## Working with UFW Rules

### Viewing Current Rules

```bash
# View rules with numbers
sudo ufw status numbered
```

Example output:

```
Status: active

     To                         Action      From
     --                         ------      ----
[ 1] 22/tcp                     ALLOW IN    Anywhere
[ 2] 80/tcp                     ALLOW IN    Anywhere
[ 3] 443/tcp                    ALLOW IN    Anywhere
[ 4] 22/tcp (v6)                ALLOW IN    Anywhere (v6)
[ 5] 80/tcp (v6)                ALLOW IN    Anywhere (v6)
[ 6] 443/tcp (v6)               ALLOW IN    Anywhere (v6)
```

### Deleting Rules

```bash
# Delete rule by number
sudo ufw delete 4

# Delete rule by specification
sudo ufw delete allow 80/tcp

# Delete a specific IPv6 rule
sudo ufw delete allow from 2001:db8:1234::/48 to any port 22
```

### Inserting Rules at Specific Positions

```bash
# Insert a rule at position 1
sudo ufw insert 1 deny from 2001:db8:bad::/48

# Insert allow rule before deny rules
sudo ufw insert 1 allow from 2001:db8:trusted::/48
```

### Resetting UFW

If you need to start fresh:

```bash
# Reset all rules (requires confirmation)
sudo ufw reset

# After reset, re-enable IPv6 and set default policies
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw enable
```

## IPv6-Specific Considerations

### ICMPv6 Traffic

ICMPv6 is essential for IPv6 operation (unlike ICMPv4 which is often blocked). UFW allows necessary ICMPv6 traffic by default, but you can customize this behavior.

Edit the before rules file:

```bash
sudo nano /etc/ufw/before6.rules
```

The default ICMPv6 rules look like:

```
# allow all ICMP types for IPv6
-A ufw6-before-input -p icmpv6 --icmpv6-type destination-unreachable -j ACCEPT
-A ufw6-before-input -p icmpv6 --icmpv6-type packet-too-big -j ACCEPT
-A ufw6-before-input -p icmpv6 --icmpv6-type time-exceeded -j ACCEPT
-A ufw6-before-input -p icmpv6 --icmpv6-type parameter-problem -j ACCEPT
-A ufw6-before-input -p icmpv6 --icmpv6-type echo-request -j ACCEPT
-A ufw6-before-input -p icmpv6 --icmpv6-type echo-reply -j ACCEPT
-A ufw6-before-input -p icmpv6 --icmpv6-type router-solicitation -m hl --hl-eq 255 -j ACCEPT
-A ufw6-before-input -p icmpv6 --icmpv6-type router-advertisement -m hl --hl-eq 255 -j ACCEPT
-A ufw6-before-input -p icmpv6 --icmpv6-type neighbor-solicitation -m hl --hl-eq 255 -j ACCEPT
-A ufw6-before-input -p icmpv6 --icmpv6-type neighbor-advertisement -m hl --hl-eq 255 -j ACCEPT
```

Never block the following ICMPv6 types as they are essential:

- Router Solicitation (133)
- Router Advertisement (134)
- Neighbor Solicitation (135)
- Neighbor Advertisement (136)

### Link-Local Addresses

Link-local addresses (fe80::/10) are used for local network communication. UFW handles these automatically, but be aware:

```bash
# Allow traffic from link-local addresses (if needed)
sudo ufw allow from fe80::/10
```

### Multicast Addresses

IPv6 multicast (ff00::/8) is used for various network functions:

```bash
# Allow multicast traffic (if required for your application)
sudo ufw allow from ff00::/8
```

## Common Use Cases

### Web Server Configuration

For a typical web server with IPv6 support:

```bash
# Reset and start fresh
sudo ufw reset

# Set default policies
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH
sudo ufw allow ssh

# Allow HTTP and HTTPS
sudo ufw allow http
sudo ufw allow https

# Allow specific management IP (IPv6)
sudo ufw allow from 2001:db8:office::/48 to any port 22

# Enable UFW
sudo ufw enable
```

### Database Server Configuration

For a database server accessed via IPv6:

```bash
# Allow PostgreSQL from application servers
sudo ufw allow from 2001:db8:app::/64 to any port 5432

# Allow MySQL from specific host
sudo ufw allow from 2001:db8:web::1 to any port 3306

# Allow MongoDB from internal network
sudo ufw allow from 2001:db8:internal::/48 to any port 27017
```

### Mail Server Configuration

```bash
# Allow SMTP
sudo ufw allow 25/tcp

# Allow SMTP Submission
sudo ufw allow 587/tcp

# Allow SMTPS
sudo ufw allow 465/tcp

# Allow IMAP
sudo ufw allow 143/tcp

# Allow IMAPS
sudo ufw allow 993/tcp

# Allow POP3
sudo ufw allow 110/tcp

# Allow POP3S
sudo ufw allow 995/tcp
```

### Docker Host with IPv6

For Docker hosts with IPv6 networking:

```bash
# Allow Docker Swarm management
sudo ufw allow from 2001:db8:docker::/48 to any port 2377/tcp

# Allow container network discovery
sudo ufw allow from 2001:db8:docker::/48 to any port 7946

# Allow overlay network traffic
sudo ufw allow from 2001:db8:docker::/48 to any port 4789/udp
```

### Kubernetes Node Configuration

```bash
# Allow Kubernetes API server
sudo ufw allow from 2001:db8:k8s::/48 to any port 6443/tcp

# Allow etcd
sudo ufw allow from 2001:db8:k8s::/48 to any port 2379:2380/tcp

# Allow Kubelet API
sudo ufw allow from 2001:db8:k8s::/48 to any port 10250/tcp

# Allow NodePort Services
sudo ufw allow from ::/0 to any port 30000:32767/tcp
```

## Monitoring and Troubleshooting

### Checking Rule Effectiveness

```bash
# View all active rules
sudo ufw status verbose

# Check ip6tables rules directly
sudo ip6tables -L -n -v

# View rule hit counts
sudo ip6tables -L -v --line-numbers
```

### Monitoring Traffic

```bash
# Watch UFW log in real-time
sudo tail -f /var/log/ufw.log

# Count blocked IPv6 connections
sudo grep "BLOCK" /var/log/ufw.log | grep "SRC=2" | wc -l

# View recent blocked connections
sudo grep "BLOCK" /var/log/ufw.log | tail -20
```

### Testing Firewall Rules

From a remote machine with IPv6:

```bash
# Test specific port connectivity
nc -6 -zv your-server.example.com 22

# Test with nmap
nmap -6 -p 22,80,443 your-server.example.com
```

### Common Issues and Solutions

#### Issue: IPv6 Rules Not Being Applied

Solution:

```bash
# Verify IPv6 is enabled in UFW
grep IPV6 /etc/default/ufw

# Disable and re-enable UFW
sudo ufw disable
sudo ufw enable

# Check ip6tables
sudo ip6tables -L
```

#### Issue: Cannot Connect via IPv6 After Enabling UFW

Solution:

```bash
# Ensure SSH is allowed before enabling UFW
sudo ufw allow ssh

# Check if default policy is correct
sudo ufw status verbose

# Temporarily disable to regain access
sudo ufw disable
```

#### Issue: ICMPv6 Traffic Being Blocked

Solution:

```bash
# Check before6.rules
sudo cat /etc/ufw/before6.rules | grep icmpv6

# Reload UFW
sudo ufw reload
```

#### Issue: Duplicate Rules

Solution:

```bash
# View numbered rules
sudo ufw status numbered

# Delete duplicate rules
sudo ufw delete [rule_number]
```

## Best Practices

### Security Best Practices

1. **Default Deny Policy**: Always start with denying all incoming traffic

```bash
sudo ufw default deny incoming
```

2. **Allow Only Necessary Ports**: Open only the ports your services require

3. **Use Specific Source Addresses**: When possible, restrict access to known IP ranges

```bash
# Instead of allowing from anywhere
sudo ufw allow from 2001:db8:trusted::/48 to any port 22
```

4. **Enable Rate Limiting**: Protect against brute force attacks

```bash
sudo ufw limit ssh
```

5. **Regular Audits**: Periodically review and clean up unused rules

```bash
sudo ufw status numbered
```

6. **Keep UFW Updated**: Regularly update UFW along with system updates

```bash
sudo apt update && sudo apt upgrade
```

### Operational Best Practices

1. **Test Rules Before Applying**: Use the `--dry-run` flag when available

2. **Document Your Rules**: Maintain documentation of your firewall configuration

3. **Backup Configuration**: Before making changes, backup current rules

```bash
sudo cp /etc/ufw/user.rules /etc/ufw/user.rules.backup
sudo cp /etc/ufw/user6.rules /etc/ufw/user6.rules.backup
```

4. **Use Application Profiles**: Leverage UFW's application profiles for common services

5. **Monitor Logs**: Regularly review UFW logs for suspicious activity

```bash
sudo grep "BLOCK" /var/log/ufw.log | tail -50
```

### IPv6-Specific Best Practices

1. **Never Block Essential ICMPv6**: Keep router and neighbor discovery operational

2. **Consider Privacy Extensions**: Be aware of IPv6 privacy extensions when creating rules

3. **Plan for Larger Subnets**: IPv6 subnets are typically /64 or larger

4. **Use Dual-Stack Rules**: When possible, use rules that apply to both IPv4 and IPv6

## UFW Command Reference

Here is a quick reference table for common UFW commands:

| Command | Description |
|---------|-------------|
| `sudo ufw status` | Show firewall status |
| `sudo ufw status verbose` | Show detailed status with default policies |
| `sudo ufw status numbered` | Show rules with line numbers |
| `sudo ufw enable` | Enable the firewall |
| `sudo ufw disable` | Disable the firewall |
| `sudo ufw reload` | Reload firewall rules |
| `sudo ufw reset` | Reset to default settings |
| `sudo ufw default deny incoming` | Set default incoming policy to deny |
| `sudo ufw default allow outgoing` | Set default outgoing policy to allow |
| `sudo ufw allow [port]` | Allow incoming traffic on port |
| `sudo ufw deny [port]` | Deny incoming traffic on port |
| `sudo ufw delete [rule]` | Delete a specific rule |
| `sudo ufw insert [num] [rule]` | Insert rule at position |
| `sudo ufw limit [port]` | Enable rate limiting on port |
| `sudo ufw logging [level]` | Set logging level |
| `sudo ufw app list` | List application profiles |
| `sudo ufw allow from [ip]` | Allow traffic from IP |
| `sudo ufw deny from [ip]` | Deny traffic from IP |

## IPv6 Address Format Quick Reference

| Address Type | Example | Description |
|--------------|---------|-------------|
| Global Unicast | 2001:db8:1234::1 | Publicly routable addresses |
| Link-Local | fe80::1 | Local network only |
| Loopback | ::1 | Localhost |
| Multicast | ff02::1 | One-to-many communication |
| Unspecified | :: | No address |
| IPv4-mapped | ::ffff:192.0.2.1 | IPv4 address in IPv6 format |

## Common CIDR Notations for IPv6

| CIDR | Number of Addresses | Common Use |
|------|---------------------|------------|
| /128 | 1 | Single host |
| /64 | 18,446,744,073,709,551,616 | Standard subnet |
| /48 | 65,536 subnets | Site allocation |
| /32 | 65,536 /48s | ISP allocation |
| /0 | All addresses | Anywhere |

## Summary

Configuring UFW for IPv6 on Ubuntu is essential for maintaining security in a dual-stack network environment. This guide covered:

1. **Enabling IPv6 in UFW**: Ensuring the `IPV6=yes` setting in `/etc/default/ufw`

2. **Default Policies**: Setting secure defaults for incoming and outgoing traffic

3. **Rule Management**: Adding, modifying, and deleting IPv6-specific rules

4. **Advanced Configurations**: Rate limiting, logging, and application profiles

5. **IPv6 Considerations**: Handling ICMPv6, link-local, and multicast traffic

6. **Common Use Cases**: Web servers, databases, mail servers, and container platforms

7. **Troubleshooting**: Diagnosing and resolving common IPv6 firewall issues

8. **Best Practices**: Security and operational recommendations for production environments

By following this guide, you can ensure your Ubuntu server is properly protected with a dual-stack firewall configuration that handles both IPv4 and IPv6 traffic effectively.

## Additional Resources

- [UFW Official Documentation](https://help.ubuntu.com/community/UFW)
- [Ubuntu Server Guide - Firewall](https://ubuntu.com/server/docs/security-firewall)
- [IPv6 Address Planning](https://www.rfc-editor.org/rfc/rfc5375)
- [ICMPv6 Message Types](https://www.iana.org/assignments/icmpv6-parameters/icmpv6-parameters.xhtml)
- [ip6tables Manual](https://linux.die.net/man/8/ip6tables)

Remember to always test your firewall configurations in a safe environment before deploying to production, and maintain backup access methods in case of misconfiguration.
