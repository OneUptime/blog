# How to Set Up GPG Subkeys for Secure Key Management on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, GPG, Security, Cryptography, Linux

Description: Learn how to create and use GPG subkeys on Ubuntu to separate your master key from daily-use keys, keeping your primary key offline and secure.

---

The most common mistake with GPG key management is using your primary key for everything. Your primary key certifies other keys and identities - if it's compromised, your entire web of trust collapses. Subkeys let you do the actual work of signing, encrypting, and authenticating while keeping the primary key locked away offline.

## Understanding the Key Hierarchy

A GPG key has a primary key pair and zero or more subkey pairs. The primary key has the `[C]` capability - Certify. Subkeys carry the other capabilities:

- `[S]` - Sign: for signing commits, emails, files
- `[E]` - Encrypt: for encrypting messages
- `[A]` - Authenticate: for SSH authentication

The normal workflow is to generate your primary key, create subkeys for daily use, export and securely store the primary key offline, and then use only the subkeys on your working machines.

## Generating the Primary Key

Start by generating a strong primary key. This key will only be used for certification:

```bash
# Generate a new key - choose RSA or ed25519
# For interactive key generation with full control:
gpg --full-generate-key

# Choose these options when prompted:
# Key type: (1) RSA and RSA, or (9) ECC (ed25519 recommended)
# Key size: 4096 for RSA
# Expiry: 0 (no expiration, or 2y for two years)
# Your name, email, comment

# After generation, list your keys to get the key ID
gpg --list-secret-keys --keyid-format=long

# Output example:
# sec   ed25519/AABBCCDD11223344 2024-01-15 [C]
# uid   John Doe <john@example.com>
```

Record your key ID - you'll use it throughout this process.

## Creating Subkeys

Enter the key editing interface to add subkeys:

```bash
# Replace KEY_ID with your actual key ID
gpg --expert --edit-key KEY_ID

# At the gpg> prompt, add a signing subkey
gpg> addkey

# Choose: (10) ECC (sign only) for ed25519
# Or: (4) RSA (sign only) for RSA

# Choose expiration - 1 year is a good balance
# Confirm and authenticate with your passphrase

# Add an encryption subkey
gpg> addkey
# Choose: (12) ECC (encrypt only) or (6) RSA (encrypt only)

# Add an authentication subkey (for SSH)
gpg> addkey
# Choose: (11) ECC (set your own capabilities)
# Toggle capabilities to get [A] only:
# - Type S to disable signing
# - Type E to disable encryption
# - Type A to enable authentication
# Then Q to finish capability selection

# Save the changes
gpg> save
```

Verify your subkeys were created:

```bash
gpg --list-secret-keys --keyid-format=long

# Expected output:
# sec   ed25519/AABBCCDD11223344 2024-01-15 [C]
# ssb   ed25519/1122334455667788 2024-01-15 [S] [expires: 2025-01-15]
# ssb   cv25519/AABBCCDD99887766 2024-01-15 [E] [expires: 2025-01-15]
# ssb   ed25519/FFAABB1122334455 2024-01-15 [A] [expires: 2025-01-15]
```

## Exporting and Storing the Primary Key Offline

Before anything else, back up your complete key including the primary key. Store this backup on an encrypted USB drive kept physically secure:

```bash
# Export the full key (primary + subkeys) for offline storage
gpg --export-secret-keys --armor KEY_ID > /media/usb/complete-key-backup.asc

# Also export just the public key for distribution
gpg --export --armor KEY_ID > my-public-key.asc

# Export the revocation certificate - generate this now while you still can
gpg --gen-revoke KEY_ID > /media/usb/revocation-certificate.asc

# Verify the backup
gpg --show-keys /media/usb/complete-key-backup.asc
```

## Removing the Primary Key from Your Working Machine

This is the critical step that makes subkeys valuable. After backing up the primary key to secure offline storage, delete it from your working keyring:

