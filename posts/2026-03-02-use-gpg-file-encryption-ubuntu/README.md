# How to Use GPG for File Encryption on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Security, GPG, Encryption, Privacy

Description: Learn how to use GPG (GNU Privacy Guard) on Ubuntu to encrypt and decrypt files, both with symmetric passwords and public key cryptography.

---

GPG (GNU Privacy Guard) is the open-source implementation of the OpenPGP standard. Beyond signing software packages and emails, GPG is a practical tool for encrypting files and directories on the command line. Ubuntu ships with GPG pre-installed.

## Verifying GPG is Available

```bash
# Check GPG version
gpg --version

# Ubuntu ships with GnuPG 2.x
# If somehow not installed:
sudo apt install gnupg -y
```

## Symmetric Encryption (Password-Based)

The simplest form of GPG encryption uses a password. No keys needed - the same password encrypts and decrypts.

### Encrypting a File

```bash
# Encrypt a file with a password (prompts for password interactively)
gpg --symmetric --cipher-algo AES256 secret.txt

# This creates secret.txt.gpg (encrypted file)
ls -la secret.txt.gpg

# Encrypt and specify the output filename
gpg --symmetric --cipher-algo AES256 \
    --output encrypted-file.gpg \
    secret.txt

# Encrypt with ASCII armor (base64 output - useful for pasting in emails)
gpg --symmetric --cipher-algo AES256 \
    --armor \
    --output secret.txt.asc \
    secret.txt
```

### Decrypting a File

```bash
# Decrypt (prompts for password)
gpg --decrypt secret.txt.gpg

# Decrypt and save to a file
gpg --decrypt --output decrypted.txt secret.txt.gpg

# Decrypt ASCII-armored file
gpg --decrypt --output decrypted.txt secret.txt.asc
```

### Non-Interactive Encryption with a Passphrase

For scripts, provide the passphrase non-interactively:

```bash
# Set passphrase in an environment variable
PASSPHRASE="mysecretpassphrase"

# Encrypt non-interactively
echo "$PASSPHRASE" | gpg \
    --batch \
    --passphrase-fd 0 \
    --symmetric \
    --cipher-algo AES256 \
    --output encrypted.gpg \
    plaintext.txt

# Decrypt non-interactively
echo "$PASSPHRASE" | gpg \
    --batch \
    --passphrase-fd 0 \
    --decrypt \
    --output decrypted.txt \
    encrypted.gpg
```

## Asymmetric Encryption (Public Key)

For encrypting files that others need to be able to decrypt, use their public key. Only the holder of the private key can decrypt.

### Generating a Key Pair

```bash
# Generate a new GPG key pair (interactive)
gpg --full-generate-key

# Follow the prompts:
# Key type: RSA and RSA (default)
# Key size: 4096 bits
# Expiration: 0 (never) or set a reasonable expiration like 2y
# Name and email address
# Passphrase to protect the private key

# Faster option - generate with defaults (ed25519 algorithm)
gpg --gen-key
```

### Listing Keys

```bash
# List all public keys in your keyring
gpg --list-keys

# List your secret (private) keys
gpg --list-secret-keys

# Show fingerprints (important for verification)
gpg --fingerprint
gpg --list-keys --fingerprint youremail@example.com
```

### Encrypting for a Recipient

```bash
# Encrypt a file for a specific recipient (using their public key)
# The recipient's public key must be in your keyring
gpg --encrypt \
    --recipient recipient@example.com \
    --output encrypted-for-bob.gpg \
    document.pdf

# Encrypt for multiple recipients
gpg --encrypt \
    --recipient alice@example.com \
    --recipient bob@example.com \
    --output encrypted-for-both.gpg \
    document.pdf

# Encrypt and sign (proves the message came from you)
gpg --encrypt \
    --sign \
    --recipient recipient@example.com \
    --output signed-encrypted.gpg \
    document.pdf
```

### Decrypting a File Encrypted with Your Public Key

```bash
# Decrypt a file encrypted with your public key
# GPG automatically finds the right private key
gpg --decrypt --output decrypted-document.pdf encrypted-for-bob.gpg

# If the file is ASCII-armored (.asc extension)
gpg --decrypt --output decrypted.txt message.asc
```

## Exporting and Importing Keys

To encrypt files for someone else, you need their public key:

```bash
# Export your public key for sharing
gpg --export --armor youremail@example.com > mypublickey.asc

# Export to the clipboard (on desktop systems)
gpg --export --armor youremail@example.com | xclip -selection clipboard

# Import someone else's public key from a file
gpg --import theirpublickey.asc

# Import from a keyserver
gpg --keyserver keys.openpgp.org --recv-keys KEYID

# Export your private key (keep this secure!)
gpg --export-secret-keys --armor youremail@example.com > myprivatekey-BACKUP.asc
# Store this in a secure location - never share it
```

## Practical Encryption Scripts

