# How to Use SOPS with OpenTofu for Encrypted Secrets

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, SOPS, Encrypted Secrets, Security, Infrastructure as Code, GitOps

Description: Learn how to use Mozilla SOPS to encrypt secret variable files and decrypt them at apply time in OpenTofu, enabling secrets to be safely committed to version control.

## Introduction

SOPS (Secrets OPerationS) is an open-source tool that encrypts specific values within YAML, JSON, ENV, and INI files using AWS KMS, GCP KMS, Azure Key Vault, or age keys. Unlike whole-file encryption, SOPS leaves keys visible while encrypting only values, making diffs readable in pull requests.

## Installing SOPS

```bash
# macOS

brew install sops age

# Linux (AMD64)
curl -LO https://github.com/getsops/sops/releases/download/v3.12.2/sops-v3.12.2.linux.amd64
chmod +x sops-v3.12.2.linux.amd64 && sudo mv sops-v3.12.2.linux.amd64 /usr/local/bin/sops

# Debian/Ubuntu 22.04+ (for age-keygen)
sudo apt-get update && sudo apt-get install -y age

sops --version
age-keygen --version
```

## Creating an Age Key (Simple Local Encryption)

For teams not yet on a cloud KMS, age keys are a good starting point:

```bash
# Generate an age key pair
mkdir -p ~/.config/sops/age
age-keygen -o ~/.config/sops/age/keys.txt
export SOPS_AGE_KEY_FILE="$HOME/.config/sops/age/keys.txt"

# The public key will look like:
# age1ql3z7hjy54pw3hyww5ayyfg7zqgvc7w3j2elw8zmrj2kg5sfn9aqmcac8p
```

## .sops.yaml Configuration

Tell SOPS which key to use for which files:

```yaml
# .sops.yaml at the repo root
creation_rules:
  # Use age key for files in secrets/
  - path_regex: secrets/.*\.tfvars\.json$
    age: age1ql3z7hjy54pw3hyww5ayyfg7zqgvc7w3j2elw8zmrj2kg5sfn9aqmcac8p

  # Use AWS KMS for production secrets
  - path_regex: environments/prod/.*secrets.*\.tfvars\.json$
    kms: arn:aws:kms:us-east-1:123456789012:key/mrk-abc123
```

## Encrypting a Secrets File

```bash
# Create a plaintext secrets file (do NOT commit this)
cat > secrets/db.tfvars.json <<EOF
{
  "db_username": "app_user",
  "db_password": "SuperSecretPassword123!",
  "api_key": "sk-abc123def456"
}
EOF

# Encrypt it with SOPS (safe to commit)
sops --encrypt secrets/db.tfvars.json > secrets/db.enc.tfvars.json

# Remove the plaintext file
rm secrets/db.tfvars.json
```

The encrypted file looks like:

```json
{
  "db_username": "ENC[AES256_GCM,data:abc123...,tag:xyz...,type:str]",
  "db_password": "ENC[AES256_GCM,data:def456...,tag:uvw...,type:str]",
  "api_key": "ENC[AES256_GCM,data:ghi789...,tag:rst...,type:str]",
  "sops": {
    "kms": [],
    "age": [
      {
        "recipient": "age1ql3z7hjy54pw3...",
        "enc": "-----BEGIN AGE ENCRYPTED FILE-----\n...\n-----END AGE ENCRYPTED FILE-----"
      }
    ]
  }
}
```

## Decrypting and Using with OpenTofu

Decrypt at apply time and pipe into OpenTofu as a var-file:

```bash
# Decrypt to stdout and pass as a var-file
sops --decrypt secrets/db.enc.tfvars.json > /tmp/secrets.tfvars.json
tofu apply -var-file="/tmp/secrets.tfvars.json"
rm /tmp/secrets.tfvars.json   # Clean up immediately after apply
```

Or use a wrapper script:

```bash
#!/bin/bash
# apply.sh - decrypt, apply, clean up
set -euo pipefail

DECRYPTED_DIR=$(mktemp -d)
trap 'rm -rf "$DECRYPTED_DIR"' EXIT
DECRYPTED="$DECRYPTED_DIR/secrets.tfvars.json"

sops --decrypt secrets/db.enc.tfvars.json > "$DECRYPTED"
tofu apply -var-file="$DECRYPTED" "$@"
```

## Using the SOPS Provider

The `carlpett/sops` provider decrypts secrets natively inside OpenTofu. Treat the OpenTofu state as sensitive, because decrypted values used in resources can still be stored there:

```hcl
# versions.tf
terraform {
  required_providers {
    sops = {
      source  = "carlpett/sops"
      version = "~> 1.0"
    }
  }
}

provider "sops" {}
```

```hcl
# main.tf - read encrypted secrets directly
data "sops_file" "db_secrets" {
  source_file = "${path.module}/secrets/db.enc.tfvars.json"
}

resource "aws_db_instance" "main" {
  # ... other required aws_db_instance arguments ...
  username = data.sops_file.db_secrets.data["db_username"]
  password = data.sops_file.db_secrets.data["db_password"]
}
```

## CI/CD Integration

```yaml
# GitHub Actions - provide the age key via a secret
- name: Tofu Apply
  env:
    SOPS_AGE_KEY: ${{ secrets.SOPS_AGE_KEY }}
  run: |
    tofu init
    tofu apply -auto-approve
```

## Conclusion

SOPS enables a Git-native secrets workflow where encrypted secret files live in version control alongside your OpenTofu configurations. Using the `carlpett/sops` provider, secrets are decrypted transparently at apply time without creating a separate plaintext secrets file; treat state as sensitive because resource arguments can still be stored there. Combine SOPS with AWS KMS or age keys to match your organization's key management maturity.
