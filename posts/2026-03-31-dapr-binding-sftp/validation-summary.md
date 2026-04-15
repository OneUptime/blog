# Validation Summary: How to Use Dapr SFTP Binding for File Transfer

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (runtime 1.15+)
- Dapr SFTP output binding (`bindings.sftp`)
- Dapr Cron input binding
- SFTP / SSH
- Python (requests, base64)
- JavaScript / Express.js
- Kubernetes (kubectl secrets)
- curl

## Sources Consulted
- Dapr SFTP binding reference: https://docs.dapr.io/reference/components-reference/supported-bindings/sftp/
- Dapr supported bindings list: https://docs.dapr.io/reference/components-reference/supported-bindings/
- Dapr bindings API reference: https://docs.dapr.io/reference/api/bindings_api/

## Issues Found

1. **Missing required `rootPath` metadata field**: Both the main component YAML and the SSH key authentication snippet were missing the `rootPath` metadata field, which is required per the official documentation. Added `rootPath` with a sample value of `/data` to both configurations.

2. **Incorrect field name `privateKeyPassword`**: The SSH key authentication YAML snippet and the kubectl secret creation command used `privateKeyPassword`, but the correct metadata field name per the official docs is `privateKeyPassphrase`. Fixed in both the YAML snippet and the kubectl command.

3. **Undocumented `contentType` metadata in Python example**: The Python upload example included `"contentType": "application/octet-stream"` in the request metadata. This is not a documented metadata field for the SFTP binding's `create` operation. Removed it to avoid confusion.

4. **Missing `delete` operation in summary**: The summary paragraph listed only `create`, `get`, and `list` operations, but the SFTP binding also supports `delete`. Updated the summary to include all four operations.

## Review Notes
- The SFTP binding is an Alpha (v1) component introduced in Dapr 1.15. It is an output-only binding — the post correctly does not show it as an input binding.
- The Cron binding integration example is conceptually correct but intentionally high-level (pseudocode-style helper functions). This is fine for illustrating the pattern.
- The `data` field in the `create` operation should be base64-encoded per the docs. The curl example uses plain text (`"report-content-here"`), which works for text content but readers should be aware that binary content requires base64 encoding as shown in the Python example.
