# Validation Summary: How to Use Dapr Configuration with Java

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Configuration building block)
- Java (Dapr Java SDK)
- Redis (as configuration store backend)
- Spring Framework (service annotation in example)
- Project Reactor (Mono/Flux reactive types)

## Sources Consulted
- Dapr Java SDK GitHub repository (https://github.com/dapr/java-sdk) — verified method signatures for `DaprClient.getConfiguration()`, `subscribeConfiguration()`, and `unsubscribeConfiguration()`
- Dapr official documentation for Configuration API (https://docs.dapr.io/developing-applications/building-blocks/configuration/)
- Dapr Redis configuration store component reference (https://docs.dapr.io/reference/components-reference/supported-configuration-stores/redis-configuration-store/)
- Maven Central for `io.dapr:dapr-sdk` version history (https://search.maven.org/artifact/io.dapr/dapr-sdk)

## Issues Found
1. **Incorrect method signature for `getConfiguration` (4 occurrences)**: The blog used `client.getConfiguration("configstore", List.of(...))` but the Dapr Java SDK does not have a `getConfiguration(String, List<String>)` overload. The correct overload requires a metadata map as the third parameter: `getConfiguration(String storeName, List<String> keys, Map<String, String> metadata)`. Fixed all calls to include `Map.of()` as the metadata argument.

2. **Incorrect method signature for `subscribeConfiguration` (2 occurrences)**: Same issue — `client.subscribeConfiguration("configstore", List.of(...))` does not match any overload. Fixed to include `Map.of()` as the metadata argument.

## Review Notes
- The Maven dependency version `1.13.0` is valid but outdated. The latest stable release is `1.17.2` as of April 2026. The code is correct for 1.13.0 and later versions, but the version could be updated in a future revision.
- The Configuration API was promoted from `DaprPreviewClient` to the stable `DaprClient` interface around SDK v1.10.0. Since the post targets v1.13.0, using `DaprClient` is correct. Some older Dapr documentation may still reference `DaprPreviewClient`.
- The `unsubscribeConfiguration(subscriptionId, "configstore")` parameter order (ID first, store name second) is correct.
- All import paths (`io.dapr.client.DaprClient`, `io.dapr.client.DaprClientBuilder`, `io.dapr.client.domain.ConfigurationItem`, `io.dapr.client.domain.SubscribeConfigurationResponse`) are valid.
- The Redis configuration store component YAML is correct with proper `redisHost` and `redisPassword` metadata fields.
