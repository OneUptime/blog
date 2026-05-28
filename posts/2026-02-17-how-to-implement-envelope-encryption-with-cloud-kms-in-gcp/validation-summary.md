# Validation Summary: How to Implement Envelope Encryption with Cloud KMS in GCP

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Google Cloud KMS
- Envelope encryption
- AES-256-GCM
- Python `google-cloud-kms` and `cryptography`
- Node.js `@google-cloud/kms` and `crypto`
- Go `cloud.google.com/go/kms/apiv1`, `crypto/aes`, and `crypto/cipher`

## Sources Consulted
- Google Cloud KMS envelope encryption documentation: https://cloud.google.com/kms/docs/envelope-encryption
- Google Cloud KMS symmetric encrypt/decrypt documentation: https://cloud.google.com/kms/docs/encrypt-decrypt
- Google Cloud KMS RPC reference for `EncryptRequest` and permissions: https://cloud.google.com/kms/docs/reference/rpc/google.cloud.kms.v1
- Google Cloud HSM limitations: https://cloud.google.com/kms/docs/hsm
- Google Cloud KMS Python client reference: https://cloud.google.com/python/docs/reference/cloudkms/latest/google.cloud.kms_v1.services.key_management_service.KeyManagementServiceClient
- Google Cloud KMS Node.js client reference: https://cloud.google.com/nodejs/docs/reference/kms/latest/kms/protos.google.cloud.kms.v1.encryptrequest
- Python `cryptography` AES-GCM documentation: https://cryptography.io/en/latest/hazmat/primitives/aead/
- Node.js `crypto` documentation: https://nodejs.org/api/crypto.html
- Go `crypto/cipher` documentation: https://pkg.go.dev/crypto/cipher
- Google Cloud KMS Go client documentation: https://pkg.go.dev/cloud.google.com/go/kms/apiv1

## Issues Found
- The opening stated a blanket 64 KiB Cloud KMS direct-encryption limit. Google documents 64 KiB for Cloud KMS software keys, while Cloud HSM-backed keys have an 8 KiB message size limit. Updated the text to distinguish software keys from HSM-backed keys.
- The post said encrypted data can be "any size." Local AES-GCM avoids the KMS direct-encryption limit, but practical cryptographic and implementation limits still apply. Changed this to say the encrypted data can be much larger than the KMS direct-encryption limit.
- The Python implementation returned UTF-8 strings from `decrypt`, which made it unsuitable for arbitrary binary payloads and conflicted with the file encryption example. Updated `decrypt` to return bytes and decoded only in the text usage example.
- The file encryption example decoded file bytes as UTF-8 before encryption, which would fail for arbitrary binary files. Updated it to pass bytes directly to the encryptor.
- The Node.js implementation returned UTF-8 strings from `decrypt`, which lost binary payload support. Updated it to encrypt `Buffer` inputs correctly and return a `Buffer`, with the usage example decoding only for text comparison.
- The DEK caching example passed plaintext directly to `AESGCM.encrypt`, which fails for Python strings. Added the same string-to-bytes conversion used by the main Python implementation.
- The DEK caching prose implied reuse across individual database rows generally. Google recommends generating new DEKs for writes and not sharing a DEK across different users. Narrowed the language to small chunks within the same security boundary.

## Review Notes
- Google recommends, but does not require, CRC32C integrity checks for Cloud KMS requests and responses in client-library examples. The post omits those checks for brevity; a production version should add them.
- The local environment did not include a Go toolchain, so the Go snippet was reviewed against official Go and Google Cloud client documentation rather than compiled locally. Python snippets were syntax-checked with `python3`, and the Node.js snippet was checked with `node --check`.
