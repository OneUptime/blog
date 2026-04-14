# Validation Summary: How to Use Dapr Service Invocation with Different Content Types

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (service invocation API)
- HTTP content types (JSON, XML, form-urlencoded, multipart, Protobuf, NDJSON)
- curl (CLI HTTP client)
- Node.js (Express with xml2js, protobufjs, axios)
- Protocol Buffers (protoc CLI)

## Sources Consulted
- Dapr service invocation API reference: https://docs.dapr.io/reference/api/service_invocation_api/
- Dapr How-To: Invoke services using HTTP: https://docs.dapr.io/developing-applications/building-blocks/service-invocation/howto-invoke-discover-services/
- Protocol Buffers MIME types: https://protobuf.dev/reference/protobuf/mime-types/
- protobufjs npm documentation: https://www.npmjs.com/package/protobufjs
- xml2js npm documentation: https://www.npmjs.com/package/xml2js
- Dapr GitHub issues on content-type handling: https://github.com/dapr/dapr/issues/4469
- Dapr GitHub issues on multipart form data: https://github.com/dapr/dapr/issues/5765

## Issues Found
No technical issues found.

## Review Notes
- Multipart form data uploads through Dapr have known compatibility issues (dapr/dapr#5765, dapr/dapr#913) where some users report "Unsupported Media Type" errors. The blog post's curl example is syntactically correct, but users may encounter issues in practice. This is a Dapr limitation, not a blog error.
- The protobuf MIME type `application/protobuf` used in the post matches the official type documented at protobuf.dev. Some libraries and services use the non-standard `application/x-protobuf` instead; both are widely accepted.
- Dapr historically added a default `Content-Type: application/json` header when none was provided. This behavior can be disabled via the `ServiceInvocation.NoDefaultContentType` feature flag. The blog doesn't mention this, which is fine since all examples explicitly set the Content-Type header.
- The Node.js XML parsing example assumes appropriate body-parsing middleware is configured for raw/text bodies (e.g., `express.text({ type: 'application/xml' })`), which is standard practice and reasonable to omit from a focused snippet.
