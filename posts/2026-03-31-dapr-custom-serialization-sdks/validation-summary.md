# Validation Summary: How to Handle Custom Serialization in Dapr SDKs

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr .NET SDK (`Dapr.Client`)
- Dapr Go SDK (`github.com/dapr/go-sdk/client`)
- Dapr Python SDK (`dapr.clients`)
- System.Text.Json (.NET)
- AES-256-GCM encryption (Go `crypto/aes`, `crypto/cipher`)
- gzip compression and base64 encoding (Python)

## Sources Consulted
- Dapr .NET SDK documentation — `DaprClientBuilder.UseJsonSerializationOptions` method: https://docs.dapr.io/developing-applications/sdks/dotnet/
- Dapr Go SDK client interface — `SaveState` and `GetState` signatures: https://docs.dapr.io/developing-applications/sdks/go/
- Dapr Python SDK — `DaprClient.save_state` and `get_state` API: https://docs.dapr.io/developing-applications/sdks/python/
- Go standard library `crypto/aes`, `crypto/cipher` documentation: https://pkg.go.dev/crypto/aes, https://pkg.go.dev/crypto/cipher
- System.Text.Json `JsonConverter<T>` documentation: https://learn.microsoft.com/en-us/dotnet/standard/serialization/system-text-json/converters-how-to
- Go import ordering conventions (goimports): https://pkg.go.dev/golang.org/x/tools/cmd/goimports

## Issues Found

1. **Description referenced Node.js but no Node.js example was provided.** The description claimed coverage of ".NET, Go, Python, and Node.js" but the post only contains examples for .NET, Go, and Python. Fixed by removing "Node.js" from the description.

2. **Go `decrypt` function silently ignored errors, risking nil pointer panic.** The `aes.NewCipher` and `cipher.NewGCM` calls used `_` to discard errors. If the encryption key were invalid (wrong length), `aes.NewCipher` would return nil and the subsequent `cipher.NewGCM(nil)` call would panic. Fixed by adding proper error checking consistent with the `encrypt` function.

3. **Go import ordering violated conventions.** The `"context"` package (standard library) was placed after the third-party import `github.com/dapr/go-sdk/client`. Go convention (enforced by `goimports`) requires standard library imports to be grouped before third-party imports. Fixed by moving `"context"` into the standard library import group.

## Review Notes
- The .NET code correctly uses `UseJsonSerializationOptions` on `DaprClientBuilder`, which is the supported way to customize JSON serialization in the Dapr .NET SDK.
- The Go AES-GCM encrypt/decrypt pattern (prepending nonce to ciphertext) is standard and correct.
- The Python compressed state wrapper correctly handles both compressed and uncompressed payloads with a metadata flag, and the base64 encoding ensures binary-safe transport through JSON.
- The Dapr Python SDK's `save_state` accepts string values, and the code correctly ensures the payload is always a string before saving.
