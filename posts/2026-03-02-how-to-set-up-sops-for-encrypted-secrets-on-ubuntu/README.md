# How to Set Up SOPS for Encrypted Secrets on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Security, SOPS, Secrets Management, DevOps

Description: Learn how to install and use Mozilla SOPS on Ubuntu to encrypt secrets files with age, GPG, or cloud KMS keys for safe storage in version control.

---

SOPS (Secrets OPerationS) is a tool from Mozilla that encrypts secrets files while keeping the structure intact. Unlike encrypting an entire file as a blob, SOPS encrypts only the values in YAML, JSON, ENV, or INI files - leaving the keys visible. This means diffs are readable, code reviews are meaningful, and secrets can be safely committed to version control.

## How SOPS Encryption Works

When you encrypt a file with SOPS, it:

1. Generates a data encryption key (DEK)
2. Encrypts each value in the file with the DEK
3. Encrypts the DEK itself with your master key (age, GPG, AWS KMS, GCP KMS, Azure Key Vault, or HashiCorp Vault)
4. Stores the encrypted DEK in the file's `sops` metadata section

To decrypt, SOPS uses your master key to recover the DEK, then decrypts the values. The key management backend never sees your secret values - only the encrypted DEK.

## Prerequisites

- Ubuntu 20.04 or 22.04
- One of: age key, GPG key, or cloud KMS access
- sudo privileges

## Installing SOPS

Download the latest SOPS binary from GitHub releases:

```bash
# Download the latest release (check https://github.com/getsops/sops/releases)
SOPS_VERSION="3.9.1"
wget "https://github.com/getsops/sops/releases/download/v${SOPS_VERSION}/sops-v${SOPS_VERSION}.linux.amd64" \
  -O /tmp/sops

# Install it
sudo install -m 755 /tmp/sops /usr/local/bin/sops

# Verify
sops --version
```

Alternatively, if you have Go installed:

```bash
go install github.com/getsops/sops/v3/cmd/sops@latest
```

## Setting Up age Keys (Recommended)

age is a modern, simple encryption tool that works well with SOPS. It's easier to manage than GPG for most use cases.

```bash
# Install age
sudo apt-get install -y age

# Generate a key pair
age-keygen -o ~/.config/sops/age/keys.txt

# The output looks like:
# # created: 2026-03-02T10:00:00Z
# # public key: age1ql3z7hjy54pw3hyww5ayyfg7zqgvc7w3j2elw8zmrj2kg5sfn9aq3dky5w
# AGE-SECRET-KEY-1QJEP...(private key)

# View the public key
age-keygen -y ~/.config/sops/age/keys.txt
```

Set the environment variable so SOPS finds your key automatically:

```bash
# Add to ~/.bashrc or ~/.zshrc
export SOPS_AGE_KEY_FILE="$HOME/.config/sops/age/keys.txt"
```

## Creating a .sops.yaml Configuration File

The `.sops.yaml` file in your project root tells SOPS which keys to use for which files. This removes the need to pass key arguments every time:

```yaml
# .sops.yaml
creation_rules:
  # Use age for all yaml files in secrets/
  - path_regex: secrets/.*\.yaml$
    age: age1ql3z7hjy54pw3hyww5ayyfg7zqgvc7w3j2elw8zmrj2kg5sfn9aq3dky5w

  # Use age for .env files
  - path_regex: \.env\.enc$
    age: age1ql3z7hjy54pw3hyww5ayyfg7zqgvc7w3j2elw8zmrj2kg5sfn9aq3dky5w

  # Use AWS KMS for production secrets
  - path_regex: prod/.*\.yaml$
    kms: arn:aws:kms:us-east-1:123456789012:key/mrk-abc123

  # Multiple recipients: any of these keys can decrypt
  - path_regex: team/.*\.yaml$
    age: >-
      age1alice...,
      age1bob...,
      age1carol...
```

## Encrypting Your First File

```bash
# Create a plaintext secrets file
cat > secrets/app.yaml << 'EOF'
database:
  host: db.internal
  username: appuser
  password: super-secret-password-123
api_keys:
  stripe: sk_live_abc123xyz
  sendgrid: SG.abc123xyz
EOF

# Encrypt it - SOPS reads .sops.yaml to find the key
sops -e secrets/app.yaml > secrets/app.enc.yaml

# Or encrypt in place (overwrites the file)
sops -e -i secrets/app.yaml
```

The encrypted file looks like:

