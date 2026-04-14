# How to Use Dapr Cryptography with Go SDK

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Go, Cryptography, Security, Encryption, SDK

Description: Encrypt, decrypt, and sign data in Go microservices using the Dapr Cryptography building block without managing keys or crypto libraries directly.

---

## Overview

The Dapr Cryptography building block provides a high-level API for encrypting, decrypting, and signing data. Keys are managed by a pluggable key store (Azure Key Vault, Kubernetes secrets, local file), so your Go code never handles raw key material. The Go SDK exposes both streaming and in-memory interfaces.

## Configuring a Crypto Component

```yaml
# components/crypto-store.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: crypto-store
spec:
  type: crypto.dapr.localstorage
  version: v1
  metadata:
    - name: path
      value: "./keys"
```

Generate a local key for testing:

```bash
mkdir -p keys
# Generate a 256-bit symmetric key for testing
openssl rand -out keys/mykey 32
# Or generate an RSA key pair
openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:4096 -out keys/rsa-private-key.pem
```

## Encrypting Data

```go
package main

import (
    "context"
    "bytes"
    "io"
    "log"

    dapr "github.com/dapr/go-sdk/client"
)

func main() {
    client, err := dapr.NewClient()
    if err != nil {
        log.Fatal(err)
    }
    defer client.Close()

    ctx := context.Background()

    plaintext := []byte("sensitive customer data: SSN 123-45-6789")

    // Encrypt using a streaming interface
    encryptedStream, err := client.Encrypt(ctx,
        bytes.NewReader(plaintext),
        dapr.EncryptOptions{
            ComponentName:        "crypto-store",
            KeyName:              "mykey",
            KeyWrapAlgorithm:     "A256KW",
            DataEncryptionCipher: "aes-gcm",
        })
    if err != nil {
        log.Fatalf("encrypt error: %v", err)
    }

    encrypted, err := io.ReadAll(encryptedStream)
    if err != nil {
        log.Fatal(err)
    }
    log.Printf("Encrypted length: %d bytes", len(encrypted))
}
```

## Decrypting Data

```go
decryptedStream, err := client.Decrypt(ctx,
    bytes.NewReader(encrypted),
    dapr.DecryptOptions{
        ComponentName: "crypto-store",
        KeyName:       "mykey",
    })
if err != nil {
    log.Fatalf("decrypt error: %v", err)
}

decrypted, err := io.ReadAll(decryptedStream)
if err != nil {
    log.Fatal(err)
}
log.Printf("Decrypted: %s", decrypted)
```

## Wrapping and Unwrapping Keys

The Dapr Cryptography building block supports envelope encryption (wrapping a data encryption key with a key-encrypting key) through the Subtle Crypto gRPC API (`SubtleWrapKeyAlpha1` / `SubtleUnwrapKeyAlpha1`). However, these operations are not yet exposed in the Go SDK's high-level client. The high-level `Encrypt` method handles envelope encryption internally when you specify a `KeyWrapAlgorithm` — Dapr generates a random data encryption key, wraps it with the named key, and includes the wrapped key in the ciphertext output.

To use an RSA key for key wrapping during encryption:

```go
encryptedStream, err := client.Encrypt(ctx,
    bytes.NewReader(plaintext),
    dapr.EncryptOptions{
        ComponentName:    "crypto-store",
        KeyName:          "master-key",
        KeyWrapAlgorithm: "RSA-OAEP-256",
    })
```

## Using Azure Key Vault for Production

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: crypto-store
spec:
  type: crypto.azure.keyvault
  version: v1
  metadata:
    - name: vaultName
      value: "my-keyvault"
```

The same Go code works unchanged with the Azure Key Vault backend.

## Summary

The Dapr Cryptography building block abstracts key management away from application code. Go services call `client.Encrypt` and `client.Decrypt` with a key name, and the sidecar performs the operation using keys stored in the configured backend. This allows rotating keys, changing key stores, and auditing usage without modifying any Go code.
