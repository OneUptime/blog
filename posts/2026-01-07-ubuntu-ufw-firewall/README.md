# Ubuntu UFW Firewall: Complete Setup Guide with Examples (2026)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Linux, Security, Firewall, Networking

Description: Step-by-step guide to configure UFW firewall on Ubuntu. Learn rules, logging, application profiles, port forwarding, and production-ready configurations.

---

## Introduction

UFW (Uncomplicated Firewall) is the default firewall configuration tool for Ubuntu and other Debian-based Linux distributions. As the name suggests, UFW simplifies the process of managing iptables rules, making firewall configuration accessible to both beginners and experienced system administrators.

A properly configured firewall is essential for securing any server connected to the internet. It acts as the first line of defense, controlling incoming and outgoing network traffic based on predetermined security rules. UFW provides a user-friendly interface to manage these rules without requiring deep knowledge of iptables syntax.

In this comprehensive guide, you will learn how to install, configure, and manage UFW on Ubuntu. We will cover everything from basic rules to advanced configurations including application profiles, rate limiting, logging, and IPv6 support.

## Prerequisites

Before you begin, ensure you have:

- An Ubuntu server (18.04, 20.04, 22.04, or later)
- Root or sudo access to the server
- SSH access to the server (if configuring remotely)
- Basic familiarity with the Linux command line

## Installing UFW

UFW comes pre-installed on most Ubuntu distributions. Let's verify the installation and install it if necessary.

Check if UFW is installed on your system:

```bash
# Check UFW version and installation status
which ufw
ufw --version
```

If UFW is not installed, install it using apt:

```bash
# Update package lists and install UFW
sudo apt update
sudo apt install ufw -y
```

Verify the installation was successful:

```bash
# Check UFW status after installation
sudo ufw status
```

You should see output indicating that UFW is inactive. This is the default state after installation.

## Understanding UFW Status

Before making any changes, it's important to understand how to check the current state of your firewall.

Check the basic status of UFW:

```bash
# Display current UFW status (active/inactive)
sudo ufw status
```

For more detailed information including rule numbers:

```bash
# Display verbose status with rule numbers and logging level
sudo ufw status verbose
```

To see rules with their corresponding numbers (useful for deletion):

```bash
# Display numbered list of rules
sudo ufw status numbered
```

## Setting Default Policies

Default policies define what happens to traffic that doesn't match any explicit rules. This is the foundation of your firewall configuration.

The recommended approach is to deny all incoming connections and allow all outgoing connections:

```bash
# Deny all incoming traffic by default
# This blocks all connections unless explicitly allowed
sudo ufw default deny incoming

# Allow all outgoing traffic by default
# This permits your server to make external connections
sudo ufw default allow outgoing
```

These defaults ensure that:
- No unsolicited incoming connections are accepted
- Your server can still make outgoing connections (updates, DNS queries, etc.)

You can also set a default policy for routed traffic if your server acts as a router:

```bash
# Set default policy for forwarded/routed traffic
sudo ufw default deny routed
```

## Enabling and Disabling UFW

Before enabling UFW, always ensure you have allowed SSH access to avoid being locked out.

Allow SSH connections before enabling the firewall:

```bash
# Allow SSH connections (critical for remote access)
sudo ufw allow ssh
```

Enable UFW to start filtering traffic:

```bash
# Enable UFW and set it to start on boot
sudo ufw enable
```

You will see a warning that enabling the firewall may disrupt existing SSH connections. Type 'y' to proceed.

To disable UFW temporarily:

```bash
# Disable UFW (stops all filtering but preserves rules)
sudo ufw disable
```

To completely reset UFW to default state:

```bash
# Reset UFW to installation defaults (removes all rules)
sudo ufw reset
```

## Allowing and Denying Connections

UFW provides multiple ways to allow or deny connections based on ports, protocols, and services.

### Allowing Connections by Port Number

Allow a specific port with default protocol (both TCP and UDP):

