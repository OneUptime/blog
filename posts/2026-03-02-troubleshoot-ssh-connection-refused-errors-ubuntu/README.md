# How to Troubleshoot SSH 'Connection Refused' Errors on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, SSH, Troubleshooting, Networking

Description: A systematic guide to diagnosing and fixing SSH 'Connection refused' errors on Ubuntu, covering service state, firewall rules, network connectivity, and configuration issues.

---

"Connection refused" is one of the most common SSH errors and also one of the most frustrating because it can have several different root causes. The error message itself is generated at the TCP layer, meaning the server received the connection attempt and explicitly rejected it - as opposed to a timeout where the packet never arrives. Working through a checklist systematically finds the problem faster than random guessing.

## What "Connection Refused" Actually Means

When you see:

```
ssh: connect to host server.example.com port 22: Connection refused
```

It means one of these things:

1. No service is listening on that port on that host
2. A firewall at the packet level sent back a TCP RST (some firewalls do this)
3. The wrong host or port is being targeted

A timeout (`Connection timed out`) is different - it means packets are being dropped rather than rejected, which points to a firewall or routing issue rather than a service issue.

## Step 1: Verify Basic Network Connectivity

Before anything else, confirm the server is reachable:

```bash
# Ping the server to check basic connectivity
ping -c 4 server.example.com

# Test TCP connectivity on port 22 specifically
nc -zv server.example.com 22

# Alternative with nmap (if installed)
nmap -p 22 server.example.com

# Test from a different port to rule out host-level issues
nc -zv server.example.com 80
```

If ping fails, the server may be down or the host unreachable entirely. If ping works but port 22 is refused, the issue is specific to SSH.

## Step 2: Check Whether SSH Is Running on the Server

Access the server via another method (console, out-of-band management, another user session) and check the SSH service:

```bash
# Check the SSH service status
sudo systemctl status ssh

# If it shows "inactive (dead)", start it
sudo systemctl start ssh

# Enable it to start automatically on boot
sudo systemctl enable ssh

# Check for startup errors
sudo journalctl -u ssh --since "30 minutes ago"
```

On some Ubuntu versions the service may be named `sshd` instead of `ssh`:

```bash
# Try both service names
sudo systemctl status sshd
sudo systemctl start sshd
```

## Step 3: Verify SSH Is Listening on the Expected Port

SSH may be running but listening on a different port than you're connecting to:

```bash
# List all listening ports and the services using them
sudo ss -tlnp | grep ssh

# Example output showing SSH on a non-standard port:
# LISTEN  0  128  0.0.0.0:2222  0.0.0.0:*  users:(("sshd",pid=1234,fd=3))

# Alternative with netstat
sudo netstat -tlnp | grep sshd
```

If SSH is on port 2222 but you're connecting to 22, use:

```bash
ssh -p 2222 user@server.example.com
```

Check what port is configured in `sshd_config`:

```bash
# Find the Port setting
sudo grep -i "^Port\|^#Port\|^ListenAddress" /etc/ssh/sshd_config
```

## Step 4: Check the Firewall

Ubuntu uses UFW by default, though some setups use iptables directly or firewalld.

### UFW

```bash
# Check if UFW is enabled and its rules
sudo ufw status verbose

# Look for rules allowing SSH
# Should show something like:
# 22/tcp  ALLOW IN  Anywhere
# or
# OpenSSH  ALLOW IN  Anywhere

# If SSH is not allowed, add a rule
sudo ufw allow ssh
# Or for a specific port
sudo ufw allow 22/tcp

# If UFW is disabled entirely, that's not the issue - check iptables
```

### iptables

```bash
# View all iptables rules
sudo iptables -L -n -v

# Check if there's a REJECT or DROP rule for port 22
sudo iptables -L INPUT -n -v | grep 22

# Check if iptables is the issue by temporarily allowing everything
# (Only in a troubleshooting context, revert immediately after)
sudo iptables -I INPUT -p tcp --dport 22 -j ACCEPT
```

