# How to Encrypt and Decrypt Data Using Cloud KMS API in GCP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud KMS, Encryption, Decryption, API

Description: Learn how to encrypt and decrypt data using the Google Cloud KMS API with gcloud, Python, Node.js, and Go, including handling of base64 encoding and plaintext size limits.

---

Cloud KMS provides a simple API for encrypting and decrypting data. You send plaintext to the encrypt endpoint, it returns ciphertext. You send ciphertext to the decrypt endpoint, it returns plaintext. The key material never leaves Google's infrastructure, and every operation is logged in Cloud Audit Logs.

This direct encrypt/decrypt pattern works well for small pieces of data - passwords, tokens, configuration values, small documents. For larger data, you should use envelope encryption instead (encrypting the data with a local key, then encrypting that local key with KMS). This post focuses on the direct API approach.

## Prerequisites

- A Cloud KMS key ring and symmetric encryption key (see the guide on creating key rings and keys)
- The `roles/cloudkms.cryptoKeyEncrypterDecrypter` role on the key
- The Cloud KMS API enabled on your project

## Encrypting Data with gcloud

The gcloud CLI makes encryption straightforward. You provide the plaintext (as a file) and specify the key:

```bash
# Write some plaintext to a file
echo -n "This is sensitive data that needs encryption" > plaintext.txt

# Encrypt the file using Cloud KMS
gcloud kms encrypt \
  --key=app-data-key \
  --keyring=my-app-keyring \
  --location=us-central1 \
  --plaintext-file=plaintext.txt \
  --ciphertext-file=encrypted.dat \
  --project=my-project-id

# The encrypted data is now in encrypted.dat
ls -la encrypted.dat
```

The ciphertext file is binary data. If you need to store or transmit it as text, base64 encode it:

```bash
# Base64 encode the ciphertext for storage in text formats
base64 encrypted.dat > encrypted.b64

# View the base64-encoded ciphertext
cat encrypted.b64
```

## Decrypting Data with gcloud

```bash
# Decrypt the ciphertext back to plaintext
gcloud kms decrypt \
  --key=app-data-key \
  --keyring=my-app-keyring \
  --location=us-central1 \
  --ciphertext-file=encrypted.dat \
  --plaintext-file=decrypted.txt \
  --project=my-project-id

# Verify the decrypted output matches the original
cat decrypted.txt
```

If your ciphertext is base64 encoded, decode it first:

```bash
# Decode base64 before decrypting
base64 --decode encrypted.b64 > encrypted.dat

# Then decrypt normally
gcloud kms decrypt \
  --key=app-data-key \
  --keyring=my-app-keyring \
  --location=us-central1 \
  --ciphertext-file=encrypted.dat \
  --plaintext-file=decrypted.txt \
  --project=my-project-id
```

## Encrypting and Decrypting with Python

The Python client library provides a clean interface for KMS operations:

```python
# Python example: Encrypt and decrypt data with Cloud KMS
from google.cloud import kms
import base64

def encrypt_data(project_id, location, keyring, key_name, plaintext):
    """Encrypt plaintext data using a Cloud KMS key."""
    # Create the KMS client
    client = kms.KeyManagementServiceClient()

    # Build the key name
    key_path = client.crypto_key_path(project_id, location, keyring, key_name)

    # Encode the plaintext to bytes if it is a string
    if isinstance(plaintext, str):
        plaintext = plaintext.encode("utf-8")

    # Call the encrypt API
    response = client.encrypt(
        request={
            "name": key_path,
            "plaintext": plaintext,
        }
    )

    # Return base64-encoded ciphertext for easy storage
    return base64.b64encode(response.ciphertext).decode("utf-8")


def decrypt_data(project_id, location, keyring, key_name, ciphertext_b64):
    """Decrypt ciphertext data using a Cloud KMS key."""
    # Create the KMS client
    client = kms.KeyManagementServiceClient()

    # Build the key name
    key_path = client.crypto_key_path(project_id, location, keyring, key_name)

    # Decode the base64 ciphertext
    ciphertext = base64.b64decode(ciphertext_b64)

    # Call the decrypt API
    response = client.decrypt(
        request={
            "name": key_path,
            "ciphertext": ciphertext,
        }
    )

    return response.plaintext.decode("utf-8")


# Usage
project = "my-project-id"
location = "us-central1"
keyring = "my-app-keyring"
key = "app-data-key"

# Encrypt
sensitive_data = "credit_card=4111111111111111"
encrypted = encrypt_data(project, location, keyring, key, sensitive_data)
print(f"Encrypted (base64): {encrypted[:50]}...")

# Decrypt
decrypted = decrypt_data(project, location, keyring, key, encrypted)
print(f"Decrypted: {decrypted}")
```

