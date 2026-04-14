# How to Use Dapr Secrets Management for API Keys

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Secret Management, API Key, Security, Microservice

Description: Learn how to securely store and retrieve third-party API keys in Dapr-enabled microservices using the secrets building block.

---

Third-party API keys for services like Stripe, Twilio, and SendGrid are sensitive credentials that must never be committed to source control. Dapr Secrets Management provides a runtime API to retrieve these keys from a secure backend, keeping them out of your application configuration files entirely.

## Setting Up a Secret Store for API Keys

Define a secret store component - here using HashiCorp Vault:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: vault-secrets
  namespace: production
spec:
  type: secretstores.hashicorp.vault
  version: v1
  metadata:
    - name: vaultAddr
      value: "https://vault.internal:8200"
    - name: vaultToken
      secretKeyRef:
        name: vault-token
        key: token
```

Store your API keys in Vault:

```bash
vault kv put secret/api-keys \
  stripe-key="sk_live_abc123xyz" \
  sendgrid-key="SG.xxxxxxxxxxxxxxxx" \
  twilio-auth-token="acxxxxxxxxxxxxxxxx"
```

## Retrieving a Single API Key

To fetch a specific key, append the key name to the query:

```bash
curl "http://localhost:3500/v1.0/secrets/vault-secrets/api-keys?metadata.version_id=2"
```

Or retrieve a specific subkey:

```bash
curl "http://localhost:3500/v1.0/secrets/vault-secrets/stripe-key"
```

## Using API Keys in a Python Service

```python
import httpx
import asyncio

async def get_stripe_key():
    async with httpx.AsyncClient() as client:
        response = await client.get(
            "http://localhost:3500/v1.0/secrets/vault-secrets/api-keys"
        )
        secrets = response.json()
        return secrets["stripe-key"]

async def charge_customer(amount: int, token: str):
    stripe_key = await get_stripe_key()
    # Use the key to call Stripe API
    headers = {"Authorization": f"Bearer {stripe_key}"}
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://api.stripe.com/v1/charges",
            headers=headers,
            data={"amount": amount, "currency": "usd", "source": token}
        )
        return resp.json()
```

## Caching Secrets to Reduce Latency

Dapr does not provide built-in secret caching with a configurable TTL. To reduce latency, implement application-level caching: store the key in memory after first retrieval and refresh on a schedule rather than fetching per-request.

## Scoping API Key Access

Restrict which services can access payment or communication API keys:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: vault-secrets
spec:
  type: secretstores.hashicorp.vault
  version: v1
scopes:
  - payment-service
  - notification-service
```

Services not in the scopes list will not have the secret store component loaded, preventing them from accessing secrets in this store.

## Summary

Dapr Secrets Management keeps third-party API keys out of code and configuration files by providing a runtime retrieval API backed by your chosen secret store. Combining scoping rules with a centralized vault ensures each microservice can only access the specific keys it needs, reducing the blast radius of any potential credential compromise.
