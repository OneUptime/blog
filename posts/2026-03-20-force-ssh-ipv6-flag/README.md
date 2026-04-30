# How to Force SSH to Use IPv6 with -6 Flag

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, SSH, OpenSSH, -6 Flag, Address Family

Description: Learn how to force SSH and related tools (scp, sftp, ssh-keyscan) to use IPv6 exclusively using the -6 flag, and how to make this the default in your SSH client configuration.

## The SSH -6 Flag

The `-6` flag forces SSH to use IPv6 addresses only, ignoring IPv4 even if both A and AAAA DNS records exist for a hostname.

```bash
# Force IPv6 for SSH connection

ssh -6 user@server.example.com

# Equivalent using -o AddressFamily
ssh -o "AddressFamily inet6" user@server.example.com

# Force IPv6 with explicit address
ssh -6 user@2001:db8::10

# Force IPv4 (for comparison)
ssh -4 user@server.example.com
```

## Using IPv6 with SSH Utilities

```bash
# SCP with IPv6
scp -6 file.txt user@server.example.com:/remote/path/
scp -6 user@server.example.com:/remote/file.txt ./

# SFTP with IPv6
sftp -6 user@server.example.com

# ssh-keyscan with IPv6 (scan host keys)
ssh-keyscan -6 server.example.com
ssh-keyscan -6 2001:db8::10

# ssh-copy-id with IPv6 (install public key)
ssh-copy-id -o AddressFamily=inet6 user@server.example.com
```

## rsync with IPv6

```bash
# rsync forces IPv6 via SSH options
rsync -av -e "ssh -6" /local/dir/ user@server.example.com:/remote/dir/

# rsync with explicit IPv6 address (bracket notation required)
rsync -av /local/file.txt "user@[2001:db8::10]:/remote/path/"

# rsync push with IPv6 and port
rsync -av -e "ssh -6 -p 2222" /local/ user@server.example.com:/remote/
```

## Permanent IPv6 Default in ~/.ssh/config

```text
# ~/.ssh/config

# Force IPv6 for ALL connections
Host *
    AddressFamily inet6

# Force IPv6 for specific host pattern
Host *.ipv6.example.com
    AddressFamily inet6

# Force IPv6 for specific server
Host prod-server
    HostName server.example.com
    AddressFamily inet6
    User admin
```

## Why Use -6 Flag?

```bash
# Scenario 1: Host has both A and AAAA records, but only IPv6 is accessible
# Without -6, SSH may try IPv4 first and time out
ssh -6 user@dual-stack-server.example.com  # Skip IPv4, go directly to IPv6

# Scenario 2: Verify IPv6 connectivity specifically
ssh -v -6 user@server.example.com 2>&1 | grep "Connecting to"
# Output: Connecting to server.example.com [2001:db8::10] port 22

# Scenario 3: Script that must use IPv6
#!/bin/bash
HOST="server.example.com"
ssh -6 -o ConnectTimeout=10 user@"$HOST" "hostname"

# Scenario 4: Checking if IPv6 SSH is working vs. IPv4
ssh -4 user@server.example.com "echo IPv4 works"
ssh -6 user@server.example.com "echo IPv6 works"
```

## Aliases and Shell Functions

```bash
# Add to ~/.bashrc or ~/.zshrc

# Alias: always use IPv6 for SSH
alias ssh6='ssh -6'
alias scp6='scp -6'
alias sftp6='sftp -6'

# Function: SSH to host with IPv6 preference
ssh_ipv6() {
    ssh -6 -o "ConnectTimeout=10" "$@"
}

# Function: Test if host is reachable via IPv6 SSH
test_ipv6_ssh() {
    local host=$1
    if ssh -6 -o "ConnectTimeout=5" -o "BatchMode=yes" "user@$host" "echo ok" 2>/dev/null; then
        echo "$host: IPv6 SSH OK"
    else
        echo "$host: IPv6 SSH FAILED"
    fi
}
```

## Comparison: -4 vs -6 vs default

```bash
# Default: SSH tries in order based on getaddrinfo() result
ssh user@dual-stack.example.com

# IPv4 only
ssh -4 user@dual-stack.example.com

# IPv6 only
ssh -6 user@dual-stack.example.com

# Verbose output shows address family used
ssh -v -6 user@server.example.com 2>&1 | grep -E "Connecting|AF_INET"
```

## Summary

Force SSH to use IPv6 exclusively with the `-6` flag: `ssh -6 user@host`. This also works with `scp -6`, `sftp -6`, and `ssh-keyscan -6`. For `ssh-copy-id`, pass `-o AddressFamily=inet6` or set `AddressFamily inet6` in `~/.ssh/config`. The `-6` flag is useful when a host has both A and AAAA records but you specifically need to test or use IPv6 connectivity, bypassing potential IPv4 fallback.
