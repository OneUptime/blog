# Validation Summary: How to Implement Environment-Specific Config with Dapr

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr Configuration API
- Dapr Go SDK (`github.com/dapr/go-sdk/client`)
- Redis (as a Dapr configuration store)
- Kubernetes (namespace-scoped Dapr components, Deployment manifests)

## Sources Consulted
- Dapr Configuration API overview: https://docs.dapr.io/developing-applications/building-blocks/configuration/configuration-api-overview/
- Dapr Redis configuration store reference: https://docs.dapr.io/reference/components-reference/supported-configuration-stores/redis-configuration-store/
- Dapr Configuration how-to guide: https://docs.dapr.io/developing-applications/building-blocks/configuration/howto-manage-configuration/
- Dapr Go SDK client reference: https://docs.dapr.io/developing-applications/sdks/go/go-client/
- Dapr Kubernetes annotations reference: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr Go SDK pkg.go.dev: https://pkg.go.dev/github.com/dapr/go-sdk/client

## Issues Found

1. **Incorrect Redis key format with `||` separator**: The post used `"api-gateway||maxConnections"` as the Redis key format for seeding configuration values. The `||` separator is a Dapr state store concept, not used by the configuration store. Configuration store keys in Redis are plain key names (e.g., `"maxConnections"`). Fixed all four `redis-cli SET` commands to use plain keys.

2. **Misleading `dapr.io/config` annotation**: The Kubernetes Deployment example included `dapr.io/config: "tracing-config"`. This annotation specifies which Dapr sidecar Configuration CRD to use (for tracing, metrics, middleware pipelines), NOT which Configuration API store component to use. In a post specifically about the Configuration API, this annotation is misleading and irrelevant. Removed it from the example.

3. **Deprecated `UnsubscribeConfigurationItems` usage**: The subscription example used `client.UnsubscribeConfigurationItems()` which is deprecated in the Dapr Go SDK. The recommended approach is to cancel the context passed to `SubscribeConfigurationItems`. Rewrote the example to use `context.WithCancel` and context cancellation instead.

## Review Notes
- The Go SDK method signatures (`GetConfigurationItems`, `SubscribeConfigurationItems`) are correct. The callback type `func(id string, items map[string]*dapr.ConfigurationItem)` matches the documented `ConfigurationHandleFunction`.
- The component YAML structure (`apiVersion: dapr.io/v1alpha1`, `type: configuration.redis`, metadata fields) is accurate.
- The claim that Dapr components are namespace-scoped in Kubernetes is correct per official documentation.
- The optional variadic `...ConfigurationOpt` parameter on SDK methods is omitted in the code examples, which is acceptable for a tutorial.
