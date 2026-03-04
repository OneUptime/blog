# How to Troubleshoot 'Connection Refused' Errors for SSH on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, SSH, Troubleshooting, Networking, Security

Description: Diagnose and fix SSH 'Connection refused' errors on RHEL by checking the sshd service, firewall rules, port configuration, and SELinux settings.

---

"Connection refused" for SSH means the client reached the server's IP address, but nothing is listening on the SSH port. This is different from a timeout (which usually means a firewall or routing issue).

## Step 1: Check if sshd is Running

```bash
# On the server (via console access or Cockpit)
sudo systemctl status sshd

# If sshd is not running, start it
sudo systemctl start sshd
sudo systemctl enable sshd

# If it fails to start, check the logs
sudo journalctl -u sshd -n 30
```

## Step 2: Verify the Listening Port

```bash
# Check what port sshd is listening on
sudo ss -tlnp | grep sshd

# If sshd is listening on a non-standard port (e.g., 2222)
# you need to connect with: ssh -p 2222 user@host

# Check the sshd config for the port
grep "^Port" /etc/ssh/sshd_config
grep "^Port" /etc/ssh/sshd_config.d/*.conf 2>/dev/null
```

## Step 3: Check the Firewall

```bash
# Check if SSH is allowed through the firewall
sudo firewall-cmd --list-services

# If ssh is not listed, add it
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --reload

# For a non-standard SSH port
sudo firewall-cmd --permanent --add-port=2222/tcp
sudo firewall-cmd --reload
```

## Step 4: Check SELinux (Non-Standard Port)

```bash
# If sshd is configured for a non-standard port
# SELinux may block it
sudo semanage port -l | grep ssh

# Add the custom port to the ssh_port_t context
sudo semanage port -a -t ssh_port_t -p tcp 2222

# Restart sshd
sudo systemctl restart sshd
```

## Step 5: Check sshd Configuration Errors

```bash
# Validate the sshd configuration
sudo sshd -t

# If there are errors, they will be printed
# Common issues:
# - Syntax errors in sshd_config
# - Missing host keys
# - Invalid options

# Regenerate host keys if missing
sudo ssh-keygen -A
sudo systemctl restart sshd
```

## Step 6: Check TCP Wrappers

```bash
# Check if /etc/hosts.deny is blocking connections
cat /etc/hosts.deny

# Check if /etc/hosts.allow permits SSH
cat /etc/hosts.allow

# Example allow entry:
# sshd: 192.168.1.0/24
```

## Step 7: Check ListenAddress

```bash
# sshd may be configured to listen on a specific IP only
grep "^ListenAddress" /etc/ssh/sshd_config

# If set to a specific IP, sshd will not accept connections on other IPs
# Set to 0.0.0.0 to listen on all interfaces
# ListenAddress 0.0.0.0

sudo systemctl restart sshd
```

## Testing from the Client

```bash
# Verbose SSH connection for debugging
ssh -vvv user@server-ip

# Test if the port is reachable
nc -zv server-ip 22

# Test with telnet
telnet server-ip 22
```

The verbose output from `ssh -vvv` shows exactly where the connection fails and is the most useful debugging tool.
