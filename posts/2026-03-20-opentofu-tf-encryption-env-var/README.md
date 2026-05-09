# How to Use the TF_ENCRYPTION Environment Variable in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Infrastructure as Code, State, Security, Encryption

Description: Learn how to use the TF_ENCRYPTION environment variable in OpenTofu to configure state encryption without modifying configuration files.

## Introduction

The `TF_ENCRYPTION` environment variable allows you to provide state encryption configuration without modifying your `.tf` files. This is useful for CI/CD pipelines where encryption settings vary by environment, or when you want to keep encryption keys out of version-controlled configuration files.

## Basic Usage

```bash
export TF_ENCRYPTION='
key_provider "pbkdf2" "main" {
  passphrase = "my-strong-passphrase"
}
method "aes_gcm" "main" {
  keys = key_provider.pbkdf2.main
}
state {
  method = method.aes_gcm.main
}
plan {
  method = method.aes_gcm.main
}
'

tofu init
tofu plan
```

## Using with AWS KMS

```bash
export TF_ENCRYPTION='
key_provider "aws_kms" "main" {
  kms_key_id = "arn:aws:kms:us-east-1:123456789012:key/abc-123"
  region     = "us-east-1"
  key_spec   = "AES_256"
}
method "aes_gcm" "main" {
  keys = key_provider.aws_kms.main
}
state {
  method = method.aes_gcm.main
  enforced = true
}
'

tofu apply
```

## Merging with Configuration File Encryption

`TF_ENCRYPTION` merges with any `encryption` block in your `.tf` files. Configuration from both sources is combined:

```hcl
# versions.tf - defines the method, but not the key

terraform {
  encryption {
    method "aes_gcm" "main" {
      keys = key_provider.pbkdf2.main
    }
    state {
      method = method.aes_gcm.main
    }
  }
}
```

```bash
# Environment variable supplies the key provider
export TF_ENCRYPTION='
key_provider "pbkdf2" "main" {
  passphrase = "${STATE_PASSPHRASE}"
}
'
```

## Environment-Specific Encryption in CI/CD

```yaml
# GitHub Actions - different passphrases per environment
jobs:
  deploy-dev:
    environment: development
    steps:
      - name: Set encryption
        run: |
          echo "TF_ENCRYPTION=key_provider \"pbkdf2\" \"main\" { passphrase = \"${{ secrets.DEV_STATE_PASSPHRASE }}\" } method \"aes_gcm\" \"main\" { keys = key_provider.pbkdf2.main } state { method = method.aes_gcm.main }" >> $GITHUB_ENV

  deploy-prod:
    environment: production
    steps:
      - name: Set encryption
        run: |
          export TF_ENCRYPTION=$(cat << 'EOF'
          key_provider "aws_kms" "main" {
            kms_key_id = "${{ vars.PROD_KMS_KEY_ARN }}"
            region     = "us-east-1"
            key_spec   = "AES_256"
          }
          method "aes_gcm" "main" {
            keys = key_provider.aws_kms.main
          }
          state {
            method   = method.aes_gcm.main
            enforced = true
          }
          EOF
          )
          echo "TF_ENCRYPTION=$TF_ENCRYPTION" >> $GITHUB_ENV
```

## Disabling Enforcement via Environment

To temporarily remove the enforcement check (useful for debugging):

```bash
# Override to remove enforcement
export TF_ENCRYPTION='
state {
  enforced = false
}
'
```

Note that setting `enforced = false` only stops OpenTofu from erroring when encryption is missing - it does not decrypt existing state. To fully migrate away from encryption, you must use the `unencrypted` method together with a `fallback` block referencing your existing method, then run `tofu apply` to rewrite state in plaintext.

## Security Considerations

- Do not log the `TF_ENCRYPTION` value - it contains key material
- Use CI/CD secret management for passphrases (GitHub Secrets, HashiCorp Vault, etc.)
- The environment variable content is not written to disk

```bash
# Safe: use a secret variable
export TF_ENCRYPTION="key_provider \"pbkdf2\" \"main\" { passphrase = \"${VAULT_PASSPHRASE}\" } ..."

# Avoid: hardcoding passphrases in scripts or config files
```

## Verifying Configuration

```bash
# Run a plan to verify encryption is working
tofu plan
# State operations should succeed with the configured encryption
```

If the encryption configuration is invalid or the keys are wrong, OpenTofu will fail early with a descriptive error during initialization or any state operation. There is no dedicated CLI command to dump the active encryption configuration, so a successful `tofu plan` is the practical way to confirm it is working.

## Conclusion

`TF_ENCRYPTION` provides flexible, runtime-configurable state encryption without modifying versioned configuration files. Use it to supply different encryption keys per environment in CI/CD, keep key material out of repositories, and enable or disable encryption settings dynamically. Combine with your CI/CD platform's secret management to securely inject passphrases or KMS key ARNs.
