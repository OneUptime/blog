# How to Force SSH to Use IPv4 Only with the -4 Flag

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SSH, IPv4, Networking, Tunneling, Configuration, Command Line

Description: Use the SSH -4 flag and AddressFamily inet configuration to force SSH connections to use IPv4 only, avoiding IPv6 connectivity issues on dual-stack systems.

## Introduction

On dual-stack systems, SSH may attempt IPv6 connections first, causing delays or failures if IPv6 routing is incomplete. The `-4` flag forces SSH to use only IPv4 for a specific connection, while `AddressFamily inet` in `~/.ssh/config` applies it permanently.

## Using the -4 Flag

```bash
# Force IPv4 for a single SSH connection

ssh -4 user@203.0.113.10

# Force IPv4 with explicit port
ssh -4 -p 2222 user@203.0.113.10

# Force IPv4 with key file
ssh -4 -i ~/.ssh/id_rsa user@203.0.113.10

# Force IPv4 for SCP file transfers
scp -4 file.txt user@203.0.113.10:/home/user/

# Force IPv4 for SFTP
sftp -4 user@203.0.113.10
```

## Persistent Configuration in ~/.ssh/config

Set IPv4-only for specific hosts or all connections:

```bash
# ~/.ssh/config

# Force IPv4 for a specific host
Host webserver
    HostName 203.0.113.10
    User admin
    AddressFamily inet    # inet = IPv4 only, inet6 = IPv6 only, any = both

# Force IPv4 for a domain
Host *.example.com
    AddressFamily inet

# Force IPv4 for all connections
Host *
    AddressFamily inet
```

## Server-Side: Configure sshd for IPv4 Only

On the SSH server, bind only to IPv4 addresses:

```bash
# /etc/ssh/sshd_config

# Listen only on IPv4
ListenAddress 0.0.0.0    # IPv4 wildcard
# NOT: ListenAddress ::  (IPv6 wildcard)

# Alternative: use AddressFamily
AddressFamily inet
```

```bash
# Restart sshd to apply
sudo systemctl restart sshd

# Verify sshd only listens on IPv4
sudo ss -tlnp | grep sshd
# Expected: LISTEN 0 128 0.0.0.0:22 0.0.0.0:*  users:(("sshd",...))
# NOT:       LISTEN 0 128 [::]:22  :::*
```

## Debugging SSH Connection Issues

```bash
# Verbose output to see which address family is used
ssh -4 -v user@host.example.com 2>&1 | grep -E "Connecting|IPv|address"

# Test both IPv4 and IPv6 separately
ssh -4 -v user@host.example.com  # IPv4 attempt
ssh -6 -v user@host.example.com  # IPv6 attempt

# Use curl to check HTTP connectivity over each address family
curl -4 http://host.example.com/  # Force IPv4
curl -6 http://host.example.com/  # Force IPv6
```

## Aliases for IPv4-Forced SSH

```bash
# ~/.bashrc or ~/.zshrc

# Override ssh to always use IPv4
alias ssh='ssh -4'
alias scp='scp -4'
alias sftp='sftp -4'
alias rsync='rsync -e "ssh -4"'
```

## Conclusion

The SSH `-4` flag forces a single connection to use IPv4. For permanent IPv4-only behavior, add `AddressFamily inet` to `~/.ssh/config` either for specific hosts or globally under `Host *`. On the server side, set `AddressFamily inet` in `sshd_config` and bind `ListenAddress 0.0.0.0` to prevent IPv6 listeners entirely. Use `-v` for verbose output to confirm which address family SSH is using.
