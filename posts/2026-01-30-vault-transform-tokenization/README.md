# How to Create Vault Transform Tokenization

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Vault, Security, Tokenization, DataProtection

Description: Use HashiCorp Vault Transform secrets engine to tokenize sensitive data and protect PII without sacrificing usability.

---

Tokenization replaces sensitive data with non-sensitive placeholders called tokens. Unlike encryption, tokens have no mathematical relationship to the original data. This makes tokenization ideal for protecting PII, credit card numbers, and other regulated data while preserving data format and usability.

HashiCorp Vault provides the Transform secrets engine specifically for tokenization. It handles token generation, secure storage of original values, and controlled detokenization.

## Tokenization vs Encryption

Before diving in, understand when to use each approach:

| Aspect | Tokenization | Encryption |
|--------|-------------|------------|
| Reversibility | Requires access to token store | Requires encryption key |
| Data format | Preserves format (SSN stays 9 digits) | Changes format entirely |
| Performance | Fast lookup | CPU-intensive |
| Compliance | Preferred for PCI-DSS | General purpose |
| Key management | No keys to manage | Must protect and rotate keys |

Use tokenization when you need format preservation or when downstream systems cannot handle encrypted blobs.

## How Tokenization Works

The following diagram shows the tokenization flow in Vault:

```mermaid
sequenceDiagram
    participant App as Application
    participant Vault as Vault Transform Engine
    participant Store as Token Store (PostgreSQL/MySQL)

    Note over App,Store: Tokenization Flow
    App->>Vault: POST /transform/encode/payments<br/>{"value": "4111-1111-1111-1111"}
    Vault->>Store: Store mapping: token -> original
    Store-->>Vault: Mapping stored
    Vault-->>App: {"encoded_value": "tok_a8f3b2c1d4e5"}

    Note over App,Store: Detokenization Flow
    App->>Vault: POST /transform/decode/payments<br/>{"value": "tok_a8f3b2c1d4e5"}
    Vault->>Store: Lookup original value
    Store-->>Vault: Return original
    Vault-->>App: {"decoded_value": "4111-1111-1111-1111"}
```

## Enable the Transform Secrets Engine

First, enable the Transform secrets engine and configure it for tokenization:

```bash
# Enable the transform secrets engine at the default path
# This creates the endpoint at /transform for all tokenization operations
vault secrets enable transform
```

## Configure a Token Store

Vault needs a persistent store for token mappings. This is typically an external database like PostgreSQL or MySQL. The store holds the relationship between tokens and original values.

```bash
# Create a PostgreSQL store for token mappings
# The connection_string should point to a dedicated database for token storage
vault write transform/stores/payments-store \
    type=sql \
    driver=postgresql \
    connection_string="postgresql://vault:secretpassword@db.internal:5432/tokenstore?sslmode=require" \
    supported_transformations=tokenization
```

For production, use a dedicated database with:
- TLS encryption in transit
- Encryption at rest
- Regular backups
- Restricted network access

## Define a Tokenization Transformation

Create a transformation that specifies how tokens are generated and stored:

```bash
# Create a tokenization transformation for credit card data
# max_ttl=0 means tokens never expire (adjust based on your retention policy)
vault write transform/transformations/tokenization/credit-card \
    allowed_roles=payments \
    stores=payments-store \
    max_ttl=0 \
    mapping_mode=exportable
```

The `mapping_mode` option controls whether token mappings can be exported:
- `default`: Mappings cannot be exported
- `exportable`: Mappings can be exported for backup or migration

## Create a Role

Roles define which transformations an application can use:

```bash
# Create a role that can use the credit-card transformation
# Applications authenticate and receive tokens with this role
vault write transform/role/payments \
    transformations=credit-card
```

## Tokenize Sensitive Data

With the configuration complete, applications can tokenize data:

```bash
# Tokenize a credit card number
# The transformation preserves the format if configured
vault write transform/encode/payments \
    value="4111-1111-1111-1111" \
    transformation=credit-card
```

Example response:

```json
{
  "request_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "data": {
    "encoded_value": "tok_9f8e7d6c5b4a3210"
  }
}
```

## Batch Tokenization

For high-volume scenarios, batch multiple values in a single request:

```bash
# Tokenize multiple values in one API call
# This reduces network round trips and improves throughput
vault write transform/encode/payments \
    transformation=credit-card \
    batch_input='[
        {"value": "4111-1111-1111-1111"},
        {"value": "5500-0000-0000-0004"},
        {"value": "3400-0000-0000-009"}
    ]'
```

## Detokenize Data

When you need the original value, detokenize with proper authorization:

```bash
# Retrieve the original value from a token
# Only applications with the payments role can perform this operation
vault write transform/decode/payments \
    value="tok_9f8e7d6c5b4a3210" \
    transformation=credit-card
```

Example response:

```json
{
  "request_id": "b2c3d4e5-f6a7-8901-bcde-f23456789012",
  "data": {
    "decoded_value": "4111-1111-1111-1111"
  }
}
```

## Token Rotation

Rotate tokens periodically to limit exposure from potential breaches:

```bash
# Rotate a token to generate a new token for the same underlying value
# The old token becomes invalid after rotation
vault write transform/rotate/payments \
    value="tok_9f8e7d6c5b4a3210" \
    transformation=credit-card
```

The response contains a new token that maps to the same original value. Update your systems to use the new token and invalidate the old one.

