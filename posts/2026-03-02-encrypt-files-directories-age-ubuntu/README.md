# How to Encrypt Files and Directories with age on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Security, Encryption, Age, Cryptography

Description: Learn how to use age, a modern and simple file encryption tool, to encrypt files and directories on Ubuntu with passphrase and public key encryption.

---

`age` (Actually Good Encryption) is a modern file encryption tool designed to be simple, secure, and composable. Created by Filippo Valsorda (who also works on Go's cryptography), age addresses common GPG pain points: no key management complexity, no configuration files, no legacy cipher support, and no interoperability with 1990s protocols. It's the right tool for straightforward file encryption.

## Installing age on Ubuntu

```bash
# Method 1: Install from Ubuntu repositories (Ubuntu 22.04+)
sudo apt update
sudo apt install age -y

# Verify installation
age --version

# Method 2: Download binary from GitHub releases
curl -LO https://github.com/FiloSottile/age/releases/latest/download/age-v1.1.1-linux-amd64.tar.gz
tar -xzf age-v1.1.1-linux-amd64.tar.gz
sudo mv age/age age/age-keygen /usr/local/bin/
age --version

# Method 3: Via Go
go install filippo.io/age/cmd/...@latest
```

## Passphrase-Based Encryption

The simplest use case - encrypt with a password you choose:

```bash
# Encrypt a file with a passphrase (prompts interactively)
age --passphrase --output secret.txt.age plaintext.txt

# Decrypt
age --decrypt --output decrypted.txt secret.txt.age
# Prompts for the passphrase

# Encrypt from stdin (useful in pipelines)
echo "sensitive data" | age --passphrase > secret.age

# Decrypt to stdout
age --decrypt secret.age
```

### Non-Interactive Passphrase Encryption

For use in scripts, pipe the passphrase:

```bash
# Encrypt with a passphrase from a variable
# Note: age reads passphrase from file or stdin when using --passphrase
PASSPHRASE="your-strong-passphrase"

# Using a passphrase file
echo "$PASSPHRASE" > /tmp/pass.txt
chmod 600 /tmp/pass.txt

# age doesn't support reading passphrase from environment/stdin directly
# The recommended approach for scripting is to use key pairs instead
```

## Key Pair Encryption

age uses X25519 key pairs for asymmetric encryption. Unlike GPG, there is no key management system - keys are just files.

### Generating Key Pairs

```bash
# Generate a new key pair
# age-keygen writes the private key to stdout and prints the public key
age-keygen

# Example output:
# # created: 2026-03-02T10:00:00Z
# # public key: age1ql3z7hjy54pw3hyww5ayyfg7zqgvc7w3j2elw8zmrj2kg5sfn9aqmcac8p
# AGE-SECRET-KEY-1...

# Save the private key to a file
age-keygen -o ~/.config/age/identity.txt

# The public key is also shown in the private key file header
cat ~/.config/age/identity.txt
# # created: 2026-03-02T10:00:00Z
# # public key: age1ql3z7hjy54pw3hyww5ayyfg7zqgvc7w3j2elw8zmrj2kg5sfn9aqmcac8p
# AGE-SECRET-KEY-1...

# Extract the public key from a private key file
age-keygen -y ~/.config/age/identity.txt
```

### Encrypting with a Public Key

```bash
# Encrypt a file for a recipient using their public key
age --recipient age1ql3z7hjy54pw3hyww5ayyfg7zqgvc7w3j2elw8zmrj2kg5sfn9aqmcac8p \
    --output encrypted-for-bob.age \
    document.pdf

# Encrypt for multiple recipients (any of them can decrypt)
age \
    --recipient age1ql3z7hjy54pw3hyww5ayyfg7zqgvc7w3j2elw8zmrj2kg5sfn9aqmcac8p \
    --recipient age1y9m6vyd6mz99dqtq3tshd78v09ssvgjfltu0s0k21xvr5h3khmxqx6k8mg \
    --output encrypted-for-both.age \
    document.pdf

# Encrypt from stdin using public key
cat important-config.yaml | \
    age --recipient age1ql3z7hjy54... > config.yaml.age
```

### Decrypting with Your Private Key

```bash
# Decrypt using your identity (private key) file
age --decrypt \
    --identity ~/.config/age/identity.txt \
    --output decrypted-document.pdf \
    encrypted-for-bob.age

# Decrypt to stdout and pipe to another command
age --decrypt \
    --identity ~/.config/age/identity.txt \
    secrets.yaml.age | kubectl apply -f -
```

## Using SSH Keys with age

age can use existing SSH keys (RSA and Ed25519) for encryption - no need to generate new keys:

```bash
# Encrypt using an SSH public key (from GitHub or local authorized_keys)
age --recipient ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAA... \
    --output encrypted.age \
    plaintext.txt

# Encrypt using your GitHub SSH public keys (they're public!)
curl https://github.com/yourusername.keys | \
    age --recipient - --output encrypted-for-github-user.age plaintext.txt

# Decrypt using your SSH private key
age --decrypt \
    --identity ~/.ssh/id_ed25519 \
    --output decrypted.txt \
    encrypted.age
```

## Encrypting Directories

age encrypts files, not directories. Use tar to bundle directories first:

```bash
# Encrypt an entire directory
tar -czf - /path/to/directory/ | \
    age --passphrase > directory-backup.tar.gz.age

# Encrypt directory for a specific recipient
tar -czf - /path/to/directory/ | \
    age --recipient age1ql3z7hjy54... > directory-backup.tar.gz.age

# Decrypt and extract
age --decrypt \
    --identity ~/.config/age/identity.txt \
    directory-backup.tar.gz.age | tar -xzf -
```

### Directory Encryption Script

```bash
#!/bin/bash
# age-dir-encrypt.sh - Encrypt a directory with age

DIRECTORY="${1:?Usage: $0 <directory> <output.age>}"
OUTPUT="${2:?Usage: $0 <directory> <output.age>}"
IDENTITY_FILE="${AGE_IDENTITY:-$HOME/.config/age/identity.txt}"

# Get the public key from the identity file
PUBKEY=$(age-keygen -y "$IDENTITY_FILE" 2>/dev/null)

if [ -z "$PUBKEY" ]; then
    echo "Error: Could not read public key from $IDENTITY_FILE"
    exit 1
fi

echo "Encrypting $DIRECTORY..."
tar -czf - "$DIRECTORY" | \
    age --recipient "$PUBKEY" --output "$OUTPUT"

echo "Encrypted to: $OUTPUT ($(du -sh "$OUTPUT" | cut -f1))"
echo "Decrypt with: age --decrypt --identity $IDENTITY_FILE $OUTPUT | tar -xzf -"
```

## Practical Use Cases

### Encrypting Secrets for CI/CD

```bash
# Encrypt .env file for storage in git
age \
    --recipient age1ql3z7hjy54pw3hyww5ayyfg7zqgvc7w3j2elw8zmrj2kg5sfn9aqmcac8p \
    --output .env.age \
    .env

# Add .env.age to git, keep .env in .gitignore
git add .env.age
echo ".env" >> .gitignore

# In CI/CD pipeline, decrypt using the private key stored as a secret
# Example: GitHub Actions
# - Store AGE_KEY as a GitHub Secret (the contents of identity.txt)
# - In the pipeline:
echo "$AGE_KEY" | age --decrypt --identity - .env.age > .env
```

### Encrypting Database Backups

```bash
#!/bin/bash
# db-backup-encrypted.sh - Create encrypted database backup

DB_NAME="myapp_production"
BACKUP_FILE="/tmp/db-backup-$(date +%Y%m%d-%H%M%S).sql.age"
AGE_PUBKEY="age1ql3z7hjy54pw3hyww5ayyfg7zqgvc7w3j2elw8zmrj2kg5sfn9aqmcac8p"

# Dump and encrypt in one pipeline
pg_dump "$DB_NAME" | \
    gzip | \
    age --recipient "$AGE_PUBKEY" \
    > "$BACKUP_FILE"

echo "Encrypted backup: $BACKUP_FILE"

# Copy to backup storage
rsync -avz "$BACKUP_FILE" backup-server:/backups/

# Remove local copy after upload
rm "$BACKUP_FILE"
```

### Decrypting and Restoring

```bash
# Decrypt and restore the database backup
age --decrypt \
    --identity ~/.config/age/identity.txt \
    db-backup-20260302.sql.age | \
    gunzip | \
    psql myapp_production
```

## Using rage (Rust Implementation)

`rage` is a Rust implementation of age with identical format but faster performance for large files:

```bash
# Install rage
curl -LO https://github.com/str4d/rage/releases/latest/download/rage-linux-amd64.tar.gz
tar -xzf rage-linux-amd64.tar.gz
sudo mv rage rage-keygen /usr/local/bin/

# rage is a drop-in replacement with same syntax
rage --passphrase --output secret.txt.age plaintext.txt
rage --decrypt --output decrypted.txt secret.txt.age
```

## age vs GPG Comparison

| Feature | age | GPG |
|---------|-----|-----|
| Complexity | Simple (one binary) | Complex (ecosystem) |
| Key management | Just files | Keyring system |
| Format stability | Stable v1 format | Multiple formats |
| Algorithm agility | No (intentional) | Yes (can choose weak algos) |
| Legacy support | No | Yes (PGP compatible) |
| Email integration | No | Yes |
| Keyserver | No | Yes |
| Learning curve | Minutes | Hours |

age is better for: file encryption, secrets management, CI/CD, backups.
GPG is better for: email signing/encryption, software package signing, web of trust.

## Key Rotation

age makes key rotation straightforward - it's just re-encrypting with new keys:

```bash
#!/bin/bash
# rotate-age-key.sh - Re-encrypt files with a new age key

OLD_IDENTITY="~/.config/age/identity-old.txt"
NEW_IDENTITY="~/.config/age/identity-new.txt"
NEW_PUBKEY=$(age-keygen -y "$NEW_IDENTITY")

# Re-encrypt all .age files in current directory
for file in *.age; do
    echo "Re-encrypting: $file"
    age --decrypt --identity "$OLD_IDENTITY" "$file" | \
        age --recipient "$NEW_PUBKEY" --output "${file}.new"
    mv "${file}.new" "$file"
done

echo "Key rotation complete. Update your identity file."
```

age's simplicity is its strength - there are very few ways to misconfigure it, making it reliable for automated systems where human error needs to be minimized.
