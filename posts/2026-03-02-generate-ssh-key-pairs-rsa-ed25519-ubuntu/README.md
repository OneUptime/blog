# How to Generate SSH Key Pairs (RSA, Ed25519) on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, SSH, Security, Cryptography

Description: Learn how to generate RSA and Ed25519 SSH key pairs on Ubuntu, understand the differences between key types, and configure them for secure server access.

---

SSH key pairs are the backbone of secure, passwordless authentication. Instead of typing a password every time you connect, your client presents a cryptographic key that proves your identity. This guide covers generating RSA and Ed25519 keys on Ubuntu, understanding when to use each, and getting them set up properly.

## Understanding SSH Key Types

Before generating anything, it helps to understand what you're working with.

**RSA** is the older, widely-supported algorithm. Keys are typically 2048 or 4096 bits. Nearly every SSH client and server in existence supports RSA, making it the safe choice for compatibility with legacy systems.

**Ed25519** is based on elliptic curve cryptography. Keys are much shorter (256 bits) but provide equivalent or better security than 4096-bit RSA. Ed25519 is faster to generate, faster during authentication, and produces smaller key files. It requires OpenSSH 6.5+ on both the client and server, which is a non-issue on any modern Ubuntu system.

For new setups, Ed25519 is the recommended choice. If you need to connect to older systems or hardware that does not support it, generate RSA as well.

## Generating an Ed25519 Key Pair

```bash
# Generate an Ed25519 key pair
# -t specifies the key type
# -C adds a comment to identify the key (commonly your email or hostname)
ssh-keygen -t ed25519 -C "your_email@example.com"
```

The tool will prompt you for a file location. The default is `~/.ssh/id_ed25519`. Press Enter to accept the default or provide a custom path if you manage multiple keys.

Next, you'll be asked for a passphrase. A passphrase encrypts the private key on disk. If someone gets your private key file, they still can't use it without the passphrase. Use a strong passphrase for any key that will have access to production systems.

```text
Generating public/private ed25519 key pair.
Enter file in which to save the key (/home/user/.ssh/id_ed25519):
Enter passphrase (empty for no passphrase):
Enter same passphrase again:
Your identification has been saved in /home/user/.ssh/id_ed25519
Your public key has been saved in /home/user/.ssh/id_ed25519.pub
The key fingerprint is:
SHA256:abc123... your_email@example.com
```

## Generating an RSA Key Pair

```bash
# Generate a 4096-bit RSA key pair
# 2048-bit is the minimum acceptable; 4096-bit provides better security
ssh-keygen -t rsa -b 4096 -C "your_email@example.com"
```

The process is identical to Ed25519. The output files will be `~/.ssh/id_rsa` (private) and `~/.ssh/id_rsa.pub` (public).

## Generating Keys with a Custom Filename

When you manage access to multiple servers or roles, keeping keys separate is important:

```bash
# Generate a key specifically for a production environment
ssh-keygen -t ed25519 -C "prod-server-access" -f ~/.ssh/id_ed25519_prod

# Generate a key for a development environment
ssh-keygen -t ed25519 -C "dev-server-access" -f ~/.ssh/id_ed25519_dev
```

With multiple keys, you'll want to configure `~/.ssh/config` to map each key to the right host.

## Examining Your Key Files

```bash
# List your keys
ls -la ~/.ssh/

# View the public key content - this is the part you share with servers
cat ~/.ssh/id_ed25519.pub

# Check the key fingerprint (useful for verification)
ssh-keygen -lf ~/.ssh/id_ed25519.pub

# Check the fingerprint in a more readable format
ssh-keygen -lf ~/.ssh/id_ed25519.pub -E md5
```

The private key (`id_ed25519`) should never be shared or sent anywhere. The public key (`id_ed25519.pub`) is what you copy to remote servers.

## Setting Correct File Permissions

