# Validation Summary: How to Encrypt Application State in Dapr

## Status
validated

## Post Type
Tutorial / How-To Guide

## Technologies Covered
- Dapr (state management, client-side encryption)
- Redis (as example state store backend)
- AES encryption (AES-GCM / AES-CBC)
- Kubernetes secrets
- OpenSSL (key generation)
- Dapr JavaScript SDK (`@dapr/dapr`)
- Dapr HTTP API

## Sources Consulted
- [How-To: Encrypt application state | Dapr Docs](https://docs.dapr.io/developing-applications/building-blocks/state-management/howto-encrypt-state/) — primary reference for configuration, YAML format, key rotation
- [State management overview | Dapr Docs](https://docs.dapr.io/developing-applications/building-blocks/state-management/state-management-overview/) — confirms automatic client encryption with key rotation support
- [Security | Dapr Docs](https://docs.dapr.io/concepts/security-concept/) — confirms AES-based client-side state encryption at sidecar level
- [GitHub Issue #6027: Dapr state store encryption should switch to AES-CBC](https://github.com/dapr/dapr/issues/6027) — context on AES-GCM to AES-CBC migration
- [Dapr v1.14.0 release notes](https://github.com/dapr/dapr/blob/master/docs/release_notes/v1.14.0.md) — lists AES-CBC mode change as a release item

## Issues Found
1. **Key Requirements table incorrectly implied algorithm choice**: The original post presented a table with AES-CBC and AES-GCM as two separate user-selectable algorithms. In reality, users do not choose the encryption algorithm — Dapr manages the algorithm internally (historically AES-GCM, with AES-CBC introduced in v1.14). The user only provides an encryption key of the appropriate length. Replaced the table with a concise description stating that Dapr uses AES internally and the key must be 16, 24, or 32 bytes (AES-128/192/256).

## Review Notes
- The Dapr project has been migrating from AES-GCM to AES-CBC mode (starting with v1.14). The blog post now avoids committing to a specific mode, which makes it more resilient to this implementation change.
- The `openssl rand -hex 32` command generates a 256-bit (32-byte) key. This is valid, though the Dapr docs recommend 128-bit keys. Not an error, but worth noting.
- The JavaScript SDK example uses correct API patterns (`client.state.save` and `client.state.get`).
- The component YAML format with `primaryEncryptionKey` and `secondaryEncryptionKey` via `secretKeyRef` is correct per official documentation.
- The key rotation procedure described is accurate.
- The Redis key format `appid||key` shown in the verification examples is correct for Dapr's default key prefix behavior.
