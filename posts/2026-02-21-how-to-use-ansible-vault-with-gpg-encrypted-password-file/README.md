# How to Use Ansible Vault with GPG Encrypted Password File

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Vault, GPG, Security, Encryption

Description: Learn how to store your Ansible Vault password in a GPG-encrypted file for an extra layer of security over plain text password files.

---

Storing your Ansible Vault password in a plain text file is convenient but risky. If someone gains access to your filesystem, they have your vault password. Wrapping that password file in GPG encryption adds a meaningful layer of protection: the attacker now needs your GPG private key (and its passphrase) to get at the vault password. This approach works particularly well for teams because you can encrypt the password file to multiple GPG keys, giving each team member access without sharing a single plaintext file.

## The Concept

The idea is straightforward. Instead of a plain text file containing the vault password, you have a GPG-encrypted file. A small shell script decrypts it on-the-fly and outputs the password to stdout. Ansible calls this script as a vault password file, gets the password, and proceeds normally.

```mermaid
flowchart LR
    A[GPG-Encrypted Password File] -->|gpg --decrypt| B[Shell Script]
    B -->|stdout| C[Ansible Vault]
    C --> D[Decrypted Secrets]
```

## Prerequisites

You need GPG installed and configured with at least one key pair:

```bash
# Check if GPG is installed
gpg --version

# List your existing GPG keys
gpg --list-keys

# If you don't have a key, generate one
gpg --full-generate-key
# Choose RSA and RSA, 4096 bits, and set an expiration
```

## Creating the GPG-Encrypted Password File

Start by creating and encrypting the vault password:

```bash
# Generate a strong random password for the vault
openssl rand -base64 32 > /tmp/vault_pass_plain.txt

# View the generated password (you won't need to memorize it)
cat /tmp/vault_pass_plain.txt

# Encrypt the password file with your GPG key
# Replace with your actual GPG key email or ID
gpg --encrypt --recipient your-email@example.com \
  --output ~/.vault_pass.gpg \
  /tmp/vault_pass_plain.txt

# Securely delete the plaintext file
shred -u /tmp/vault_pass_plain.txt
# On macOS (no shred), use: rm -P /tmp/vault_pass_plain.txt
```

Verify the encrypted file works:

```bash
# Decrypt and verify (GPG will prompt for your key passphrase)
gpg --decrypt ~/.vault_pass.gpg
```

## Creating the Password Script

Write a script that decrypts the GPG file and outputs the password:

```bash
#!/bin/bash
# vault_pass_gpg.sh
# Decrypts the GPG-encrypted vault password file and outputs the password
# GPG agent caches the passphrase, so you only enter it once per session

GPG_FILE="${HOME}/.vault_pass.gpg"

if [ ! -f "${GPG_FILE}" ]; then
  echo "ERROR: GPG-encrypted vault password file not found at ${GPG_FILE}" >&2
  exit 1
fi

# Decrypt and output the password
# --quiet suppresses GPG status messages
# --batch prevents interactive prompts (relies on gpg-agent for passphrase)
PASSWORD=$(gpg --quiet --batch --decrypt "${GPG_FILE}" 2>/dev/null)

if [ $? -ne 0 ]; then
  echo "ERROR: Failed to decrypt ${GPG_FILE}. Is your GPG key available?" >&2
  exit 1
fi

# Output only the password, trimming any trailing whitespace
echo -n "${PASSWORD}" | tr -d '\n'
echo
```

Set permissions and test:

```bash
# Make executable and restrict access
chmod 700 vault_pass_gpg.sh

# Test the script (will prompt for GPG passphrase on first use)
./vault_pass_gpg.sh
```

## Using It with Ansible

Configure the script in `ansible.cfg`:

```ini
# ansible.cfg
[defaults]
vault_password_file = ./vault_pass_gpg.sh
```

Now use Ansible normally. GPG agent will handle passphrase caching:

```bash
# First run in a session prompts for GPG passphrase
# Subsequent runs use the cached passphrase
ansible-vault encrypt secrets.yml
ansible-vault view secrets.yml
ansible-playbook site.yml
```

## GPG Agent Caching

The GPG agent caches your passphrase for a configurable duration, so you do not have to enter it repeatedly:

```bash
# Configure GPG agent cache timeout (in seconds)
# Add to ~/.gnupg/gpg-agent.conf
# 28800 seconds = 8 hours
cat > ~/.gnupg/gpg-agent.conf << 'AGENTCONF'
default-cache-ttl 28800
max-cache-ttl 28800
AGENTCONF

# Reload the GPG agent to apply changes
gpgconf --kill gpg-agent
gpg-agent --daemon
```