```bash
# Allow connections on port 80 (HTTP)
sudo ufw allow 80
```

Allow a specific port with a specific protocol:

```bash
# Allow TCP connections on port 443 (HTTPS)
sudo ufw allow 443/tcp

# Allow UDP connections on port 53 (DNS)
sudo ufw allow 53/udp
```

### Allowing Connections by Service Name

UFW can recognize service names from /etc/services:

```bash
# Allow HTTP service (port 80)
sudo ufw allow http

# Allow HTTPS service (port 443)
sudo ufw allow https

# Allow SSH service (port 22)
sudo ufw allow ssh
```

### Allowing Port Ranges

Allow a range of ports for applications that require multiple ports:

```bash
# Allow TCP ports 6000 to 6007 (X11 forwarding)
sudo ufw allow 6000:6007/tcp

# Allow UDP ports 60000 to 61000 (Mosh)
sudo ufw allow 60000:61000/udp
```

### Denying Connections

Explicitly deny connections to specific ports:

```bash
# Deny connections on port 23 (Telnet - insecure)
sudo ufw deny 23

# Deny TCP connections on port 3306 (MySQL external access)
sudo ufw deny 3306/tcp
```

### Rejecting vs Denying

The difference between deny and reject:
- `deny`: Silently drops packets (attacker doesn't know if port exists)
- `reject`: Sends back an ICMP unreachable message

```bash
# Reject connections on port 25 (sends ICMP unreachable)
sudo ufw reject 25
```

## IP-Based Rules

Control access based on source IP addresses for more granular security.

### Allow from Specific IP Address

Allow all connections from a trusted IP:

```bash
# Allow all traffic from a specific IP address
sudo ufw allow from 192.168.1.100
```

Allow connections from a specific IP to a specific port:

```bash
# Allow SSH access only from a specific IP
sudo ufw allow from 192.168.1.100 to any port 22

# Allow MySQL access from application server
sudo ufw allow from 10.0.0.50 to any port 3306
```

### Allow from Subnet

Allow connections from an entire subnet:

```bash
# Allow all traffic from local network subnet
sudo ufw allow from 192.168.1.0/24

# Allow HTTP access from office network
sudo ufw allow from 10.0.0.0/8 to any port 80
```

### Deny from Specific IP

Block traffic from malicious IP addresses:

```bash
# Block all traffic from a specific IP
sudo ufw deny from 203.0.113.100

# Block a specific IP from accessing SSH
sudo ufw deny from 203.0.113.100 to any port 22
```

### Specifying Network Interface

Apply rules to specific network interfaces:

```bash
# Allow HTTP only on eth0 interface
sudo ufw allow in on eth0 to any port 80

# Allow internal traffic on private interface
sudo ufw allow in on eth1 from 10.0.0.0/8
```

## Application Profiles

UFW application profiles provide a convenient way to manage firewall rules for common applications.

### Viewing Available Profiles

List all available application profiles:

```bash
# Display list of available application profiles
sudo ufw app list
```

View details of a specific application profile:

```bash
# Show details of the OpenSSH profile
sudo ufw app info OpenSSH

# Show details of the Nginx Full profile
sudo ufw app info "Nginx Full"
```

### Using Application Profiles

Allow an application using its profile:

```bash
# Allow OpenSSH through the firewall
sudo ufw allow OpenSSH

# Allow Nginx HTTP and HTTPS
sudo ufw allow "Nginx Full"

# Allow only Nginx HTTP
sudo ufw allow "Nginx HTTP"

# Allow only Nginx HTTPS
sudo ufw allow "Nginx HTTPS"
```

### Common Application Profiles

Here are commonly used application profiles and their ports:

```bash
# Apache web server profiles
sudo ufw allow "Apache"        # Port 80
sudo ufw allow "Apache Full"   # Ports 80 and 443
sudo ufw allow "Apache Secure" # Port 443

# Nginx web server profiles
sudo ufw allow "Nginx HTTP"    # Port 80
sudo ufw allow "Nginx Full"    # Ports 80 and 443
sudo ufw allow "Nginx HTTPS"   # Port 443

# OpenSSH profile
sudo ufw allow OpenSSH         # Port 22
```

### Creating Custom Application Profiles

Create custom profiles for your applications in /etc/ufw/applications.d/:

```bash
# Create a custom application profile file
sudo nano /etc/ufw/applications.d/myapp
```

Add the following content:

```ini
[MyApp]
title=My Custom Application
description=Custom application running on port 8080
ports=8080/tcp

[MyApp-Full]
title=My Custom Application Full
description=Custom application with multiple ports
ports=8080,8443/tcp
```

Update the application list and use your custom profile:

```bash
# Update UFW application list
sudo ufw app update MyApp

# View your custom profile
sudo ufw app info MyApp

# Allow your custom application
sudo ufw allow MyApp
```

## Deleting Rules

Remove rules that are no longer needed using several methods.

### Delete by Rule Specification

Delete a rule by specifying the exact rule:

```bash
# Delete an allow rule for port 80
sudo ufw delete allow 80

# Delete an allow rule for HTTP service
sudo ufw delete allow http

# Delete a deny rule for specific IP
sudo ufw delete deny from 203.0.113.100
```

### Delete by Rule Number

First, list rules with their numbers:

```bash
# Display numbered list of current rules
sudo ufw status numbered
```

Then delete by the rule number:

```bash
# Delete rule number 3
sudo ufw delete 3
```

Note: After deleting a rule, the remaining rules are renumbered. Always check the current numbering before deleting multiple rules.

### Delete All Rules for a Port

Remove all rules associated with a specific port:

```bash
# Delete all rules for port 8080
sudo ufw delete allow 8080/tcp
sudo ufw delete allow 8080/udp
```

## Rate Limiting

Rate limiting helps protect against brute-force attacks by limiting connection attempts.

### Basic Rate Limiting

Enable rate limiting for SSH to prevent brute-force attacks:

```bash
# Limit SSH connections (denies connections if 6+ attempts in 30 seconds)
sudo ufw limit ssh
```

Apply rate limiting to a specific port:

```bash
# Limit connections to port 22 with TCP
sudo ufw limit 22/tcp
```

### Rate Limiting with Comments

Add descriptive comments to your rate-limited rules:

```bash
# Limit SSH with a comment for documentation
sudo ufw limit ssh comment 'Rate limit SSH for brute-force protection'
```

### Understanding Rate Limit Behavior

UFW's rate limiting uses the following defaults:
- Allows 6 connections within 30 seconds
- Blocks the IP temporarily after exceeding the limit
- Automatically unblocks after the time window passes

For more granular control, you may need to configure iptables directly or use fail2ban alongside UFW.

## Logging Configuration

UFW logging helps you monitor firewall activity and troubleshoot issues.

### Enabling Logging

Enable UFW logging with default level:

```bash
# Enable logging with default level (low)
sudo ufw logging on
```

Set a specific logging level:

```bash
# Set logging to low (logs blocked packets)
sudo ufw logging low

# Set logging to medium (logs blocked + some allowed packets)
sudo ufw logging medium

# Set logging to high (logs most packets)
sudo ufw logging high

# Set logging to full (logs everything)
sudo ufw logging full
```

### Logging Levels Explained

| Level | Description |
|-------|-------------|
| off | Logging disabled |
| low | Logs blocked packets not matching default policy |
| medium | Low + logs invalid packets and new connections |
| high | Medium + logs all packets (with rate limiting) |
| full | Logs everything (no rate limiting) |

### Viewing Firewall Logs

UFW logs are stored in /var/log/ufw.log. View recent log entries:

```bash
# View the last 50 lines of UFW log
sudo tail -50 /var/log/ufw.log
```

Monitor the log in real-time:

```bash
# Watch UFW log in real-time
sudo tail -f /var/log/ufw.log
```

Search for specific events in the log:

```bash
# Find all blocked connections
sudo grep "BLOCK" /var/log/ufw.log

# Find connections from a specific IP
sudo grep "SRC=192.168.1.100" /var/log/ufw.log
```

### Disabling Logging

Turn off logging if not needed:

```bash
# Disable UFW logging
sudo ufw logging off
```

## IPv6 Support

UFW supports IPv6 by default on modern Ubuntu installations.

### Checking IPv6 Configuration

Verify IPv6 is enabled in UFW configuration:

```bash
# Check if IPv6 is enabled in UFW configuration
grep IPV6 /etc/default/ufw
```

The output should show `IPV6=yes`.

### Enabling IPv6

If IPv6 is not enabled, edit the UFW configuration:

```bash
# Edit UFW default configuration
sudo nano /etc/default/ufw
```

Ensure the following line exists:

```
IPV6=yes
```

Reload UFW to apply changes:

```bash
# Reload UFW to apply IPv6 configuration
sudo ufw reload
```

### IPv6-Specific Rules

Allow connections on IPv6 addresses:

```bash
# Allow HTTP on IPv6
sudo ufw allow from ::/0 to any port 80

# Allow specific IPv6 address
sudo ufw allow from 2001:db8::1

# Allow IPv6 subnet
sudo ufw allow from 2001:db8::/32 to any port 22
```

### Viewing IPv6 Rules

Check the status to see both IPv4 and IPv6 rules:

```bash
# Display all rules including IPv6
sudo ufw status verbose
```

IPv6 rules are displayed with "(v6)" notation.

## Advanced Configuration

Advanced UFW configurations for production environments.

### Editing UFW Configuration Files

UFW configuration files are located in /etc/ufw/:

```bash
# Main UFW configuration
sudo nano /etc/default/ufw

# Rules applied before user rules
sudo nano /etc/ufw/before.rules

# Rules applied after user rules
sudo nano /etc/ufw/after.rules

# IPv6 before rules
sudo nano /etc/ufw/before6.rules

# IPv6 after rules
sudo nano /etc/ufw/after6.rules
```

### Custom iptables Rules

Add custom iptables rules in before.rules for advanced configurations:

```bash
# Edit before.rules to add custom rules
sudo nano /etc/ufw/before.rules
```

Example: Add port forwarding (NAT) rules:

```
# Add before the *filter section
*nat
:PREROUTING ACCEPT [0:0]
:POSTROUTING ACCEPT [0:0]

# Forward port 80 to internal server
-A PREROUTING -p tcp --dport 80 -j DNAT --to-destination 10.0.0.10:80

# Masquerade outgoing traffic
-A POSTROUTING -s 10.0.0.0/24 -o eth0 -j MASQUERADE

COMMIT
```

### Enable IP Forwarding

For routing/NAT functionality, enable IP forwarding:

```bash
# Edit UFW sysctl configuration
sudo nano /etc/ufw/sysctl.conf
```

Uncomment or add:

```
net/ipv4/ip_forward=1
net/ipv6/conf/default/forwarding=1
net/ipv6/conf/all/forwarding=1
```

Apply changes:

```bash
# Reload UFW to apply sysctl changes
sudo ufw reload
```

### Changing Default Forward Policy

To allow forwarded traffic by default:

```bash
# Edit main UFW configuration
sudo nano /etc/default/ufw
```

Change:

```
DEFAULT_FORWARD_POLICY="ACCEPT"
```

### Adding Comments to Rules

Document your rules with comments:

```bash
# Allow HTTP with a descriptive comment
sudo ufw allow 80/tcp comment 'Allow HTTP web traffic'

# Allow specific IP with comment
sudo ufw allow from 10.0.0.50 to any port 3306 comment 'MySQL from app server'
```

View comments in verbose output:

```bash
# Display rules with comments
sudo ufw status verbose
```

## Common Production Server Configurations

Here are complete firewall configurations for common server roles.

### Web Server Configuration

Configure UFW for a typical web server:

```bash
# Reset to clean state (be careful with remote access)
sudo ufw reset

# Set default policies
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH (change port if using non-standard)
sudo ufw allow ssh

# Allow HTTP and HTTPS
sudo ufw allow http
sudo ufw allow https

# Rate limit SSH to prevent brute-force
sudo ufw limit ssh

# Enable logging
sudo ufw logging on

# Enable the firewall
sudo ufw enable
```

### Database Server Configuration

Configure UFW for a MySQL/PostgreSQL database server:

```bash
# Set default policies
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH only from admin network
sudo ufw allow from 10.0.0.0/24 to any port 22

# Allow MySQL from application servers only
sudo ufw allow from 10.0.1.0/24 to any port 3306 comment 'MySQL from app tier'

# Allow PostgreSQL from application servers only
sudo ufw allow from 10.0.1.0/24 to any port 5432 comment 'PostgreSQL from app tier'

# Enable the firewall
sudo ufw enable
```

### Docker Host Configuration

Configure UFW to work properly with Docker:

```bash
# Edit after.rules to handle Docker networking
sudo nano /etc/ufw/after.rules
```

Add the following at the end of the file:

```
# BEGIN UFW AND DOCKER
*filter
:ufw-user-forward - [0:0]
:ufw-docker-logging-deny - [0:0]
:DOCKER-USER - [0:0]
-A DOCKER-USER -j ufw-user-forward

-A DOCKER-USER -j RETURN -s 10.0.0.0/8
-A DOCKER-USER -j RETURN -s 172.16.0.0/12
-A DOCKER-USER -j RETURN -s 192.168.0.0/16

-A DOCKER-USER -p udp -m udp --sport 53 --dport 1024:65535 -j RETURN

-A DOCKER-USER -j ufw-docker-logging-deny -p tcp -m tcp --tcp-flags FIN,SYN,RST,ACK SYN -d 192.168.0.0/16
-A DOCKER-USER -j ufw-docker-logging-deny -p tcp -m tcp --tcp-flags FIN,SYN,RST,ACK SYN -d 10.0.0.0/8
-A DOCKER-USER -j ufw-docker-logging-deny -p tcp -m tcp --tcp-flags FIN,SYN,RST,ACK SYN -d 172.16.0.0/12
-A DOCKER-USER -j ufw-docker-logging-deny -p udp -m udp --dport 0:32767 -d 192.168.0.0/16
-A DOCKER-USER -j ufw-docker-logging-deny -p udp -m udp --dport 0:32767 -d 10.0.0.0/8
-A DOCKER-USER -j ufw-docker-logging-deny -p udp -m udp --dport 0:32767 -d 172.16.0.0/12

-A DOCKER-USER -j RETURN

-A ufw-docker-logging-deny -m limit --limit 3/min --limit-burst 10 -j LOG --log-prefix "[UFW DOCKER BLOCK] "
-A ufw-docker-logging-deny -j DROP

COMMIT
# END UFW AND DOCKER
```

### Mail Server Configuration

Configure UFW for an email server:

```bash
# Set default policies
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH
sudo ufw limit ssh

# Allow SMTP (for receiving mail)
sudo ufw allow 25/tcp comment 'SMTP'

# Allow submission (for sending mail with auth)
sudo ufw allow 587/tcp comment 'SMTP Submission'

# Allow SMTPS (encrypted SMTP)
sudo ufw allow 465/tcp comment 'SMTPS'

# Allow IMAP and IMAPS
sudo ufw allow 143/tcp comment 'IMAP'
sudo ufw allow 993/tcp comment 'IMAPS'

# Allow POP3 and POP3S
sudo ufw allow 110/tcp comment 'POP3'
sudo ufw allow 995/tcp comment 'POP3S'

# Enable the firewall
sudo ufw enable
```

## Troubleshooting UFW

Common issues and their solutions.

### Locked Out of SSH

If you accidentally block SSH access:

1. Access the server through console (physical or cloud provider console)
2. Disable UFW:

```bash
# Disable UFW to regain access
sudo ufw disable
```

3. Fix the rules and re-enable:

```bash
# Add SSH rule
sudo ufw allow ssh

# Re-enable UFW
sudo ufw enable
```

### Rules Not Taking Effect

If rules don't seem to work:

```bash
# Reload UFW to apply changes
sudo ufw reload

# Restart UFW completely
sudo ufw disable && sudo ufw enable
```

### Checking iptables Rules

View the actual iptables rules generated by UFW:

```bash
# Display all iptables rules
sudo iptables -L -n -v

# Display NAT rules
sudo iptables -t nat -L -n -v
```

### Debugging Connection Issues

Use netcat to test if a port is accessible:

```bash
# Test connection to port 80 from another machine
nc -zv server-ip 80
```

Check if the service is listening:

```bash
# List all listening ports
sudo ss -tlnp
```

### UFW and Fail2ban

If using Fail2ban with UFW, ensure they work together:

```bash
# Check Fail2ban UFW integration
sudo fail2ban-client status

# Fail2ban should use UFW as banaction
# In /etc/fail2ban/jail.local, set:
# banaction = ufw
```

## Best Practices

Follow these recommendations for secure firewall management.

### Security Best Practices

1. **Default Deny**: Always use deny as the default policy for incoming traffic
2. **Least Privilege**: Only open ports that are absolutely necessary
3. **Rate Limiting**: Apply rate limiting to SSH and other authentication services
4. **IP Restrictions**: Restrict administrative access to known IP addresses
5. **Regular Audits**: Periodically review firewall rules and remove unused ones

### Operational Best Practices

1. **Document Rules**: Use comments to document the purpose of each rule
2. **Enable Logging**: Keep logging enabled to monitor for suspicious activity
3. **Backup Configuration**: Backup UFW rules before making changes
4. **Test Changes**: Test firewall changes in a staging environment first
5. **Avoid Rule Conflicts**: Check for conflicting rules that might cause issues

### Backup and Restore

Backup current UFW rules:

```bash
# Export current rules to a file
sudo cp /etc/ufw/user.rules ~/ufw-backup-user.rules
sudo cp /etc/ufw/user6.rules ~/ufw-backup-user6.rules
```

Restore rules from backup:

```bash
# Restore rules from backup
sudo cp ~/ufw-backup-user.rules /etc/ufw/user.rules
sudo cp ~/ufw-backup-user6.rules /etc/ufw/user6.rules
sudo ufw reload
```

## Quick Reference

Common UFW commands for daily use.

### Status Commands

```bash
# Check if UFW is enabled
sudo ufw status

# Detailed status with rules
sudo ufw status verbose

# Numbered list of rules
sudo ufw status numbered
```

### Basic Rule Commands

```bash
# Allow a port
sudo ufw allow PORT

# Deny a port
sudo ufw deny PORT

# Delete a rule
sudo ufw delete allow PORT

# Allow from IP
sudo ufw allow from IP_ADDRESS

# Rate limit a port
sudo ufw limit PORT
```

### Control Commands

```bash
# Enable UFW
sudo ufw enable

# Disable UFW
sudo ufw disable

# Reload rules
sudo ufw reload

# Reset to defaults
sudo ufw reset
```

## Conclusion

UFW provides a straightforward way to manage firewall rules on Ubuntu servers. By following this guide, you have learned how to:

- Install and enable UFW with secure default policies
- Create rules to allow and deny traffic based on ports, services, and IP addresses
- Use application profiles for common services
- Implement rate limiting to protect against brute-force attacks
- Configure logging to monitor firewall activity
- Enable and manage IPv6 firewall rules
- Apply advanced configurations for production environments

A well-configured firewall is essential for server security. Remember to regularly audit your firewall rules, keep logging enabled for monitoring, and always ensure SSH access is maintained before enabling new firewall configurations.

For production environments, consider combining UFW with additional security tools like Fail2ban for intrusion prevention and regular security audits to maintain a robust security posture.
