# Validation Summary: How to Use Dapr Alpha and Beta APIs

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr HTTP API (alpha state query endpoint)
- Dapr Go SDK (cryptography building block)
- Dapr metadata API
- Dapr preview features

## Sources Consulted
- Dapr official docs: preview features — https://docs.dapr.io/operations/support/support-preview-features/
- Dapr official docs: state query API — https://docs.dapr.io/developing-applications/building-blocks/state-management/howto-state-query-api/
- Dapr official docs: metadata API reference — https://docs.dapr.io/reference/api/metadata_api/
- Dapr official docs: cryptography building block — https://docs.dapr.io/developing-applications/building-blocks/cryptography/
- Dapr Go SDK source: crypto.go — https://github.com/dapr/go-sdk/blob/main/client/crypto.go

## Issues Found

1. **Go SDK Crypto API code was incorrect (multiple errors)**
   - **Struct name**: Blog used `EncryptRequestOptions`; the correct name is `EncryptOptions`.
   - **Method signature**: `client.Encrypt` is a streaming API that takes `(ctx, io.Reader, EncryptOptions)` and returns `(io.Reader, error)`. The blog incorrectly showed it accepting a struct field `PlaintextData: []byte(...)` and returning `[]byte`.
   - **Missing field**: The `Algorithm` field (e.g., `"RSA"`) is required in `EncryptOptions` but was missing.
   - **Non-existent field**: `PlaintextData` is not a field on `EncryptOptions`; plaintext is passed as the `io.Reader` parameter.
   - **Pointer vs value**: Blog passed `&dapr.EncryptRequestOptions{...}` (pointer); the method takes `EncryptOptions` by value.
   - **API stability label**: The Cryptography API is listed as alpha in Dapr docs, not beta. Changed the comment accordingly.
   - **Fix**: Rewrote the Go example to use the correct streaming API with `bytes.NewReader`, `EncryptOptions`, and `io.ReadAll`.

2. **"Feature Flags" terminology is incorrect**
   - Dapr uses the term "preview features", not "feature flags". Updated section heading from "Discovering Available Feature Flags" to "Discovering Available Preview Features" and updated the Tags accordingly.

## Review Notes
- The Cryptography building block is listed as alpha (not beta) in the current Dapr preview features documentation. It may graduate to beta/stable in future Dapr releases.
- The State Query API (`v1.0-alpha1`) is also listed as alpha. The endpoint, method, and request body structure are all correct.
- The metadata endpoint and `enabledFeatures` field in the response are correctly documented.
- The three-tier stability model (Stable/Beta/Alpha) is accurate, though the Beta description ("may have minor breaking changes") is slightly optimistic — Dapr docs note that incompatible changes are still possible at the beta level and recommend non-business-critical use only.
