# How to Use OpenTofu Client-Side State Encryption

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Encryption, Security, State Management, Compliance

Description: A deep dive into OpenTofu client-side state encryption, explaining how it differs from server-side encryption, configuration options, key management strategies, and compliance considerations.

---

Client-side state encryption in OpenTofu means the state file is encrypted on your machine before it ever leaves for the backend. This is fundamentally different from server-side encryption (like S3 SSE), where the data travels unencrypted to the server and gets encrypted there. For organizations with strict compliance requirements or zero-trust security models, client-side encryption is the stronger option.

## Client-Side vs Server-Side Encryption

Let us be clear about what each approach protects against.

**Server-side encryption** (S3 SSE, Azure Storage encryption, GCS encryption):
- State is encrypted at rest on the storage service
- State travels over TLS in transit
- The storage service handles encryption and decryption
- Anyone with read access to the bucket can read the state
- The cloud provider can theoretically read the state

**Client-side encryption** (OpenTofu state encryption):
- State is encrypted on your machine before upload
- The backend stores ciphertext it cannot decrypt
- Only holders of the encryption key can read the state
- Even cloud provider admins cannot read the state
- Adds protection against compromised backend credentials

In practice, you should use both. Server-side encryption is a baseline requirement, and client-side encryption adds defense in depth.

## Setting Up Client-Side Encryption

The encryption configuration lives in the `terraform` block. Here is a complete example:

```hcl
terraform {
  required_version = ">= 1.7.0"

  # Backend for state storage
  backend "s3" {
    bucket         = "myorg-opentofu-state"
    key            = "production/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "opentofu-locks"
    encrypt        = true  # Server-side encryption (S3 SSE)
  }

  # Client-side encryption
  encryption {
    key_provider "pbkdf2" "main" {
      passphrase = var.encryption_passphrase
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
  }
}

variable "encryption_passphrase" {
  type      = string
  sensitive = true
}
```

## Understanding AES-GCM Encryption

OpenTofu uses AES-GCM (Galois/Counter Mode) for state encryption. This is an authenticated encryption algorithm, which means it provides both confidentiality (the data is unreadable without the key) and integrity (any tampering with the ciphertext is detected).

Key properties:
- 256-bit encryption keys
- Each encryption operation uses a unique nonce
- Built-in authentication tag prevents ciphertext modification
- Industry standard for data encryption

The encrypted state looks like binary data. The original JSON structure is completely hidden:

```bash
# Encrypted state on S3 (not readable)
aws s3 cp s3://myorg-opentofu-state/production/terraform.tfstate - | file -
# Output: data (not JSON, not text)

# Decrypted state through OpenTofu (readable)
tofu state pull | head -5
# {
#   "version": 4,
#   "terraform_version": "1.8.0",
#   ...
```

## Key Provider Options

### PBKDF2 Passphrase Provider

Derives an encryption key from a passphrase using the PBKDF2 algorithm:

```hcl
key_provider "pbkdf2" "main" {
  passphrase = var.encryption_passphrase

  # Optional: customize the key derivation parameters
  # Higher iterations = more secure but slower
  # key_length = 32  (default, for AES-256)
  # iterations = 600000  (default)
  # hash_function = "sha256"  (default)
  # salt_length = 32  (default)
}
```

Best for: development environments, small teams, simple setups.

### AWS KMS Provider

Uses AWS Key Management Service to wrap/unwrap the data encryption key:

```hcl
key_provider "aws_kms" "main" {
  kms_key_id = "alias/opentofu-state-key"
  key_spec   = "AES_256"
  region     = "us-east-1"

  # Optional: assume a role for KMS access
  # role_arn = "arn:aws:iam::123456789012:role/KMSAccessRole"
}
```

How it works:
1. OpenTofu generates a random data encryption key (DEK)
2. The DEK is encrypted (wrapped) using the KMS key
3. The wrapped DEK is stored alongside the encrypted state
4. On read, the wrapped DEK is decrypted (unwrapped) by KMS
5. The DEK is used to decrypt the state

Best for: AWS-based teams, production environments, compliance requirements.

### GCP KMS Provider

```hcl
key_provider "gcp_kms" "main" {
  kms_encryption_key = "projects/my-project/locations/global/keyRings/opentofu/cryptoKeys/state"
  key_length         = 256
}
```

Best for: GCP-based teams.

## Encrypting Sensitive Outputs

State encryption protects everything in the state file, including outputs marked as sensitive:

