# How to Use SOPS with Git on Ubuntu for Secret Management

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Security, SOPS, Secrets Management, GitOps

Description: Learn how to use Mozilla SOPS on Ubuntu to encrypt secrets and commit them safely to Git repositories, with support for AWS KMS, GCP KMS, Azure Key Vault, and GPG keys.

---

SOPS (Secrets OPerationS) is a tool that encrypts files before you commit them to Git. Unlike committing plaintext secrets or using a separate secrets manager for every project, SOPS lets you store encrypted YAML, JSON, ENV, and INI files directly in your repository. The encrypted files can be decrypted by anyone with access to the encryption key (AWS KMS, GPG, etc.), making secret rotation as simple as editing a file and committing. This guide covers installing SOPS on Ubuntu and integrating it into a Git workflow.

## Installing SOPS on Ubuntu

```bash
# Download the latest SOPS release
SOPS_VERSION=$(curl -s https://api.github.com/repos/mozilla/sops/releases/latest | \
    grep '"tag_name"' | sed 's/.*"v//;s/".*//')

curl -LO "https://github.com/mozilla/sops/releases/download/v${SOPS_VERSION}/sops_${SOPS_VERSION}_amd64.deb"

# Install the package
sudo dpkg -i "sops_${SOPS_VERSION}_amd64.deb"

# Verify installation
sops --version
```

Alternatively, install via binary:

```bash
# Direct binary installation
SOPS_VERSION="3.8.1"
curl -LO "https://github.com/mozilla/sops/releases/download/v${SOPS_VERSION}/sops-v${SOPS_VERSION}.linux.amd64"
sudo mv "sops-v${SOPS_VERSION}.linux.amd64" /usr/local/bin/sops
sudo chmod +x /usr/local/bin/sops
```

## Setting Up Encryption Keys

SOPS supports multiple key providers. Choose based on your infrastructure.

### Option 1: AWS KMS (Recommended for AWS Environments)

```bash
# Install AWS CLI
sudo apt-get install -y awscli
aws configure

# Create a KMS key for SOPS
KEY_ARN=$(aws kms create-key \
    --description "SOPS encryption key" \
    --query 'KeyMetadata.KeyId' \
    --output text)

# Create an alias for easy reference
aws kms create-alias \
    --alias-name alias/sops-key \
    --target-key-id "$KEY_ARN"

echo "KMS Key ARN: $(aws kms describe-key --key-id alias/sops-key --query 'KeyMetadata.Arn' --output text)"
```

### Option 2: GPG Keys (Works Offline and Without Cloud)

```bash
# Generate a GPG key pair for SOPS
gpg --batch --full-generate-key << 'EOF'
Key-Type: RSA
Key-Length: 4096
Subkey-Type: RSA
Subkey-Length: 4096
Name-Real: DevOps Secrets
Name-Email: devops@example.com
Expire-Date: 2y
%no-protection
%commit
EOF

# Get the key fingerprint
gpg --fingerprint devops@example.com
# Example output: 1234 5678 ABCD EF01 2345 6789 ABCD EF01 2345 6789

# Export the public key for sharing with team members
gpg --armor --export devops@example.com > devops-sops-public.asc
```

### Option 3: Age Keys (Modern, Simple)

```bash
# Install age
sudo apt-get install -y age

# Generate an age key pair
age-keygen -o ~/.config/sops/age/keys.txt
# Output shows the public key: age1xxxxxxxxxxxxxxxxx...

# View the generated key
cat ~/.config/sops/age/keys.txt
# Output:
# # created: 2026-03-02T...
# # public key: age1...
# AGE-SECRET-KEY-1...
```

## Configuring SOPS with .sops.yaml

Create a `.sops.yaml` configuration file in your repository root. This tells SOPS which keys to use for which files:

```yaml
# .sops.yaml - SOPS configuration file
# This file should be committed to the repository (contains no secrets)

creation_rules:
  # Encrypt production secrets with AWS KMS + backup GPG key
  - path_regex: secrets/production/.*\.yaml
    kms: arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012
    pgp: 123456789ABCDEF0123456789ABCDEF0123456789

  # Encrypt staging secrets with a different KMS key
  - path_regex: secrets/staging/.*\.yaml
    kms: arn:aws:kms:us-east-1:123456789012:key/87654321-4321-4321-4321-210987654321

  # Encrypt development secrets with GPG only
  - path_regex: secrets/dev/.*\.(yaml|json|env)
    pgp: 123456789ABCDEF0123456789ABCDEF0123456789

  # Encrypt all .env files with Age key
  - path_regex: .*\.env
    age: age1xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

  # Multiple recipients (any of them can decrypt)
  - path_regex: k8s/.*secret.*\.yaml
    kms: arn:aws:kms:us-east-1:123456789012:key/12345678-...
    pgp: >-
      123456789ABCDEF0123456789ABCDEF0123456789,
      FEDCBA9876543210FEDCBA9876543210FEDCBA98
```

## Encrypting Secrets

With `.sops.yaml` in place, encrypting files is straightforward:

```bash
# Create a plaintext secrets file
cat > secrets/production/app-secrets.yaml << 'EOF'
database:
  host: db.prod.internal
  name: myapp_production
  username: myapp
  password: super-secret-password

api_keys:
  stripe: sk_live_xxxxxxxxxxxxxxxxxxxx
  sendgrid: SG.xxxxxxxxxxxxxxxxxxxxxxxx

jwt_secret: your-very-long-random-jwt-signing-key
EOF

# Encrypt the file in place
sops --encrypt --in-place secrets/production/app-secrets.yaml

# View the encrypted file
cat secrets/production/app-secrets.yaml
# The file now contains encrypted values alongside metadata
```

