# How to use Vault Transit secrets engine for encryption as a service

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: HashiCorp Vault, Encryption, Transit Engine, Kubernetes, Data Security

Description: Learn how to use Vault's Transit secrets engine to provide encryption-as-a-service for Kubernetes applications, encrypting data without managing encryption keys.

---

Applications often need to encrypt sensitive data before storing it in databases or caches. Managing encryption keys securely is challenging. Vault's Transit secrets engine provides encryption-as-a-service, handling key management while applications simply send data to encrypt or decrypt. This guide shows you how to implement Transit encryption in Kubernetes.

## Understanding Transit Secrets Engine

The Transit engine acts as encryption-as-a-service. It performs cryptographic operations without exposing encryption keys. Applications send plaintext data to Vault for encryption and receive ciphertext, or send ciphertext for decryption and receive plaintext. Keys never leave Vault.

Transit supports multiple encryption algorithms, key rotation with automatic re-encryption, and convergent encryption for deterministic results. This eliminates the complexity of key management while providing strong encryption.

## Enabling Transit Engine

Configure the Transit secrets engine:

```bash
# Enable Transit engine
vault secrets enable transit

# Verify enabled
vault secrets list | grep transit

# Create encryption key
vault write -f transit/keys/app-data

# Create different keys for different purposes
vault write -f transit/keys/user-pii
vault write -f transit/keys/payment-data
vault write -f transit/keys/session-tokens

# View key information
vault read transit/keys/app-data
```

## Encrypting and Decrypting Data

Basic encryption operations:

```bash
# Encrypt plaintext
vault write transit/encrypt/app-data \
  plaintext=$(echo "sensitive data" | base64)

# Output:
# Key           Value
# ---           -----
# ciphertext    vault:v1:8SDd3WHDOjf7mq69CyCqYjBXAiQQAVZRkFM96XKhkpTj8I/4U=

# Decrypt ciphertext
vault write transit/decrypt/app-data \
  ciphertext="vault:v1:8SDd3WHDOjf7mq69CyCqYjBXAiQQAVZRkFM96XKhkpTj8I/4U="

# Output shows base64 encoded plaintext
# Decode to get original text
```

The "vault:v1:" prefix indicates the key version used for encryption.

## Creating Vault Policy for Transit Access

Define policies controlling encryption access:

```bash
vault policy write transit-encrypt - <<EOF
# Allow encrypting data
path "transit/encrypt/app-data" {
  capabilities = ["update"]
}

# Allow decrypting data
path "transit/decrypt/app-data" {
  capabilities = ["update"]
}

# Allow reading key metadata (not the key itself)
path "transit/keys/app-data" {
  capabilities = ["read"]
}
EOF

# Create policy for key rotation
vault policy write transit-admin - <<EOF
path "transit/keys/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

path "transit/keys/*/rotate" {
  capabilities = ["update"]
}

path "transit/keys/*/config" {
  capabilities = ["update"]
}
EOF

# Assign to Kubernetes auth role
vault write auth/kubernetes/role/app \
  bound_service_account_names=app-sa \
  bound_service_account_namespaces=default \
  policies=transit-encrypt \
  ttl=1h
```

## Implementing Transit in Go Applications

Encrypt and decrypt data in Go:

