# Validation Summary: How to Encrypt Dapr State at Rest with State Store Encryption

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (state management building block)
- AES-GCM encryption (128/192/256-bit)
- Redis (as example state store backend)
- Kubernetes Secrets
- Go Dapr SDK
- Python Dapr SDK
- OpenSSL CLI

## Sources Consulted
- Dapr state store encryption how-to: https://docs.dapr.io/developing-applications/building-blocks/state-management/howto-encrypt-state/
- Dapr supported state stores reference: https://docs.dapr.io/reference/components-reference/supported-state-stores/
- Dapr state store key prefix documentation: https://docs.dapr.io/developing-applications/building-blocks/state-management/howto-state-manage-key-prefix/

## Issues Found

1. **AES key size claim was too restrictive**: The post stated the encryption key "must be a 32-byte (256-bit) AES key." Dapr AES-GCM actually supports 128, 192, and 256-bit keys, and the official docs recommend 128-bit keys. Fixed to list all supported sizes and note the recommendation.

2. **Overview incorrectly stated AES-256-GCM exclusively**: The overview said encryption uses "AES-256-GCM" but Dapr supports AES-GCM with multiple key sizes. Fixed to say "AES in Galois/Counter Mode (GCM)" with 128/192/256-bit support.

3. **Self-hosted inline plaintext key is not supported**: The self-hosted example used `value:` to supply the encryption key as plaintext directly in the component metadata. The Dapr docs explicitly state: "The encryption keys are always fetched from a secret, and cannot be supplied as plaintext values on the metadata section." Fixed to use `secretKeyRef` with a local secret store reference.

4. **Redis verification key was wrong for the configured keyPrefix**: The config set `keyPrefix: "name"`, which stores keys as `{componentName}||{key}` (e.g., `statestore||secret-order`). The blog incorrectly showed `GET "order-service||secret-order"`, which would be the format for `keyPrefix: "appid"`. Fixed to `GET "statestore||secret-order"`.

5. **Supported State Stores table understated scope**: The table listed only six state stores. The official docs state encryption is supported by **all** Dapr state stores. Added a note clarifying this.

## Review Notes
- The Go and Python SDK code examples are structurally correct and demonstrate the key point that encryption is transparent to application code. The Python example uses `await` (async pattern), which is available in newer versions of the Dapr Python SDK.
- The Mermaid sequence diagram is accurate and helpful for illustrating the encryption flow.
- The key rotation procedure (primary → secondary swap) is correctly described and matches official documentation.
