# How to Debug Ansible SSH Connection Failures

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, SSH, Networking, Troubleshooting

Description: Learn how to systematically diagnose and fix SSH connection failures in Ansible with step-by-step debugging techniques.

---

SSH connection failures are the most fundamental problem you can hit with Ansible because if Ansible cannot connect to a host, nothing else works. The errors range from cryptic timeout messages to authentication failures, and the cause might be anywhere from a typo in the inventory to a firewall rule or an SSH key permission issue. This post walks through a systematic debugging process for every common SSH failure scenario.

## The Error Messages

SSH failures in Ansible typically look like one of these:

```
fatal: [web-01]: UNREACHABLE! => {"changed": false, "msg": "Failed to connect to the host via ssh: ssh: connect to host web-01 port 22: Connection timed out", "unreachable": true}

fatal: [web-01]: UNREACHABLE! => {"changed": false, "msg": "Failed to connect to the host via ssh: Permission denied (publickey,password).", "unreachable": true}

fatal: [web-01]: UNREACHABLE! => {"changed": false, "msg": "Failed to connect to the host via ssh: ssh: Could not resolve hostname web-01: Name or service not known", "unreachable": true}
```

## Step 1: Test SSH Manually

Before debugging Ansible, verify that you can SSH to the host directly:

```bash
# Basic SSH test
ssh user@web-01

# SSH with verbose output
ssh -vvv user@web-01

# SSH with a specific key
ssh -i ~/.ssh/id_ed25519 -vvv user@web-01

# SSH on a non-standard port
ssh -p 2222 user@web-01
```

If manual SSH works but Ansible fails, the problem is in Ansible's SSH configuration. If manual SSH also fails, fix the SSH issue first.

## Step 2: Run Ansible with Maximum Verbosity

Use `-vvvv` to see exactly what SSH command Ansible is running:

```bash
# Maximum verbosity shows the full SSH command
ansible web-01 -m ping -vvvv
```

Look for the `SSH: EXEC` lines in the output:

```
<web-01> SSH: EXEC ssh -C -o ControlMaster=auto -o ControlPersist=60s
  -o 'IdentityFile="/home/deploy/.ssh/id_ed25519"'
  -o KbdInteractiveAuthentication=no
  -o PreferredAuthentications=gssapi-with-mic,gssapi-keyex,hostbased,publickey
  -o PasswordAuthentication=no
  -o ConnectTimeout=10
  -o 'ControlPath="/home/deploy/.ansible/cp/abc123"'
  deploy@web-01 '/bin/sh -c ...'
```

Copy this SSH command and run it manually to see the exact error.

## Common Failure: Connection Timed Out

```
ssh: connect to host web-01 port 22: Connection timed out
```

**Possible causes:**
1. Host is down
2. Wrong IP address or hostname
3. Firewall blocking port 22
4. Network routing issue
5. SSH running on a different port

**Debugging steps:**

```bash
# Check if the host is reachable at all
ping web-01

# Check if the SSH port is open
nc -zv web-01 22
# Or with nmap
nmap -p 22 web-01

# Check DNS resolution
dig web-01
nslookup web-01

# Check routing
traceroute web-01
```

**Fix if SSH is on a different port:**

```ini
# inventory file
[webservers]
web-01 ansible_port=2222

# Or in ansible.cfg
[defaults]
remote_port = 2222
```

## Common Failure: Permission Denied

```
Permission denied (publickey,password).
```

**Debugging steps:**

```bash
# Check which authentication methods are offered
ssh -vvv user@web-01 2>&1 | grep "Authentications that can continue"

# Check if your key is being offered
ssh -vvv user@web-01 2>&1 | grep "Offering public key"

# Check if the key is accepted
ssh -vvv user@web-01 2>&1 | grep "Authentication succeeded"
```

**Common causes and fixes:**

```bash
# Cause 1: Wrong SSH key
# Check which key Ansible is using
ansible web-01 -m ping -vvvv 2>&1 | grep IdentityFile

# Fix: Specify the correct key in inventory
# inventory
web-01 ansible_ssh_private_key_file=~/.ssh/correct_key
```

```bash
# Cause 2: Wrong username
# Fix: Set the correct user
# inventory
web-01 ansible_user=ubuntu
```

```bash
# Cause 3: Key permissions too open
ls -la ~/.ssh/id_ed25519
# Should be: -rw------- (600)
chmod 600 ~/.ssh/id_ed25519
chmod 700 ~/.ssh
```

```bash
# Cause 4: Public key not in authorized_keys on the remote host
# Copy the key manually
ssh-copy-id -i ~/.ssh/id_ed25519.pub user@web-01
```

```bash
# Cause 5: Remote authorized_keys has wrong permissions
# On the remote host:
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
```

## Common Failure: Host Key Verification Failed

```
Host key verification failed.
```

This happens when the host's SSH key has changed (server rebuilt, different server on same IP) or when connecting for the first time without the host key in known_hosts.

