# Validation Summary: How to Use Dapr with Azure OpenAI Service

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (service invocation, HTTP output binding, state management, secrets management)
- Azure OpenAI Service (GPT-4 chat completions API)
- Azure Key Vault (secret store)
- Kubernetes (Dapr sidecar injection annotations)
- Node.js / JavaScript (@dapr/dapr SDK)

## Sources Consulted
- [Dapr HTTP binding spec](https://docs.dapr.io/reference/components-reference/supported-bindings/http/) — verified component type, version, metadata fields, and header forwarding behavior
- [Dapr Bindings API reference](https://docs.dapr.io/reference/api/bindings_api/) — verified invocation endpoint, request body format, and operation field
- [Azure OpenAI REST API reference](https://learn.microsoft.com/en-us/azure/ai-services/openai/reference) — verified URL pattern and API versions
- [Azure OpenAI API version lifecycle](https://learn.microsoft.com/en-us/azure/ai-services/openai/api-version-deprecation) — checked GA version history
- [Dapr JavaScript SDK docs](https://docs.dapr.io/developing-applications/sdks/js/js-client/) — verified DaprClient import, constructor, state API
- [Dapr state management how-to](https://docs.dapr.io/developing-applications/building-blocks/state-management/howto-get-save-state/) — verified state.get and state.save signatures
- [Dapr service invocation API](https://docs.dapr.io/reference/api/service_invocation_api/) — verified invoke URL pattern
- [Dapr Kubernetes annotations](https://docs.dapr.io/reference/arguments-annotations-overview/) — verified annotation names
- [Azure Key Vault secret store component](https://docs.dapr.io/reference/components-reference/supported-secret-stores/azure-keyvault/) — verified component type and vaultName metadata
- [Dapr component secret references](https://docs.dapr.io/operations/components/component-secrets/) — verified secretKeyRef syntax and auth.secretStore requirement

## Issues Found

1. **Outdated Azure OpenAI API version**: The post used `api-version=2024-02-01`, which has been superseded. Updated to `2024-10-21` (current GA version).

2. **Lowercase `api-key` metadata key not forwarded as HTTP header**: Dapr's HTTP output binding only forwards metadata keys that start with a capital letter as HTTP request headers. The original `"api-key"` would be silently dropped. Changed to `"Api-Key"` — HTTP headers are case-insensitive per RFC 7230, so Azure OpenAI accepts this.

3. **Incorrect secret reference example**: The original example applied `secretKeyRef` to the `url` metadata field, which doesn't make sense — the URL is not a secret. Replaced with a complete component YAML showing the correct approach: using `securityToken` (with `secretKeyRef` for the API key) and `securityTokenHeader` (set to `"api-key"`), along with the required `auth.secretStore` field pointing to the Key Vault component.

## Review Notes
- The JavaScript example uses CommonJS `require()` syntax. The official Dapr JS SDK docs prefer ES module `import` syntax, but `require` works correctly. This is a style preference, not an error.
- The Kubernetes Deployment YAML in the service invocation section is intentionally minimal (showing only the Dapr-relevant annotations). It would not be a valid complete Deployment spec, but this is acceptable for a focused tutorial snippet.
- The `callAzureOpenAI(history)` function in the state management example is left undefined — it serves as a placeholder to keep the example focused on the Dapr state API, which is reasonable.