During a typical workday, you enter your GPG passphrase once in the morning, and every Ansible command after that decrypts seamlessly.

## Encrypting for Multiple Team Members

The real power of this approach shows when working in teams. Encrypt the password file to multiple GPG keys so each team member can decrypt it independently:

```bash
# Encrypt the vault password to multiple recipients
gpg --encrypt \
  --recipient alice@example.com \
  --recipient bob@example.com \
  --recipient charlie@example.com \
  --output vault_pass.gpg \
  /tmp/vault_pass_plain.txt
```

Commit the GPG-encrypted file to the repository:

```bash
# The GPG-encrypted file is safe to commit
# Only people with the right GPG keys can decrypt it
git add vault_pass.gpg
git commit -m "Add GPG-encrypted vault password"
```

This is a significant advantage over plain text password files. The encrypted file can live in your repository, and only authorized team members can decrypt it.

## Project Structure with GPG Vault Password

A typical project layout:

```
project/
  ansible.cfg              # references vault_pass_gpg.sh
  vault_pass_gpg.sh        # decryption script (committed)
  vault_pass.gpg           # GPG-encrypted password (committed)
  .gitignore               # excludes plaintext password files
  group_vars/
    production/
      vars.yml             # plaintext config
      vault.yml            # ansible-vault encrypted secrets
```

```ini
# ansible.cfg
[defaults]
vault_password_file = ./vault_pass_gpg.sh
```

```gitignore
# .gitignore
# Exclude any plaintext password files but NOT the GPG-encrypted one
*.vault_pass
vault_pass.txt
vault_pass_plain*
```

## Rotating the Vault Password

When you need to rotate the vault password:

```bash
#!/bin/bash
# rotate_vault_password.sh
# Generates a new vault password, re-encrypts the GPG file, and rekeys vault files

# Step 1: Decrypt the old password
OLD_PASS=$(gpg --quiet --batch --decrypt vault_pass.gpg)

# Step 2: Generate a new password
NEW_PASS=$(openssl rand -base64 32)

# Step 3: Write temporary password files
echo "${OLD_PASS}" > /tmp/old_vault_pass.txt
echo "${NEW_PASS}" > /tmp/new_vault_pass.txt

# Step 4: Rekey all vault-encrypted files
find . -name "vault.yml" -exec ansible-vault rekey \
  --vault-password-file /tmp/old_vault_pass.txt \
  --new-vault-password-file /tmp/new_vault_pass.txt {} +

# Step 5: Re-encrypt the new password with GPG (to all recipients)
echo "${NEW_PASS}" | gpg --encrypt \
  --recipient alice@example.com \
  --recipient bob@example.com \
  --output vault_pass.gpg

# Step 6: Clean up
shred -u /tmp/old_vault_pass.txt /tmp/new_vault_pass.txt

echo "Vault password rotated. Commit the updated files."
```

## Adding and Removing Team Members

When someone joins the team, re-encrypt the password file with their key added:

```bash
# Decrypt the current password
VAULT_PASS=$(gpg --quiet --batch --decrypt vault_pass.gpg)

# Re-encrypt with the new team member's key added
echo "${VAULT_PASS}" | gpg --encrypt \
  --recipient alice@example.com \
  --recipient bob@example.com \
  --recipient newperson@example.com \
  --output vault_pass.gpg

# Commit the updated file
git add vault_pass.gpg
git commit -m "Add newperson to vault access"
```

When someone leaves, re-encrypt without their key AND rotate the vault password (since they knew the old one):

```bash
# Re-encrypt without the departed person's key
# AND use a new vault password (since they knew the old one)
NEW_PASS=$(openssl rand -base64 32)

echo "${NEW_PASS}" | gpg --encrypt \
  --recipient alice@example.com \
  --recipient bob@example.com \
  --output vault_pass.gpg

# Then rekey all vault files with the new password
```

## Troubleshooting

Common issues and fixes:

```bash
# "No secret key" error - your GPG key is not available
gpg --list-secret-keys
# If empty, you need to import your private key

# "Inappropriate ioctl for device" - GPG cannot prompt for passphrase
# Fix: ensure GPG_TTY is set
export GPG_TTY=$(tty)
# Add to ~/.bashrc for persistence

# GPG agent not running
gpg-agent --daemon

# Test decryption manually to isolate issues
gpg --decrypt vault_pass.gpg
```

## Summary

GPG-encrypted vault passwords give you the convenience of automated decryption with the security of public-key cryptography. The password file is safe to commit to version control, team member access is managed through GPG key lists, and the GPG agent handles passphrase caching so you are not constantly typing passwords. This approach hits a practical sweet spot between security and usability for teams managing infrastructure with Ansible.