**Fix for development/testing (less secure):**

```ini
# ansible.cfg
[defaults]
host_key_checking = false
```

Or per-host:

```ini
# inventory
web-01 ansible_ssh_common_args='-o StrictHostKeyChecking=no'
```

**Fix for production (secure):**

```bash
# Remove the old host key
ssh-keygen -R web-01

# Add the new host key
ssh-keyscan -H web-01 >> ~/.ssh/known_hosts
```

## Common Failure: Cannot Resolve Hostname

```
ssh: Could not resolve hostname web-01: Name or service not known
```

**Fix: Use IP address in inventory:**

```ini
# inventory
[webservers]
web-01 ansible_host=10.0.1.50
web-02 ansible_host=10.0.1.51
```

Or fix DNS:

```bash
# Check DNS resolution
dig web-01
host web-01

# Add to /etc/hosts if no DNS
echo "10.0.1.50 web-01" | sudo tee -a /etc/hosts
```

## Common Failure: SSH Control Socket Issues

Ansible uses SSH multiplexing (ControlMaster) to speed up connections. Sometimes the control socket gets corrupted:

```
ssh: Connection to web-01 timed out
```

But you can SSH manually just fine. The control socket might be stale.

**Fix:**

```bash
# Remove stale control sockets
rm -rf ~/.ansible/cp/*

# Or disable control persist temporarily
ANSIBLE_SSH_ARGS="-o ControlMaster=no" ansible web-01 -m ping
```

## Debugging with the ansible Command

Use the `ansible` ad-hoc command for quick connection tests:

```bash
# Basic connectivity test
ansible web-01 -m ping

# Test with a specific user
ansible web-01 -m ping -u ubuntu

# Test with a specific key
ansible web-01 -m ping --private-key=~/.ssh/mykey

# Test with password authentication
ansible web-01 -m ping --ask-pass

# Test with become (sudo)
ansible web-01 -m ping --become --ask-become-pass

# Test all hosts in a group
ansible webservers -m ping
```

## SSH Configuration for Ansible

Create a dedicated SSH config for your Ansible hosts:

```
# ~/.ssh/config

Host web-*
    User deploy
    IdentityFile ~/.ssh/deploy_key
    Port 22
    StrictHostKeyChecking no
    ConnectTimeout 10

Host bastion
    HostName 203.0.113.10
    User admin
    IdentityFile ~/.ssh/bastion_key

Host 10.0.1.*
    ProxyJump bastion
    User deploy
    IdentityFile ~/.ssh/internal_key
```

Ansible respects `~/.ssh/config`, so these settings apply automatically.

## Debugging Bastion/Jump Host Issues

When connecting through a jump host, failures can happen at either hop:

```ini
# inventory
[webservers]
web-01 ansible_host=10.0.1.50
web-02 ansible_host=10.0.1.51

[webservers:vars]
ansible_ssh_common_args='-o ProxyCommand="ssh -W %h:%p -q bastion@203.0.113.10"'
```

**Debugging:**

```bash
# Test the jump host connection first
ssh bastion@203.0.113.10

# Then test the full path
ssh -o ProxyCommand="ssh -W %h:%p -q bastion@203.0.113.10" deploy@10.0.1.50

# With verbose output
ssh -vvv -o ProxyCommand="ssh -vvv -W %h:%p -q bastion@203.0.113.10" deploy@10.0.1.50
```

## Connection Timeout Configuration

Adjust timeouts for slow networks:

```ini
# ansible.cfg
[defaults]
timeout = 30  # SSH connection timeout in seconds

[ssh_connection]
ssh_args = -o ConnectTimeout=30 -o ConnectionAttempts=3
```

Or in inventory for specific hosts:

```ini
# Slow hosts get longer timeouts
[slow_network]
remote-host ansible_host=203.0.113.50

[slow_network:vars]
ansible_ssh_common_args='-o ConnectTimeout=60'
```

## Quick Diagnostic Checklist

When you hit an SSH failure, run through this checklist:

```bash
# 1. Can you resolve the hostname?
dig web-01

# 2. Can you reach the host?
ping -c 3 web-01

# 3. Is SSH port open?
nc -zv web-01 22

# 4. Can you SSH manually?
ssh -vvv user@web-01

# 5. What does Ansible's verbose output show?
ansible web-01 -m ping -vvvv

# 6. Are there stale control sockets?
ls -la ~/.ansible/cp/

# 7. Are SSH key permissions correct?
ls -la ~/.ssh/
```

## Summary

SSH connection failures in Ansible are always one of these problems: the host is unreachable (network/firewall), the hostname cannot be resolved (DNS), the authentication fails (wrong key/user/permissions), or the host key has changed. Start by testing SSH manually with `-vvv`, then check Ansible's full SSH command with `-vvvv`. Fix the most basic layer first (network connectivity), then authentication, then Ansible-specific SSH settings. Keep a clean SSH config file and maintain your known_hosts file to prevent recurring issues.
