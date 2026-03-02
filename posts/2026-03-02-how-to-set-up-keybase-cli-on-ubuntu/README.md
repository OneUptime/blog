# How to Set Up Keybase CLI on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Keybase, Security, Cryptography, Linux

Description: Install and configure the Keybase CLI on Ubuntu to verify cryptographic identities, encrypt files, use the encrypted filesystem, and communicate securely with your team.

---

Keybase ties cryptographic identity to social accounts - GitHub, Twitter, Reddit, and others. When you verify someone's Keybase identity, you're not just trusting a key exchange; you're trusting a chain of proofs that their public key is controlled by the same person who controls those social accounts. The CLI brings this to the command line alongside encrypted file storage and team chat.

## Installing Keybase

Keybase provides packages for Ubuntu. Install from their official repository:

```bash
# Download and install the Keybase package
curl --remote-name https://prerelease.keybase.io/keybase_amd64.deb
sudo apt install ./keybase_amd64.deb

# Or use the newer apt repository method
curl -s https://keybase.io/docs/server_security/code_signing_key.asc | \
  sudo gpg --dearmor -o /usr/share/keyrings/keybase-keyring.gpg

echo "deb [arch=amd64 signed-by=/usr/share/keyrings/keybase-keyring.gpg] \
  https://prerelease.keybase.io/deb stable main" | \
  sudo tee /etc/apt/sources.list.d/keybase.list

sudo apt update
sudo apt install keybase

# Verify the installation
keybase version
```

## Creating an Account and Logging In

```bash
# Create a new Keybase account
keybase signup

# Or log in to an existing account
keybase login

# After login, run the service in the background
# Keybase requires a background service for most operations
run_keybase

# Check your current user
keybase status

# Verify the service is running
keybase ctl status
```

On headless servers (no GUI), the service runs in background mode automatically after login.

## Verifying Your Identity

The core feature of Keybase is proving that your cryptographic key belongs to you by posting proofs on your social accounts:

```bash
# Prove your GitHub identity
keybase prove github your-github-username

# Keybase will tell you to create a public gist with specific content
# Follow the instructions, then Keybase verifies it automatically

# Prove your Twitter identity
keybase prove twitter your-twitter-handle

# Prove ownership of a domain
keybase prove dns example.com
# Follow DNS TXT record instructions

# List all your current proofs
keybase id

# Look up another user and verify their proofs
keybase id username
keybase id github://their-github-username
```

## Encrypting and Signing Files

The CLI provides simple commands for file encryption and signing:

```bash
# Encrypt a file for a specific Keybase user
keybase encrypt recipient-username -m "secret message"

# Encrypt to multiple recipients
keybase encrypt user1 user2 user3 < sensitive-file.txt > encrypted.txt

# Encrypt a file
keybase encrypt recipient-username -i document.pdf -o document.pdf.kbx

# Decrypt a file
keybase decrypt -i document.pdf.kbx -o document.pdf

# Sign a file (creates a detached signature)
keybase sign -i release.tar.gz -d -o release.tar.gz.sig

# Verify a signature from a specific user
keybase verify -S sender-username -i release.tar.gz -d -s release.tar.gz.sig

# Sign and encrypt in one operation
keybase encrypt -s recipient-username -i secret.txt -o secret.txt.kbx
```

## Using the Keybase Filesystem (KBFS)

Keybase provides an encrypted, distributed filesystem mounted at `/keybase`. Files placed in your private directory are end-to-end encrypted:

```bash
# Check if KBFS is mounted
ls /keybase

# Your private directory - only you can read it
ls /keybase/private/yourusername/

# Write a file to your private storage
echo "backup data" > /keybase/private/yourusername/notes.txt

# Shared directories with other users (both must have Keybase)
ls /keybase/private/yourusername,otherusername/

# Public directory - world-readable, cryptographically signed by you
# Anyone can verify these files came from you
ls /keybase/public/yourusername/

# Copy a file to your public directory
cp my-gpg-key.asc /keybase/public/yourusername/

# Team directories (requires creating a team)
ls /keybase/team/myteam/
```

