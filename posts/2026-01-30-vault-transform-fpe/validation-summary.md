# Validation Summary: How to Build Vault Transform FPE

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- HashiCorp Vault (Enterprise) — Transform secrets engine
- Format-Preserving Encryption (FPE) — FF3-1 algorithm (NIST SP 800-38G Rev. 1)
- hvac (Python Vault client)
- node-vault (Node.js Vault client)
- HCL (Vault policy language)
- Bash scripting

## Sources Consulted
- HashiCorp Vault Transform secrets engine documentation: https://developer.hashicorp.com/vault/docs/secrets/transform
- HashiCorp Vault Transform FPE documentation: https://developer.hashicorp.com/vault/docs/secrets/transform/fpe
- HashiCorp Vault API — Transform: https://developer.hashicorp.com/vault/api-docs/secret/transform
- NIST SP 800-38G Rev. 1 (FF3-1 specification)
- hvac Python SDK documentation (transform secret backend): https://hvac.readthedocs.io/
- node-vault npm package documentation
- HashiCorp Vault audit logging docs: https://developer.hashicorp.com/vault/docs/audit

## Issues Found

1. **Incorrect description of `tweak_source=internal`** (around line 248 of the original):
   - Original: `# Internal: Vault manages tweaks automatically (stored with ciphertext)`
   - Issue: With `tweak_source=internal`, Vault uses a single fixed tweak that is internal to the transformation (which is why it yields deterministic / convergent output). The tweak is not stored alongside each ciphertext — that wording suggested a per-encoding tweak, which would conflict with the post's own correct claim that internal mode is deterministic.
   - Fix: Updated comment to `# Internal: Vault uses a fixed tweak stored with the transformation (deterministic)`.

2. **Missing `import requests` in the connection pooling example**:
   - Original code imported `from requests.adapters import HTTPAdapter` and then called `requests.Session()` without importing the top-level `requests` module. In Python, importing a submodule via `from X.Y import Z` does not bind `X` (or `requests`) into the local namespace, so `requests.Session()` would raise `NameError`.
   - Fix: Added `import requests` to the imports block.

## Review Notes
- The post does not mention that the Transform secrets engine is a **Vault Enterprise** feature (requires the ADP-Transform module). Users on Vault OSS will not be able to enable it. This is an omission rather than a factual error, so it was not added per the scope of the review.
- The "Convergent Encryption" section reuses `tweak_source=internal`, which is the correct way to get deterministic encryption in Transform FPE. Vault Transform does not have an explicit `convergent_encryption=true` flag (unlike the Transit engine); the determinism comes from the fixed internal tweak. The post's treatment is technically correct but could be clearer about this implementation detail.
- The "Without Tweak" branch of the Mermaid diagram under "Understanding Tweak Sources" is slightly imprecise — FF3-1 always uses a tweak; what's depicted is really the fixed-internal-tweak case. The meaning is preserved, but a future revision could clarify the wording.
- The example tweak `"dXNlcjEyMw=="` (base64 for "user123", 7 bytes / 56 bits) happens to match the FF3-1 tweak length requirement, so the example is internally consistent.
- Built-in alphabet names (`builtin/numeric`, `builtin/alphalower`, `builtin/alphaupper`, `builtin/alphanumericlower`, `builtin/alphanumericupper`) match Vault's documented built-ins.
- The hvac method signatures (`client.secrets.transform.encode` / `decode` with `role_name`, `value`, `transformation`, `mount_point`) and the node-vault `vault.write()` paths/responses match the current libraries.
- The Vault policy capabilities (`update` on `transform/encode/<role>` and `transform/decode/<role>`) are correct for Vault's policy model.
- The audit logging note ("Audit logs never contain plaintext values or encrypted outputs by default") is accurate — Vault HMACs sensitive request/response fields in audit logs by default.