## Encrypting and Decrypting with Node.js

```javascript
// Node.js example: Encrypt and decrypt data with Cloud KMS
const { KeyManagementServiceClient } = require("@google-cloud/kms");

const client = new KeyManagementServiceClient();

async function encryptData(projectId, location, keyring, keyName, plaintext) {
  // Build the key name
  const keyPath = client.cryptoKeyPath(projectId, location, keyring, keyName);

  // Convert plaintext to a Buffer
  const plaintextBuffer = Buffer.from(plaintext, "utf8");

  // Call the encrypt API
  const [result] = await client.encrypt({
    name: keyPath,
    plaintext: plaintextBuffer,
  });

  // Return base64-encoded ciphertext
  return Buffer.from(result.ciphertext).toString("base64");
}

async function decryptData(projectId, location, keyring, keyName, ciphertextB64) {
  // Build the key name
  const keyPath = client.cryptoKeyPath(projectId, location, keyring, keyName);

  // Decode the base64 ciphertext
  const ciphertext = Buffer.from(ciphertextB64, "base64");

  // Call the decrypt API
  const [result] = await client.decrypt({
    name: keyPath,
    ciphertext: ciphertext,
  });

  return Buffer.from(result.plaintext).toString("utf8");
}

// Usage
async function main() {
  const project = "my-project-id";
  const location = "us-central1";
  const keyring = "my-app-keyring";
  const key = "app-data-key";

  // Encrypt
  const encrypted = await encryptData(project, location, keyring, key, "sensitive-data-here");
  console.log(`Encrypted: ${encrypted.substring(0, 50)}...`);

  // Decrypt
  const decrypted = await decryptData(project, location, keyring, key, encrypted);
  console.log(`Decrypted: ${decrypted}`);
}

main().catch(console.error);
```

## Encrypting and Decrypting with Go

```go
// Go example: Encrypt and decrypt data with Cloud KMS
package main

import (
    "context"
    "encoding/base64"
    "fmt"
    "hash/crc32"

    kms "cloud.google.com/go/kms/apiv1"
    "cloud.google.com/go/kms/apiv1/kmspb"
    "google.golang.org/protobuf/types/known/wrapperspb"
)

func encryptData(projectID, location, keyring, keyName, plaintext string) (string, error) {
    ctx := context.Background()
    client, err := kms.NewKeyManagementClient(ctx)
    if err != nil {
        return "", fmt.Errorf("failed to create kms client: %w", err)
    }
    defer client.Close()

    // Build the key resource name
    keyPath := fmt.Sprintf(
        "projects/%s/locations/%s/keyRings/%s/cryptoKeys/%s",
        projectID, location, keyring, keyName,
    )

    // Calculate CRC32C checksum for data integrity
    plaintextBytes := []byte(plaintext)
    crc32c := func(data []byte) uint32 {
        t := crc32.MakeTable(crc32.Castagnoli)
        return crc32.Checksum(data, t)
    }

    // Call the encrypt API
    result, err := client.Encrypt(ctx, &kmspb.EncryptRequest{
        Name:            keyPath,
        Plaintext:       plaintextBytes,
        PlaintextCrc32C: wrapperspb.Int64(int64(crc32c(plaintextBytes))),
    })
    if err != nil {
        return "", fmt.Errorf("failed to encrypt: %w", err)
    }

    return base64.StdEncoding.EncodeToString(result.Ciphertext), nil
}

func decryptData(projectID, location, keyring, keyName, ciphertextB64 string) (string, error) {
    ctx := context.Background()
    client, err := kms.NewKeyManagementClient(ctx)
    if err != nil {
        return "", fmt.Errorf("failed to create kms client: %w", err)
    }
    defer client.Close()

    keyPath := fmt.Sprintf(
        "projects/%s/locations/%s/keyRings/%s/cryptoKeys/%s",
        projectID, location, keyring, keyName,
    )

    // Decode the base64 ciphertext
    ciphertext, err := base64.StdEncoding.DecodeString(ciphertextB64)
    if err != nil {
        return "", fmt.Errorf("failed to decode base64: %w", err)
    }

    // Call the decrypt API
    result, err := client.Decrypt(ctx, &kmspb.DecryptRequest{
        Name:       keyPath,
        Ciphertext: ciphertext,
    })
    if err != nil {
        return "", fmt.Errorf("failed to decrypt: %w", err)
    }

    return string(result.Plaintext), nil
}
```

