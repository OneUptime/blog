# Validation Summary: How to Use Dapr HTTP Output Binding

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr HTTP output binding (`bindings.http`)
- Dapr Bindings API
- Dapr Resiliency policies
- Node.js Dapr SDK (`@dapr/dapr`)
- Python Dapr SDK (`dapr`)

## Sources Consulted
- Dapr HTTP binding component reference: https://docs.dapr.io/reference/components-reference/supported-bindings/http/
- Dapr Bindings API reference: https://docs.dapr.io/reference/api/bindings_api/
- Dapr Bindings how-to guide: https://docs.dapr.io/developing-applications/building-blocks/bindings/howto-bindings/
- Dapr Resiliency policies documentation: https://docs.dapr.io/operations/resiliency/policies/
- Dapr Python SDK source (`BindingResponse` class)
- Dapr JS SDK (`DaprClient.binding.send` interface)

## Issues Found

1. **Spurious `metadata.method` field in curl example**: The curl invocation included `"method": "POST"` inside the `metadata` object. The HTTP method is determined solely by the `operation` field, not by metadata. The `method` key in metadata would be sent as a request header, which is misleading. Removed `"method": "POST"` from the metadata.

2. **Spurious `method` field in Node.js SDK example**: Same issue as above — the Node.js SDK example passed `method: 'POST'` in the metadata object. Removed it.

3. **Incorrect Python SDK response attribute (`resp.status_code`)**: The `BindingResponse` object in the Dapr Python SDK does not have a `status_code` attribute. Available attributes are `data`, `binding_metadata`, `headers`, `text()`, and `json()`. Changed `resp.status_code` to `resp.text()`.

4. **Incomplete supported operations list**: The blog listed 7 operations (get, post, put, patch, delete, options, head) but the Dapr HTTP binding supports 9 operations. Added `create` (alias for PUT, used for backward compatibility) and `trace` (HTTP TRACE).

5. **Incorrect resiliency YAML target key**: The resiliency configuration used `targets.bindings` but the correct key per Dapr documentation is `targets.components`. Changed `bindings` to `components`.

6. **Misleading explanatory text**: The sentence "You can override the path and method at invocation time" was updated to clarify that path is overridden via metadata and the HTTP method is set via the `operation` field.

## Review Notes
- The `create` operation in the Dapr HTTP binding maps to HTTP PUT (not POST), which may be non-obvious to readers. The blog lists it accurately after the fix.
- The Python SDK example passes `Content-Type` in `binding_metadata`, which is valid since metadata keys starting with a capital letter are forwarded as HTTP headers.
- Custom headers via metadata (e.g., `Authorization`, `X-Custom-Header`) work correctly as described because Dapr forwards capitalized metadata keys as request headers.