```go
package main

import (
    "context"
    "encoding/base64"
    "fmt"
    "io/ioutil"
    "log"

    vault "github.com/hashicorp/vault/api"
)

type TransitClient struct {
    client *vault.Client
    keyName string
}

func NewTransitClient(vaultAddr, keyName string) (*TransitClient, error) {
    config := vault.DefaultConfig()
    config.Address = vaultAddr

    client, err := vault.NewClient(config)
    if err != nil {
        return nil, err
    }

    // Authenticate with Kubernetes auth
    jwt, err := ioutil.ReadFile("/var/run/secrets/kubernetes.io/serviceaccount/token")
    if err != nil {
        return nil, err
    }

    params := map[string]interface{}{
        "jwt":  string(jwt),
        "role": "app",
    }

    secret, err := client.Logical().Write("auth/kubernetes/login", params)
    if err != nil {
        return nil, err
    }

    client.SetToken(secret.Auth.ClientToken)

    return &TransitClient{
        client:  client,
        keyName: keyName,
    }, nil
}

func (tc *TransitClient) Encrypt(plaintext string) (string, error) {
    // Base64 encode plaintext
    encoded := base64.StdEncoding.EncodeToString([]byte(plaintext))

    // Encrypt
    params := map[string]interface{}{
        "plaintext": encoded,
    }

    secret, err := tc.client.Logical().Write(
        fmt.Sprintf("transit/encrypt/%s", tc.keyName),
        params,
    )
    if err != nil {
        return "", err
    }

    ciphertext := secret.Data["ciphertext"].(string)
    return ciphertext, nil
}

func (tc *TransitClient) Decrypt(ciphertext string) (string, error) {
    params := map[string]interface{}{
        "ciphertext": ciphertext,
    }

    secret, err := tc.client.Logical().Write(
        fmt.Sprintf("transit/decrypt/%s", tc.keyName),
        params,
    )
    if err != nil {
        return "", err
    }

    // Decode base64 plaintext
    encoded := secret.Data["plaintext"].(string)
    decoded, err := base64.StdEncoding.DecodeString(encoded)
    if err != nil {
        return "", err
    }

    return string(decoded), nil
}

func (tc *TransitClient) EncryptBatch(plaintexts []string) ([]string, error) {
    batchInput := make([]map[string]interface{}, len(plaintexts))
    for i, pt := range plaintexts {
        batchInput[i] = map[string]interface{}{
            "plaintext": base64.StdEncoding.EncodeToString([]byte(pt)),
        }
    }

    params := map[string]interface{}{
        "batch_input": batchInput,
    }

    secret, err := tc.client.Logical().Write(
        fmt.Sprintf("transit/encrypt/%s", tc.keyName),
        params,
    )
    if err != nil {
        return nil, err
    }

    results := secret.Data["batch_results"].([]interface{})
    ciphertexts := make([]string, len(results))
    for i, r := range results {
        result := r.(map[string]interface{})
        ciphertexts[i] = result["ciphertext"].(string)
    }

    return ciphertexts, nil
}

func main() {
    tc, err := NewTransitClient(
        "http://vault.vault.svc.cluster.local:8200",
        "app-data",
    )
    if err != nil {
        log.Fatal(err)
    }

    // Encrypt data
    plaintext := "Credit card: 1234-5678-9012-3456"
    ciphertext, err := tc.Encrypt(plaintext)
    if err != nil {
        log.Fatal(err)
    }
    fmt.Printf("Encrypted: %s\n", ciphertext)

    // Decrypt data
    decrypted, err := tc.Decrypt(ciphertext)
    if err != nil {
        log.Fatal(err)
    }
    fmt.Printf("Decrypted: %s\n", decrypted)
}
```

## Python Implementation

Use Transit encryption in Python:

```python
import hvac
import base64

class TransitEncryption:
    def __init__(self, vault_addr, key_name):
        self.key_name = key_name
        self.client = hvac.Client(url=vault_addr)
        self._authenticate()

    def _authenticate(self):
        with open('/var/run/secrets/kubernetes.io/serviceaccount/token') as f:
            jwt = f.read()
        self.client.auth.kubernetes.login(role='app', jwt=jwt)

    def encrypt(self, plaintext):
        # Encode plaintext
        encoded = base64.b64encode(plaintext.encode()).decode()

        # Encrypt
        response = self.client.secrets.transit.encrypt_data(
            name=self.key_name,
            plaintext=encoded
        )

        return response['data']['ciphertext']

    def decrypt(self, ciphertext):
        # Decrypt
        response = self.client.secrets.transit.decrypt_data(
            name=self.key_name,
            ciphertext=ciphertext
        )

        # Decode plaintext
        encoded = response['data']['plaintext']
        plaintext = base64.b64decode(encoded).decode()

        return plaintext

    def encrypt_batch(self, plaintexts):
        batch_input = [
            {'plaintext': base64.b64encode(pt.encode()).decode()}
            for pt in plaintexts
        ]

        response = self.client.secrets.transit.encrypt_data(
            name=self.key_name,
            batch_input=batch_input
        )

        return [r['ciphertext'] for r in response['data']['batch_results']]

# Usage
transit = TransitEncryption(
    vault_addr='http://vault.vault.svc.cluster.local:8200',
    key_name='app-data'
)

# Encrypt sensitive data
ssn = "123-45-6789"
encrypted_ssn = transit.encrypt(ssn)
print(f"Encrypted SSN: {encrypted_ssn}")

# Store encrypted_ssn in database

# Later, decrypt when needed
decrypted_ssn = transit.decrypt(encrypted_ssn)
print(f"Decrypted SSN: {decrypted_ssn}")
```

## Using Convergent Encryption

Enable deterministic encryption for searchable ciphertext:

```bash
# Create key with convergent encryption
vault write transit/keys/searchable-data \
  convergent_encryption=true \
  derived=true

# Encrypt with context for deterministic results
vault write transit/encrypt/searchable-data \
  plaintext=$(echo "user@example.com" | base64) \
  context=$(echo "email" | base64)

# Same input + context always produces same ciphertext
# This allows database queries on encrypted data
```

Implement in code:

```go
func (tc *TransitClient) EncryptConvergent(plaintext, context string) (string, error) {
    params := map[string]interface{}{
        "plaintext": base64.StdEncoding.EncodeToString([]byte(plaintext)),
        "context":   base64.StdEncoding.EncodeToString([]byte(context)),
    }

    secret, err := tc.client.Logical().Write(
        fmt.Sprintf("transit/encrypt/%s", tc.keyName),
        params,
    )
    if err != nil {
        return "", err
    }

    return secret.Data["ciphertext"].(string), nil
}
```

## Implementing Key Rotation

Rotate encryption keys regularly:

```bash
# Rotate key to new version
vault write -f transit/keys/app-data/rotate

# Check key versions
vault read transit/keys/app-data

# Output shows multiple versions:
# Keys:
#   1    2024-01-15T10:00:00Z
#   2    2024-02-15T10:00:00Z (current)

# Configure automatic rotation
vault write transit/keys/app-data/config \
  auto_rotate_period="720h"

# Set minimum encryption version
vault write transit/keys/app-data/config \
  min_encryption_version=2
```

Existing ciphertext with old key versions still decrypts. New encryptions use the latest version.

## Rewrapping Data After Key Rotation

Update encrypted data to use new key version:

```bash
# Rewrap ciphertext to latest key version
vault write transit/rewrap/app-data \
  ciphertext="vault:v1:oldciphertext..."

# Output:
# ciphertext    vault:v2:newciphertext...
```

Automate rewrapping:

```go
func (tc *TransitClient) RewrapIfNeeded(ciphertext string) (string, bool, error) {
    // Parse version from ciphertext
    // Format: vault:v1:...
    version := extractVersion(ciphertext)

    // Get current key version
    keyInfo, err := tc.client.Logical().Read(
        fmt.Sprintf("transit/keys/%s", tc.keyName),
    )
    if err != nil {
        return "", false, err
    }

    latestVersion := keyInfo.Data["latest_version"].(json.Number)
    latest, _ := latestVersion.Int64()

    // If not latest, rewrap
    if int64(version) < latest {
        params := map[string]interface{}{
            "ciphertext": ciphertext,
        }

        secret, err := tc.client.Logical().Write(
            fmt.Sprintf("transit/rewrap/%s", tc.keyName),
            params,
        )
        if err != nil {
            return "", false, err
        }

        return secret.Data["ciphertext"].(string), true, nil
    }

    return ciphertext, false, nil
}
```

## Signing and Verification

Use Transit for digital signatures:

```bash
# Create signing key
vault write transit/keys/signing-key \
  type=ed25519

# Sign data
vault write transit/sign/signing-key \
  input=$(echo "document to sign" | base64)

# Output:
# signature    vault:v1:MEUCIQDfOJ...

# Verify signature
vault write transit/verify/signing-key \
  input=$(echo "document to sign" | base64) \
  signature="vault:v1:MEUCIQDfOJ..."

# Output:
# valid    true
```

## Generating HMACs

Create HMACs for data integrity:

```bash
# Create HMAC key
vault write transit/keys/hmac-key \
  type=aes256-gcm96

# Generate HMAC
vault write transit/hmac/hmac-key \
  input=$(echo "data to authenticate" | base64)

# Output:
# hmac    vault:v1:8PtZC...

# Verify HMAC
vault write transit/verify/hmac-key \
  input=$(echo "data to authenticate" | base64) \
  hmac="vault:v1:8PtZC..."
```

## Performance Optimization

Improve performance with batching and caching:

```go
type CachedTransitClient struct {
    TransitClient
    cache map[string]string
    mutex sync.RWMutex
}

func (ctc *CachedTransitClient) EncryptCached(plaintext string) (string, error) {
    ctc.mutex.RLock()
    if cached, ok := ctc.cache[plaintext]; ok {
        ctc.mutex.RUnlock()
        return cached, nil
    }
    ctc.mutex.RUnlock()

    ciphertext, err := ctc.Encrypt(plaintext)
    if err != nil {
        return "", err
    }

    ctc.mutex.Lock()
    ctc.cache[plaintext] = ciphertext
    ctc.mutex.Unlock()

    return ciphertext, nil
}

// Process records in batches
func processRecords(tc *TransitClient, records []Record) error {
    batchSize := 100
    for i := 0; i < len(records); i += batchSize {
        end := i + batchSize
        if end > len(records) {
            end = len(records)
        }

        batch := records[i:end]
        plaintexts := make([]string, len(batch))
        for j, r := range batch {
            plaintexts[j] = r.SensitiveData
        }

        ciphertexts, err := tc.EncryptBatch(plaintexts)
        if err != nil {
            return err
        }

        for j, ct := range ciphertexts {
            batch[j].EncryptedData = ct
        }
    }

    return nil
}
```

Vault Transit engine provides encryption-as-a-service that eliminates key management complexity while maintaining strong security. Applications encrypt sensitive data before storage and decrypt only when needed, with all cryptographic operations and key management handled by Vault. This approach ensures compliance with data protection requirements while keeping encryption keys secure and auditable.