## Using Additional Authenticated Data (AAD)

AAD provides context binding for your ciphertext. When you encrypt with AAD, the same AAD must be provided during decryption. This prevents ciphertext from being used in a different context:

```python
# Encrypt with additional authenticated data (AAD)
def encrypt_with_aad(project_id, location, keyring, key_name, plaintext, aad):
    """Encrypt with additional authenticated data for context binding."""
    client = kms.KeyManagementServiceClient()
    key_path = client.crypto_key_path(project_id, location, keyring, key_name)

    response = client.encrypt(
        request={
            "name": key_path,
            "plaintext": plaintext.encode("utf-8"),
            # AAD binds the ciphertext to a specific context
            "additional_authenticated_data": aad.encode("utf-8"),
        }
    )
    return base64.b64encode(response.ciphertext).decode("utf-8")

# Example: bind encrypted data to a specific user ID
encrypted = encrypt_with_aad(
    "my-project-id", "us-central1", "my-app-keyring", "app-data-key",
    "user-secret-data",
    "user-id:12345"  # This AAD must match during decryption
)
```

## Size Limits and Considerations

Cloud KMS has a 64 KiB plaintext size limit per encrypt call. For data larger than this, use envelope encryption (encrypt the data locally with a random key, then encrypt that random key with KMS).

Each encrypt and decrypt call is an API request. High-throughput applications should consider:

- **Batching**: Encrypt multiple small values together rather than one at a time
- **Caching**: Cache decrypted values in memory if the same data is read repeatedly
- **Envelope encryption**: For large data, encrypt locally and only use KMS for the key wrapping

## Cost Awareness

Every encrypt and decrypt operation has a cost. At high volumes, this adds up. For reference, symmetric encrypt/decrypt operations are billed per operation. If your application makes thousands of decrypt calls per second, consider caching decrypted values or switching to envelope encryption where you only call KMS once to unwrap the data encryption key.

## Monitoring Encryption Operations

Track KMS usage through Cloud Audit Logs:

```bash
# View recent encrypt/decrypt operations
gcloud logging read 'protoPayload.methodName=("Encrypt" OR "Decrypt") AND resource.type="cloudkms_cryptokey"' \
  --project=my-project-id \
  --limit=20 \
  --format="table(timestamp, protoPayload.methodName, protoPayload.authenticationInfo.principalEmail, protoPayload.resourceName)"
```

Set up alerts for unusual patterns, like a spike in decrypt operations or operations from unexpected principals.

The Cloud KMS encrypt and decrypt APIs give you a clean way to protect sensitive data without managing key material yourself. Keep the 64 KiB limit in mind, use AAD when context matters, and move to envelope encryption when you outgrow direct API calls. The API is simple enough that there is no reason to leave sensitive data unencrypted in your application layer.
