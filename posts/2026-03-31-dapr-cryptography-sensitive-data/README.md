# How to Use Dapr Cryptography for Sensitive Data Protection

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Cryptography, Security, PII, Data Protection, GDPR, Compliance

Description: Learn how to protect sensitive data like PII, credentials, and health records using Dapr Cryptography with practical patterns for GDPR and HIPAA compliance.

---

## Sensitive Data Protection with Dapr

Sensitive data includes PII (names, SSNs, addresses), health records, financial data, and credentials. Protecting this data requires more than database-level encryption - you need application-level encryption with proper key management so that even infrastructure operators cannot read unencrypted values.

Dapr Cryptography provides a portable API for encrypting and decrypting sensitive data, with keys stored in external providers like Azure Key Vault or Kubernetes Secrets.

## Classifying Data Sensitivity

Before implementing encryption, classify which fields need protection:

| Classification | Examples | Action |
|----------------|----------|--------|
| Public | Product names, descriptions | No encryption needed |
| Internal | User email, username | Standard access controls |
| Confidential | Phone, address, DOB | Encrypt with Dapr Crypto |
| Restricted | SSN, health records, payment | Encrypt with dedicated keys |

## Setup

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: sensitive-crypto
spec:
  type: crypto.azure.keyvault
  version: v1
  metadata:
  - name: vaultName
    value: "compliance-vault"
  - name: azureClientId
    value: "<managed-identity-id>"
```

Use separate keys for different sensitivity levels:

```python
KEY_MAP = {
    "confidential": "confidential-data-key",
    "restricted": "restricted-data-key",
    "health": "hipaa-health-data-key",
    "payment": "pci-payment-key"
}
```

## Protecting PII for GDPR Compliance

GDPR requires the ability to delete all personal data for a user (right to erasure). Dapr Cryptography supports this through key deletion - if you use per-user encryption keys, deleting the key renders all their data permanently unreadable.

```python
from dapr.clients import DaprClient
from dapr.clients.grpc._crypto import EncryptOptions

def encrypt_pii(user_id: str, field: str, value: str) -> bytes:
    """Encrypt PII using a per-user key for GDPR erasure support."""
    key_name = f"user-key-{user_id}"  # Per-user key in Key Vault

    with DaprClient() as d:
        encrypted = d.encrypt(
            data=value.encode('utf-8'),
            options=EncryptOptions(
                component_name="sensitive-crypto",
                key_name=key_name,
                key_wrap_algorithm="RSA-OAEP-256",
            ),
        )
        return encrypted.read()

def gdpr_erase_user(user_id: str):
    """GDPR right to erasure: delete the user's key to render all PII unreadable."""
    import subprocess
    subprocess.run([
        "az", "keyvault", "key", "delete",
        "--vault-name", "compliance-vault",
        "--name", f"user-key-{user_id}"
    ], check=True)
    # The user's encrypted PII in the database is now permanently inaccessible
```

## Protecting Health Records (HIPAA)

```python
@dataclass
class HealthRecord:
    patient_id: str
    diagnosis: str
    medications: list
    notes: str

def save_health_record(record: HealthRecord):
    import json

    with DaprClient() as d:
        # Encrypt the entire health record as a JSON blob
        record_json = json.dumps({
            "diagnosis": record.diagnosis,
            "medications": record.medications,
            "notes": record.notes
        })

        encrypted = d.encrypt(
            data=record_json.encode('utf-8'),
            options=EncryptOptions(
                component_name="sensitive-crypto",
                key_name=KEY_MAP["health"],
                key_wrap_algorithm="RSA-OAEP-256",
            ),
        )
        encrypted_bytes = encrypted.read()

    db.execute(
        "INSERT INTO health_records (patient_id, encrypted_data) VALUES (%s, %s)",
        [record.patient_id, encrypted_bytes]
    )
```

## Masking Sensitive Data in Logs

```python
import re
import logging

class SensitiveDataFilter(logging.Filter):
    """Strip PII patterns from log messages."""

    PATTERNS = [
        (re.compile(r'\b\d{3}-\d{2}-\d{4}\b'), '[SSN REDACTED]'),
        (re.compile(r'\b4[0-9]{12}(?:[0-9]{3})?\b'), '[CARD REDACTED]'),
        (re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'), '[EMAIL REDACTED]')
    ]

    def filter(self, record):
        message = str(record.getMessage())
        for pattern, replacement in self.PATTERNS:
            message = pattern.sub(replacement, message)
        record.msg = message
        record.args = None
        return True

# Add filter to all handlers
for handler in logging.root.handlers:
    handler.addFilter(SensitiveDataFilter())
```

## Tokenization Pattern

Replace sensitive values with tokens that can be looked up:

```python
import secrets

def tokenize(sensitive_value: str) -> str:
    """Replace a sensitive value with a non-sensitive token."""
    token = secrets.token_urlsafe(16)
    encrypted = encrypt_sensitive(sensitive_value)

    db.execute(
        "INSERT INTO token_vault (token, encrypted_value) VALUES (%s, %s)",
        [token, encrypted]
    )
    return token

def detokenize(token: str) -> str:
    row = db.query("SELECT encrypted_value FROM token_vault WHERE token = %s", token)
    return decrypt_sensitive(row["encrypted_value"])
```

## Audit Logging for Sensitive Data Access

```python
def decrypt_sensitive_with_audit(field: str, record_id: str, accessor_id: str) -> str:
    value = decrypt_field(field)

    # Log every access to sensitive data
    audit_log.info({
        "event": "sensitive_data_access",
        "recordId": record_id,
        "accessor": accessor_id,
        "fieldType": "restricted",
        "timestamp": datetime.utcnow().isoformat()
    })

    return value
```

## Summary

Dapr Cryptography provides a solid foundation for sensitive data protection by enabling application-level encryption with externally managed keys. Per-user keys support GDPR right-to-erasure, dedicated keys per data classification support least-privilege access, and audit logging on decryption operations satisfies compliance requirements for HIPAA, PCI-DSS, and GDPR.
