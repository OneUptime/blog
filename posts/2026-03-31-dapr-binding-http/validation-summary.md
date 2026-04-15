# Validation Summary: How to Set Up Dapr Binding with HTTP Endpoint

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr HTTP output binding (`bindings.http`)
- Dapr Bindings API (`/v1.0/bindings`)
- Python (requests library)
- Node.js (axios library)
- Go (net/http standard library)
- cURL

## Sources Consulted
- [Dapr HTTP Binding Spec - Official Documentation](https://docs.dapr.io/reference/components-reference/supported-bindings/http/)
- [Dapr Bindings API Reference](https://docs.dapr.io/reference/api/bindings_api/)
- [Dapr Bindings Overview](https://docs.dapr.io/developing-applications/building-blocks/bindings/bindings-overview/)
- [Dapr How-To: Use Output Bindings](https://docs.dapr.io/developing-applications/building-blocks/bindings/howto-bindings/)

## Issues Found

1. **Invalid `query` metadata field in GET request example**: The curl GET example used `"query": "fields=name,price"` as a separate metadata key. The Dapr HTTP binding does NOT have a `query` metadata field. Since `query` starts with a lowercase letter, it would not be sent as an HTTP header either (Dapr only forwards metadata keys starting with a capital letter as headers). **Fix**: Moved the query parameters into the `path` value: `"/products/123?fields=name,price"`.

2. **Metadata reference table listed nonexistent `query` field**: The table at the bottom of the post listed `query` as a valid metadata key with description "Query string parameters". This field does not exist in the Dapr HTTP binding specification. **Fix**: Removed the `query` row and updated the `path` description to note it can include query parameters.

3. **Metadata reference table inaccurately described header behavior**: The table stated "Any header name" is set as an HTTP header. Per the official Dapr docs, only metadata fields that **start with a capital letter** are passed as HTTP request headers. **Fix**: Updated the row to "Any capitalized key" with a description clarifying the capitalization requirement.

## Review Notes
- The `direction: "output"` metadata in the component YAML is valid. While not listed in the HTTP binding-specific docs, it is a general Dapr binding component feature that is recommended for all bindings to help decouple the sidecar and application lifecycle.
- The Node.js example uses top-level `await` with CommonJS `require()` syntax. Top-level await is only available in ES modules. This is a common pattern in blog code snippets and is understood to represent code that would run inside an async function.
- The Go example ignores the error from `json.Marshal()` which is not best practice but acceptable in a blog tutorial context.
- The list of supported operations mentions `get, post, put, patch, delete`. The binding also supports `create` (alias for POST), `head`, `options`, and `trace`, but omitting these less common operations is fine for a tutorial.