SSH is strict about file permissions. If your key files have loose permissions, SSH will refuse to use them:

```bash
# Set correct permissions on the .ssh directory
chmod 700 ~/.ssh

# Set correct permissions on private keys
chmod 600 ~/.ssh/id_ed25519
chmod 600 ~/.ssh/id_rsa

# Public keys can be a bit more permissive
chmod 644 ~/.ssh/id_ed25519.pub
chmod 644 ~/.ssh/id_rsa.pub
```

## Configuring the SSH Agent

The SSH agent holds your decrypted private keys in memory so you don't have to enter your passphrase repeatedly:

```bash
# Start the SSH agent in the background
eval "$(ssh-agent -s)"

# Add your key to the agent
# You'll be prompted for the passphrase once
ssh-add ~/.ssh/id_ed25519

# List keys currently loaded in the agent
ssh-add -l

# Add a key with a time limit (removes after 4 hours)
ssh-add -t 4h ~/.ssh/id_ed25519_prod
```

To make this persistent across sessions, add the following to your `~/.bashrc` or `~/.zshrc`:

```bash
# Auto-start SSH agent and load default key
if [ -z "$SSH_AUTH_SOCK" ]; then
    eval "$(ssh-agent -s)"
    ssh-add ~/.ssh/id_ed25519
fi
```

## Using ~/.ssh/config to Manage Multiple Keys

When you have multiple keys for different hosts, the `~/.ssh/config` file keeps things organized:

```text
# Default identity for general use
Host *
    IdentityFile ~/.ssh/id_ed25519
    AddKeysToAgent yes

# Production servers use a dedicated key
Host prod-server
    HostName 192.168.1.100
    User deploy
    IdentityFile ~/.ssh/id_ed25519_prod
    IdentitiesOnly yes

# GitHub uses its own key
Host github.com
    User git
    IdentityFile ~/.ssh/id_ed25519_github
    IdentitiesOnly yes
```

The `IdentitiesOnly yes` directive tells SSH to use only the specified key and not offer others. This prevents authentication failures on servers that limit the number of key attempts.

## Rotating Old Keys

Key rotation is a good security practice. When generating a new key to replace an old one:

```bash
# Generate a new key
ssh-keygen -t ed25519 -C "new-key-2026" -f ~/.ssh/id_ed25519_new

# Add the new public key to the remote server's authorized_keys
# (while still connected with the old key)
ssh-copy-id -i ~/.ssh/id_ed25519_new.pub user@server

# Test authentication with the new key
ssh -i ~/.ssh/id_ed25519_new user@server

# Once confirmed working, remove the old key from authorized_keys on the server
# Then remove the old local key files
rm ~/.ssh/id_ed25519_old ~/.ssh/id_ed25519_old.pub
```

## Changing a Key Passphrase

If you need to change the passphrase on an existing key without regenerating it:

```bash
# Change passphrase on an existing key
# You'll be prompted for the old passphrase, then the new one
ssh-keygen -p -f ~/.ssh/id_ed25519
```

## Verifying Key Security

```bash
# Check the key algorithm and size
ssh-keygen -lf ~/.ssh/id_ed25519

# Output shows: bit-length, fingerprint, comment, key-type
# Example: 256 SHA256:abc123... your@email.com (ED25519)

# For RSA, verify you're using at least 2048 bits (4096 preferred)
ssh-keygen -lf ~/.ssh/id_rsa
# Example: 4096 SHA256:xyz789... your@email.com (RSA)
```

## Summary

Ed25519 is the right choice for new key generation on modern Ubuntu systems - it is faster, more secure, and produces smaller keys. RSA at 4096 bits remains valid for environments requiring backward compatibility. Always protect private keys with a passphrase, set strict file permissions on `~/.ssh`, and use the SSH agent to avoid repeatedly typing passphrases. Organize multiple keys with `~/.ssh/config` and rotate keys periodically as part of your security hygiene.