```yaml
database:
    host: ENC[AES256_GCM,data:abc...,iv:...,tag:...,type:str]
    username: ENC[AES256_GCM,data:def...,iv:...,tag:...,type:str]
    password: ENC[AES256_GCM,data:ghi...,iv:...,tag:...,type:str]
api_keys:
    stripe: ENC[AES256_GCM,data:jkl...,iv:...,tag:...,type:str]
    sendgrid: ENC[AES256_GCM,data:mno...,iv:...,tag:...,type:str]
sops:
    kms: []
    age:
    -   recipient: age1ql3z7hjy...
        enc: |
            -----BEGIN AGE ENCRYPTED FILE-----
            ...
            -----END AGE ENCRYPTED FILE-----
    version: 3.9.1
```

The structure is preserved - you can see the keys but not the values.

## Decrypting and Editing

```bash
# Decrypt to stdout
sops -d secrets/app.enc.yaml

# Decrypt to a new file
sops -d secrets/app.enc.yaml > secrets/app.yaml

# Open encrypted file in your editor (decrypts, opens editor, re-encrypts on save)
sops secrets/app.enc.yaml

# Edit a specific key without opening full editor
sops --set '["database"]["password"] "new-password"' secrets/app.enc.yaml
```

The `sops file.yaml` command (without flags) opens the file decrypted in your `$EDITOR`, then re-encrypts it when you save and close. This is the safest way to make changes.

## Using SOPS with .env Files

For applications that read environment variables from `.env` files:

```bash
# Encrypt a .env file
cat > .env << 'EOF'
DATABASE_URL=postgres://user:password@localhost/mydb
SECRET_KEY=abc123verysecret
API_TOKEN=tok_live_xyz789
EOF

# Encrypt it
sops -e .env > .env.enc
```

To use in a script:

```bash
#!/bin/bash
# Decrypt and export all variables from encrypted .env
eval "$(sops -d --output-type=dotenv .env.enc | sed 's/^/export /')"

# Now start your application with the secrets in the environment
./myapp
```

## Integrating with CI/CD

### GitHub Actions

```yaml
# .github/workflows/deploy.yml
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install SOPS
        run: |
          curl -LO "https://github.com/getsops/sops/releases/download/v3.9.1/sops-v3.9.1.linux.amd64"
          sudo install -m 755 sops-v3.9.1.linux.amd64 /usr/local/bin/sops

      - name: Decrypt secrets
        env:
          # age private key stored as GitHub secret
          SOPS_AGE_KEY: ${{ secrets.SOPS_AGE_KEY }}
        run: |
          # Write the key to a temp file
          echo "$SOPS_AGE_KEY" > /tmp/age-key.txt
          export SOPS_AGE_KEY_FILE=/tmp/age-key.txt

          # Decrypt secrets
          sops -d secrets/app.yaml > /tmp/app-secrets.yaml
```

### Ansible Integration

Use the `sops_vars` Ansible lookup plugin or decrypt before running:

```bash
# Decrypt secrets, run playbook, remove decrypted file
sops -d group_vars/production/secrets.enc.yaml > /tmp/secrets.yaml
ansible-playbook -e @/tmp/secrets.yaml playbook.yml
rm /tmp/secrets.yaml
```

## Key Rotation

When you need to rotate encryption keys:

```bash
# Rotate to a new age key
sops updatekeys --input-type yaml secrets/app.yaml

# Update .sops.yaml with the new key, then rotate all files
for file in secrets/*.yaml; do
  sops updatekeys "$file"
done
```

## Excluding Fields from Encryption

Sometimes you want some values unencrypted (like non-sensitive config):

```yaml
# .sops.yaml
creation_rules:
  - path_regex: config/.*\.yaml$
    age: age1ql3z7hjy...
    # Only encrypt fields matching these regex patterns
    encrypted_regex: '^(password|secret|key|token|credential)$'
```

## GPG Keys

If you prefer GPG over age:

```bash
# Generate a GPG key pair
gpg --full-generate-key
# Choose: RSA, 4096 bits, no expiry

# Get your key ID
gpg --list-keys --keyid-format LONG

# Use in .sops.yaml
# pgp: FINGERPRINT_OF_YOUR_KEY

# Export public key for teammates
gpg --export --armor your@email.com > public-key.asc
```

## Troubleshooting

**"failed to get the data key" error:**
```bash
# Check that your age key file is set
echo $SOPS_AGE_KEY_FILE
# Or check GPG key is available
gpg --list-secret-keys
```

**"no creation rules" when encrypting:**
- Verify `.sops.yaml` exists in the current directory or a parent directory
- Check the `path_regex` matches your file path

**File was accidentally committed unencrypted:**
```bash
# Remove from git history (use with caution)
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch secrets/app.yaml" HEAD
# Then rotate the exposed credentials immediately
```

SOPS with age keys is one of the most practical approaches to secrets-in-git. The workflow feels natural: edit secrets normally, run `sops -e -i` to encrypt, commit the result. Team members with their keys listed in `.sops.yaml` can decrypt. Anyone without a key sees only ciphertext.
