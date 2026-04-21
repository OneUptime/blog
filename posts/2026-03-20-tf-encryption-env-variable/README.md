# How to Use the TF_ENCRYPTION Environment Variable in OpenTofu - Variable

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Terraform, IaC, DevOps, Security, Encryption

Description: Learn how to use the TF_ENCRYPTION environment variable to configure OpenTofu state encryption without modifying HCL configuration files.

## Introduction

The `TF_ENCRYPTION` environment variable allows you to configure OpenTofu state and plan encryption entirely through an environment variable - no changes to your `.tf` files required. This is especially useful in CI/CD pipelines, for injecting encryption configs at runtime, or when managing encryption separately from application configuration.

## Why Use TF_ENCRYPTION?

- Configure encryption without modifying shared configuration files
- Inject encryption settings per-environment in CI/CD
- Avoid storing encryption passphrases in version-controlled files
- Override or extend existing encryption configuration at runtime

## Basic Usage

The `TF_ENCRYPTION` variable contains HCL-formatted encryption configuration:

```bash
export TF_ENCRYPTION='
key_provider "pbkdf2" "my_key" {
  passphrase = "my-secure-passphrase"
}

method "aes_gcm" "my_method" {
  keys = key_provider.pbkdf2.my_key
}

state {
  method   = method.aes_gcm.my_method
  enforced = true
}

plan {
  method   = method.aes_gcm.my_method
  enforced = true
}
'

# Now run any OpenTofu command - encryption is applied

tofu init
tofu plan
tofu apply
```

## Using TF_ENCRYPTION in CI/CD

### GitHub Actions

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup OpenTofu
        uses: opentofu/setup-opentofu@v2

      - name: Configure Encryption and Deploy
        env:
          TF_ENCRYPTION: |
            key_provider "pbkdf2" "main" {
              passphrase = "${{ secrets.STATE_ENCRYPTION_PASSPHRASE }}"
            }
            method "aes_gcm" "main" {
              keys = key_provider.pbkdf2.main
            }
            state {
              method   = method.aes_gcm.main
              enforced = true
            }
            plan {
              method   = method.aes_gcm.main
              enforced = true
            }
        run: |
          tofu init
          tofu plan -out=plan.tfplan
          tofu apply plan.tfplan
```

### GitLab CI

```yaml
deploy:
  script:
    - |
      export TF_ENCRYPTION="$(cat <<EOF
      key_provider "pbkdf2" "main" {
        passphrase = "$STATE_PASSPHRASE"
      }
      method "aes_gcm" "main" {
        keys = key_provider.pbkdf2.main
      }
      state {
        method = method.aes_gcm.main
        enforced = true
      }
      plan {
        method = method.aes_gcm.main
        enforced = true
      }
      EOF
      )"
    - tofu init
    - tofu apply -auto-approve
  variables:
    STATE_PASSPHRASE: $STATE_ENCRYPTION_PASSPHRASE  # From GitLab CI variables
```

## Using AWS KMS via TF_ENCRYPTION

```bash
export TF_ENCRYPTION='
key_provider "aws_kms" "main" {
  kms_key_id = "alias/terraform-state"
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
'
```

## Merging TF_ENCRYPTION with HCL Configuration

If your `.tf` files already contain an `encryption` block, `TF_ENCRYPTION` is **merged** with the HCL configuration. This lets you define the method in HCL and inject keys via the environment:

```hcl
# encryption.tf - defines the method structure
terraform {
  encryption {
    # The key provider will come from TF_ENCRYPTION env var
    method "aes_gcm" "main" {
      keys = key_provider.pbkdf2.injected_key  # Defined in env var
    }

    state {
      method = method.aes_gcm.main
    }
  }
}
```

```bash
# Inject the key provider via environment
export TF_ENCRYPTION='
key_provider "pbkdf2" "injected_key" {
  passphrase = "runtime-passphrase"
}
'
```

## Using JSON Format in TF_ENCRYPTION

You can also use JSON format:

```bash
export TF_ENCRYPTION='{
  "key_provider": {
    "pbkdf2": {
      "main": {
        "passphrase": "my-secure-passphrase"
      }
    }
  },
  "method": {
    "aes_gcm": {
      "main": {
        "keys": "key_provider.pbkdf2.main"
      }
    }
  },
  "state": {
    "method": "method.aes_gcm.main",
    "enforced": true
  }
}'
```

## Security Considerations

```bash
# Never set TF_ENCRYPTION with the passphrase visible in shell history
# Bad:
export TF_ENCRYPTION='key_provider "pbkdf2" "k" { passphrase = "secret" }...'

# Better: Load from a secrets manager
export TF_ENCRYPTION=$(vault kv get -mount=secret -field=tf_encryption terraform)

# Or use a file (excluded from version control)
export TF_ENCRYPTION=$(cat /run/secrets/tf_encryption)
```

## Conclusion

The `TF_ENCRYPTION` environment variable provides a flexible, runtime-configurable approach to OpenTofu state encryption. It's particularly valuable in CI/CD environments where encryption configuration should be injected at runtime rather than stored in version-controlled files. Combine it with secrets managers like AWS Secrets Manager or HashiCorp Vault to securely inject encryption keys without exposing them in pipeline definitions.