```hcl
output "database_password" {
  value     = random_password.db.result
  sensitive = true
}

# Without encryption, this is visible in state JSON
# With encryption, the entire state is ciphertext
```

## Migration Strategies

### From Unencrypted to Encrypted

```hcl
terraform {
  encryption {
    key_provider "pbkdf2" "main" {
      passphrase = var.encryption_passphrase
    }

    method "aes_gcm" "main" {
      keys = key_provider.pbkdf2.main
    }

    # Allow reading unencrypted state during migration
    method "unencrypted" "fallback" {}

    state {
      method = method.aes_gcm.main
      fallback {
        method = method.unencrypted.fallback
      }
    }
  }
}
```

```bash
# Step 1: Add the encryption config with fallback
tofu init

# Step 2: Apply (reads unencrypted, writes encrypted)
tofu apply

# Step 3: Verify the state is encrypted
aws s3 cp s3://bucket/key - | file -  # Should not be JSON

# Step 4: Remove the fallback block (after all state is encrypted)
```

### From Encrypted Back to Unencrypted

If you need to disable encryption (not recommended):

```hcl
terraform {
  encryption {
    key_provider "pbkdf2" "main" {
      passphrase = var.encryption_passphrase
    }

    method "aes_gcm" "old" {
      keys = key_provider.pbkdf2.main
    }

    method "unencrypted" "new" {}

    state {
      method = method.unencrypted.new
      fallback {
        method = method.aes_gcm.old
      }
    }
  }
}
```

```bash
# Apply to write unencrypted state
tofu apply

# Verify state is readable without encryption
tofu state pull | python3 -m json.tool | head -5
```

### Migrating Between Key Providers

Switch from passphrase to KMS without downtime:

```hcl
terraform {
  encryption {
    # New key provider (KMS)
    key_provider "aws_kms" "new" {
      kms_key_id = "alias/opentofu-state-key"
      key_spec   = "AES_256"
      region     = "us-east-1"
    }

    # Old key provider (passphrase)
    key_provider "pbkdf2" "old" {
      passphrase = var.old_passphrase
    }

    method "aes_gcm" "new" {
      keys = key_provider.aws_kms.new
    }

    method "aes_gcm" "old" {
      keys = key_provider.pbkdf2.old
    }

    state {
      method = method.aes_gcm.new
      fallback {
        method = method.aes_gcm.old
      }
    }
  }
}
```

## Compliance Considerations

Client-side encryption helps with several compliance frameworks:

**SOC 2**: Demonstrates encryption of sensitive data at rest with customer-controlled keys.

**HIPAA**: Protects PHI (Protected Health Information) that might be referenced in infrastructure state.

**PCI DSS**: Encrypts cardholder data environment (CDE) infrastructure details.

**GDPR**: Adds a layer of protection for infrastructure containing personal data.

Document your encryption setup as part of your compliance controls:

```markdown
## State Encryption Controls

- Algorithm: AES-256-GCM (authenticated encryption)
- Key Management: AWS KMS (key ID: alias/opentofu-state-key)
- Key Rotation: Annual, managed via KMS automatic rotation
- Access Control: IAM policy restricts KMS decrypt to CI/CD role
- Audit: CloudTrail logs all KMS operations
```

## Emergency Access and Recovery

Plan for key loss scenarios:

```bash
# Keep an offline backup of your passphrase or KMS key ID
# Store in a secure location (hardware security module, vault, etc.)

# For KMS: ensure the key deletion protection is enabled
aws kms describe-key --key-id alias/opentofu-state-key \
  --query 'KeyMetadata.DeletionDate'

# For passphrase: store in a secrets manager
# with break-glass procedures for emergency access
```

**If you lose the encryption key, you lose access to your state permanently.** There is no recovery mechanism. The encryption is real.

## Performance Impact

Client-side encryption adds minimal overhead. The AES-GCM operation is fast even for large state files:

```bash
# Benchmark (rough numbers for a 10MB state file)
# Without encryption: 50ms to read state
# With encryption: 55ms to read state
# The overhead is negligible
```

The main performance consideration is KMS latency. Each state read/write requires a KMS API call. For frequent operations, consider caching or using a passphrase for development.

Client-side state encryption is one of OpenTofu's most compelling features. It fills a genuine security gap and does it in a way that is straightforward to configure and maintain. If your state contains any sensitive data (and it almost certainly does), enable encryption.

For CI/CD integration, see [How to Use OpenTofu with CI/CD Pipelines](https://oneuptime.com/blog/post/2026-02-23-use-opentofu-with-ci-cd-pipelines/view).
