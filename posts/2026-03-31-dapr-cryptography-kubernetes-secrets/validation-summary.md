# Validation Summary: How to Use Dapr Cryptography with Kubernetes Secrets

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr Cryptography building block
- Kubernetes Secrets (as crypto key provider)
- Dapr Python SDK (`dapr-ext-grpc`)
- Dapr Go SDK (`github.com/dapr/go-sdk`)
- Kubernetes RBAC
- JWK (JSON Web Key) format
- Node.js `crypto` module (for key generation)

## Sources Consulted
- Dapr Kubernetes Secrets Crypto Component docs: https://docs.dapr.io/reference/components-reference/supported-cryptography/kubernetes-secrets/
- Dapr Cryptography API reference: https://docs.dapr.io/reference/api/cryptography_api/
- Dapr Cryptography How-To guide: https://docs.dapr.io/developing-applications/building-blocks/cryptography/howto-cryptography/
- Dapr Cryptography Quickstart: https://docs.dapr.io/getting-started/quickstarts/cryptography-quickstart/
- Dapr Python SDK crypto source: https://github.com/dapr/python-sdk/blob/main/dapr/clients/grpc/client.py
- Dapr Python SDK crypto examples: https://github.com/dapr/python-sdk/tree/main/examples/crypto
- Dapr Go SDK crypto source: https://github.com/dapr/go-sdk/blob/main/client/crypto.go
- Dapr Go SDK crypto example: https://github.com/dapr/go-sdk/blob/main/examples/crypto/main.go
- Dapr components-contrib Kubernetes Secrets source: https://github.com/dapr/components-contrib/blob/main/crypto/kubernetes/secrets/component.go

## Issues Found

1. **Python SDK: wrong options type and parameter style** -- The `encrypt()` and `decrypt()` calls passed a plain `dict` with camelCase keys (e.g., `"componentName"`, `"keyName"`) for the `options` parameter. The Dapr Python SDK requires typed `EncryptOptions` / `DecryptOptions` objects from `dapr.clients.grpc._crypto` with snake_case field names (`component_name`, `key_name`, `key_wrap_algorithm`). Fixed both encrypt and decrypt examples.

2. **Python SDK: wrong data type** -- The `data` parameter was wrapped in `io.BytesIO(...)`. The Dapr Python SDK `encrypt()` and `decrypt()` methods accept `Union[str, bytes]` directly, not a stream wrapper. Removed the `io.BytesIO` wrapping and the `import io` statement.

3. **Go SDK: wrong struct name** -- The Go encrypt example used `dapr.EncryptRequestOptions{}`. The correct struct name in the Dapr Go SDK is `dapr.EncryptOptions{}`. Fixed the struct name.

4. **Python: function call arity mismatch** -- In the "Namespace-Scoped Keys" section, `encrypt_field(value, key_name)` was called with 2 arguments, but `encrypt_field` was defined earlier with only 1 parameter (`value`). Replaced with a self-contained `encrypt_for_tenant` function that correctly accepts tenant_id and constructs the key name.

## Review Notes
- The key name format description (`{secret-name}/{key-name}`) is correct when `defaultNamespace` is configured, but the three-part format (`{namespace}/{secret-name}/{key-name}`) is also supported and not mentioned. This is a minor omission, not an error, since the post configures `defaultNamespace`.
- The `"AES"` value for `keyWrapAlgorithm` is valid SDK-level shorthand that maps to `A256KW` internally. The more precise value `A256KW` could also be used.
- The Node.js key generation script uses `crypto.generateKeySync` which is available in Node.js 15+. This is fine for current Node.js versions but worth noting.
- The RBAC configuration is correct and follows Kubernetes best practices by scoping to specific `resourceNames`.
