# How to Generate and Use SSH Keys on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, SSH, Security, Authentication, Keys, Tutorial

Description: Complete guide to generating SSH key pairs, managing keys, and configuring key-based authentication for secure remote access on Ubuntu.

---

SSH keys provide secure, passwordless authentication for remote server access. They're more secure than passwords and essential for automating deployments, CI/CD pipelines, and daily system administration. This guide covers generating keys, managing them, and best practices.

## Understanding SSH Keys

SSH keys work in pairs:
- **Private Key**: Stays on your local machine (never share!)
- **Public Key**: Placed on servers you want to access

Authentication works by proving you possess the private key that matches a public key on the server.

## Generating SSH Keys

### Generate Ed25519 Key (Recommended)

Ed25519 is the modern, secure choice:

```bash
# Generate Ed25519 key pair
ssh-keygen -t ed25519 -C "your_email@example.com"
```

You'll be prompted for:
- **File location**: Press Enter for default (`~/.ssh/id_ed25519`)
- **Passphrase**: Enter a strong passphrase (recommended) or leave empty

### Generate RSA Key (Compatibility)

For systems that don't support Ed25519:

```bash
# Generate 4096-bit RSA key
ssh-keygen -t rsa -b 4096 -C "your_email@example.com"
```

### Key Generation Options

```bash
# Generate with custom filename
ssh-keygen -t ed25519 -f ~/.ssh/myserver_key -C "myserver access"

# Generate without passphrase (for automation - less secure)
ssh-keygen -t ed25519 -f ~/.ssh/automation_key -N ""

# Generate with specific passphrase
ssh-keygen -t ed25519 -f ~/.ssh/secure_key -N "your_passphrase"
```

## View Your Keys

```bash
# List keys in .ssh directory
ls -la ~/.ssh/

# View public key (this is what you share)
cat ~/.ssh/id_ed25519.pub

# View key fingerprint
ssh-keygen -lf ~/.ssh/id_ed25519.pub
```

Public key format:
```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI... your_email@example.com
```

## Copy Public Key to Server

### Method 1: ssh-copy-id (Easiest)

```bash
# Copy key to remote server
ssh-copy-id -i ~/.ssh/id_ed25519.pub user@server_ip

# For non-standard SSH port
ssh-copy-id -i ~/.ssh/id_ed25519.pub -p 2222 user@server_ip
```

### Method 2: Manual Copy

```bash
# Display public key
cat ~/.ssh/id_ed25519.pub

# Connect to server with password
ssh user@server_ip

# On server: create .ssh directory
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# Append public key to authorized_keys
echo "ssh-ed25519 AAAAC3..." >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys

# Exit server
exit
```

### Method 3: Single Command

```bash
# Copy public key in one command
cat ~/.ssh/id_ed25519.pub | ssh user@server_ip "mkdir -p ~/.ssh && chmod 700 ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"
```

## Test Key Authentication

```bash
# Connect using key (should not prompt for password)
ssh user@server_ip

# Verbose mode to debug connection
ssh -v user@server_ip

# Specify which key to use
ssh -i ~/.ssh/id_ed25519 user@server_ip
```

## SSH Config File

Simplify connections with `~/.ssh/config`:

```bash
# Create or edit SSH config
nano ~/.ssh/config
```

```
# Default settings for all hosts
Host *
    AddKeysToAgent yes
    IdentitiesOnly yes

# Production server
Host prod
    HostName 192.168.1.100
    User admin
    IdentityFile ~/.ssh/id_ed25519
    Port 22

# Staging server
Host staging
    HostName staging.example.com
    User deploy
    IdentityFile ~/.ssh/staging_key
    Port 2222

# Jump host configuration
Host internal
    HostName 10.0.0.5
    User admin
    ProxyJump jumphost

Host jumphost
    HostName jump.example.com
    User jumpuser
    IdentityFile ~/.ssh/jump_key
```

Now connect with:
```bash
ssh prod
ssh staging
ssh internal
```

## Managing Multiple Keys

### Different Keys for Different Services

```bash
# Generate key for GitHub
ssh-keygen -t ed25519 -f ~/.ssh/github_key -C "github@example.com"

# Generate key for work servers
ssh-keygen -t ed25519 -f ~/.ssh/work_key -C "work@company.com"

# Generate key for personal servers
ssh-keygen -t ed25519 -f ~/.ssh/personal_key -C "personal@example.com"
```

Configure in `~/.ssh/config`:

```
Host github.com
    HostName github.com
    User git
    IdentityFile ~/.ssh/github_key

Host gitlab.com
    HostName gitlab.com
    User git
    IdentityFile ~/.ssh/gitlab_key
```

## SSH Agent

The SSH agent holds your keys in memory so you don't need to enter passphrases repeatedly.

