# How to Use the Dapr Cryptography API Reference

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Cryptography, API, Encryption, Security

Description: A practical reference for the Dapr Cryptography API covering encrypt, decrypt, sign, and verify operations using managed key vaults.

---

## Overview

The Dapr Cryptography API lets applications encrypt, decrypt, sign, and verify data using keys managed in a key vault backend. Applications never handle raw key material - the Dapr sidecar delegates all cryptographic operations to the vault, keeping keys out of application memory.

## Supported Backends

- Azure Key Vault
- JSON Web Key Sets (JWKS)
- Kubernetes Secrets
- Local file-based keys (development only)

## Component Definition

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: myvault
spec:
  type: crypto.azure.keyvault
  version: v1
  metadata:
    - name: vaultName
      value: "my-vault"
    - name: azureClientId
      value: "your-client-id"
    - name: azureTenantId
      value: "your-tenant-id"
    - name: azureClientSecret
      secretKeyRef:
        name: azure-secret
        key: clientSecret
```

## Encrypting Data (Go SDK)

```go
package main

import (
    dapr "github.com/dapr/go-sdk/client"
    "context"
    "bytes"
)

func encryptData(plaintext []byte) ([]byte, error) {
    client, _ := dapr.NewClient()
    defer client.Close()

    out, err := client.Encrypt(context.Background(),
        bytes.NewReader(plaintext),
        dapr.EncryptOptions{
            ComponentName:    "myvault",
            KeyName:          "my-encryption-key",
            KeyWrapAlgorithm: "RSA-OAEP-256",
        },
    )
    if err != nil {
        return nil, err
    }

    var buf bytes.Buffer
    buf.ReadFrom(out)
    return buf.Bytes(), nil
}
```

## Decrypting Data (Go SDK)

```go
func decryptData(ciphertext []byte) ([]byte, error) {
    client, _ := dapr.NewClient()
    defer client.Close()

    out, err := client.Decrypt(context.Background(),
        bytes.NewReader(ciphertext),
        dapr.DecryptOptions{
            ComponentName: "myvault",
            KeyName:       "my-encryption-key",
        },
    )
    if err != nil {
        return nil, err
    }

    var buf bytes.Buffer
    buf.ReadFrom(out)
    return buf.Bytes(), nil
}
```

## Signing Data (Subtle Crypto HTTP API)

Sign and verify operations use the Dapr Subtle Crypto API (alpha). These are not yet wrapped in the Python SDK, but are accessible via the Dapr HTTP sidecar.

```bash
curl -X POST "http://localhost:3500/v1.0-alpha1/subtlecrypto/myvault/sign" \
  -H "Content-Type: application/json" \
  -d '{
    "algorithm": "PS256",
    "keyName": "my-signing-key",
    "digest": "<base64-encoded-digest>"
  }'
```

The response contains the signature as a base64-encoded string.

## Verifying a Signature (Subtle Crypto HTTP API)

```bash
curl -X POST "http://localhost:3500/v1.0-alpha1/subtlecrypto/myvault/verify" \
  -H "Content-Type: application/json" \
  -d '{
    "algorithm": "PS256",
    "keyName": "my-signing-key",
    "digest": "<base64-encoded-digest>",
    "signature": "<base64-encoded-signature>"
  }'
```

The response contains a `valid` boolean indicating whether the signature is correct.

## Supported Algorithms

| Use Case | Algorithms |
|---|---|
| Key wrapping (asymmetric) | RSA-OAEP-256, A256KW |
| Data encryption ciphers | AES-GCM (default), ChaCha20-Poly1305 |
| Signing (Subtle Crypto API) | PS256, PS384, PS512, RS256, RS384, RS512, ES256, ES384, ES512 |

## Security Best Practices

1. Never use the local file-based component in production
2. Use separate keys for encryption and signing
3. Enable key rotation in your vault - Dapr can use rotated keys without an application restart, but existing data must be re-encrypted by the application
4. Scope the crypto component to only the services that need it

## Summary

The Dapr Cryptography API abstracts key management away from application code by routing all cryptographic operations through a managed vault backend. Applications only see plaintext and ciphertext - the keys themselves never leave the vault. This reduces the blast radius of application-layer security vulnerabilities and simplifies compliance with data protection regulations.
