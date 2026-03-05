# How to Use Mozilla SOPS for Secret Encryption on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Security, Secret, Encryption, DevOps

Description: A practical guide to using Mozilla SOPS for encrypting secrets in configuration files on Ubuntu, covering age, GPG, and AWS KMS key providers with Git workflow integration.

---

SOPS (Secrets OPerationS) is a file encryption tool from Mozilla that encrypts individual values within YAML, JSON, ENV, and INI files, leaving the keys visible. This makes encrypted files diff-friendly in version control - you can see what changed (which key) without seeing the value.

Unlike approaches that encrypt entire files, SOPS lets you commit encrypted secrets to Git and use standard review processes for secret changes.

## How SOPS Encryption Works

Given a file like:

```yaml
database_password: mysecret123
api_key: sk-abcdef
debug: false
```

After encryption with SOPS:

```yaml
database_password: ENC[AES256_GCM,data:abc123,iv:xyz,tag:pqr,type:str]
api_key: ENC[AES256_GCM,data:def456,iv:uvw,tag:lmn,type:str]
debug: false
sops:
    kms: []
    age:
    -   recipient: age1...
        enc: |
            -----BEGIN AGE ENCRYPTED FILE-----
            ...
```

The structure is preserved, unencrypted values remain plaintext, and the `sops` metadata block tells SOPS how to decrypt.

## Installing SOPS

```bash
# Download the latest SOPS binary
SOPS_VERSION=$(curl -s https://api.github.com/repos/getsops/sops/releases/latest | grep tag_name | cut -d'"' -f4)
curl -Lo sops.deb "https://github.com/getsops/sops/releases/download/${SOPS_VERSION}/sops_${SOPS_VERSION#v}_amd64.deb"
sudo dpkg -i sops.deb
rm sops.deb

# Verify
sops --version
```

## Using SOPS with Age (Recommended)

Age is a simple, modern encryption tool that works well with SOPS and does not require managing a GPG keyring.

Install age:

```bash
sudo apt install age -y
```

Generate a key pair:

```bash
# Generate an age key pair and save to standard location
mkdir -p ~/.config/sops/age
age-keygen -o ~/.config/sops/age/keys.txt

# The output shows your public key - save it
# Example: age1ql3z7hjy54pw3hyww5ayyfg7zqgvc7w3j2elw8zmrj2kg5sfn9aqmcac8p
```

Configure SOPS to use your age key:

```bash
# Create or edit ~/.sops.yaml (global config)
cat > ~/.sops.yaml << 'EOF'
creation_rules:
  - path_regex: .*
    age: age1ql3z7hjy54pw3hyww5ayyfg7zqgvc7w3j2elw8zmrj2kg5sfn9aqmcac8p
EOF
```

## Encrypting a File

Create a test secrets file:

```bash
cat > secrets.yaml << 'EOF'
database:
  host: db.internal
  password: supersecretpassword
  username: appuser
api:
  key: sk-prod-abcdef1234567890
debug: false
EOF
```

Encrypt it:

```bash
# Encrypt in place (modifies the file)
sops -e -i secrets.yaml

# Encrypt and write to a new file
sops -e secrets.yaml > secrets.enc.yaml
```

Check the encrypted file - `debug: false` remains unencrypted because it is a boolean:

```bash
cat secrets.yaml
```

## Decrypting a File

```bash
# Decrypt and print to stdout
sops -d secrets.yaml

# Decrypt in place (modifies the file back)
sops -d -i secrets.yaml

# Decrypt to a different file
sops -d secrets.yaml > secrets.dec.yaml
```

## Editing Encrypted Files

SOPS can open an encrypted file in your editor, decrypt it temporarily, and re-encrypt on save:

```bash
# Open in default editor (set EDITOR env var)
EDITOR=nano sops secrets.yaml
```

This workflow means you never have a plaintext copy on disk (unless you use `-d`).

## Encrypting Only Specific Keys

Sometimes you want to leave some keys unencrypted. Use `--encrypted-regex`:

```bash
# Only encrypt values whose key matches the pattern
sops --encrypted-regex '^(password|key|secret|token)$' -e -i secrets.yaml
```

Or configure in `.sops.yaml`:

```yaml
creation_rules:
  - path_regex: .*\.yaml$
    age: age1ql3z7...
    encrypted_regex: '^(password|secret|key|token)$'
```

## Using SOPS with GPG