### Start SSH Agent

```bash
# Start agent and add to environment
eval "$(ssh-agent -s)"
```

### Add Keys to Agent

```bash
# Add default key
ssh-add

# Add specific key
ssh-add ~/.ssh/github_key

# Add key with timeout (removed after 1 hour)
ssh-add -t 3600 ~/.ssh/secure_key

# List keys in agent
ssh-add -l

# Remove all keys from agent
ssh-add -D
```

### Persistent Agent (Keychain)

Add to `~/.bashrc` or `~/.zshrc`:

```bash
# Start SSH agent if not running
if [ -z "$SSH_AUTH_SOCK" ]; then
    eval "$(ssh-agent -s)" > /dev/null
    ssh-add ~/.ssh/id_ed25519 2>/dev/null
fi
```

Or use `keychain`:

```bash
# Install keychain
sudo apt install keychain -y

# Add to ~/.bashrc
eval $(keychain --eval --quiet id_ed25519)
```

## Disable Password Authentication

After verifying key authentication works:

```bash
# On the server, edit SSH config
sudo nano /etc/ssh/sshd_config
```

```
# Disable password authentication
PasswordAuthentication no
PubkeyAuthentication yes
ChallengeResponseAuthentication no
UsePAM yes
```

```bash
# Restart SSH service
sudo systemctl restart sshd
```

**Warning**: Ensure key authentication works before disabling passwords!

## Changing Key Passphrase

```bash
# Change passphrase on existing key
ssh-keygen -p -f ~/.ssh/id_ed25519

# You'll be prompted for old passphrase, then new passphrase
```

## Revoking Access

To remove someone's access:

```bash
# On the server, edit authorized_keys
nano ~/.ssh/authorized_keys

# Delete the line containing their public key
# Each key is one line starting with ssh-ed25519 or ssh-rsa
```

## Key Security Best Practices

### Protect Private Keys

```bash
# Set correct permissions
chmod 700 ~/.ssh
chmod 600 ~/.ssh/id_ed25519
chmod 644 ~/.ssh/id_ed25519.pub
chmod 600 ~/.ssh/config

# Never share private keys
# Never commit private keys to git
```

### Add to .gitignore

```bash
# In your home directory
echo "id_*" >> ~/.ssh/.gitignore
echo "!*.pub" >> ~/.ssh/.gitignore
```

### Use Passphrases

Always use strong passphrases for important keys:
- At least 20 characters
- Mix of words, numbers, symbols
- Use a password manager

### Key Rotation

Periodically rotate keys:
1. Generate new key pair
2. Add new public key to servers
3. Test access with new key
4. Remove old public key from servers
5. Delete old private key

## Troubleshooting

### Permission Denied (publickey)

```bash
# Check key permissions
ls -la ~/.ssh/

# Ensure correct permissions
chmod 700 ~/.ssh
chmod 600 ~/.ssh/id_ed25519
chmod 644 ~/.ssh/id_ed25519.pub

# Verify key is being offered
ssh -v user@server_ip 2>&1 | grep "Offering"

# Check server's authorized_keys
# On server:
cat ~/.ssh/authorized_keys
ls -la ~/.ssh/
```

### Agent Has No Identities

```bash
# Add key to agent
ssh-add ~/.ssh/id_ed25519

# Verify
ssh-add -l
```

### Wrong Key Being Used

```bash
# Force specific key
ssh -i ~/.ssh/correct_key user@server_ip

# Or configure in ~/.ssh/config with IdentitiesOnly yes
```

### Server Refuses Key

Check server-side issues:

```bash
# On server, check SSH logs
sudo tail -f /var/log/auth.log

# Common issues:
# - Wrong permissions on ~/.ssh or authorized_keys
# - Key format issues
# - SELinux/AppArmor blocking
```

### Too Many Authentication Failures

```bash
# Limit keys offered
ssh -o IdentitiesOnly=yes -i ~/.ssh/specific_key user@server_ip

# Or add to config:
Host server
    IdentitiesOnly yes
    IdentityFile ~/.ssh/specific_key
```

## SSH Key for Git Services

### GitHub

```bash
# Copy public key
cat ~/.ssh/github_key.pub

# Add at: https://github.com/settings/keys

# Test connection
ssh -T git@github.com
```

### GitLab

```bash
# Copy public key
cat ~/.ssh/gitlab_key.pub

# Add at: https://gitlab.com/-/profile/keys

# Test connection
ssh -T git@gitlab.com
```

---

SSH keys are fundamental to secure server management and modern DevOps workflows. Use Ed25519 keys when possible, always protect private keys with strong passphrases, and leverage SSH config files to simplify daily work. For enhanced security, consider hardware security keys (like YubiKey) for storing SSH keys.
