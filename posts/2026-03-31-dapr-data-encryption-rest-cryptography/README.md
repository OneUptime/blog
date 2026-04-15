# How to Implement Data Encryption at Rest with Dapr Cryptography

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Cryptography, Encryption, Security, Data Protection

Description: Use the Dapr Cryptography API to encrypt sensitive data before storing it in state stores, protecting data at rest across all backends.

---

Dapr's Cryptography building block provides encrypt and decrypt operations using industry-standard algorithms (AES-GCM, RSA-OAEP, ChaCha20-Poly1305). By encrypting data before saving it to a state store, you protect sensitive information at rest regardless of which backend is used. This is essential for PII, financial data, and secrets stored in state.

## Dapr Cryptography Architecture

The Dapr Cryptography API uses key stores to manage encryption keys. Supported key stores include:

- Kubernetes Secrets
- Azure Key Vault
- JSON Web Key Sets (JWKS)
- Local file (development only)

Configure a key store component:

```yaml
# components/crypto-keystore.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: local-crypto-store
  namespace: default
spec:
  type: crypto.dapr.localstorage
  version: v1
  metadata:
    - name: path
      value: /keys
```

For production, use Azure Key Vault:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: azure-crypto-store
  namespace: default
spec:
  type: crypto.azure.keyvault
  version: v1
  metadata:
    - name: vaultName
      value: my-key-vault
    - name: azureTenantId
      secretKeyRef:
        name: azure-credentials
        key: tenantId
    - name: azureClientId
      secretKeyRef:
        name: azure-credentials
        key: clientId
    - name: azureClientSecret
      secretKeyRef:
        name: azure-credentials
        key: clientSecret
```

## Encrypting Data Before Storing

Encrypt sensitive fields before saving to the state store:

```python
# crypto_state.py
from dapr.clients import DaprClient
from dapr.clients.grpc._crypto import EncryptOptions, DecryptOptions
import json
import base64

CRYPTO_COMPONENT = "local-crypto-store"
KEY_NAME = "data-encryption-key"
STATE_STORE = "statestore"

def save_encrypted_state(key: str, sensitive_data: dict):
    with DaprClient() as client:
        # Serialize and encrypt
        plaintext = json.dumps(sensitive_data).encode('utf-8')

        encrypt_response = client.encrypt(
            data=plaintext,
            options=EncryptOptions(
                component_name=CRYPTO_COMPONENT,
                key_name=KEY_NAME,
                key_wrap_algorithm="AES",
            ),
        )

        # Store the ciphertext (base64 encoded) in state
        ciphertext_b64 = base64.b64encode(encrypt_response.read()).decode()
        client.save_state(
            store_name=STATE_STORE,
            key=key,
            value=json.dumps({
                "encrypted": True,
                "ciphertext": ciphertext_b64,
            })
        )

def get_decrypted_state(key: str) -> dict:
    with DaprClient() as client:
        state = client.get_state(STATE_STORE, key)
        if not state.data:
            return None

        stored = json.loads(state.data)
        if not stored.get("encrypted"):
            return stored

        # Decrypt
        ciphertext = base64.b64decode(stored["ciphertext"])
        decrypt_response = client.decrypt(
            data=ciphertext,
            options=DecryptOptions(
                component_name=CRYPTO_COMPONENT,
                key_name=KEY_NAME,
            ),
        )

        return json.loads(decrypt_response.read().decode('utf-8'))
```

## Encrypting Specific Fields (Field-Level Encryption)

Encrypt only sensitive fields, leaving others searchable:

```python
# field_level_encryption.py
SENSITIVE_FIELDS = {'ssn', 'credit_card', 'bank_account', 'password_hash'}

def save_customer(customer_id: str, customer: dict):
    encrypted_customer = dict(customer)

    with DaprClient() as client:
        for field in SENSITIVE_FIELDS:
            if field in customer:
                value_bytes = str(customer[field]).encode('utf-8')
                encrypted = client.encrypt(
                    data=value_bytes,
                    options=EncryptOptions(
                        component_name=CRYPTO_COMPONENT,
                        key_name=KEY_NAME,
                        key_wrap_algorithm="AES",
                    ),
                )
                encrypted_customer[field] = base64.b64encode(
                    encrypted.read()).decode()
                encrypted_customer[f"_enc_{field}"] = True

        client.save_state(STATE_STORE, f"customer:{customer_id}",
                          json.dumps(encrypted_customer))
```

## Encrypting Pub/Sub Event Payloads

Protect sensitive event data:

```python
def publish_sensitive_event(topic: str, sensitive_data: dict):
    with DaprClient() as client:
        plaintext = json.dumps(sensitive_data).encode()
        encrypted = client.encrypt(
            data=plaintext,
            options=EncryptOptions(
                component_name=CRYPTO_COMPONENT,
                key_name=KEY_NAME,
                key_wrap_algorithm="AES",
            ),
        )

        envelope = {
            "encrypted": True,
            "payload": base64.b64encode(encrypted.read()).decode()
        }
        client.publish_event("pubsub", topic, json.dumps(envelope))
```

## Key Rotation

Rotate encryption keys without re-encrypting all data:

```bash
# Generate new key version in Azure Key Vault
az keyvault key create \
  --vault-name my-key-vault \
  --name data-encryption-key \
  --kty RSA \
  --size 2048

# Dapr automatically uses the latest key version for new encryptions
# Old data remains decryptable using the previous key version
```

## Summary

Dapr's Cryptography API provides application-level encryption at rest that works regardless of the underlying state store's native encryption capabilities. Field-level encryption enables selective protection of PII and financial data while keeping non-sensitive fields searchable, and key rotation preserves decryptability of existing data.
