# How to Set Up GPG Key Management on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Security, GPG, Key Management, Cryptography

Description: Learn how to manage GPG keys on Ubuntu, including generating key pairs, key servers, subkeys, revocation certificates, and security best practices for long-term key management.

---

GPG key management is the foundation of secure communication and file encryption. Getting it right from the start saves significant pain later. This guide covers key generation best practices, organizing subkeys, publishing and retrieving keys from keyservers, and maintaining long-term key security.

## GPG Directory Structure

Before generating keys, understand where GPG stores data:

```bash
# Main GPG directory
ls -la ~/.gnupg/

# Key files:
# pubring.kbx     - Public keyring (all public keys you've imported)
# private-keys-v1.d/ - Private keys storage
# trustdb.gpg     - Trust database
# gpg.conf        - Configuration file
# gpg-agent.conf  - Agent configuration

# Set proper permissions (important for security)
chmod 700 ~/.gnupg
chmod 600 ~/.gnupg/*
```

## Generating a Secure Key Pair

The default `gpg --gen-key` makes decisions for you. For better control:

```bash
# Full key generation with all options
gpg --full-generate-key

# Recommended choices:
# Type: (1) RSA and RSA - or - (9) ECC and ECC (ed25519, more modern)
# Key size: 4096 (for RSA) - larger is slower but more future-proof
# Expiration: 2y (2 years - forces you to review your keys periodically)
# Real name: Your Name
# Email: youremail@example.com
# Comment: (leave blank unless you need to distinguish multiple keys)
# Passphrase: Use a strong, memorable passphrase
```

### Generating an Ed25519/Cv25519 Key (Modern Approach)

Ed25519 keys are smaller, faster, and considered more secure than RSA 4096 for most use cases:

```bash
# Interactive key generation specifying Ed25519
gpg --expert --full-generate-key

# Choose: (9) ECC and ECC
# Then: (1) Curve 25519
# Then set expiration, name, email, passphrase
```

## Listing and Inspecting Keys

```bash
# List all public keys
gpg --list-keys

# List with fingerprints (always verify fingerprints when importing keys)
gpg --list-keys --fingerprint

# List secret keys
gpg --list-secret-keys --fingerprint

# Show keyid format (short, long, fingerprint)
gpg --list-keys --keyid-format LONG

# Get detailed info about a specific key
gpg --list-keys --fingerprint youremail@example.com

# Show key signatures (who has signed this key)
gpg --list-sigs youremail@example.com
```

Example output:

```
pub   rsa4096 2026-01-01 [SC] [expires: 2028-01-01]
      ABCD 1234 5678 90AB CDEF  1234 5678 90AB CDEF 1234
uid           [ultimate] Your Name <youremail@example.com>
sub   rsa4096 2026-01-01 [E] [expires: 2028-01-01]
```

Key flags: `S` = Sign, `C` = Certify (sign other keys), `E` = Encrypt, `A` = Authenticate

## Using Subkeys

A best practice for serious GPG use is separating your master key from subkeys:
- **Master key**: Used only for certification (signing other keys). Keep offline.
- **Signing subkey**: Used for signing documents and emails
- **Encryption subkey**: Used for encrypting messages
- **Authentication subkey**: Used for SSH authentication (optional)

```bash
# Add a subkey to an existing key
gpg --edit-key youremail@example.com

# Inside the GPG editor:
gpg> addkey

# Choose type (e.g., RSA (sign only) for a signing subkey)
# Or RSA (encrypt only) for an encryption subkey
# Set expiration (subkeys can have shorter expiry than the master)

gpg> save
```

The advantage: if a subkey is compromised, you revoke and replace just that subkey. Your master key (and your web of trust) remains intact.

## Setting Key Expiration

```bash
# Change expiration date for your key
gpg --edit-key youremail@example.com

# Select the key to modify
gpg> expire

# Set new expiration date
# Enter new expiration date: 2y

# For a specific subkey, first select it
gpg> key 1  # Select subkey 1
gpg> expire

gpg> save
```

After extending expiration, republish to keyservers:

```bash
gpg --keyserver keys.openpgp.org --send-keys YOURKEYID
```

## Exporting and Backing Up Keys

```bash
# Export public key (safe to share)
gpg --export --armor youremail@example.com > my-public-key.asc

# Export private key (KEEP THIS SECURE)
gpg --export-secret-keys --armor youremail@example.com > my-private-key-BACKUP.asc

# Export just subkeys (for use on daily-use machines)
gpg --export-secret-subkeys --armor youremail@example.com > my-subkeys.asc

# Export all keys (public + private) for full backup
gpg --export --armor > all-public-keys.asc
gpg --export-secret-keys --armor > all-private-keys.asc
```

Store your private key backup in multiple secure offline locations (encrypted external drive, printed on paper stored in a safe, etc.). Never store it in cloud services without additional encryption.

## Importing Keys