### Cloud/Provider Firewalls

If the server is on AWS, GCP, Azure, or another cloud platform, there is likely a security group or network firewall separate from the OS-level firewall:

- AWS: Check the EC2 instance's Security Group for inbound rules on port 22
- GCP: Check VPC Firewall Rules for SSH (port 22)
- Azure: Check Network Security Group rules
- DigitalOcean: Check Firewall settings in the control panel

These cloud firewalls operate before traffic reaches the server, so OS-level firewall changes will not fix a blocked cloud firewall.

## Step 5: Check the SSH Configuration File

A misconfigured `sshd_config` can prevent SSH from starting or cause it to refuse connections:

```bash
# Validate the SSH config file for syntax errors
sudo sshd -t

# Check for common misconfigurations
sudo grep -E "^ListenAddress|^AllowUsers|^AllowGroups|^DenyUsers|^DenyGroups|^Match" /etc/ssh/sshd_config
```

If `AllowUsers` or `AllowGroups` is set, only the specified users or group members can connect. Make sure the user you're connecting as is included:

```bash
# Check if the user exists and is in the right groups
id username
getent group groupname
```

## Step 6: Check /etc/hosts.allow and /etc/hosts.deny (TCP Wrappers)

Older Ubuntu configurations may use TCP wrappers:

```bash
# Check TCP wrapper allow rules
cat /etc/hosts.allow

# Check TCP wrapper deny rules
cat /etc/hosts.deny

# If your IP is being denied by hosts.deny, add it to hosts.allow
# or remove the blocking entry from hosts.deny
```

## Step 7: Review Authentication Logs

The auth log shows what SSH is rejecting and why:

```bash
# View recent SSH authentication attempts and failures
sudo journalctl -u ssh --since "1 hour ago"

# Or the traditional log file
sudo tail -100 /var/log/auth.log | grep sshd

# Look for patterns like:
# sshd: Connection refused
# sshd: fatal: Cannot bind any address
# sshd: error: Bind to port 22 on 0.0.0.0 failed
```

A "Bind to port 22 failed" error means SSH couldn't start because another process is using that port:

```bash
# Find what's using port 22
sudo lsof -i :22
sudo fuser 22/tcp
```

## Step 8: Dealing with fail2ban or sshguard Blocks

If you've been blocked by a brute-force protection tool:

```bash
# Check if fail2ban is running and has banned your IP
sudo fail2ban-client status sshd

# If your IP is banned, unban it
sudo fail2ban-client set sshd unbanip YOUR_IP_ADDRESS

# Check sshguard blocks
sudo iptables -L -n | grep -i sshguard
```

## Step 9: Test with SSH Verbose Mode

When you can connect from somewhere but not from a specific client, verbose mode shows what's happening:

```bash
# Connect with maximum verbosity
ssh -vvv user@server.example.com

# The output shows each step of the connection attempt
# Look for the last successful step and the first error
```

## Common Fixes Summary

```bash
# Fix 1: SSH service not running
sudo systemctl start ssh && sudo systemctl enable ssh

# Fix 2: Firewall blocking SSH
sudo ufw allow ssh

# Fix 3: SSH listening on wrong port - connect with the right port
ssh -p 2222 user@server

# Fix 4: fail2ban blocked your IP
sudo fail2ban-client set sshd unbanip YOUR_IP

# Fix 5: Config error - validate and restore backup
sudo sshd -t
sudo cp /etc/ssh/sshd_config.bak /etc/ssh/sshd_config
sudo systemctl restart ssh
```

## Summary

"Connection refused" on port 22 is almost always one of: SSH service not running, SSH listening on a different port, a firewall blocking the connection (OS-level or cloud-level), or a misconfigured `sshd_config`. Work through these in order. Use `ss -tlnp` to confirm what's listening, `systemctl status ssh` to check the service state, and `ufw status` or cloud console to check firewalls. The server's auth logs and `sshd -t` for config validation fill in the gaps. With this approach, the cause is usually found within minutes.
