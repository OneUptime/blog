# How to Configure SSH Key-Based Authentication on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, SSH, Key-Based Auth, Security, Linux

Description: Step-by-step guide to setting up SSH key-based authentication on RHEL, covering key generation, deployment, permissions, and common pitfalls.

---

SSH keys are the foundation of secure remote access. A key pair provides stronger authentication than any password, and it eliminates the risk of password brute-forcing entirely. Setting up key-based auth on RHEL is straightforward, but the details around file permissions and SELinux matter.

## Generating an SSH Key Pair

On your local workstation (not the server), generate a key pair:

```bash
# Generate an Ed25519 key (recommended for RHEL)
ssh-keygen -t ed25519 -C "jsmith@workstation"
```

When prompted:
- **File location**: Accept the default (`~/.ssh/id_ed25519`) or specify a custom path.
- **Passphrase**: Always set a passphrase. It protects the key if someone steals it.

### Alternative: Generate an RSA key

If you need RSA compatibility with older systems:

```bash
# Generate a 4096-bit RSA key
ssh-keygen -t rsa -b 4096 -C "jsmith@workstation"
```

### What gets created

```bash
~/.ssh/id_ed25519      # Private key (NEVER share this)
~/.ssh/id_ed25519.pub  # Public key (this goes on servers)
```

## Deploying the Public Key to the Server

### Method 1: ssh-copy-id (easiest)

```bash
# Copy your public key to the server
ssh-copy-id -i ~/.ssh/id_ed25519.pub admin@server.example.com
```

This appends your public key to `~/.ssh/authorized_keys` on the server and sets the correct permissions.

### Method 2: Manual copy

If ssh-copy-id is not available:

```bash
# Copy the public key content
cat ~/.ssh/id_ed25519.pub
```

Then on the server:

```bash
# Create the .ssh directory if it does not exist
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# Add the public key
echo "ssh-ed25519 AAAA...your-key-here... jsmith@workstation" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

### Method 3: SCP the key and append

```bash
# Copy the key file to the server
scp ~/.ssh/id_ed25519.pub admin@server.example.com:/tmp/

# On the server, append it
ssh admin@server.example.com
cat /tmp/id_ed25519.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
rm /tmp/id_ed25519.pub
```

## Critical: File Permissions

SSH is very strict about file permissions. If they are wrong, key auth silently fails and falls back to password auth.

```bash
# On the server, verify permissions
ls -la ~/.ssh/
ls -la ~/.ssh/authorized_keys
```

Required permissions:

| Path | Permission | Owner |
|---|---|---|
| ~/.ssh/ | 700 (drwx------) | The user |
| ~/.ssh/authorized_keys | 600 (-rw-------) | The user |
| Home directory | 755 or stricter | The user |

```bash
# Fix permissions if needed
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
chown -R $(whoami):$(whoami) ~/.ssh
```

## SELinux Context

On RHEL, SELinux may prevent SSH from reading authorized_keys if the context is wrong:

```bash
# Check the SELinux context
ls -laZ ~/.ssh/authorized_keys
```

Expected context: `unconfined_u:object_r:ssh_home_t:s0`

If the context is wrong:

```bash
# Restore the correct SELinux context
sudo restorecon -Rv ~/.ssh/
```

## Testing Key-Based Authentication

```bash
# Test from your workstation
ssh -i ~/.ssh/id_ed25519 admin@server.example.com

# Verbose mode for troubleshooting
ssh -vvv -i ~/.ssh/id_ed25519 admin@server.example.com
```

In verbose output, look for:

```bash
debug1: Offering public key: /home/jsmith/.ssh/id_ed25519 ED25519
debug1: Server accepts key: /home/jsmith/.ssh/id_ed25519 ED25519
debug1: Authentication succeeded (publickey).
```

## Configuring the SSH Server

Verify the SSH server accepts key authentication:

```bash
sudo vi /etc/ssh/sshd_config
```

Make sure these lines are present:

```bash
PubkeyAuthentication yes
AuthorizedKeysFile .ssh/authorized_keys
```

These are the defaults on RHEL, so they should already be set.

## Managing Multiple Keys

### Using ssh-agent

```bash
# Start the SSH agent
eval $(ssh-agent)

# Add your key
ssh-add ~/.ssh/id_ed25519

# List loaded keys
ssh-add -l
```

### Configuring different keys for different servers

```bash
vi ~/.ssh/config
```

```bash
Host webserver
    HostName web.example.com
    User admin
    IdentityFile ~/.ssh/id_ed25519_web

Host dbserver
    HostName db.example.com
    User dbadmin
    IdentityFile ~/.ssh/id_ed25519_db
```

## Revoking a Key

To remove access for a specific key:

```bash
# On the server, edit authorized_keys
vi ~/.ssh/authorized_keys
# Delete the line containing the key to revoke
```

Or if you know the key content:

```bash
# Remove a specific key by matching its comment
grep -v "jsmith@old-laptop" ~/.ssh/authorized_keys > ~/.ssh/authorized_keys.tmp
mv ~/.ssh/authorized_keys.tmp ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

## Deploying Keys Across a Fleet

For multiple servers, use a script or Ansible:

```bash
# Simple script to deploy a key to multiple servers
for server in web01 web02 web03 db01 db02; do
    ssh-copy-id -i ~/.ssh/id_ed25519.pub admin@"$server"
    echo "Key deployed to $server"
done
```

## Troubleshooting

### Key auth fails silently

Check the server's auth log:

```bash
sudo tail -f /var/log/secure
```

Common causes:
- Wrong permissions on `.ssh/` or `authorized_keys`
- Wrong SELinux context
- Home directory permissions too open
- Wrong ownership

### "Permission denied (publickey)" immediately

```bash
# Check that the right key is being offered
ssh -vvv admin@server 2>&1 | grep "Offering"
```

### Key works for one user but not another

Compare permissions between the working and broken user accounts:

```bash
sudo ls -laZ /home/workinguser/.ssh/
sudo ls -laZ /home/brokenuser/.ssh/
```

## Wrapping Up

SSH key-based authentication is not complicated, but the details around file permissions, ownership, and SELinux context trip people up constantly. Use `ssh-copy-id` for deployment, always set a passphrase on your private key, and use verbose mode (`-vvv`) when troubleshooting. Once keys are working, disable password authentication entirely to close the door on brute-force attacks.
