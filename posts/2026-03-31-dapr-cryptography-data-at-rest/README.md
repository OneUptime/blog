# How to Use Dapr Cryptography for Data at Rest Encryption

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Cryptography, Encryption at Rest, Security, Database, Compliance, PII

Description: Learn how to implement application-level data at rest encryption using the Dapr Cryptography API, protecting sensitive fields before they reach the database.

---

## What Is Data at Rest Encryption?

Data at rest encryption ensures that stored data is unreadable if the storage layer is compromised. While databases offer transparent encryption (TDE), application-level encryption with Dapr Cryptography provides an additional layer: data is encrypted before it leaves your application, meaning even the database administrator cannot read it.

## Architecture

```text
Application --[encrypt]--> Dapr Sidecar --[fetch key]--> Key Vault
Application --> Encrypted bytes --> Database
```

The database stores only ciphertext. Dapr fetches the decryption key at runtime when your application needs to read the data.

## Component Setup

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: data-crypto
spec:
  type: crypto.azure.keyvault
  version: v1
  metadata:
  - name: vaultName
    value: "my-vault"
  - name: azureClientId
    value: "<managed-identity-client-id>"
```

## Encryption Helper

```python
import base64
from dapr.clients import DaprClient
from dapr.clients.grpc._crypto import EncryptOptions, DecryptOptions

CRYPTO_COMPONENT = "data-crypto"
DATA_KEY = "app-data-encryption-key"

def encrypt_field(value: str) -> str:
    """Encrypt a string field and return base64-encoded ciphertext."""
    if value is None:
        return None

    with DaprClient() as d:
        encrypted = d.encrypt(
            data=value.encode("utf-8"),
            options=EncryptOptions(
                component_name=CRYPTO_COMPONENT,
                key_name=DATA_KEY,
                key_wrap_algorithm="RSA-OAEP-256",
            ),
        )
        return base64.b64encode(encrypted.read()).decode("ascii")

def decrypt_field(ciphertext_b64: str) -> str:
    """Decrypt a base64-encoded ciphertext field."""
    if ciphertext_b64 is None:
        return None

    ciphertext = base64.b64decode(ciphertext_b64)
    with DaprClient() as d:
        decrypted = d.decrypt(
            data=ciphertext,
            options=DecryptOptions(
                component_name=CRYPTO_COMPONENT,
                key_name=DATA_KEY,
            ),
        )
        return decrypted.read().decode("utf-8")
```

## Database Model with Encrypted Fields

```python
from dataclasses import dataclass

@dataclass
class Customer:
    id: str
    email: str          # Not encrypted - used for lookups
    name: str           # Will be encrypted
    ssn: str            # Will be encrypted
    phone: str          # Will be encrypted
    address: str        # Will be encrypted

def save_customer(customer: Customer):
    db.execute(
        """INSERT INTO customers (id, email, name_enc, ssn_enc, phone_enc, address_enc)
           VALUES (%s, %s, %s, %s, %s, %s)""",
        [
            customer.id,
            customer.email,  # plaintext for search
            encrypt_field(customer.name),
            encrypt_field(customer.ssn),
            encrypt_field(customer.phone),
            encrypt_field(customer.address)
        ]
    )

def get_customer(customer_id: str) -> Customer:
    row = db.query("SELECT * FROM customers WHERE id = %s", customer_id)
    return Customer(
        id=row["id"],
        email=row["email"],
        name=decrypt_field(row["name_enc"]),
        ssn=decrypt_field(row["ssn_enc"]),
        phone=decrypt_field(row["phone_enc"]),
        address=decrypt_field(row["address_enc"])
    )
```

## Database Schema

```sql
CREATE TABLE customers (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email       VARCHAR(255) NOT NULL UNIQUE,  -- plaintext for auth/lookup
    name_enc    TEXT,                          -- encrypted
    ssn_enc     TEXT,                          -- encrypted
    phone_enc   TEXT,                          -- encrypted
    address_enc TEXT,                          -- encrypted
    created_at  TIMESTAMP DEFAULT NOW()
);

-- Index on non-encrypted email for login queries
CREATE INDEX idx_customers_email ON customers(email);
```

## Encrypted File Storage Pattern

```python
def save_document(file_bytes: bytes, user_id: str, filename: str) -> str:
    with DaprClient() as d:
        encrypted = d.encrypt(
            data=file_bytes,
            options=EncryptOptions(
                component_name=CRYPTO_COMPONENT,
                key_name=DATA_KEY,
                key_wrap_algorithm="RSA-OAEP-256",
            ),
        )
        encrypted_bytes = encrypted.read()

    # Store encrypted file
    doc_id = str(uuid.uuid4())
    s3.put_object(
        Bucket="secure-documents",
        Key=f"{user_id}/{doc_id}",
        Body=encrypted_bytes,
        Metadata={"original-filename": filename}
    )
    return doc_id
```

## Performance Considerations

Dapr Cryptography adds latency for each field operation. Batch related operations:

```python
def save_customer_bulk(customers: list):
    with DaprClient() as d:
        rows = []
        for customer in customers:
            encrypt_opts = EncryptOptions(
                component_name=CRYPTO_COMPONENT,
                key_name=DATA_KEY,
                key_wrap_algorithm="RSA-OAEP-256",
            )
            rows.append((
                customer.id,
                customer.email,
                # Encrypt each field - consider caching the client connection
                d.encrypt(data=customer.name.encode(),
                    options=encrypt_opts).read(),
                d.encrypt(data=customer.ssn.encode(),
                    options=encrypt_opts).read()
            ))
        db.executemany("INSERT INTO customers VALUES (%s,%s,%s,%s)", rows)
```

## Summary

Dapr Cryptography enables application-level encryption at rest, protecting sensitive fields before they reach the database. By encrypting PII and sensitive data in the application layer with centrally managed keys, you add a critical security layer that protects against database breaches, backup exposure, and insider threats - all with consistent key management across environments.
