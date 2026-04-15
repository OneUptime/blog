# How to Use the Dapr Cryptography API

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Cryptography, Encryption, Security, API, Key Management

Description: Learn how to use the Dapr Cryptography API to encrypt and decrypt data without managing cryptographic keys directly in your application code.

---

## What Is the Dapr Cryptography API?

The Dapr Cryptography building block provides a standardized API for encrypting and decrypting data without embedding key management logic in your application. Keys are stored in a pluggable key provider (Azure Key Vault, Kubernetes secrets, local storage), and your app calls simple Dapr APIs to perform cryptographic operations.

This separation means you can rotate keys, change providers, and enforce access control at the infrastructure level without changing application code.

## Supported Providers

- Azure Key Vault (recommended for production)
- Kubernetes secrets
- Local key storage (for development)
- JSON Web Key Sets (JWKS)

## Setting Up a Local Key Provider

For development, use the local file provider:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: my-crypto-provider
spec:
  type: crypto.dapr.localstorage
  version: v1
  metadata:
  - name: path
    value: ./keys
```

Generate a key for local use with OpenSSL:

```bash
mkdir keys
# Generate a 256-bit symmetric key
openssl rand -out keys/mykey 32
```

## Encrypting Data via HTTP API

```bash
curl -X PUT http://localhost:3500/v1.0-alpha1/crypto/my-crypto-provider/encrypt \
  -H "Content-Type: application/octet-stream" \
  -H "dapr-key-name: mykey" \
  -H "dapr-key-wrap-algorithm: A256KW" \
  --data-binary "Hello, secret world!" \
  -o encrypted.bin
```

## Decrypting Data via HTTP API

```bash
curl -X PUT http://localhost:3500/v1.0-alpha1/crypto/my-crypto-provider/decrypt \
  -H "Content-Type: application/octet-stream" \
  -H "dapr-key-name: mykey" \
  --data-binary @encrypted.bin
```

## Using the Go SDK

```go
package main

import (
    "bytes"
    "context"
    "fmt"
    "io"

    dapr "github.com/dapr/go-sdk/client"
)

func main() {
    client, _ := dapr.NewClient()
    defer client.Close()

    plaintext := []byte("sensitive customer data")

    // Encrypt
    encryptOpts := dapr.EncryptOptions{
        ComponentName:    "my-crypto-provider",
        KeyName:          "mykey",
        KeyWrapAlgorithm: "A256KW",
    }
    encrypted, err := client.Encrypt(context.Background(),
        bytes.NewReader(plaintext), encryptOpts)
    if err != nil {
        panic(err)
    }

    encryptedBytes, _ := io.ReadAll(encrypted)
    fmt.Printf("Encrypted %d bytes\n", len(encryptedBytes))

    // Decrypt
    decryptOpts := dapr.DecryptOptions{
        ComponentName: "my-crypto-provider",
        KeyName:       "mykey",
    }
    decrypted, err := client.Decrypt(context.Background(),
        bytes.NewReader(encryptedBytes), decryptOpts)
    if err != nil {
        panic(err)
    }

    result, _ := io.ReadAll(decrypted)
    fmt.Printf("Decrypted: %s\n", string(result))
}
```

## Using the Python SDK

```python
from dapr.clients import DaprClient
from dapr.clients.grpc._crypto import EncryptOptions, DecryptOptions

with DaprClient() as d:
    plaintext = b"sensitive customer data"

    # Encrypt
    encrypted = d.encrypt(
        data=plaintext,
        options=EncryptOptions(
            component_name="my-crypto-provider",
            key_name="mykey",
            key_wrap_algorithm="A256KW",
        ),
    )
    encrypted_bytes = encrypted.read()
    print(f"Encrypted: {len(encrypted_bytes)} bytes")

    # Decrypt
    decrypted = d.decrypt(
        data=encrypted_bytes,
        options=DecryptOptions(
            component_name="my-crypto-provider",
            key_name="mykey",
        ),
    )
    result = decrypted.read()
    print(f"Decrypted: {result.decode()}")
```

## Supported Algorithms

| Operation | Algorithms |
|-----------|-----------|
| Key wrap | A256KW, A128CBC, A192CBC, RSA-OAEP-256 |
| Data encryption | AES-GCM (256-bit), ChaCha20-Poly1305 |

## Summary

The Dapr Cryptography API provides a portable, provider-agnostic interface for encryption and decryption. Applications call simple encrypt/decrypt operations while key management, storage, and rotation are handled externally by the configured provider. This makes it easy to start with local keys in development and switch to Azure Key Vault or Kubernetes secrets in production without code changes.
