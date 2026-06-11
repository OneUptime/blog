# Validation Summary: How to Create Encryption Key Rotation

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Node.js `crypto` module
- AES-256-GCM authenticated encryption
- Key versioning and key rotation
- `node-cron`
- AWS KMS and AWS SDK for JavaScript v3
- TLS certificate rotation
- Certbot
- OpenSSL
- Nginx and Kubernetes reload examples

## Sources Consulted
- Node.js Crypto API documentation: https://nodejs.org/api/crypto.html
- NIST SP 800-38D, GCM and GMAC mode recommendation: https://csrc.nist.gov/pubs/sp/800/38/d/final
- node-cron documentation: https://www.nodecron.com/getting-started.html
- AWS KMS EnableKeyRotation documentation: https://docs.aws.amazon.com/kms/latest/APIReference/API_EnableKeyRotation.html
- AWS CLI KMS `enable-key-rotation` reference: https://docs.aws.amazon.com/cli/latest/reference/kms/enable-key-rotation.html
- AWS KMS Decrypt API documentation: https://docs.aws.amazon.com/kms/latest/APIReference/API_Decrypt.html
- AWS CLI KMS `encrypt` reference: https://docs.aws.amazon.com/cli/latest/reference/kms/encrypt.html
- Certbot user guide: https://eff-certbot.readthedocs.io/en/stable/using.html
- PCI DSS v4.0 SAQ D Merchant requirements, sections 3.6 and 3.7: https://listings.pcisecuritystandards.org/documents/PCI-DSS-v4-0-SAQ-D-Merchant.pdf
- HHS HIPAA Security Rule summary: https://www.hhs.gov/hipaa/for-professionals/security/laws-regulations/index.html
- AICPA SOC trust services overview: https://www.aicpa-cima.com/resources/landing/system-and-organization-controls-soc-suite-of-services

## Issues Found
- The compliance bullet overstated HIPAA and SOC 2 as requiring periodic key rotation. Updated it to state that PCI DSS requires key changes at the end of defined cryptoperiods, while HIPAA and SOC 2 commonly involve documented key management controls.
- The full re-encryption section said downtime is required. Changed this to "can require downtime" because online re-encryption strategies are possible.
- The local key-store comments described a JSON file as "secure storage." Changed wording to "restricted local storage" to avoid implying that file permissions alone provide production-grade key storage.
- The `initialize()` method treated every read or parse error as a missing key store and would overwrite state. Updated it to generate a new key only for `ENOENT` and rethrow other errors.
- The AES-GCM example used a 16-byte IV. Changed it to a 12-byte IV, matching the common 96-bit GCM recommendation.
- The scheduler description said the cron expression rotates every 90 days. Changed it to every three months, which is what `0 0 1 */3 *` represents.
- The key-retirement math kept one more key version than the comment promised. Updated the minimum version calculation so `keepVersions` keeps the current version plus the intended number of recent versions.
- The AWS KMS section said automatic rotation is annual. Updated it to note the default 365-day period, configurable 90-to-2,560-day periods, and on-demand rotation.
- The AWS KMS code did not show configurable rotation or on-demand rotation. Added `RotationPeriodInDays` and a `rotateNow()` method using `RotateKeyOnDemandCommand`.
- The AWS KMS direct encryption example did not mention the 4,096-byte plaintext limit. Added a size check and guidance to use envelope encryption for larger data.
- The Certbot script used `--cert-path` and `--key-path` as if normal `certonly` issuance writes directly to those service paths. Updated the script to issue with `--cert-name`, then copy `fullchain.pem` and `privkey.pem` from Certbot's live directory into the service certificate directory.

## Review Notes
The examples are suitable as educational patterns, but a production implementation should use a managed KMS or HSM-backed key store rather than persisting raw encryption keys in a local JSON file.
