# Validation Summary: How to Implement Key Rotation with Dapr Cryptography

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr Cryptography building block
- Dapr Python SDK (`dapr-ext-grpc`)
- Azure Key Vault (as a Dapr crypto component)
- Dapr Jobs API (alpha)
- Azure CLI (`az keyvault key`)
- SQL (generic DDL/DML)
- Python 3

## Sources Consulted
- Dapr Cryptography building block docs: https://docs.dapr.io/developing-applications/building-blocks/cryptography/
- Dapr Cryptography API reference: https://docs.dapr.io/reference/api/cryptography_api/
- Dapr Crypto Scheme v1 spec (header/manifest format): https://github.com/dapr/kit/blob/main/schemes/enc/v1/README.md
- Dapr Python SDK source (`dapr/clients/grpc/client.py`, `dapr/clients/grpc/_crypto.py`) for `encrypt`/`decrypt` method signatures and `EncryptOptions`/`DecryptOptions` dataclasses
- Dapr Jobs building block docs: https://docs.dapr.io/developing-applications/building-blocks/jobs/
- Azure CLI `az keyvault key` reference: https://learn.microsoft.com/en-us/cli/azure/keyvault/key

## Issues Found

### 1. Python SDK API usage was incorrect (all code examples)
**What was wrong:** The blog passed `io.BytesIO(plaintext)` as the `data` argument and used plain Python dictionaries with camelCase keys (e.g., `"componentName"`, `"keyName"`, `"keyWrapAlgorithm"`) for the `options` argument. The actual Dapr Python SDK `encrypt()` and `decrypt()` methods accept `data` as `str` or `bytes` (not `BytesIO`), and require `EncryptOptions` / `DecryptOptions` dataclass instances with snake_case attributes (`component_name`, `key_name`, `key_wrap_algorithm`).

**What was changed:** Updated all three Python code blocks (Phase 2 encrypt/decrypt, Phase 3 re-encryption script) to:
- Import `EncryptOptions` and `DecryptOptions` from `dapr.clients.grpc._crypto`
- Pass `data` as raw `bytes` instead of `io.BytesIO` objects
- Use `EncryptOptions(...)` and `DecryptOptions(...)` dataclass instances instead of plain dicts
- Use snake_case parameter names (`component_name`, `key_name`, `key_wrap_algorithm`)
- Removed unused `import io`

### 2. Ciphertext format description was inaccurate
**What was wrong:** The blog described the ciphertext as containing "The key ID (kid)", "the encrypted data encryption key (DEK)", and "The AES-256-GCM ciphertext." The actual Dapr Crypto Scheme v1 uses the term "key name" (stored as field `k` in the JSON manifest), not "key ID (kid)". The key name is optional (marked `omitempty`). The encrypted symmetric key is called the "Wrapped File Key" (WFK). AES-256-GCM is the default cipher but ChaCha20-Poly1305 is also supported.

**What was changed:** Updated the bullet list to use correct terminology: "key name" instead of "key ID (kid)", "wrapped file key" instead of "DEK", and noted that AES-256-GCM is the default with ChaCha20-Poly1305 also available. Added "(optionally embedded in the header)" to clarify the key name is not always present.

### 3. Decrypt behavior description was incomplete
**What was wrong:** The blog stated Dapr "reads the key ID from the ciphertext" without noting this is optional or that you can override it.

**What was changed:** Updated to note the key name is read "if present" from the header and that you can also explicitly pass it in the decrypt call.

### 4. Dapr Jobs terminology was incorrect
**What was wrong:** The code comment said "dapr-jobs component triggers this" — Dapr Jobs is a building block API backed by the Scheduler control plane service, not a "component." Also, Jobs is currently in alpha status, which was not mentioned.

**What was changed:** Updated the comments to reference "Dapr Jobs API (alpha)" and "Dapr Scheduler service" instead of "dapr-jobs component."

### 5. Compliance framework claim was slightly overstated
**What was wrong:** The blog stated key rotation "is required by compliance frameworks like PCI-DSS, HIPAA, and SOC 2." PCI-DSS explicitly requires key rotation (Requirement 3.6.4), but HIPAA recommends periodic review of encryption mechanisms without explicitly mandating key rotation, and SOC 2 is principle-based without a specific key rotation requirement.

**What was changed:** Changed "is required by" to "is required or recommended by" to accurately reflect the varying levels of prescription across these frameworks.

## Review Notes
- The `keyWrapAlgorithm` value `RSA-OAEP-256` used in the blog is valid per the Dapr Crypto Scheme v1 spec, though the official Dapr how-to guide examples use the shorter alias `RSA`. Both appear to work.
- The Azure CLI commands (`az keyvault key create`, `list-versions`, `set-attributes`) are all correct with valid flags and parameters.
- The Dapr Jobs API is currently in alpha status. If this post is intended for production guidance, readers should be aware that the Jobs API may change.
- The re-encryption script uses OFFSET-based pagination, which can skip or duplicate rows if records are being modified concurrently. A cursor-based approach (e.g., `WHERE id > last_seen_id`) would be more robust for production use, but this is a design consideration rather than a technical error.
- The overall key rotation strategy (four phases) is sound and follows industry best practices.
