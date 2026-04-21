# How to Set Up an SSH Bastion Host for IPv4 Network Access

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SSH, Bastion Host, IPv4, Security, Jump Server, Network Access

Description: Configure an SSH bastion host as a secure entry point for accessing internal IPv4 servers, implementing jump server functionality with proper access controls.

## Introduction

A bastion host (jump server) is a hardened SSH server on a public IPv4 address that provides a single, auditable entry point to internal networks. All access to internal servers flows through the bastion, reducing the attack surface.

## Architecture

```mermaid
graph LR
    C[Client<br/>Internet] -->|SSH :22| B["Bastion<br/>203.0.113.10"]
    B -->|SSH| S1["Server 1<br/>10.0.0.10"]
    B -->|SSH| S2["Server 2<br/>10.0.0.11"]
    B -->|SSH| S3["Server 3<br/>10.0.0.12"]
```

## Bastion Host sshd_config

Harden the bastion SSH configuration:

```bash
# /etc/ssh/sshd_config (on bastion server)

# Listen on public IPv4 only

ListenAddress 203.0.113.10
Port 22

# Disable root login
PermitRootLogin no

# Key-based auth only
PasswordAuthentication no
PubkeyAuthentication yes

# Disable X11 and forwarding for most users
X11Forwarding no
AllowTcpForwarding no   # Set forwarding off by default; override per-user below

# Only allow specific users
AllowUsers alice bob carol

# Timeout settings
ClientAliveInterval 300
ClientAliveCountMax 2
LoginGraceTime 30

# Logging
LogLevel VERBOSE

# For users who need ProxyJump or port forwarding:
Match User alice
    AllowTcpForwarding yes
```

## Client-Side ~/.ssh/config with ProxyJump

Configure SSH to automatically use the bastion:

```bash
# ~/.ssh/config

# Bastion host definition
Host bastion
    HostName 203.0.113.10
    User alice
    AddressFamily inet
    IdentityFile ~/.ssh/id_rsa_bastion

# Internal servers: jump through bastion automatically
Host 10.0.0.*
    User ubuntu
    IdentityFile ~/.ssh/id_rsa_internal
    ProxyJump bastion
    AddressFamily inet

# Named shortcuts for specific servers
Host web-prod
    HostName 10.0.0.10
    User deploy
    ProxyJump bastion

Host db-primary
    HostName 10.0.0.20
    User postgres
    ProxyJump bastion
```

## Connecting Through the Bastion

```bash
# Direct access through bastion to internal server
ssh web-prod

# Or inline with -J flag
ssh -J alice@203.0.113.10 ubuntu@10.0.0.10

# Force IPv4 throughout
ssh -4 -J alice@203.0.113.10 ubuntu@10.0.0.10

# SCP through bastion
scp -J alice@203.0.113.10 file.txt ubuntu@10.0.0.10:/home/ubuntu/

# Port forwarding through bastion to internal service
ssh -L 5432:10.0.0.20:5432 alice@203.0.113.10 -N
```

## Auditing Bastion Access

```bash
# Monitor all connections through the bastion
sudo tail -f /var/log/auth.log | grep sshd

# Record interactive shell history on the bastion (if using it as a shell server)
# Create the history directory once:
# sudo install -d -m 1733 /var/log/bash_history
# Add to /etc/profile or /etc/bash.bashrc:
# export HISTFILE=/var/log/bash_history/$(whoami)_$(date +%F)
# export HISTTIMEFORMAT="%F %T "

# Use ForceCommand to log or restrict what users can do
# Match User alice
#     ForceCommand /usr/local/bin/audit-wrapper

# Use auditd for comprehensive syscall logging
sudo auditctl -w /etc/ssh/sshd_config -p rwxa -k sshd_config
```

## Bastion and Internal Firewall Rules

```bash
# Allow SSH to the bastion from trusted admin IPs only
sudo iptables -A INPUT -i eth0 -p tcp -s 198.51.100.0/24 --dport 22 -j ACCEPT
sudo iptables -A INPUT -i eth0 -p tcp --dport 22 -j DROP

# Allow outbound SSH from bastion to internal servers
sudo iptables -A OUTPUT -p tcp -d 10.0.0.0/8 --dport 22 -j ACCEPT

# If the bastion is not a router, block packet forwarding through it
sudo iptables -A FORWARD -j DROP

# On each internal server or its cloud firewall, allow SSH only from the bastion's private IP
sudo iptables -A INPUT -p tcp -s 10.0.0.5 --dport 22 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 22 -j DROP
```

## Conclusion

An SSH bastion host centralizes and audits all administrative access to internal IPv4 infrastructure. Configure `ProxyJump` in `~/.ssh/config` to make bastion-mediated access transparent to developers. Harden the bastion with key-only auth, `PermitRootLogin no`, and `AllowUsers`, and use internal-host or cloud firewall rules to ensure the bastion is the only SSH path to internal servers.