## Validate Tokens

Check if a token is valid without revealing the original value:

```bash
# Validate that a token exists and is active
# Returns metadata without exposing the sensitive data
vault write transform/validate/payments \
    value="tok_9f8e7d6c5b4a3210" \
    transformation=credit-card
```

## Check Token Metadata

Retrieve metadata about a token:

```bash
# Get token metadata including creation time and expiration
vault write transform/metadata/payments \
    value="tok_9f8e7d6c5b4a3210" \
    transformation=credit-card
```

## Delete Tokens

Remove tokens when data retention periods expire:

```bash
# Permanently delete a token and its mapping
# This operation is irreversible
vault write transform/delete/payments \
    value="tok_9f8e7d6c5b4a3210" \
    transformation=credit-card
```

## Application Integration Example

Here is a complete Python example showing how to integrate Vault tokenization:

```python
import hvac
import os

# Initialize the Vault client
# Use environment variables for configuration in production
client = hvac.Client(
    url=os.environ.get('VAULT_ADDR', 'https://vault.internal:8200'),
    token=os.environ.get('VAULT_TOKEN')
)

def tokenize_credit_card(card_number: str) -> str:
    """
    Tokenize a credit card number using Vault Transform.

    Args:
        card_number: The plaintext credit card number

    Returns:
        A token that can be safely stored in databases
    """
    response = client.secrets.transform.encode(
        role_name='payments',
        value=card_number,
        transformation='credit-card'
    )
    return response['data']['encoded_value']

def detokenize_credit_card(token: str) -> str:
    """
    Retrieve the original credit card number from a token.

    Args:
        token: The token returned from tokenization

    Returns:
        The original credit card number
    """
    response = client.secrets.transform.decode(
        role_name='payments',
        value=token,
        transformation='credit-card'
    )
    return response['data']['decoded_value']

def batch_tokenize(card_numbers: list) -> list:
    """
    Tokenize multiple credit card numbers in a single request.

    Args:
        card_numbers: List of plaintext credit card numbers

    Returns:
        List of tokens in the same order as input
    """
    batch_input = [{'value': card} for card in card_numbers]
    response = client.secrets.transform.encode(
        role_name='payments',
        transformation='credit-card',
        batch_input=batch_input
    )
    return [item['encoded_value'] for item in response['data']['batch_results']]

# Example usage
if __name__ == '__main__':
    # Tokenize a single card
    card = '4111-1111-1111-1111'
    token = tokenize_credit_card(card)
    print(f'Token: {token}')

    # Store the token in your database instead of the card number
    # Later, retrieve the original when needed
    original = detokenize_credit_card(token)
    print(f'Original: {original}')
```

## Vault Policy for Tokenization

Create a policy that grants appropriate permissions:

```hcl
# policy-payments-tokenize.hcl
# This policy allows encoding (tokenization) but not decoding
# Use for services that only need to tokenize data

path "transform/encode/payments" {
    capabilities = ["create", "update"]
}

# Separate policy for services that need to detokenize
# policy-payments-detokenize.hcl
path "transform/decode/payments" {
    capabilities = ["create", "update"]
}

# Combined policy for services that need both operations
# policy-payments-full.hcl
path "transform/encode/payments" {
    capabilities = ["create", "update"]
}

path "transform/decode/payments" {
    capabilities = ["create", "update"]
}

path "transform/validate/payments" {
    capabilities = ["create", "update"]
}
```

Apply the policy:

```bash
# Create the policy in Vault
vault policy write payments-tokenize policy-payments-tokenize.hcl
```

## Architecture Diagram

The following diagram shows a complete tokenization architecture:

```mermaid
flowchart TB
    subgraph Applications
        A1[Payment Service]
        A2[Customer Service]
        A3[Analytics Service]
    end

    subgraph Vault Cluster
        V1[Vault Primary]
        V2[Vault Standby]
        V3[Vault Standby]
    end

    subgraph Token Store
        DB[(PostgreSQL)]
    end

    subgraph Data Storage
        APP_DB[(Application DB)]
    end

    A1 -->|Tokenize PAN| V1
    A2 -->|Tokenize SSN| V1
    A3 -->|Read tokens only| APP_DB

    V1 -->|Store mappings| DB
    V1 <-->|Replication| V2
    V1 <-->|Replication| V3

    A1 -->|Store token| APP_DB
    A2 -->|Store token| APP_DB
```

## Best Practices

1. **Separate token stores by data type**: Use different stores for credit cards, SSNs, and other sensitive data. This limits blast radius and simplifies compliance.

2. **Use short TTLs when possible**: For temporary tokens (session data), set appropriate TTLs to automatically expire mappings.

3. **Implement least privilege**: Grant encode-only permissions to most services. Reserve decode permissions for services that genuinely need original values.

4. **Monitor token operations**: Enable Vault audit logging and alert on unusual patterns like bulk detokenization.

5. **Plan for disaster recovery**: Regularly backup your token store database. Without the mappings, tokens become permanently unrecoverable.

6. **Use batch operations**: When processing large volumes, batch requests reduce latency and improve throughput.

---

Vault Transform tokenization provides a robust solution for protecting sensitive data while maintaining data format and usability. By replacing actual values with tokens, you reduce the scope of sensitive data in your systems and simplify compliance with regulations like PCI-DSS and GDPR.
