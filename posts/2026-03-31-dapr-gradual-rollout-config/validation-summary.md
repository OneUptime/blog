# Validation Summary: How to Implement Gradual Rollout with Dapr Configuration

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr Configuration API
- Dapr Redis Configuration Store (`configuration.redis`)
- Dapr Go SDK (`github.com/dapr/go-sdk/client`)
- Go (atomic operations, FNV hashing, HTTP handlers)
- Redis (direct CLI usage for configuration values)
- Bash scripting (automated rollout with error rate monitoring)

## Sources Consulted
- Dapr Redis Configuration Store reference: https://docs.dapr.io/reference/components-reference/supported-configuration-stores/redis-configuration-store/
- Dapr Configuration API overview: https://docs.dapr.io/developing-applications/building-blocks/configuration/configuration-api-overview/
- Dapr Configuration API reference: https://docs.dapr.io/reference/api/configuration_api/
- Dapr How-To: Manage configuration: https://docs.dapr.io/developing-applications/building-blocks/configuration/howto-manage-configuration/
- Dapr Go SDK source (configuration.go): https://github.com/dapr/go-sdk/blob/main/client/configuration.go
- Dapr components-contrib Redis configuration source (redis_value.go): https://github.com/dapr/components-contrib/blob/main/configuration/redis/internal/redis_value.go
- Dapr components-contrib Redis settings source: https://github.com/dapr/components-contrib/blob/main/common/component/redis/settings.go

## Issues Found

### Issue 1: Invalid `subscribeOnly` metadata field in component YAML
- **What was wrong:** The component YAML included a metadata field `subscribeOnly` set to `"false"`. This field does not exist in the Dapr Redis configuration store component. It is not documented and does not appear in the component source code's `Settings` struct.
- **What was changed:** Removed the `subscribeOnly` metadata entry from the component YAML.
- **Why:** Using a non-existent metadata field could confuse readers and would be silently ignored by Dapr at runtime.

### Issue 2: Incorrect Redis key format using `||` separator in keys
- **What was wrong:** Redis keys were written as `rollouts||new-search-engine:percentage`, using `||` as a separator between the component name and the key. This is incorrect. In the Dapr Redis configuration store, the `||` separator is used **inside values** to separate the actual value from an optional version string (e.g., `"101||v1"`). Configuration store keys are plain strings with no component name prefix. The `appid||key` format is a state store concept, not a configuration store concept.
- **What was changed:** Changed all Redis keys from `rollouts||new-search-engine:percentage` format to `new-search-engine:percentage` (plain keys without the component name prefix). This affected three keys in the "Storing Rollout Configuration" section and two `redis-cli SET` commands in the "Automated Rollout Script" section.
- **Why:** Using the wrong key format would mean Dapr's configuration subscription would never receive updates, since it subscribes to keyspace notifications on the plain key name, not the prefixed version.

## Review Notes
- The Go SDK `SubscribeConfigurationItems` call ignores the return values `(string, error)`. The returned string is the subscription ID. In production code, the error should be checked, but this is acceptable for a blog example.
- The `UnsubscribeConfigurationItems` method is deprecated in the Go SDK. The preferred approach is to cancel the context passed to `SubscribeConfigurationItems`. The blog post does not call unsubscribe, so this is not an issue, but worth noting for readers who extend the pattern.
- The automated rollout script writes directly to Redis rather than going through the Dapr API. This works because the Redis configuration component uses Redis keyspace notifications to detect changes, so direct writes are picked up. However, readers should be aware this couples the script to the Redis implementation detail.
- The FNV-32a hash-based bucketing approach for user assignment is sound and provides deterministic, consistent assignment (the same user always lands in the same bucket), which is important for gradual rollouts.