```bash
# Export only the subkeys (no primary key private material)
gpg --export-secret-subkeys --armor KEY_ID > subkeys-only.asc

# Delete the entire secret key from your keyring
gpg --delete-secret-key KEY_ID

# Re-import just the subkeys
gpg --import subkeys-only.asc

# Clean up the export file
rm subkeys-only.asc

# Verify the primary key is gone (shown as sec# with a # indicating missing)
gpg --list-secret-keys --keyid-format=long

# Output should show:
# sec#  ed25519/AABBCCDD11223344 2024-01-15 [C]
#       ^-- The # means the secret primary key is NOT present
# ssb   ed25519/1122334455667788 2024-01-15 [S]
# ssb   cv25519/AABBCCDD99887766 2024-01-15 [E]
# ssb   ed25519/FFAABB1122334455 2024-01-15 [A]
```

## Using the Authentication Subkey for SSH

GPG's authentication subkey can replace SSH keys entirely, giving you one hardware-backed key for everything:

```bash
# Enable gpg-agent as an SSH agent
# Add this to ~/.bashrc or ~/.zshrc
echo 'export SSH_AUTH_SOCK=$(gpgconf --list-dirs agent-ssh-socket)' >> ~/.bashrc
echo 'gpgconf --launch gpg-agent' >> ~/.bashrc

# Or add to ~/.gnupg/gpg-agent.conf
cat >> ~/.gnupg/gpg-agent.conf << 'EOF'
enable-ssh-support
default-cache-ttl 600
max-cache-ttl 7200
EOF

# Reload the gpg-agent
gpgconf --kill gpg-agent
gpgconf --launch gpg-agent

# Get your SSH public key from the GPG authentication subkey
gpg --export-ssh-key KEY_ID

# Add this to ~/.ssh/authorized_keys on servers you want to access
# Or to GitHub/GitLab SSH keys
```

## Using a Hardware Token (YubiKey)

Subkeys work especially well with hardware tokens like YubiKey. The private key material lives on the hardware device and never touches your computer:

```bash
# If you have a YubiKey, transfer subkeys to it
gpg --edit-key KEY_ID

# Select the first subkey
gpg> key 1

# Transfer it to the card (YubiKey)
gpg> keytocard
# Choose the appropriate slot (1=signature, 2=encryption, 3=authentication)

# Repeat for other subkeys
gpg> key 1  # Deselect key 1
gpg> key 2  # Select key 2
gpg> keytocard

gpg> key 2
gpg> key 3
gpg> keytocard

gpg> save
```

After transfer, the private key stub on your computer points to the hardware token. GPG will request the token when needed.

## Renewing Expiring Subkeys

When subkeys are about to expire, generate new ones using the primary key (which you have stored offline):

```bash
# Mount your offline backup and import the primary key temporarily
gpg --import /media/usb/complete-key-backup.asc

# Edit the key and add fresh subkeys with new expiration dates
gpg --expert --edit-key KEY_ID
gpg> addkey
# ... create new subkeys

gpg> save

# Export the updated public key for distribution
gpg --export --armor KEY_ID > updated-public-key.asc

# Upload to keyservers
gpg --keyserver keys.openpgp.org --send-keys KEY_ID

# Remove the primary key again
gpg --export-secret-subkeys --armor KEY_ID > new-subkeys.asc
gpg --delete-secret-key KEY_ID
gpg --import new-subkeys.asc
rm new-subkeys.asc
```

## Verifying Your Setup

```bash
# Confirm subkeys are working
echo "test" | gpg --clearsign

# Test encryption and decryption
echo "secret message" | gpg --encrypt --recipient KEY_ID | gpg --decrypt

# Check that the SSH agent is working with GPG keys
ssh-add -l
# Should show your GPG authentication subkey's fingerprint
```

The discipline of keeping the primary key offline pays off when a subkey is compromised. You revoke the subkey from your secure primary key, issue a new one, and your web of trust remains intact. Without subkeys, a compromised key means starting from scratch.
