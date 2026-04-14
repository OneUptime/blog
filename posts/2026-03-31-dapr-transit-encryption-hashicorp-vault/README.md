# How to Use Transit Encryption with Dapr and HashiCorp Vault

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, HashiCorp Vault, Encryption, Security, Cryptography

Description: Learn how to use HashiCorp Vault's Transit secrets engine with Dapr's Cryptography API to encrypt and decrypt sensitive data without managing encryption keys.

---

## What Is Vault Transit Encryption?

Vault's Transit secrets engine is an "encryption as a service" API. Your application sends data to Vault for encryption and receives ciphertext back - the encryption key never leaves Vault. This eliminates key management from your application code and provides key rotation, versioning, and audit logging.

Dapr's Cryptography API wraps Vault Transit, giving you a consistent encryption interface.

## Setting Up Vault Transit

```bash
# Enable the transit secrets engine
vault secrets enable transit

# Create an encryption key for your application
vault write -f transit/keys/app-data-key \
  type=aes256-gcm96 \
  exportable=false \
  allow_plaintext_backup=false

# Create a policy for your application
vault policy write app-encrypt-policy - <<EOF
path "transit/encrypt/app-data-key" {
  capabilities = ["update"]
}
path "transit/decrypt/app-data-key" {
  capabilities = ["update"]
}
EOF
```

## Dapr Cryptography Component

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: vault-crypto
  namespace: default
spec:
  type: crypto.hashicorp.vault
  version: v1
  metadata:
  - name: vaultAddr
    value: "https://vault.example.com:8200"
  - name: vaultTokenMountPath
    value: "/var/run/secrets/vault/token"
  - name: transitMountPath
    value: "transit"
```

## Encrypting Data with Dapr Cryptography API

```go
package main

import (
    "context"
    "fmt"
    "io"
    "strings"

    dapr "github.com/dapr/go-sdk/client"
)

func encryptSensitiveData(ctx context.Context, client dapr.Client, plaintext string) (string, error) {
    // Encrypt using Vault Transit via Dapr
    encrypted, err := client.Encrypt(ctx,
        strings.NewReader(plaintext),
        dapr.EncryptOptions{
            ComponentName:    "vault-crypto",
            KeyName:          "app-data-key",
            KeyWrapAlgorithm: "AES",
        },
    )
    if err != nil {
        return "", fmt.Errorf("encryption failed: %w", err)
    }

    ciphertext, err := io.ReadAll(encrypted)
    if err != nil {
        return "", err
    }
    return string(ciphertext), nil
}

func decryptSensitiveData(ctx context.Context, client dapr.Client, ciphertext string) (string, error) {
    decrypted, err := client.Decrypt(ctx,
        strings.NewReader(ciphertext),
        dapr.DecryptOptions{
            ComponentName: "vault-crypto",
            KeyName:       "app-data-key",
        },
    )
    if err != nil {
        return "", fmt.Errorf("decryption failed: %w", err)
    }

    plaintext, err := io.ReadAll(decrypted)
    if err != nil {
        return "", err
    }
    return string(plaintext), nil
}
```

## Practical Example: Encrypting PII Before Storage

```go
type Customer struct {
    ID    string
    Name  string
    Email string // will be encrypted
    SSN   string // will be encrypted
}

func storeCustomer(ctx context.Context, daprClient dapr.Client, c Customer) error {
    // Encrypt sensitive fields
    encryptedEmail, err := encryptSensitiveData(ctx, daprClient, c.Email)
    if err != nil {
        return err
    }

    encryptedSSN, err := encryptSensitiveData(ctx, daprClient, c.SSN)
    if err != nil {
        return err
    }

    // Store with encrypted data
    return daprClient.SaveState(ctx, "statestore", "customer:"+c.ID, map[string]string{
        "id":    c.ID,
        "name":  c.Name,           // not sensitive
        "email": encryptedEmail,   // encrypted
        "ssn":   encryptedSSN,     // encrypted
    }, nil)
}
```

## Key Rotation

Vault Transit supports key rotation without re-encrypting all data:

```bash
# Rotate the encryption key
vault write -f transit/keys/app-data-key/rotate

# Check key versions
vault read transit/keys/app-data-key

# Old ciphertext can still be decrypted (older key versions remain available)
# New encryptions use the latest key version automatically

# Optionally, re-wrap old ciphertext to the new key version
vault write transit/rewrap/app-data-key \
  ciphertext="vault:v1:abc123..."
```

## Using the Dapr HTTP API Directly

```bash
# Encrypt via Dapr sidecar HTTP API
curl -X PUT http://localhost:3500/v1.0-alpha1/crypto/vault-crypto/encrypt \
  -H "dapr-key-name: app-data-key" \
  -H "dapr-key-wrap-algorithm: AES" \
  -H "Content-Type: application/octet-stream" \
  --data-binary "sensitive data here"
```

## Summary

Vault Transit encryption through Dapr's Cryptography API keeps encryption keys inside Vault and out of your application code. Encrypt PII and sensitive fields before storage and decrypt on retrieval, with all key operations managed by Vault. Key rotation is non-disruptive since older versions remain available for decryption while new encryptions automatically use the latest key version.
