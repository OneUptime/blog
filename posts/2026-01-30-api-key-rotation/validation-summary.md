# Validation Summary: How to Create API Key Rotation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Node.js
- Node.js crypto module
- HashiCorp Vault KV v2
- node-vault
- node-cron
- API key and secrets rotation
- Security compliance considerations

## Sources Consulted
- Node.js crypto documentation: https://nodejs.org/api/crypto.html
- Node.js globals documentation for fetch: https://nodejs.org/api/globals.html
- node-cron documentation, scheduling options: https://www.nodecron.com/scheduling-options.html
- node-cron documentation, API reference: https://www.nodecron.com/api-reference.html
- HashiCorp Vault KV v2 API documentation: https://developer.hashicorp.com/vault/api-docs/secret/kv/kv-v2
- HashiCorp Vault CLI/API command mapping: https://developer.hashicorp.com/vault/docs/commands
- HHS HIPAA Security Rule summary: https://www.hhs.gov/hipaa/for-professionals/security/laws-regulations/index.html
- NIST SP 800-63B authentication lifecycle guidance: https://pages.nist.gov/800-63-3/sp800-63b.html
- PCI DSS v4.0.1 document library: https://www.pcisecuritystandards.org/document_library/

## Issues Found
- The compliance bullet incorrectly stated that PCI-DSS, SOC 2, and HIPAA all mandate credential rotation. Updated it to distinguish PCI DSS application/system account credential change requirements from SOC 2 and HIPAA risk-based control expectations.
- The rotation code marked the oldest active key after adding the new key, which could select the newly generated key during initial rotation and could also make retiring keys invalid during the intended overlap window. Updated the code to select the old key before storing the new key, persist the pending revocation state, and allow `pending_revocation` keys through validation until `revokeAt`.
- The validation code compared API key strings directly. Updated it to use `crypto.timingSafeEqual` with equal-length buffers, matching Node.js guidance for secret comparisons.
- The Vault backend treated the same KV v2 `/data/` path as suitable for listing and full revocation. Updated the adapter to use a corresponding `/metadata/` path for `list` and metadata/all-version deletion, matching the Vault KV v2 API.
- The Vault backend did not persist `revokeAt`, so pending revocation state would lose the overlap deadline when stored. Added `revokeAt` to the stored payload.
- The scheduler comment said the job ran at midnight UTC, but `node-cron` uses the system timezone unless configured. Added `timezone: 'UTC'` to the daily rotation schedule.

## Review Notes
All JavaScript code blocks pass `node --check` on Node.js v22.22.0. A behavioral smoke test confirmed the rotator accepts the retiring key during the overlap period, accepts the new key, and rejects the old key after cleanup. The sample remains illustrative and does not include production concerns such as startup hydration from Vault, retry wrappers for consumer key fetches, or distributed locking for multiple scheduler instances.
