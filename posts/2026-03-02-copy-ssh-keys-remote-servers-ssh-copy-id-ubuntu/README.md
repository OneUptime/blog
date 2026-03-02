# How to Copy SSH Keys to Remote Servers with ssh-copy-id on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, SSH, Security, Server Administration

Description: Learn how to use ssh-copy-id to deploy SSH public keys to remote servers on Ubuntu, enabling passwordless authentication with proper file permissions.

---

After generating an SSH key pair, the next step is getting your public key onto the remote server so it can authenticate you. Doing this manually by editing `~/.ssh/authorized_keys` is error-prone - wrong permissions or a misplaced newline can break authentication silently. The `ssh-copy-id` tool handles this correctly every time.

## How ssh-copy-id Works

`ssh-copy-id` connects to the remote server using password authentication, then appends your public key to `~/.ssh/authorized_keys` on that server. It also ensures the `~/.ssh` directory and `authorized_keys` file have the correct permissions. Once the key is in place, future connections can use key-based authentication instead of a password.

## Basic Usage

The simplest form of the command:

```bash
# Copy your default public key to a remote server
# You'll be prompted for the remote user's password
ssh-copy-id user@remote-server.example.com
```

If you have a non-standard key filename or want to specify exactly which key to copy:

```bash
# Copy a specific public key
ssh-copy-id -i ~/.ssh/id_ed25519.pub user@remote-server.example.com

# Copy an RSA key
ssh-copy-id -i ~/.ssh/id_rsa.pub user@192.168.1.50
```

The `-i` flag points to the public key file. Note that it should end in `.pub` - you're copying the public key, not the private key.

## Handling Non-Standard SSH Ports

If the remote server runs SSH on a port other than 22:

```bash
# Connect to a server using a non-standard port
# The -p flag must be passed through using -o Port=
ssh-copy-id -i ~/.ssh/id_ed25519.pub -p 2222 user@remote-server.example.com

# Alternative syntax with -o flag
ssh-copy-id -i ~/.ssh/id_ed25519.pub "-p 2222 user@remote-server.example.com"
```

## Copying Keys When Password Authentication Is Restricted

On some servers, password authentication may be disabled before you've set up key auth. In that case, you can use another key to authenticate and append the new key:

```bash
# Use an existing key to connect, then add a new key to authorized_keys
ssh-copy-id -i ~/.ssh/id_ed25519_new.pub -o "IdentityFile=~/.ssh/id_ed25519_old" user@server
```

## Verifying the Key Was Copied

After running `ssh-copy-id`, test the connection:

```bash
# Test key-based authentication
ssh user@remote-server.example.com

# If using a non-default key, specify it
ssh -i ~/.ssh/id_ed25519 user@remote-server.example.com

# Verbose mode shows which key is being used
ssh -v user@remote-server.example.com 2>&1 | grep -i "identity\|key\|auth"
```

## The Manual Method When ssh-copy-id Is Unavailable

On systems where `ssh-copy-id` is not installed (some minimal environments or Windows-only clients), do it manually:

```bash
# Read the public key content
cat ~/.ssh/id_ed25519.pub

# Then on the remote server, append it to authorized_keys:
# mkdir -p ~/.ssh
# chmod 700 ~/.ssh
# echo "paste-key-content-here" >> ~/.ssh/authorized_keys
# chmod 600 ~/.ssh/authorized_keys
```

Or use a one-liner over SSH:

```bash
# Pipe the public key directly into the remote authorized_keys
cat ~/.ssh/id_ed25519.pub | ssh user@server "mkdir -p ~/.ssh && chmod 700 ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"
```

## Understanding authorized_keys File Format

Each line in `~/.ssh/authorized_keys` on the remote server represents one authorized public key. The format is:

```
# Optional comment line
ssh-ed25519 AAAA... user@hostname
ssh-rsa AAAA... another-user@another-host

# Key with restrictions - only allows this key from a specific IP
from="192.168.1.10" ssh-ed25519 AAAA... restricted-access

# Key that only runs a specific command when used
command="/usr/local/bin/backup.sh" ssh-ed25519 AAAA... backup-only-key
```

You can add these restrictions manually after using `ssh-copy-id` to give you a baseline entry.

## Copying Keys to Multiple Servers

For deploying a key to many servers at once:

```bash
# Define a list of servers
SERVERS=("server1.example.com" "server2.example.com" "server3.example.com")

# Copy the key to each server
for server in "${SERVERS[@]}"; do
    echo "Copying key to $server..."
    ssh-copy-id -i ~/.ssh/id_ed25519.pub user@"$server"
done
```

Or use a more robust approach with error handling:

```bash
#!/bin/bash
# deploy-keys.sh - Copy SSH keys to multiple servers

KEY_FILE="$HOME/.ssh/id_ed25519.pub"
REMOTE_USER="ubuntu"

while IFS= read -r server; do
    # Skip empty lines and comments
    [[ -z "$server" || "$server" == \#* ]] && continue

    echo "Deploying key to $server..."
    if ssh-copy-id -i "$KEY_FILE" "${REMOTE_USER}@${server}" 2>/dev/null; then
        echo "  Success: $server"
    else
        echo "  Failed: $server" >&2
    fi
done < servers.txt
```

## Removing an Old Key from authorized_keys

When you rotate keys or want to revoke access, remove the old key from the server:

```bash
# Connect to the server and view current authorized keys
ssh user@server "cat ~/.ssh/authorized_keys"

# Remove a specific key by its comment or unique portion
# This example removes a key with "old-key" in the comment
ssh user@server "sed -i '/old-key/d' ~/.ssh/authorized_keys"

# Verify it was removed
ssh user@server "cat ~/.ssh/authorized_keys"
```

## Common Issues and Fixes

**Permission denied (publickey)**

This usually means the key was not added correctly, or the `authorized_keys` file permissions are wrong:

```bash
# Fix permissions on the remote server
ssh user@server "chmod 700 ~/.ssh && chmod 600 ~/.ssh/authorized_keys"

# Check that the key is actually in authorized_keys
ssh user@server "grep -c '' ~/.ssh/authorized_keys"
```

**ssh-copy-id hangs or refuses connection**

```bash
# Test basic SSH connectivity first
ssh -v user@server

# Check if the remote sshd is running
nc -zv server 22
```

**Multiple keys causing "Too many authentication failures"**

If your SSH agent has many keys loaded, a server may reject the connection before trying the right key:

```bash
# Tell SSH to only try the specified key
ssh -o IdentitiesOnly=yes -i ~/.ssh/id_ed25519 user@server

# Or configure this in ~/.ssh/config
# Host server
#     IdentitiesOnly yes
#     IdentityFile ~/.ssh/id_ed25519
```

## Disabling Password Authentication After Keys Are Set Up

Once you've confirmed key authentication works, disable password logins for improved security:

```bash
# On the remote server, edit the SSH daemon config
sudo nano /etc/ssh/sshd_config

# Set these options:
# PasswordAuthentication no
# ChallengeResponseAuthentication no
# UsePAM no  (optional, consult your distro docs before changing)

# Reload the SSH service
sudo systemctl reload ssh
```

Always verify key authentication works in a separate terminal window before closing the current session when making this change.

## Summary

`ssh-copy-id` is the cleanest way to deploy public keys to remote servers. It handles directory creation, permission setting, and key appending correctly. After deployment, test the connection, then consider disabling password authentication to enforce key-only logins. For managing keys across many servers, script the deployment using a loop and maintain a record of which keys have access to which systems.