### Encrypt a Directory

GPG encrypts files, not directories. Use tar first:

```bash
#!/bin/bash
# encrypt-directory.sh - Encrypt an entire directory

DIRECTORY="$1"
PASSPHRASE="$2"
OUTPUT="${DIRECTORY%.}-$(date +%Y%m%d).tar.gz.gpg"

if [ -z "$DIRECTORY" ] || [ -z "$PASSPHRASE" ]; then
    echo "Usage: $0 <directory> <passphrase>"
    exit 1
fi

echo "Compressing and encrypting $DIRECTORY..."

# Create a tar archive and pipe directly to GPG
tar -czf - "$DIRECTORY" | gpg \
    --batch \
    --passphrase "$PASSPHRASE" \
    --symmetric \
    --cipher-algo AES256 \
    --output "$OUTPUT"

echo "Encrypted archive saved as: $OUTPUT"

# Verify the encrypted file can be decrypted
echo "Verifying..."
echo "$PASSPHRASE" | gpg \
    --batch \
    --passphrase-fd 0 \
    --decrypt "$OUTPUT" | tar -tzf - > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo "Verification successful."
else
    echo "WARNING: Verification failed!"
fi
```

### Decrypt a Directory Archive

```bash
#!/bin/bash
# decrypt-directory.sh - Decrypt and extract an encrypted directory archive

ENCRYPTED_FILE="$1"
PASSPHRASE="$2"
EXTRACT_DIR="${3:-.}"  # Default to current directory

if [ -z "$ENCRYPTED_FILE" ] || [ -z "$PASSPHRASE" ]; then
    echo "Usage: $0 <encrypted-file.tar.gz.gpg> <passphrase> [extract-dir]"
    exit 1
fi

echo "Decrypting and extracting $ENCRYPTED_FILE to $EXTRACT_DIR..."

echo "$PASSPHRASE" | gpg \
    --batch \
    --passphrase-fd 0 \
    --decrypt "$ENCRYPTED_FILE" | tar -xzf - -C "$EXTRACT_DIR"

echo "Extraction complete."
```

### Batch Encrypt Multiple Files

```bash
#!/bin/bash
# batch-encrypt.sh - Encrypt all files matching a pattern

PATTERN="${1:-*.txt}"
RECIPIENT="${2:-youremail@example.com}"

for file in $PATTERN; do
    [ -f "$file" ] || continue
    gpg --encrypt \
        --recipient "$RECIPIENT" \
        --output "${file}.gpg" \
        "$file"
    echo "Encrypted: $file -> ${file}.gpg"
done

echo "Done. Encrypted $(ls *.gpg 2>/dev/null | wc -l) files."
```

## Verifying File Integrity with GPG Signatures

GPG can sign files to verify authenticity without encrypting them:

```bash
# Sign a file (creates a separate .sig file)
gpg --sign --detach-sign --armor document.pdf
# Creates: document.pdf.asc

# Verify a signature
gpg --verify document.pdf.asc document.pdf

# Sign and encrypt in one step
gpg --sign --encrypt \
    --recipient recipient@example.com \
    document.pdf
```

## Managing the GPG Agent

GPG uses an agent to cache your passphrase so you don't have to enter it for every operation:

```bash
# Check if gpg-agent is running
gpg-agent --daemon --use-standard-socket 2>/dev/null || true

# Set cache time (seconds)
# Add to ~/.gnupg/gpg-agent.conf
echo "default-cache-ttl 3600" >> ~/.gnupg/gpg-agent.conf
echo "max-cache-ttl 14400" >> ~/.gnupg/gpg-agent.conf

# Reload the agent after config changes
gpgconf --reload gpg-agent

# Clear cached passphrases (forces re-entry on next use)
gpgconf --kill gpg-agent
gpg-agent --daemon --use-standard-socket
```

## File Encryption for Backup Scripts

```bash
#!/bin/bash
# backup-with-encryption.sh - Daily encrypted backup example

BACKUP_SOURCE="/home/user/documents"
BACKUP_DEST="/mnt/backup-drive"
RECIPIENT="backup@example.com"
DATE=$(date +%Y-%m-%d)
BACKUP_FILE="$BACKUP_DEST/backup-$DATE.tar.gz.gpg"

# Create encrypted backup
tar -czf - "$BACKUP_SOURCE" | \
    gpg --encrypt \
        --recipient "$RECIPIENT" \
        --output "$BACKUP_FILE"

echo "Backup created: $BACKUP_FILE ($(du -sh "$BACKUP_FILE" | cut -f1))"

# Remove backups older than 30 days
find "$BACKUP_DEST" -name "backup-*.gpg" -mtime +30 -delete
echo "Old backups cleaned up."
```

GPG symmetric encryption with AES-256 is appropriate for personal file encryption. For files shared with others or stored where multiple people need access, asymmetric (public key) encryption is more practical and secure.
