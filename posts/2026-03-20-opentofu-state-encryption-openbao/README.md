# How to Configure State Encryption with OpenBao in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Infrastructure as Code, State, Security, Encryption

Description: Learn how to configure OpenTofu state encryption using OpenBao (the open-source Vault fork) as the key provider for centralized secrets management.

## Introduction

OpenBao is the open-source fork of HashiCorp Vault, providing centralized secrets management with dynamic secrets, PKI, and a Transit engine for encryption. Using OpenBao's Transit engine as the key provider for OpenTofu state encryption gives you a centralized, auditable key management solution with automatic key rotation.

## Prerequisites

- OpenBao or Vault server running and accessible
- Transit engine enabled
- Encryption key created

## Setting Up OpenBao Transit Engine

```bash
# Enable the transit engine

bao secrets enable transit

# Create an encryption key
bao write -f transit/keys/tofu-state-key

# Verify the key was created
bao read transit/keys/tofu-state-key
```

## OpenTofu Configuration

```hcl
# versions.tf
terraform {
  required_version = ">= 1.7"

  encryption {
    key_provider "openbao" "main" {
      address             = "https://openbao.acme-corp.com:8200"
      token               = var.openbao_token
      key_name            = "tofu-state-key"
      transit_engine_path = "/transit"
    }

    method "aes_gcm" "main" {
      keys = key_provider.openbao.main
    }

    state {
      method = method.aes_gcm.main
    }

    plan {
      method = method.aes_gcm.main
    }
  }
}
```

## Authentication Options

### Token Authentication

The OpenBao key provider authenticates with a token, either passed via the `token` argument or read from the `BAO_TOKEN` environment variable.

```hcl
key_provider "openbao" "main" {
  address  = "https://openbao.acme-corp.com:8200"
  token    = var.openbao_token
  key_name = "tofu-state-key"
}
```

### AppRole Authentication

The key provider itself only accepts a token, so AppRole login is performed outside OpenTofu (for example in a CI/CD job) and the resulting client token is passed in via `BAO_TOKEN`:

```bash
# Log in with AppRole and capture the resulting client token
export BAO_ADDR="https://openbao.acme-corp.com:8200"
BAO_TOKEN=$(bao write -field=token auth/approle/login \
  role_id="$OPENBAO_ROLE_ID" \
  secret_id="$OPENBAO_SECRET_ID")
export BAO_TOKEN

tofu init
tofu apply
```

## OpenBao Policy for Transit

```hcl
# OpenBao/Vault policy for OpenTofu
path "transit/encrypt/tofu-state-key" {
  capabilities = ["update"]
}

path "transit/decrypt/tofu-state-key" {
  capabilities = ["update"]
}

path "transit/datakey/plaintext/tofu-state-key" {
  capabilities = ["update"]
}
```

## Key Rotation

OpenBao Transit supports automatic key rotation:

```bash
# Rotate the encryption key
bao write -f transit/keys/tofu-state-key/rotate

# OpenBao re-wraps existing ciphertext with the new key version automatically
```

## Environment Variable Configuration

The OpenBao key provider reads `BAO_ADDR` and `BAO_TOKEN` from the environment, so you can omit `address` and `token` from the HCL configuration:

```bash
export BAO_ADDR="https://openbao.acme-corp.com:8200"
export BAO_TOKEN="your-openbao-token"
```

## Benefits Over PBKDF2

| Feature | PBKDF2 | OpenBao/Vault |
|---|---|---|
| Key management | Manual passphrase | Centralized, audited |
| Key rotation | Manual | Automatic |
| Access control | File-based | Policy-based |
| Audit trail | None | Full audit log |
| Dynamic secrets | No | Yes |

## Conclusion

OpenBao Transit engine provides enterprise-grade key management for OpenTofu state encryption. Use it for centralized key governance, automatic rotation, and a full audit trail of all encryption operations. Because the key provider only accepts a token, integrations like AppRole or Kubernetes auth are handled outside OpenTofu by exchanging credentials for a client token (via `bao login` or the OpenBao API) and exposing it through `BAO_TOKEN`.