```bash
# Import a key from a file
gpg --import someone-elses-key.asc

# Import from a keyserver by email
gpg --keyserver keys.openpgp.org --search-keys target@example.com

# Import by key ID or fingerprint (more reliable than email search)
gpg --keyserver keys.openpgp.org --recv-keys ABCDEF1234567890

# Import from keys.gnupg.net
gpg --keyserver hkps://keyserver.ubuntu.com --recv-keys KEYID
```

## Publishing Keys to Keyservers

```bash
# Get your key ID first
gpg --list-keys --keyid-format LONG youremail@example.com

# Send to the OpenPGP keyserver network
gpg --keyserver keys.openpgp.org --send-keys YOURKEYID

# Send to Ubuntu's keyserver
gpg --keyserver hkps://keyserver.ubuntu.com --send-keys YOURKEYID

# Send to multiple keyservers
for ks in keys.openpgp.org keyserver.ubuntu.com pgp.mit.edu; do
    gpg --keyserver "$ks" --send-keys YOURKEYID
done
```

## Creating a Revocation Certificate

Create a revocation certificate immediately after generating your key. Store it offline. If your key is ever compromised, use this to invalidate it:

```bash
# Generate revocation certificate
gpg --generate-revocation youremail@example.com > my-revocation-cert.asc

# Follow the prompts:
# Reason for revocation: (0) No reason specified
# Description: (optional)
# y to confirm

# IMPORTANT: Store this certificate securely offline
# Anyone with this certificate can revoke your key

# Protect it
chmod 400 my-revocation-cert.asc
```

### Using a Revocation Certificate

If your key is compromised:

```bash
# Import the revocation certificate (marks the key as revoked locally)
gpg --import my-revocation-cert.asc

# Publish the revoked key to keyservers so others know it's invalid
gpg --keyserver keys.openpgp.org --send-keys YOURKEYID
```

## Trust Model

GPG uses a web of trust to establish that a key actually belongs to who it claims:

```bash
# Edit trust level for a key
gpg --edit-key someone@example.com

gpg> trust

# Trust levels:
# 1 = I don't know or won't say
# 2 = I do NOT trust
# 3 = I trust marginally
# 4 = I trust fully
# 5 = I trust ultimately (only for your own keys)

gpg> quit

# Sign someone's key (verifies you've confirmed their identity)
gpg --sign-key someone@example.com

# Or use a local signature (not published to keyservers)
gpg --lsign-key someone@example.com
```

## GPG Configuration Best Practices

```bash
# Create or edit ~/.gnupg/gpg.conf
cat << 'EOF' > ~/.gnupg/gpg.conf
# Use the strongest hash algorithm
personal-cipher-preferences AES256 AES192 AES
personal-digest-preferences SHA512 SHA384 SHA256
personal-compress-preferences ZLIB BZIP2 ZIP Uncompressed

# Use SHA512 for certificate signatures
cert-digest-algo SHA512

# Always show long key IDs (prevent key ID collision attacks)
keyid-format 0xlong

# Show fingerprints in key listings
with-fingerprint

# Don't reveal the key ID used to encrypt a message (privacy)
throw-keyids

# Use the specified keyserver
keyserver hkps://keys.openpgp.org

# Always include your key in encrypted messages (so you can decrypt your own)
default-recipient-self
EOF
```

## Keybox vs. Keyring

GPG 2.1+ uses a keybox format by default. If you need to migrate:

```bash
# Export all keys from old format
gpg --export > all-public.gpg
gpg --export-secret-keys > all-secret.gpg

# Import into new keybox
gpg --import all-public.gpg
gpg --import all-secret.gpg
```

## Automating Key Backup

```bash
#!/bin/bash
# gpg-backup.sh - Backup all GPG keys to an encrypted archive

BACKUP_DIR="$HOME/gpg-backup-$(date +%Y%m%d)"
mkdir -p "$BACKUP_DIR"

# Export all public keys
gpg --export --armor > "$BACKUP_DIR/public-keys.asc"

# Export all private keys
gpg --export-secret-keys --armor > "$BACKUP_DIR/private-keys.asc"

# Export ownertrust database
gpg --export-ownertrust > "$BACKUP_DIR/ownertrust.txt"

# Export revocation certificates (if you've created them and they're imported)
# These are stored in ~/.gnupg/openpgp-revocs.d/
cp -r ~/.gnupg/openpgp-revocs.d/ "$BACKUP_DIR/" 2>/dev/null || true

# Create a tar archive
tar -czf "$BACKUP_DIR.tar.gz" -C "$(dirname "$BACKUP_DIR")" "$(basename "$BACKUP_DIR")"

# Encrypt the archive
gpg --symmetric --cipher-algo AES256 \
    --output "$BACKUP_DIR.tar.gz.gpg" \
    "$BACKUP_DIR.tar.gz"

# Clean up unencrypted files
rm -rf "$BACKUP_DIR" "$BACKUP_DIR.tar.gz"

echo "GPG backup saved to: $BACKUP_DIR.tar.gz.gpg"
echo "Store this in a secure offline location."
```

Regular key maintenance - extending expiration, revoking old subkeys, checking keyserver availability - keeps your GPG setup functional and secure over the long term.
