# How to Connect to SSH Servers over IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, SSH, OpenSSH, Remote Access, Client

Description: Learn how to connect to remote SSH servers over IPv6, including global addresses, link-local addresses, and configuring your SSH client for IPv6 connections.

## Basic SSH Connection over IPv6

```bash
# Connect using IPv6 address directly

ssh user@2001:db8::10

# With explicit port
ssh -p 2222 user@2001:db8::10

# Force IPv6 (ignore IPv4)
ssh -6 user@2001:db8::10

# With verbose logging to see IPv6 negotiation
ssh -v user@2001:db8::10
```

## SSH Client Configuration (~/.ssh/config)

```text
# ~/.ssh/config

# Use IPv6 for all connections
AddressFamily inet6

# Specific host over IPv6
Host myserver
    HostName 2001:db8::10
    User admin
    Port 22
    AddressFamily inet6
    IdentityFile ~/.ssh/id_ed25519

# Use IPv6 for hosts in a domain
Host *.ipv6.example.com
    AddressFamily inet6

# Prefer IPv6 but fall back to IPv4
Host *
    AddressFamily any
```

## Connecting with Hostname

```bash
# If hostname has AAAA record, SSH will use IPv6
ssh user@server.example.com

# Force IPv6 even if hostname has both A and AAAA records
ssh -6 user@server.example.com

# Check DNS AAAA record
dig server.example.com AAAA

# Verify which address was used
ssh -v user@server.example.com 2>&1 | grep "Connecting to"
```

## First-Time Connection and Host Keys

```bash
# First connection to IPv6 host - accept key fingerprint
ssh user@2001:db8::10
# The authenticity of host '2001:db8::10 (2001:db8::10)' can't be established.
# ED25519 key fingerprint is SHA256:xxxx.
# Are you sure you want to continue connecting (yes/no)?

# Automatically accept (use with caution)
ssh -o StrictHostKeyChecking=no user@2001:db8::10

# Add host key to known_hosts manually
ssh-keyscan -6 2001:db8::10 >> ~/.ssh/known_hosts
```

## SCP and rsync over IPv6

```bash
# Copy file to remote via SCP over IPv6 (brackets required around IPv6 address)
scp /local/file.txt user@[2001:db8::10]:/remote/path/

# Copy from remote via SCP
scp user@[2001:db8::10]:/remote/file.txt /local/path/

# Force IPv6 for SCP
scp -6 /local/file.txt user@[2001:db8::10]:/remote/path/

# rsync over SSH with IPv6
rsync -av -e "ssh -6" /local/dir/ user@2001:db8::10:/remote/dir/

# rsync with explicit IPv6 address
rsync -av /local/file.txt "user@[2001:db8::10]:/remote/path/"
```

## Port Forwarding over IPv6

```bash
# Local port forwarding: tunnel local port 8080 to remote service via IPv6
ssh -L 8080:localhost:80 user@2001:db8::10

# Remote port forwarding: expose local service on remote IPv6 host
ssh -R 9090:localhost:9090 user@2001:db8::10

# Dynamic SOCKS proxy over IPv6
ssh -D 1080 user@2001:db8::10

# Forward specific IPv6 addresses in tunnel
ssh -L "[::1]:8080:localhost:80" user@2001:db8::10
```

## SFTP over IPv6

```bash
# Interactive SFTP session over IPv6
sftp user@2001:db8::10

# Inside SFTP:
# ls, get, put, mkdir, rm, etc.

# Batch mode
sftp user@2001:db8::10 << 'EOF'
get /remote/file.txt /local/file.txt
put /local/upload.txt /remote/upload.txt
bye
EOF
```

## Troubleshooting IPv6 SSH Connections

```bash
# Debug connection with verbose output
ssh -vvv user@2001:db8::10

# Check if server is reachable
nc -6 -zv 2001:db8::10 22

# Verify your IPv6 address
ip -6 addr show

# Test ICMP
ping6 2001:db8::10

# Check SSH known_hosts for stale entries
grep "2001:db8::10" ~/.ssh/known_hosts

# Remove stale host key
ssh-keygen -R 2001:db8::10
```

## Summary

Connect to SSH servers over IPv6 with `ssh user@2001:db8::10` (using the IPv6 address directly) or `ssh -6 user@hostname` to force IPv6. Configure `~/.ssh/config` with `AddressFamily inet6` for persistent IPv6 preference. Use `ssh-keyscan -6 2001:db8::10 >> ~/.ssh/known_hosts` to pre-populate host keys. For SCP, use `scp -6` or bracket notation `scp user@[2001:db8::10]:/path`. Debug with `ssh -vvv` to see address selection details.