The encrypted YAML keeps its structure - only the values are encrypted, not the keys:

```yaml
# Example of an encrypted SOPS file
database:
    host: ENC[AES256_GCM,data:xxxxx,iv:xxxxx,tag:xxxxx,type:str]
    name: ENC[AES256_GCM,data:xxxxx,iv:xxxxx,tag:xxxxx,type:str]
    username: ENC[AES256_GCM,data:xxxxx,iv:xxxxx,tag:xxxxx,type:str]
    password: ENC[AES256_GCM,data:xxxxx,iv:xxxxx,tag:xxxxx,type:str]
sops:
    kms:
    -   arn: arn:aws:kms:us-east-1:...
        created_at: '2026-03-02T10:00:00Z'
        enc: AQICAHxxxxx...
    version: 3.8.1
```

## Decrypting and Editing

```bash
# Decrypt a file to stdout (doesn't modify the encrypted file)
sops --decrypt secrets/production/app-secrets.yaml

# Edit an encrypted file (opens in your $EDITOR, re-encrypts on save)
sops secrets/production/app-secrets.yaml
# SOPS decrypts the file, opens your editor, then re-encrypts on save

# Decrypt to a new file
sops --decrypt --output /tmp/decrypted-secrets.yaml secrets/production/app-secrets.yaml
# Remember to delete the decrypted file after use!
rm -f /tmp/decrypted-secrets.yaml
```

## Using SOPS with Environment Files

For applications that read from .env files:

```bash
# Create and encrypt a .env file
cat > secrets/production/.env << 'EOF'
DATABASE_URL=postgresql://myapp:password@db.prod.internal:5432/myapp
SECRET_KEY=very-secret-key
STRIPE_KEY=sk_live_xxxxx
EOF

sops --encrypt --in-place secrets/production/.env

# In your application startup script, decrypt and source
eval "$(sops --decrypt secrets/production/.env)"

# Or use sops exec-env to run a command with decrypted env vars
sops exec-env secrets/production/.env ./myapp

# SOPS never writes decrypted values to disk in this mode
```

## Git Integration

### Preventing Accidental Commits of Unencrypted Secrets

```bash
# Create a pre-commit hook to check for SOPS-encrypted files
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash
# Verify that files in secrets/ directory are SOPS-encrypted

SECRETS_DIRS=("secrets" "k8s/secrets")

for dir in "${SECRETS_DIRS[@]}"; do
    if [[ ! -d "$dir" ]]; then
        continue
    fi

    # Find YAML, JSON, and ENV files in secrets directories
    while IFS= read -r file; do
        # Check if the file is staged
        if git diff --cached --name-only | grep -q "^$file$"; then
            # Check if it contains SOPS metadata (is encrypted)
            if ! grep -q "sops:" "$file" 2>/dev/null; then
                echo "ERROR: Unencrypted secret file staged for commit: $file"
                echo "Encrypt it first with: sops --encrypt --in-place $file"
                exit 1
            fi
        fi
    done < <(find "$dir" -type f \( -name "*.yaml" -o -name "*.json" -o -name "*.env" \))
done

exit 0
EOF

chmod +x .git/hooks/pre-commit
```

### Using git-sops for Automatic Encryption

For a more seamless workflow, configure git to automatically encrypt/decrypt:

```bash
# Add to .gitattributes
echo "secrets/**/*.yaml diff=sops" >> .gitattributes
echo "secrets/**/*.env diff=sops" >> .gitattributes

# Configure git diff driver for SOPS files
git config diff.sops.textconv "sops --decrypt"
```

This makes `git diff` show decrypted values when reviewing changes.

## Rotating Keys

When a team member leaves or a key is compromised, rotate the encryption keys:

```bash
# Re-encrypt all files with new keys after updating .sops.yaml
# First update .sops.yaml to remove old keys and add new ones

# Then rotate all encrypted files
find secrets/ -name "*.yaml" -o -name "*.env" | while read -r file; do
    if grep -q "sops:" "$file"; then
        echo "Rotating keys for: $file"
        sops updatekeys "$file"
    fi
done

# Commit the updated encrypted files
git add secrets/
git commit -m "Rotate SOPS encryption keys"
```

## Integrating with CI/CD

### GitHub Actions with AWS KMS

```yaml
# .github/workflows/deploy.yml
jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      id-token: write  # Required for OIDC authentication to AWS
      contents: read

    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/github-actions-role
          aws-region: us-east-1

      - name: Install SOPS
        run: |
          curl -LO "https://github.com/mozilla/sops/releases/download/v3.8.1/sops_3.8.1_amd64.deb"
          sudo dpkg -i sops_3.8.1_amd64.deb

      - name: Deploy with decrypted secrets
        run: |
          # Decrypt secrets and inject as environment variables
          eval "$(sops --decrypt secrets/production/.env)"
          # All secrets are now in the environment
          ./deploy.sh
```

### Kubernetes with Flux/Argo CD (GitOps)

SOPS integrates with Flux CD and Argo CD for GitOps secret management:

```yaml
# Flux CD decryption provider configuration
# .flux.yaml or clusters/production/flux-system/kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: production-secrets
spec:
  decryption:
    provider: sops
    secretRef:
      name: sops-age-key  # Contains the age private key
  path: ./k8s/production/secrets
```

SOPS provides an elegant balance between developer convenience (edit secrets like any other file) and security (secrets never live in plaintext in the repository). For teams practicing GitOps or infrastructure-as-code, it's an essential tool for keeping secrets under version control without compromising them.
