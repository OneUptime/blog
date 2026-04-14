# Validation Summary: How to Use Dapr Secrets Management for API Keys

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr Secrets Management building block
- HashiCorp Vault (as secret store backend)
- Python with httpx (async HTTP client)
- Stripe API (as example third-party service)
- Vault CLI (kv put command)

## Sources Consulted
- Dapr Secrets API reference (https://docs.dapr.io/reference/api/secrets_api/)
- Dapr Secrets management overview (https://docs.dapr.io/developing-applications/building-blocks/secrets/secrets-overview/)
- Dapr HashiCorp Vault secret store component reference (https://docs.dapr.io/reference/components-reference/supported-secret-stores/hashicorp-vault/)
- Dapr component scoping documentation (https://docs.dapr.io/operations/components/component-scopes/)
- Dapr component secrets / secretKeyRef documentation (https://docs.dapr.io/operations/components/component-secrets/)
- Dapr How-to: Retrieve a secret (https://docs.dapr.io/developing-applications/building-blocks/secrets/howto-secrets/)

## Issues Found

1. **Scoping YAML structure was incorrect**: The `scopes` field was nested under `spec` in the component YAML. According to the Dapr component specification, `scopes` is a root-level field (sibling of `spec`, `metadata`, `kind`, and `apiVersion`), not a child of `spec`. Fixed by moving `scopes` to the correct indentation level.

2. **False claim about built-in secret caching**: The post stated "Dapr caches secrets by default" and implied there was a configurable TTL for secret caching. This is not documented in the official Dapr documentation. The accompanying YAML snippet showed `skipVerify` and `vaultAddr` fields, which are unrelated to caching. Removed the incorrect caching claim and the misleading YAML, keeping only the valid recommendation for application-level caching.

3. **Incorrect 403 claim for scoped components**: The post stated that services not in the scopes list "receive a 403" when accessing the store. In reality, when `scopes` restricts a component, Dapr does not load the component for non-scoped apps at all — those apps simply cannot see the secret store rather than receiving a specific 403 response. Updated the explanation to accurately describe this behavior.

## Review Notes
- The `secretKeyRef` usage for `vaultToken` in the first component YAML is valid (it is a general Dapr component feature), but the blog does not include the `auth.secretStore` field. In a Kubernetes environment (implied by the `namespace: production` field), Dapr defaults to the Kubernetes secret store for resolving `secretKeyRef`, so this is acceptable but could be made more explicit for non-Kubernetes deployments.
- The Python code correctly accesses `secrets["stripe-key"]` from the individual secret retrieval response, which returns a flat map of key-value pairs when using the default `vaultValueType: "map"` setting.
- The Stripe API example uses the `/v1/charges` endpoint with the `source` parameter, which is a legacy Stripe pattern. Modern Stripe integrations use PaymentIntents, but this is acceptable for a Dapr-focused tutorial where the Stripe call is illustrative.
