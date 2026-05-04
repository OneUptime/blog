# How to Configure SSH ProxyJump over IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, SSH, ProxyJump, Jump Host, Bastion Host

Description: Learn how to configure SSH ProxyJump (jump host / bastion host) over IPv6 to reach internal servers via an intermediate IPv6 jump host.

## SSH ProxyJump Basics

ProxyJump (`-J`) creates a tunnel through an intermediate SSH server (jump host / bastion) to reach a final destination. All of this works over IPv6.

```bash
# Jump through bastion at 2001:db8::1 to reach internal server at 2001:db8::100

ssh -J user@2001:db8::1 admin@2001:db8::100

# Multiple jump hosts (chained)
ssh -J user@2001:db8::1,user@2001:db8::2 admin@2001:db8::100

# Explicit port on jump host (IPv6 literal must be in square brackets when a port is specified)
ssh -J user@[2001:db8::1]:22 admin@2001:db8::100

# Force IPv6 on jump
ssh -J user@2001:db8::1 -6 admin@destination.internal
```

## ~/.ssh/config with ProxyJump

```text
# ~/.ssh/config

# Define the jump host (bastion)
Host bastion
    HostName 2001:db8::1
    User jumpuser
    AddressFamily inet6
    IdentityFile ~/.ssh/id_ed25519
    ServerAliveInterval 30

# Internal server accessible via jump host
Host internal-server
    HostName 2001:db8::100
    User admin
    ProxyJump bastion
    AddressFamily inet6
    IdentityFile ~/.ssh/id_ed25519

# Multiple internal servers using same bastion
Host app-*
    ProxyJump bastion
    AddressFamily inet6
    User deploy

Host app-server-1
    HostName 2001:db8::101

Host app-server-2
    HostName 2001:db8::102
```

## ProxyCommand Alternative (Older SSH Versions)

```text
# ~/.ssh/config (for SSH < 7.3 that lacks ProxyJump)

Host internal-server
    HostName 2001:db8::100
    User admin
    ProxyCommand ssh -6 -W [%h]:%p user@2001:db8::1

# With agent forwarding through the jump
Host internal-server
    HostName 2001:db8::100
    User admin
    ProxyCommand ssh -A -6 -W [%h]:%p jumpuser@2001:db8::1
```

## Agent Forwarding with ProxyJump

```bash
# Forward SSH agent through the jump host
ssh -A -J jumpuser@2001:db8::1 admin@2001:db8::100

# In ~/.ssh/config
# Host internal-server
#     ProxyJump bastion
#     ForwardAgent yes
```

## SCP and rsync via ProxyJump

```bash
# SCP through jump host to internal server
scp -J jumpuser@2001:db8::1 file.txt admin@2001:db8::100:/remote/path/

# SCP from internal server through jump host
scp -J jumpuser@2001:db8::1 admin@2001:db8::100:/remote/file.txt ./

# rsync through jump host
rsync -av -e "ssh -6 -J jumpuser@2001:db8::1" /local/dir/ admin@2001:db8::100:/remote/

# With ssh config (uses ProxyJump automatically)
rsync -av /local/dir/ internal-server:/remote/
```

## Multi-Hop ProxyJump

```text
# ~/.ssh/config

# Three-hop jump: internet → DMZ bastion → internal jump → final server
Host internet-bastion
    HostName 2001:db8::1
    User bastion-user
    AddressFamily inet6

Host internal-jump
    HostName 2001:db8::50
    User jump-user
    ProxyJump internet-bastion
    AddressFamily inet6

Host final-server
    HostName 2001:db8::200
    User admin
    ProxyJump internal-jump
    AddressFamily inet6
```

## Port Forwarding via ProxyJump

```bash
# Local port forward via jump host to internal service
# (IPv6 destinations in -L must be enclosed in square brackets)
ssh -J jumpuser@2001:db8::1 \
    -L 8080:[2001:db8::100]:80 \
    -N admin@2001:db8::100

# Access database behind jump host
ssh -J jumpuser@2001:db8::1 \
    -L 5432:[2001:db8::100]:5432 \
    -N db-user@2001:db8::100
```

## Troubleshooting ProxyJump over IPv6

```bash
# Verbose mode shows each hop
ssh -vv -J jumpuser@2001:db8::1 admin@2001:db8::100

# Test jump host connectivity
ssh -6 -o ConnectTimeout=5 jumpuser@2001:db8::1 echo "Jump host OK"

# Test internal server from jump host
ssh -J jumpuser@2001:db8::1 \
    -o ConnectTimeout=5 \
    admin@2001:db8::100 \
    echo "Internal server OK"

# Common issue: Jump host resolves destination to IPv4
# Fix: Use IPv6 addresses directly or set AddressFamily inet6 in config
```

## Summary

Configure SSH ProxyJump for IPv6 with `ssh -J jumpuser@2001:db8::1 admin@2001:db8::100` or set `ProxyJump bastion` in `~/.ssh/config`. Chain multiple jumps with `ssh -J hop1,hop2 destination`. Use `ProxyCommand ssh -6 -W [%h]:%p user@jump` for SSH < 7.3 (square brackets around `%h` are required when the destination is an IPv6 literal). Set `AddressFamily inet6` on both the jump host and destination entries in config. All SSH features (SCP, rsync, port forwarding, agent forwarding) work through ProxyJump. Debug with `ssh -vv`.
