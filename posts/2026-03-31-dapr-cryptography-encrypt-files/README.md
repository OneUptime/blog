# How to Encrypt Files Using Dapr Cryptography API

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Cryptography, File Encryption, Security, AES, Storage

Description: Learn how to encrypt files using the Dapr Cryptography API, enabling secure file storage and transfer with streaming encryption and pluggable key providers.

---

## File Encryption with Dapr

Dapr's Cryptography building block supports streaming encryption, making it efficient for encrypting files of any size. The API wraps AES-256-GCM encryption with pluggable key management, so you can encrypt files before storing them in object storage or a database without managing keys in your application.

## Component Setup

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

Generate an RSA key pair for file encryption (RSA for key wrapping, AES-GCM for data):

```bash
openssl genrsa -out /keys/file-key.pem 4096
openssl rsa -in /keys/file-key.pem -pubout -out /keys/file-key.pub.pem
```

## Encrypting a File with Go

```go
package main

import (
    "context"
    "io"
    "log"
    "os"
    dapr "github.com/dapr/go-sdk/client"
)

func encryptFile(inputPath, outputPath, keyName string) error {
    client, err := dapr.NewClient()
    if err != nil {
        return err
    }
    defer client.Close()

    // Open source file
    inputFile, err := os.Open(inputPath)
    if err != nil {
        return err
    }
    defer inputFile.Close()

    // Encrypt using streaming API
    encryptedStream, err := client.Encrypt(
        context.Background(),
        inputFile,
        dapr.EncryptOptions{
            ComponentName:    "file-crypto",
            KeyName:          keyName,
            KeyWrapAlgorithm: "RSA-OAEP-256",
        },
    )
    if err != nil {
        return err
    }

    // Write encrypted output
    outputFile, err := os.Create(outputPath)
    if err != nil {
        return err
    }
    defer outputFile.Close()

    written, err := io.Copy(outputFile, encryptedStream)
    log.Printf("Encrypted %d bytes to %s", written, outputPath)
    return err
}
```

## Encrypting a File with Python

```python
from dapr.clients import DaprClient
from dapr.clients.grpc._crypto import EncryptOptions

def encrypt_file(input_path: str, output_path: str, key_name: str):
    with open(input_path, "rb") as f:
        plaintext = f.read()

    with DaprClient() as d:
        encrypted_stream = d.encrypt(
            data=plaintext,
            options=EncryptOptions(
                component_name="file-crypto",
                key_name=key_name,
                key_wrap_algorithm="RSA-OAEP-256",
            ),
        )
        encrypted_bytes = encrypted_stream.read()

    with open(output_path, "wb") as f:
        f.write(encrypted_bytes)

    print(f"Encrypted {len(plaintext)} bytes -> {len(encrypted_bytes)} bytes")

# Usage
encrypt_file("report.pdf", "report.pdf.enc", "file-key")
```

## Encrypting and Uploading to S3

```python
import boto3
from dapr.clients import DaprClient
from dapr.clients.grpc._crypto import EncryptOptions

def encrypt_and_upload(local_path: str, bucket: str, s3_key: str, key_name: str):
    with open(local_path, "rb") as f:
        plaintext = f.read()

    with DaprClient() as d:
        encrypted_stream = d.encrypt(
            data=plaintext,
            options=EncryptOptions(
                component_name="file-crypto",
                key_name=key_name,
                key_wrap_algorithm="RSA-OAEP-256",
            ),
        )
        encrypted_bytes = encrypted_stream.read()

    s3 = boto3.client("s3")
    s3.put_object(
        Bucket=bucket,
        Key=s3_key,
        Body=encrypted_bytes,
        Metadata={"dapr-key-name": key_name}
    )
    print(f"Uploaded encrypted file to s3://{bucket}/{s3_key}")
```

## HTTP API File Encryption

```bash
# Encrypt a file using the HTTP API
curl -X PUT http://localhost:3500/v1.0-alpha1/crypto/file-crypto/encrypt \
  -H "Content-Type: application/octet-stream" \
  -H "dapr-key-name: file-key" \
  -H "dapr-key-wrap-algorithm: RSA-OAEP-256" \
  --data-binary @report.pdf \
  -o report.pdf.enc
```

## Streaming Large Files in Chunks

For very large files, avoid loading the entire file into memory:

```go
func encryptLargeFile(inputPath, outputPath string) error {
    client, _ := dapr.NewClient()
    defer client.Close()

    // Open with buffered reading
    inputFile, _ := os.Open(inputPath)
    defer inputFile.Close()

    bufferedReader := bufio.NewReaderSize(inputFile, 64*1024) // 64KB chunks

    encryptedStream, err := client.Encrypt(context.Background(), bufferedReader,
        dapr.EncryptOptions{
            ComponentName:    "file-crypto",
            KeyName:          "file-key",
            KeyWrapAlgorithm: "RSA-OAEP-256",
        })
    if err != nil {
        return err
    }

    outputFile, _ := os.Create(outputPath)
    defer outputFile.Close()

    _, err = io.Copy(outputFile, encryptedStream)
    return err
}
```

## Summary

Dapr's Cryptography API makes file encryption straightforward with streaming support for any file size. By combining RSA key wrapping with AES-256-GCM data encryption, files are securely encrypted without exposing keys in application code. The same API works with local keys in development and cloud key vaults in production.
