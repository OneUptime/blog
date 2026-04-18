# How to Use Vault Transit for State Encryption in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Vault, Transit, State Encryption, Security

Description: Learn how to use OpenTofu's native encryption with HashiCorp Vault Transit to encrypt state files at rest, protecting sensitive infrastructure data from exposure.

## Introduction

OpenTofu 1.7+ introduced native state encryption, allowing state files to be encrypted before being written to the backend. The Vault Transit secrets engine acts as a key management service, providing encryption/decryption without exposing the raw key material to OpenTofu.

## Enabling Transit Secrets Engine

```hcl
# Configure Transit secrets engine in Vault

resource "vault_mount" "transit" {
  path = "transit"
  type = "transit"
}

# Create an encryption key for OpenTofu state
resource "vault_transit_secret_backend_key" "opentofu_state" {
  backend          = vault_mount.transit.path
  name             = "opentofu-state-encryption"
  type             = "aes256-gcm96"
  deletion_allowed = false
  exportable       = false

  # Enable automatic rotation
  auto_rotate_period = 2592000  # 30 days in seconds
}

# Policy allowing OpenTofu to use the transit key
resource "vault_policy" "opentofu_state" {
  name = "opentofu-state-encryption"

  policy = <<EOT
path "transit/encrypt/opentofu-state-encryption" {
  capabilities = ["update"]
}
path "transit/decrypt/opentofu-state-encryption" {
  capabilities = ["update"]
}
path "transit/keys/opentofu-state-encryption" {
  capabilities = ["read"]
}
EOT
}
```

## Configuring OpenTofu State Encryption

```hcl
# terraform.tf (or versions.tf)
terraform {
  required_version = ">= 1.7.0"

  backend "s3" {
    bucket = "my-state-bucket"
    key    = "prod/terraform.tfstate"
    region = "us-east-1"
  }

  # Native state encryption using Vault Transit
  encryption {
    key_provider "pbkdf2" "local_fallback" {
      passphrase = var.state_encryption_passphrase
    }

    method "aes_gcm" "default" {
      keys = key_provider.pbkdf2.local_fallback
    }

    state {
      method = method.aes_gcm.default
    }

    plan {
      method = method.aes_gcm.default
    }
  }
}
```

For Vault-backed key derivation, use OpenTofu's built-in `openbao` key provider (compatible with the last MPL-licensed release of HashiCorp Vault, 1.14, as well as with OpenBao):

```hcl
terraform {
  encryption {
    key_provider "openbao" "transit_key" {
      token               = var.vault_token
      address             = "https://vault.example.com:8200"
      transit_engine_path = "/transit"
      key_name            = "opentofu-state-encryption"
    }

    method "aes_gcm" "vault_backed" {
      keys = key_provider.openbao.transit_key
    }

    state {
      method = method.aes_gcm.vault_backed
    }

    plan {
      method = method.aes_gcm.vault_backed
    }
  }
}
```

## Using Environment Variables for Token

```bash
# Obtain a Vault token (Vault CLI reads VAULT_ADDR/VAULT_TOKEN)
export VAULT_ADDR=https://vault.example.com:8200
VAULT_TOKEN=$(vault login -method=aws -field=token role=opentofu-cicd)

# OpenTofu's openbao key provider reads BAO_ADDR/BAO_TOKEN
export BAO_ADDR="$VAULT_ADDR"
export BAO_TOKEN="$VAULT_TOKEN"

# Now run OpenTofu - it will use BAO_TOKEN for transit encryption
tofu plan
tofu apply
```

## Key Rotation

```hcl
# Rotate the Transit key
resource "vault_transit_secret_backend_key" "opentofu_state" {
  backend            = vault_mount.transit.path
  name               = "opentofu-state-encryption"
  type               = "aes256-gcm96"
  auto_rotate_period = 2592000  # 30 days
  # min_decryption_version allows reading old state encrypted with previous key versions
  min_decryption_version = 1
}
```

```bash
# Manually trigger key rotation
vault write -f transit/keys/opentofu-state-encryption/rotate

# Re-encrypt state with the new key version
tofu apply -refresh-only
```

## Verifying Encryption

```bash
# Check if state file is encrypted
aws s3 cp s3://my-state-bucket/prod/terraform.tfstate - | head -c 100
# Should show binary/encrypted content, not readable JSON

# Use tofu to read state (decrypts transparently)
tofu show
tofu state list
```

## Conclusion

OpenTofu's native encryption with Vault Transit provides defense-in-depth for state files: the state is encrypted on the client before upload, so even unrestricted S3 bucket access doesn't expose plaintext infrastructure data. The Transit engine's automatic key rotation and minimum decryption version tracking ensures old state files remain readable while new state uses updated keys.
