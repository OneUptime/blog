# How to Implement Key Rotation with Dapr Cryptography

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Cryptography, Key Rotation, Security, Compliance, Key Management

Description: Learn how to implement cryptographic key rotation with Dapr Cryptography, enabling zero-downtime key updates while maintaining the ability to decrypt existing data.

---

## Why Key Rotation Matters

Key rotation limits the exposure window if a key is compromised and is required or recommended by compliance frameworks like PCI-DSS, HIPAA, and SOC 2. Rotating keys with Dapr Cryptography is straightforward because Dapr's ciphertext format can include the key name, allowing old and new keys to coexist during the rotation period.

## How Dapr Handles Key Rotation

When you encrypt data with Dapr, the ciphertext includes:
- The key name used for encryption (optionally embedded in the header)
- The wrapped file key (encrypted symmetric key)
- The encrypted data (AES-256-GCM by default, or ChaCha20-Poly1305)

When decrypting, Dapr reads the key name from the ciphertext header (if present) and fetches the corresponding key from the provider. You can also explicitly pass the key name in the decrypt call. This means data encrypted with old keys can still be decrypted after you add new keys, enabling gradual re-encryption.

## Key Rotation Strategy

Phase 1: Add new key (both old and new keys active)
Phase 2: Update application to encrypt new data with new key
Phase 3: Re-encrypt all data encrypted with old key
Phase 4: Remove old key

## Phase 1: Adding the New Key in Azure Key Vault

```bash
# Create a new key version (Azure Key Vault handles versioning automatically)
az keyvault key create \
  --vault-name my-app-keyvault \
  --name my-encryption-key \
  --kty RSA \
  --size 4096

# The new version is active; old versions remain available for decryption
az keyvault key list-versions \
  --vault-name my-app-keyvault \
  --name my-encryption-key
```

## Phase 1: Adding New Key in Local Storage

```bash
# Add new key alongside old key
cp keys/data-key.json keys/data-key-v2.json
# Edit data-key-v2.json to have kid: "data-key-v2" and regenerated key material
```

## Phase 2: Update Application to Use New Key

```python
import os
from dapr.clients import DaprClient
from dapr.clients.grpc._crypto import EncryptOptions, DecryptOptions

# Environment variable controls which key to use for new encryptions
CURRENT_KEY_NAME = os.environ.get("CRYPTO_KEY_NAME", "data-key-v2")

def encrypt_data(plaintext: bytes) -> bytes:
    with DaprClient() as d:
        encrypted = d.encrypt(
            data=plaintext,
            options=EncryptOptions(
                component_name="my-crypto",
                key_name=CURRENT_KEY_NAME,  # New key for new data
                key_wrap_algorithm="RSA-OAEP-256",
            ),
        )
        return encrypted.read()

def decrypt_data(ciphertext: bytes, key_name: str) -> bytes:
    # key_name is stored alongside the ciphertext in the database
    with DaprClient() as d:
        decrypted = d.decrypt(
            data=ciphertext,
            options=DecryptOptions(
                component_name="my-crypto",
                key_name=key_name,  # Use the key that was used to encrypt
            ),
        )
        return decrypted.read()
```

## Storing Key Metadata with Ciphertext

Track which key was used to encrypt each record:

```sql
ALTER TABLE sensitive_data ADD COLUMN key_version VARCHAR(50);

-- When inserting
INSERT INTO sensitive_data (id, encrypted_value, key_version)
VALUES (1, $1, 'data-key-v2');

-- When reading
SELECT encrypted_value, key_version FROM sensitive_data WHERE id = 1;
```

## Phase 3: Re-encryption Script

```python
from dapr.clients import DaprClient
from dapr.clients.grpc._crypto import EncryptOptions, DecryptOptions

NEW_KEY = "data-key-v2"
OLD_KEY = "data-key-v1"

def rotate_records_batch(batch_size: int = 100):
    offset = 0
    total_rotated = 0

    while True:
        # Fetch records still using old key
        records = db.query(
            "SELECT id, encrypted_value FROM sensitive_data WHERE key_version = %s LIMIT %s OFFSET %s",
            [OLD_KEY, batch_size, offset]
        )

        if not records:
            break

        with DaprClient() as d:
            for record in records:
                # Decrypt with old key
                plaintext = d.decrypt(
                    data=record["encrypted_value"],
                    options=DecryptOptions(
                        component_name="my-crypto",
                        key_name=OLD_KEY,
                    ),
                ).read()

                # Re-encrypt with new key
                new_ciphertext = d.encrypt(
                    data=plaintext,
                    options=EncryptOptions(
                        component_name="my-crypto",
                        key_name=NEW_KEY,
                        key_wrap_algorithm="RSA-OAEP-256",
                    ),
                ).read()

                # Update database
                db.execute(
                    "UPDATE sensitive_data SET encrypted_value = %s, key_version = %s WHERE id = %s",
                    [new_ciphertext, NEW_KEY, record["id"]]
                )
                total_rotated += 1

        print(f"Rotated {total_rotated} records so far")
        offset += batch_size

    print(f"Key rotation complete. Total records: {total_rotated}")

rotate_records_batch()
```

## Phase 4: Disable Old Key

```bash
# After all data is re-encrypted, disable the old key version
az keyvault key set-attributes \
  --vault-name my-app-keyvault \
  --name my-encryption-key \
  --version <old-version-id> \
  --enabled false
```

## Automated Rotation with Dapr Jobs

```python
# Schedule monthly key rotation check using the Dapr Jobs API (alpha)
# The Dapr Scheduler service triggers this handler on the configured schedule
@app.route("/job/key-rotation-check", methods=["POST"])
def monthly_key_rotation():
    records_needing_rotation = db.count(
        "SELECT COUNT(*) FROM sensitive_data WHERE key_version != %s",
        [CURRENT_KEY_NAME]
    )
    if records_needing_rotation > 0:
        rotate_records_batch()
    return "", 200
```

## Summary

Key rotation with Dapr Cryptography is a four-phase process: add the new key, update the application to use it for new encryptions, re-encrypt existing data in background batches, then disable the old key. Storing the key version alongside each ciphertext is essential for zero-downtime rotation without losing the ability to decrypt existing data.
