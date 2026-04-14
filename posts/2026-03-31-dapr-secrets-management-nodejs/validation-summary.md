# Validation Summary: How to Use Dapr Secrets Management with Node.js

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr JavaScript/Node.js SDK (`@dapr/dapr`)
- Dapr Secrets Management API
- Kubernetes Secrets (as a Dapr secret store)
- HashiCorp Vault (as a Dapr secret store)
- Node.js

## Sources Consulted
- Dapr JS SDK npm package (`@dapr/dapr` v3.6.1) — type definitions and source code
- Dapr JS SDK GitHub repository (dapr/js-sdk) — DaprClient constructor options and IClientSecret interface
- Dapr official documentation — Secrets Management API reference (https://docs.dapr.io/reference/api/secrets_api/)
- Dapr official documentation — Kubernetes secret store component (https://docs.dapr.io/reference/components-reference/supported-secret-stores/kubernetes-secret-store/)
- Dapr official documentation — HashiCorp Vault secret store component (https://docs.dapr.io/reference/components-reference/supported-secret-stores/hashicorp-vault/)

## Issues Found

1. **Incorrect `daprHost` value with protocol prefix**
   - **What was wrong:** The DaprClient constructor used `daprHost: "http://localhost"`, which includes the `http://` protocol prefix. The SDK expects a bare hostname (default is `"127.0.0.1"`) and constructs the full URL internally. Including the protocol would produce malformed URLs like `http://http://localhost:3500/...`.
   - **What was changed:** Changed `"http://localhost"` to `"127.0.0.1"`.
   - **Why:** The `daprHost` option in `DaprClientOptions` is typed as a hostname string, not a URL. The SDK prepends the protocol based on the configured communication protocol.

2. **Metadata parameter passed as object instead of string**
   - **What was wrong:** The metadata example passed `{ "version": "2" }` (a JavaScript object) as the third argument to `client.secret.get()`. The SDK's method signature types this parameter as `string`, not `object`. The HTTP implementation appends it directly as a query string.
   - **What was changed:** Changed `{ "version": "2" }` to `"metadata.version_id=2"`.
   - **Why:** The Dapr HTTP API expects metadata as query parameters in `metadata.KEY=VALUE` format. The SDK passes this string directly to the request URL. Additionally, the correct metadata key for Vault KV v2 versioning is `version_id`, not `version`.

3. **Misleading comment on metadata example**
   - **What was wrong:** The comment said `// Vault: specify a namespace` but the code was specifying a secret version, not a Vault namespace.
   - **What was changed:** Changed comment to `// Vault: specify a secret version`.
   - **Why:** The metadata being passed (`version_id=2`) retrieves a specific version of a secret from Vault's KV v2 engine. This has nothing to do with Vault namespaces.

## Review Notes
- The Dapr component YAML configurations for both Kubernetes and HashiCorp Vault are correct in format, field names, and type identifiers.
- The `secret.get()` and `secret.getBulk()` method names and return value shapes are accurate.
- The Vault component example uses a hardcoded `vaultToken` value, which is fine for a tutorial but production deployments should use `vaultTokenMountPath` with a file-mounted token or another auth method.
- The gRPC implementation of the SDK currently ignores the metadata parameter (marked with a `@todo` comment in the source). This is a SDK limitation, not a blog post error, but readers using gRPC communication protocol should be aware.
- The advice about avoiding secret leaks in logs is sound, though the example still partially logs the secret (first 4 characters). In highly sensitive environments, even partial logging may not be advisable.
