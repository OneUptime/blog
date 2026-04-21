# How to Use SSH ProxyJump to Access IPv4 Servers Through a Jump Host

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SSH, ProxyJump, IPv4, Jump Host, Bastion, Networking

Description: Use SSH ProxyJump (-J flag and ProxyJump directive) to connect to internal IPv4 servers through a bastion jump host in a single command.

## Introduction

`ProxyJump` (introduced in OpenSSH 7.3) is the modern, clean way to connect through SSH jump hosts. It establishes an SSH connection to the jump host and then creates a second SSH connection through it-using a single command, with authentication handled for each SSH hop.

## Basic ProxyJump Usage

```bash
# -J flag: specify jump host(s)

# Connect to 10.0.0.10 via bastion at 203.0.113.10
ssh -J user@203.0.113.10 admin@10.0.0.10

# Use IPv4-only mode with IPv4 addresses
ssh -4 -J user@203.0.113.10 admin@10.0.0.10

# Jump through multiple hops (comma-separated)
ssh -J user@203.0.113.10,user@10.0.0.1 admin@192.168.1.10
```

## Configuring ProxyJump in ~/.ssh/config

```bash
# ~/.ssh/config

# Jump host definition
Host jump
    HostName 203.0.113.10
    User jumpuser
    IdentityFile ~/.ssh/jump_key
    AddressFamily inet
    ServerAliveInterval 30

# Internal servers using the jump host
Host web-*
    User webadmin
    IdentityFile ~/.ssh/internal_key
    ProxyJump jump

Host web-prod
    HostName 10.0.1.10

Host web-staging
    HostName 10.0.1.20

Host db-*
    User dbadmin
    IdentityFile ~/.ssh/db_key
    ProxyJump jump

Host db-primary
    HostName 10.0.2.10

Host db-replica
    HostName 10.0.2.11
```

## Chained Jump Hosts

For multi-hop access (e.g., dev environment → staging → internal):

```bash
# ~/.ssh/config

Host outer-bastion
    HostName 203.0.113.10
    User alice

Host inner-bastion
    HostName 10.0.0.1
    User alice
    ProxyJump outer-bastion

Host production-server
    HostName 192.168.1.10
    User deploy
    ProxyJump inner-bastion
```

```bash
# Single command reaches through two jump hosts
ssh production-server
```

## ProxyJump with SCP, SFTP, and Rsync

```bash
# SCP through jump host
scp -J user@203.0.113.10 local-file.txt admin@10.0.0.10:/home/admin/

# SFTP through jump host
sftp -J user@203.0.113.10 admin@10.0.0.10

# Rsync through jump host
rsync -avz -e "ssh -J user@203.0.113.10" \
  /local/path/ admin@10.0.0.10:/remote/path/
```

## Port Forwarding Through Jump Host

```bash
# Local port forward through jump host to internal database
ssh -J user@203.0.113.10 \
  -L 5432:db.internal:5432 \
  admin@10.0.0.10 -N -f

# Now connect to PostgreSQL locally
psql -h 127.0.0.1 -p 5432 -U dbuser mydb
```

## SSH Agent for Key Authentication

When the target server accepts the same local key as the jump host:

```bash
# ~/.ssh/config

Host jump
    HostName 203.0.113.10
    User alice

Host internal
    HostName 10.0.0.10
    User alice
    ProxyJump jump
```

```bash
# Add key to the local agent
ssh-add ~/.ssh/id_ed25519

# Connect (the local client can use the agent for both SSH authentications)
ssh internal
```

## Conclusion

SSH `ProxyJump` (`-J` flag or `ProxyJump` in config) is the cleanest way to access IPv4 servers through jump hosts. It handles multiple hops, works with SCP/SFTP/rsync, and supports port forwarding. Configure `~/.ssh/config` with named hosts and `ProxyJump` directives to make multi-hop access as simple as `ssh internal-server`.
