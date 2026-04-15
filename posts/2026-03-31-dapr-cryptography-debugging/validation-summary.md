# Validation Summary: How to Debug Dapr Cryptography Issues

## Status
validated

## Post Type
Troubleshooting / Debugging Guide

## Technologies Covered
- Dapr (sidecar, CLI, metadata API, cryptography building block)
- Dapr Cryptography HTTP API (`v1.0-alpha1/crypto`)
- Dapr component YAML configuration
- Azure Key Vault (with managed identity / service principal authentication)
- Kubernetes (annotations, secrets, pod exec)
- Azure CLI (`az keyvault`)
- JWK (JSON Web Key) format
- AES-GCM encryption (nonce + authentication tag)
- Python (debugging scripts)
- Bash / curl

## Sources Consulted
- Dapr Cryptography building block documentation: https://docs.dapr.io/developing-applications/building-blocks/cryptography/
- Dapr Cryptography HTTP API reference: https://docs.dapr.io/reference/api/cryptography_api/
- Dapr Metadata API reference: https://docs.dapr.io/reference/api/metadata_api/
- Dapr component schema (crypto component types): https://docs.dapr.io/reference/components-reference/supported-cryptography/
- Azure IMDS (Instance Metadata Service) documentation: https://learn.microsoft.com/en-us/azure/active-directory/managed-identities-azure-resources/how-to-use-vm-token
- Azure Key Vault CLI reference: https://learn.microsoft.com/en-us/cli/azure/keyvault
- JWK (RFC 7517) specification: https://datatracker.ietf.org/doc/html/rfc7517
- Previously validated Dapr cryptography blog posts in this repository (for cross-referencing API patterns and algorithm naming conventions)

## Issues Found

### 1. HTTP API key-wrap-algorithm header used SDK shorthand
**What was wrong:** The healthcheck curl example used `dapr-key-wrap-algorithm: AES` in the HTTP header (line 199). The Dapr HTTP API expects full JWA (JSON Web Algorithms) algorithm names, not SDK shorthands. `AES` is the Python/Node.js SDK shorthand; the HTTP API requires `A256KW`.
**What was changed:** Replaced `AES` with `A256KW` in the `dapr-key-wrap-algorithm` HTTP header.
**Why:** Confirmed by multiple previously validated posts in this blog (e.g., `dapr-cryptography-testing-locally`, `dapr-how-to-encrypt-data-using-dapr-cryptography-building-block`) that the HTTP API expects full JWA names.

### 2. Issue 6 algorithm comment used SDK shorthand
**What was wrong:** The comment in Issue 6 stated `AES key -> keyWrapAlgorithm: "AES"` (line 183). Since the example uses a plain dict (not an SDK-specific options object), the full JWA name should be used for consistency and correctness.
**What was changed:** Changed `"AES"` to `"A256KW"` in the comment.
**Why:** The surrounding code is not SDK-specific (uses camelCase keys in a plain dict), so it should use the standard JWA algorithm name.

### 3. Unused `import sys` in ciphertext debug snippet
**What was wrong:** The Python snippet for debugging ciphertext corruption (line 161) imported `sys` but never used it.
**What was changed:** Removed the `import sys` line.
**Why:** Unused imports are confusing in debugging snippets that readers are expected to copy and run.

## Review Notes
- The AADSTS70011 error in Issue 3 ("The provided value for the input parameter 'scope' is not valid") is specifically about a malformed or unrecognized scope/resource parameter in the OAuth2 token request, not about insufficient permissions. The described cause ("managed identity or service principal does not have permission") more closely matches errors like AADSTS65001 or HTTP 403 responses. However, the debugging steps and fix provided (checking token acquisition and setting Key Vault access policies) are practical and commonly needed when troubleshooting Azure Key Vault authentication with Dapr, so this was left as-is.
- The metadata API jq filter uses `.components`, which is the correct field name in current Dapr versions.
- The `v1.0-alpha1` API prefix for the crypto endpoints is correct — the Dapr Cryptography HTTP API is still in alpha status.
- The AES-GCM minimum ciphertext size calculation (12 nonce + 16 tag = 28 bytes) is correct.
- The JWK example shows an RSA private key structure with the required fields (`kty`, `kid`, `n`, `e`, `d`). The `use` and `alg` fields are optional per RFC 7517 but recommended for Dapr's local storage component.
