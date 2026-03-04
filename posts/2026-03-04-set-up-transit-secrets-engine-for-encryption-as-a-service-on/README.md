# How to Set Up Transit Secrets Engine for Encryption as a Service on RHEL

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: RHEL, Vault, Transit, Encryption, Security, HashiCorp, Linux

Description: Learn how to set up HashiCorp Vault's Transit secrets engine on RHEL to provide encryption as a service, enabling applications to encrypt and decrypt data without managing encryption keys directly.

---

Managing encryption keys inside applications is error-prone. Keys end up in config files, get committed to repositories, or stay in memory longer than they should. Vault's Transit secrets engine provides encryption as a service: your application sends plaintext to Vault and gets ciphertext back, without ever touching the encryption key. This guide covers setting it up on RHEL.

## How Transit Works

The Transit secrets engine handles cryptographic operations without exposing the encryption keys:

- Applications send data to Vault's Transit API
- Vault encrypts or decrypts the data using keys that never leave Vault
- Applications receive the result without managing keys
- Keys can be rotated without re-encrypting existing data

## Prerequisites

- RHEL with Vault installed and running
- An application that needs to encrypt or decrypt data

## Enabling the Transit Engine

```bash
# Enable the Transit secrets engine
vault secrets enable transit
```

## Creating Encryption Keys

Create a named encryption key:

```bash
# Create an AES-256-GCM key for general encryption
vault write -f transit/keys/myapp-key
```

Create keys with specific types:

```bash
# Create an RSA-4096 key for asymmetric encryption
vault write transit/keys/myapp-rsa type=rsa-4096

# Create a key for signing only
vault write transit/keys/myapp-sign type=ed25519
```

View key details:

```bash
# Read key configuration
vault read transit/keys/myapp-key
```

## Encrypting Data

```bash
# Encrypt plaintext (must be base64-encoded)
vault write transit/encrypt/myapp-key \
  plaintext=$(echo -n "sensitive data here" | base64)
```

The response includes ciphertext prefixed with the key version:

```
Key           Value
---           -----
ciphertext    vault:v1:AbCdEfGhIjKlMnOpQrStUvWxYz123456789...
key_version   1
```

## Decrypting Data

```bash
# Decrypt ciphertext
vault write transit/decrypt/myapp-key \
  ciphertext="vault:v1:AbCdEfGhIjKlMnOpQrStUvWxYz123456789..."
```

The response contains the base64-encoded plaintext:

```bash
# Decode the plaintext
echo "c2Vuc2l0aXZlIGRhdGEgaGVyZQ==" | base64 -d
```

## Batch Encryption and Decryption

Encrypt multiple items in a single request:

```bash
# Batch encrypt
vault write transit/encrypt/myapp-key \
  batch_input='[
    {"plaintext":"'$(echo -n "record1" | base64)'"},
    {"plaintext":"'$(echo -n "record2" | base64)'"},
    {"plaintext":"'$(echo -n "record3" | base64)'"}
  ]'
```

## Key Rotation

Rotate the encryption key without re-encrypting existing data:

```bash
# Rotate the key
vault write -f transit/keys/myapp-key/rotate
```

After rotation, new encryptions use the latest key version, but Vault can still decrypt data encrypted with older versions.

To re-encrypt existing data with the latest key version:

```bash
# Rewrap ciphertext with the current key version
vault write transit/rewrap/myapp-key \
  ciphertext="vault:v1:OldCiphertextHere..."
```

## Setting a Minimum Decryption Version

Once all data has been rewrapped, disable old key versions:

```bash
# Set the minimum decryption version to 2
vault write transit/keys/myapp-key/config \
  min_decryption_version=2
```

Data encrypted with version 1 can no longer be decrypted. This is useful for key retirement.

## Signing and Verification

Use Transit for digital signatures:

```bash
# Sign data
vault write transit/sign/myapp-sign \
  input=$(echo -n "document to sign" | base64)
```

```bash
# Verify a signature
vault write transit/verify/myapp-sign \
  input=$(echo -n "document to sign" | base64) \
  signature="vault:v1:MEUCIQCx..."
```

## HMAC Generation

Generate HMACs for data integrity verification:

```bash
# Generate an HMAC
vault write transit/hmac/myapp-key \
  input=$(echo -n "data to hash" | base64)
```

## Application Integration

Here is how to use Transit in a Python application:

```python
import hvac
import base64

client = hvac.Client(url='http://127.0.0.1:8200', token='your-app-token')

def encrypt_field(plaintext):
    """Encrypt a string using Vault Transit."""
    encoded = base64.b64encode(plaintext.encode()).decode()
    result = client.secrets.transit.encrypt_data(
        name='myapp-key',
        plaintext=encoded
    )
    return result['data']['ciphertext']

def decrypt_field(ciphertext):
    """Decrypt ciphertext using Vault Transit."""
    result = client.secrets.transit.decrypt_data(
        name='myapp-key',
        ciphertext=ciphertext
    )
    return base64.b64decode(result['data']['plaintext']).decode()

# Encrypt sensitive data before storing in the database
encrypted_ssn = encrypt_field("123-45-6789")
print(f"Encrypted: {encrypted_ssn}")

# Decrypt when needed
original_ssn = decrypt_field(encrypted_ssn)
print(f"Decrypted: {original_ssn}")
```

## Creating Vault Policies for Transit

```bash
# Policy for encrypting only
vault policy write transit-encrypt-only - << 'EOF'
path "transit/encrypt/myapp-key" {
  capabilities = ["update"]
}
EOF
```

```bash
# Policy for both encrypt and decrypt
vault policy write transit-full - << 'EOF'
path "transit/encrypt/myapp-key" {
  capabilities = ["update"]
}
path "transit/decrypt/myapp-key" {
  capabilities = ["update"]
}
path "transit/rewrap/myapp-key" {
  capabilities = ["update"]
}
EOF
```

Separating encrypt and decrypt policies lets you create services that can only encrypt data but never decrypt it, which is useful for data ingestion pipelines.

## Convergent Encryption

For cases where you need to search on encrypted data, use convergent encryption:

```bash
# Create a convergent encryption key
vault write transit/keys/searchable-key \
  type=aes256-gcm96 \
  convergent_encryption=true \
  derived=true
```

With convergent encryption, the same plaintext always produces the same ciphertext, allowing you to build indexes on encrypted fields.

## Performance Considerations

Transit operations add a network round trip per encryption or decryption. To minimize latency:

- Use batch operations for multiple items
- Keep Vault close to your application (same network, same datacenter)
- Use Vault Agent for caching and connection pooling
- Consider using derived keys for client-side encryption when latency is critical

## Conclusion

Vault's Transit secrets engine on RHEL provides encryption as a service that removes the burden of key management from your applications. Applications encrypt and decrypt data through an API call, keys never leave Vault, and rotation is handled without re-encrypting existing data. This approach simplifies compliance, reduces the risk of key exposure, and provides a clear audit trail for all cryptographic operations.
