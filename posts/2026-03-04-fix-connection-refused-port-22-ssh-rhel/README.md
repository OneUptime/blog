# How to Fix 'Connection Refused' on Port 22 SSH on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, SSH, Troubleshooting, Firewall, Sshd

Description: Diagnose and resolve 'Connection refused' errors when attempting SSH connections to port 22 on RHEL systems.

---

"Connection refused" on port 22 means either the SSH daemon is not running, is listening on a different port, or a firewall is actively rejecting the connection.

## Step 1: Check if sshd Is Running

```bash
# Check the SSH daemon status
sudo systemctl status sshd

# If it is not running, start it
sudo systemctl start sshd

# Enable it to start at boot
sudo systemctl enable sshd
```

## Step 2: Check Which Port sshd Is Listening On

```bash
# View the configured port
sudo grep -E "^Port|^#Port" /etc/ssh/sshd_config

# Check what port sshd is actually listening on
sudo ss -tlnp | grep sshd
# LISTEN  0  128  0.0.0.0:22  0.0.0.0:*  users:(("sshd",pid=1234,fd=3))

# If sshd is on a different port, connect to that port
ssh -p 2222 user@server.example.com
```

## Step 3: Check the Firewall

```bash
# Check if the ssh service is allowed through the firewall
sudo firewall-cmd --list-services
# Look for "ssh" in the output

# If ssh is not listed, add it
sudo firewall-cmd --add-service=ssh --permanent
sudo firewall-cmd --reload

# If using a non-standard port
sudo firewall-cmd --add-port=2222/tcp --permanent
sudo firewall-cmd --reload
```

## Step 4: Check SELinux for Non-Standard Ports

```bash
# If you changed the SSH port, SELinux may block it
sudo semanage port -l | grep ssh
# ssh_port_t tcp 22

# Add the custom port to SELinux
sudo semanage port -a -t ssh_port_t -p tcp 2222
```

## Step 5: Check for Network-Level Blocks

```bash
# Test connectivity from the client side
nc -zv server.example.com 22

# Check iptables rules on the server
sudo iptables -L -n | grep 22

# Check if TCP wrappers are blocking access
cat /etc/hosts.deny
cat /etc/hosts.allow
```

## Step 6: Check sshd Configuration Errors

```bash
# Validate the SSH configuration
sudo sshd -t

# If there are configuration errors, sshd will not start
# Check the logs for details
sudo journalctl -u sshd --since "10 minutes ago"

# Common config issues:
# - ListenAddress set to a specific IP that does not exist
# - Invalid cipher or key exchange algorithms
```

## Step 7: Check System Resource Issues

```bash
# If the system is running out of memory or file descriptors, sshd may fail
sudo journalctl -u sshd | grep -i "error\|fail"

# Check available memory
free -h
```

Start with step 1. If sshd is running and the firewall allows port 22, the issue is likely network-level (routers, security groups, or intermediate firewalls).
