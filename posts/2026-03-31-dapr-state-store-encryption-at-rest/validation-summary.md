# Validation Summary: How to Configure State Store Encryption at Rest with Dapr

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- Dapr (state management, encryption, secrets API)
- Redis (as state store backend)
- PostgreSQL (as state store backend)
- Kubernetes (secrets, deployments)
- AWS KMS (key management)
- HashiCorp Vault (secret store)
- OpenSSL (key generation)

## Sources Consulted
- Dapr state store encryption documentation: https://docs.dapr.io/developing-applications/building-blocks/state-management/howto-encrypt-state/
- Dapr component secrets documentation: https://docs.dapr.io/operations/components/component-secrets/
- Dapr state management key prefix documentation: https://docs.dapr.io/developing-applications/building-blocks/state-management/howto-share-state/
- Dapr HashiCorp Vault secret store component reference: https://docs.dapr.io/reference/components-reference/supported-secret-stores/hashicorp-vault/
- Dapr PostgreSQL state store component reference: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-postgresql-v2/
- kubectl rollout restart documentation (supports -l/--selector flag)

## Issues Found

1. **Incorrect encryption algorithm claim**: The post stated "Dapr uses AES-256-GCM" but Dapr uses AES-GCM with key size (128, 192, or 256 bits) determined by the key length provided. Fixed to "AES-GCM" with explanation of supported key sizes.

2. **Wrong key encoding format**: The post stated keys must be "32-byte base64-encoded" strings and used `openssl rand -base64 32` for generation. Dapr expects hex-encoded keys, not base64-encoded. Fixed key generation commands to use `openssl rand 32 | hexdump -v -e '/1 "%02x"'` and updated the description to explain hex encoding.

3. **Incorrect Redis key format**: The post showed `dapr||myapp||mykey` as the Redis key format. Dapr's default key prefix strategy (`appid`) produces keys in the format `{appid}||{key}` with no `dapr||` prefix. Fixed to `myapp||mykey`.

4. **Missing `auth.secretStore` for Vault integration**: The Secrets API section showed `secretKeyRef` with `name: vault-kv-dapr` as if the secret store component name goes inside `secretKeyRef.name`. In Dapr, the secret store is specified via `auth.secretStore` at the component spec level, and `secretKeyRef.name` is the name of the secret within that store. Fixed by adding `auth.secretStore: vault-kv-dapr` to the component spec and correcting `secretKeyRef.name` to reference the actual secret name.

5. **Inaccurate key rotation fallback description**: The post stated "Dapr decrypts data with the secondary key if the primary key fails" implying a trial-and-error approach. Dapr actually tracks which key was used for each state item deterministically (by appending the secret key reference name). Fixed to explain the deterministic tracking mechanism and that old data is re-encrypted only when the application writes it again.

6. **Double base64 encoding in key rotation script**: The key rotation Step 2 used `openssl rand -base64 32 | base64` which double-encodes the key. Fixed to generate a hex-encoded key and then base64-encode it for the Kubernetes Secret data path.

## Review Notes
- The AWS KMS integration section's piped command (`aws kms generate-data-key ... | kubectl create secret ...`) is conceptually valid but fragile in practice — the `--from-literal=primary-key=-` flag reads from stdin, which works but the KMS output may need additional processing depending on the shell environment. This is a minor practical concern, not a correctness issue.
- The post uses 256-bit keys throughout. While valid, Dapr's documentation recommends 128-bit keys as the default. This is a stylistic choice, not an error.
- The Vault component example uses `vaultToken` directly, which is suitable for development but production Vault deployments typically use `vaultTokenMountPath` with Kubernetes auth. This is worth noting but not incorrect.