If KBFS is not automatically mounted, start it:

```bash
# Mount the filesystem
keybase fuse mount

# Or restart the Keybase service
keybase ctl stop
run_keybase

# Check mount status
keybase fs stat /keybase
```

## Working with Teams

Keybase supports encrypted team communication and shared file storage:

```bash
# Create a new team
keybase team create mycompany.devops

# Add a member to the team
keybase team add-member mycompany.devops --user colleague --role writer

# List team members
keybase team list-members mycompany.devops

# Access the team's shared filesystem
ls /keybase/team/mycompany.devops/

# Store shared secrets or configs in the team directory
cp database-credentials.txt /keybase/team/mycompany.devops/secrets/

# Send a message to the team channel
keybase chat send mycompany.devops#general "Deployment complete"

# Read recent messages from a channel
keybase chat read mycompany.devops#general

# Send a direct message to a user
keybase chat send otherusername "Can you review the PR?"
```

## Git Repositories with Keybase

Keybase supports end-to-end encrypted Git repositories:

```bash
# Create a new encrypted repository
keybase git create myrepo

# Clone a Keybase Git repository
keybase git clone keybase://private/yourusername/myrepo
# or
git clone keybase://private/yourusername/myrepo

# List your Keybase repositories
keybase git list

# Add a Keybase remote to an existing repository
cd existing-project
git remote add keybase keybase://private/yourusername/existing-project

# Push to Keybase
git push keybase main

# Create a team repository
keybase git create mycompany.devops/infrastructure
git clone keybase://team/mycompany.devops/infrastructure
```

## Managing the Keybase Service on Ubuntu

On Ubuntu servers, you typically want Keybase running as a persistent background service:

```bash
# Start the Keybase service
run_keybase

# Check service status
keybase ctl status

# Restart the service
keybase ctl stop
run_keybase

# For a system-level auto-start, create a systemd user service
mkdir -p ~/.config/systemd/user/

cat > ~/.config/systemd/user/keybase.service << 'EOF'
[Unit]
Description=Keybase service
After=network.target

[Service]
ExecStart=/usr/bin/keybase service
Restart=on-failure

[Install]
WantedBy=default.target
EOF

# Enable the user service
systemctl --user enable keybase.service
systemctl --user start keybase.service
loginctl enable-linger $USER  # Start on boot without login
```

## Scripting with Keybase

The CLI is script-friendly for automation:

```bash
#!/bin/bash
# backup-to-keybase.sh - Encrypted backup script using Keybase

BACKUP_DIR="/keybase/private/yourusername/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Create a database dump
pg_dump myapp_db > /tmp/db_backup_${TIMESTAMP}.sql

# Compress it
tar -czf /tmp/db_backup_${TIMESTAMP}.tar.gz /tmp/db_backup_${TIMESTAMP}.sql

# Upload to Keybase encrypted storage
cp /tmp/db_backup_${TIMESTAMP}.tar.gz "${BACKUP_DIR}/"

# Notify team via chat
keybase chat send mycompany.devops#ops \
  "Database backup completed: db_backup_${TIMESTAMP}.tar.gz"

# Clean up temporary files
rm /tmp/db_backup_${TIMESTAMP}.sql /tmp/db_backup_${TIMESTAMP}.tar.gz

echo "Backup complete: ${BACKUP_DIR}/db_backup_${TIMESTAMP}.tar.gz"
```

## Troubleshooting

Common issues and fixes:

```bash
# If the service isn't responding
keybase ctl stop
pkill -f keybase
run_keybase

# If KBFS isn't mounting
keybase fs sync disable  # disable sync if causing issues
keybase ctl stop
run_keybase

# Check for errors in the Keybase log
keybase log send  # sends logs to Keybase for support

# Clear and resync if things are stuck
keybase clear-cached-public-key
keybase ctl reload
```

Keybase's strength is in combining identity verification with encryption. Having a place to share files, keys, and messages with cryptographic proof of who you're talking to is genuinely useful for small teams and open source projects.
