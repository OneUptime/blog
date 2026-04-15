# How to Decrypt Files Using Dapr Cryptography API

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Cryptography, File Decryption, Security, AES, Storage

Description: Learn how to decrypt files using the Dapr Cryptography API with streaming decryption in Go, Python, and via the HTTP API for any file size.

---

## File Decryption with Dapr

Dapr's streaming decryption API handles files of any size efficiently by processing data in chunks rather than loading the entire file into memory. The decryption process retrieves the key from the configured provider, unwraps the data encryption key, and decrypts the ciphertext using AES-256-GCM.

## Prerequisites

The component must reference the same key provider used for encryption:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: file-crypto
spec:
  type: crypto.dapr.localstorage
  version: v1
  metadata:
  - name: path
    value: /keys
```

## Decrypting a File with Go

```go
package main

import (
    "context"
    "io"
    "log"
    "os"
    dapr "github.com/dapr/go-sdk/client"
)

func decryptFile(encryptedPath, outputPath, keyName string) error {
    client, err := dapr.NewClient()
    if err != nil {
        return err
    }
    defer client.Close()

    // Open encrypted file
    encryptedFile, err := os.Open(encryptedPath)
    if err != nil {
        return err
    }
    defer encryptedFile.Close()

    // Decrypt using streaming API
    decryptedStream, err := client.Decrypt(
        context.Background(),
        encryptedFile,
        dapr.DecryptOptions{
            ComponentName: "file-crypto",
            KeyName:       keyName,
        },
    )
    if err != nil {
        return err
    }

    // Write decrypted output
    outputFile, err := os.Create(outputPath)
    if err != nil {
        return err
    }
    defer outputFile.Close()

    written, err := io.Copy(outputFile, decryptedStream)
    log.Printf("Decrypted %d bytes to %s", written, outputPath)
    return err
}

func main() {
    if err := decryptFile("report.pdf.enc", "report.pdf", "file-key"); err != nil {
        log.Fatalf("Decryption failed: %v", err)
    }
}
```

## Decrypting a File with Python

```python
from dapr.clients import DaprClient
from dapr.clients.grpc._crypto import DecryptOptions

def decrypt_file(encrypted_path: str, output_path: str, key_name: str):
    with open(encrypted_path, "rb") as f:
        ciphertext = f.read()

    with DaprClient() as d:
        decrypted_stream = d.decrypt(
            data=ciphertext,
            options=DecryptOptions(
                component_name="file-crypto",
                key_name=key_name,
            ),
        )
        plaintext = decrypted_stream.read()

    with open(output_path, "wb") as f:
        f.write(plaintext)

    print(f"Decrypted {len(ciphertext)} bytes -> {len(plaintext)} bytes")

# Usage
decrypt_file("report.pdf.enc", "report.pdf", "file-key")
```

## Downloading and Decrypting from S3

```python
import boto3
from dapr.clients import DaprClient
from dapr.clients.grpc._crypto import DecryptOptions

def download_and_decrypt(bucket: str, s3_key: str, output_path: str):
    s3 = boto3.client("s3")
    response = s3.get_object(Bucket=bucket, Key=s3_key)

    # Get key name from metadata
    key_name = response["Metadata"].get("dapr-key-name", "file-key")
    encrypted_bytes = response["Body"].read()

    with DaprClient() as d:
        decrypted_stream = d.decrypt(
            data=encrypted_bytes,
            options=DecryptOptions(
                component_name="file-crypto",
                key_name=key_name,
            ),
        )
        plaintext = decrypted_stream.read()

    with open(output_path, "wb") as f:
        f.write(plaintext)

    print(f"Decrypted and saved to {output_path}")
```

## HTTP API File Decryption

```bash
# Decrypt an encrypted file using the HTTP API
curl -X PUT http://localhost:3500/v1.0-alpha1/crypto/file-crypto/decrypt \
  -H "Content-Type: application/octet-stream" \
  -H "dapr-key-name: file-key" \
  --data-binary @report.pdf.enc \
  -o report.pdf
```

## Streaming Decryption for Large Files

```go
func decryptLargeFile(encryptedPath, outputPath string) error {
    client, _ := dapr.NewClient()
    defer client.Close()

    encryptedFile, _ := os.Open(encryptedPath)
    defer encryptedFile.Close()

    decryptedStream, err := client.Decrypt(
        context.Background(),
        encryptedFile,
        dapr.DecryptOptions{
            ComponentName: "file-crypto",
            KeyName:       "file-key",
        },
    )
    if err != nil {
        return err
    }

    outputFile, _ := os.Create(outputPath)
    defer outputFile.Close()

    // Stream directly to disk - no full-file buffering
    buf := make([]byte, 64*1024) // 64KB buffer
    _, err = io.CopyBuffer(outputFile, decryptedStream, buf)
    return err
}
```

## Error Handling

```python
from dapr.clients import DaprClient
from dapr.clients.exceptions import DaprInternalError
from dapr.clients.grpc._crypto import DecryptOptions

def safe_decrypt_file(encrypted_path: str, key_name: str) -> bytes:
    try:
        with open(encrypted_path, "rb") as f:
            ciphertext = f.read()

        with DaprClient() as d:
            return d.decrypt(
                data=ciphertext,
                options=DecryptOptions(
                    component_name="file-crypto",
                    key_name=key_name,
                ),
            ).read()

    except DaprInternalError as e:
        if "key not found" in str(e):
            raise ValueError(f"Key '{key_name}' not found in crypto provider")
        raise
    except FileNotFoundError:
        raise ValueError(f"Encrypted file not found: {encrypted_path}")
```

## Summary

Dapr's file decryption API provides streaming decryption for files of any size, retrieving decryption keys transparently from the configured provider. The same code pattern works locally with file-based keys and in production with Azure Key Vault or Kubernetes secrets, making it easy to promote applications across environments.