For teams that prefer GPG:

```bash
# Generate a GPG key
gpg --full-generate-key

# Get the key fingerprint
gpg --list-keys --with-fingerprint

# Configure SOPS to use GPG
cat > ~/.sops.yaml << 'EOF'
creation_rules:
  - path_regex: .*
    pgp: YOUR_FINGERPRINT_HERE
EOF
```

For team use, add multiple recipients:

```yaml
creation_rules:
  - path_regex: .*
    pgp: >-
      FINGERPRINT_ALICE,
      FINGERPRINT_BOB,
      FINGERPRINT_CHARLIE
```

## Configuring Per-Directory Rules

The `.sops.yaml` file can live in your project directory and define rules based on file path:

```yaml
# .sops.yaml in project root
creation_rules:
  # Production secrets use AWS KMS
  - path_regex: ^environments/production/.*\.yaml$
    kms: arn:aws:kms:us-east-1:123456789:key/mrk-abc123

  # Staging secrets use age
  - path_regex: ^environments/staging/.*\.yaml$
    age: age1ql3z7...

  # Development secrets use GPG (for local dev)
  - path_regex: ^environments/development/.*\.yaml$
    pgp: DEVELOPER_FINGERPRINT
```

## Using SOPS with AWS KMS

For production use, AWS KMS provides hardware-backed key management:

```bash
# Install AWS CLI
sudo snap install aws-cli --classic

# Configure credentials
aws configure

# Create a KMS key (or use an existing one)
aws kms create-key --description "SOPS encryption key"
# Note the KeyId or ARN from the output
```

Configure SOPS:

```yaml
creation_rules:
  - kms: arn:aws:kms:us-east-1:123456789012:key/your-key-id
```

Encrypt:

```bash
sops -e -i secrets.yaml
```

SOPS uses your AWS credentials to generate a data encryption key, which encrypts the file. The encrypted DEK is stored in the SOPS metadata block.

## Git Workflow Integration

Add a `.gitattributes` file to show diffs in a readable format:

```bash
# .gitattributes
*.yaml diff=sopsdiffer
```

Configure the sops differ:

```bash
git config diff.sopsdiffer.textconv "sops -d"
```

Now `git diff` will show decrypted values in diffs (locally only - the encrypted version is what gets committed).

Add a pre-commit hook to prevent committing unencrypted secrets:

```bash
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash
# Check for unencrypted secrets files
for file in $(git diff --cached --name-only | grep -E '\.yaml$'); do
    if grep -q 'password:' "$file" && ! grep -q 'ENC\[' "$file"; then
        echo "ERROR: $file appears to contain unencrypted secrets"
        exit 1
    fi
done
EOF
chmod +x .git/hooks/pre-commit
```

## Decrypting in CI/CD

In a CI pipeline, store the age private key or AWS credentials as CI secrets:

```yaml
# GitHub Actions example
- name: Decrypt secrets
  env:
    SOPS_AGE_KEY: ${{ secrets.SOPS_AGE_KEY }}
  run: |
    # SOPS reads the key from SOPS_AGE_KEY environment variable
    sops -d -i config/secrets.yaml

    # Or export to environment variables
    export $(sops -d --output-type=dotenv secrets.yaml | xargs)
```

For AWS KMS in CI, use an IAM role with KMS decrypt permissions and no additional SOPS configuration - just working AWS credentials.

## Rotating Keys

When you need to rotate encryption keys:

```bash
# Update the key in .sops.yaml, then re-encrypt all files
find . -name "*.yaml" -exec sops updatekeys {} \;
```

## Troubleshooting

**"could not load keys" error:**
```bash
# Verify SOPS_AGE_KEY_FILE is set or keys.txt exists
ls ~/.config/sops/age/keys.txt
export SOPS_AGE_KEY_FILE=~/.config/sops/age/keys.txt
```

**"file has not been encrypted with sops":**
The file does not have a `sops` metadata block. Encrypt it first with `sops -e -i filename`.

**Wrong key used:**
Check which `.sops.yaml` file is being picked up:
```bash
# SOPS searches from current directory up to root
ls -la .sops.yaml ~/.sops.yaml
```

SOPS is particularly well-suited for infrastructure-as-code repositories where secrets live alongside Terraform, Helm, or Kubernetes manifests. The ability to see which secrets changed in a PR without seeing their values makes it practical to treat secret files like regular code.
