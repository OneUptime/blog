# Validation Summary: How to Use Dapr Configuration for Environment-Specific Settings

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr Configuration API
- Dapr Redis Configuration Store component (`configuration.redis`)
- Dapr Go SDK (`github.com/dapr/go-sdk/client`)
- Redis
- Kubernetes (namespaces, secrets)

## Sources Consulted
- Dapr Configuration API reference — https://docs.dapr.io/reference/api/configuration_api/
- Dapr Redis Configuration Store component reference — https://docs.dapr.io/reference/components-reference/supported-configuration-stores/redis-configuration-store/
- Dapr How-To: Manage configuration from a store — https://docs.dapr.io/developing-applications/building-blocks/configuration/howto-manage-configuration/
- Dapr Go SDK client package — https://pkg.go.dev/github.com/dapr/go-sdk/client
- Dapr Component secrets reference — https://docs.dapr.io/operations/components/component-secrets/
- Dapr Component schema reference — https://docs.dapr.io/reference/resource-specs/component-schema/

## Issues Found

1. **Incorrect key format using double-pipe separator (`||`) in Redis configuration store keys.**
   - *What was wrong:* Strategy 1 used keys like `myapp||log-level`, and Strategy 2 used keys like `prod||myapp.log-level`. The double-pipe (`||`) separator is a convention of Dapr's **state store** (`state.redis`), where keys are formatted as `<app-id>||<state-key>`. The Dapr Redis configuration store uses plain key-value storage — keys are stored directly as-is without any special separator.
   - *What was changed:* Replaced all `myapp||key-name` keys in Strategy 1 with simple keys (e.g., `log-level`, `max-connections`, `cache-ttl`). Replaced `prod||myapp.log-level` style keys in Strategy 2 with dot-prefixed keys (e.g., `prod.log-level`).
   - *Why:* The double-pipe format would cause Dapr's configuration store to look up the literal key `myapp||log-level` in Redis, which would not match what the application requests via the Configuration API.

2. **Non-existent `keyPrefix` metadata field in `configuration.redis` component.**
   - *What was wrong:* The Strategy 2 component YAML included a `keyPrefix` metadata field. This field does not exist on the `configuration.redis` component — it is a feature of Dapr state store components (e.g., `state.redis`), not configuration store components.
   - *What was changed:* Removed the `keyPrefix` metadata entry from the component YAML. Updated the explanatory text to clarify that the environment prefix is handled in application code, not in the component definition.
   - *Why:* Including a non-existent metadata field would be silently ignored by Dapr, and keys would not be prefixed as intended, causing configuration lookups to fail.

3. **Go code did not actually use the environment prefix.**
   - *What was wrong:* The Go code fetched `APP_ENV` into a variable but immediately discarded it with `_ = env`, and used hardcoded keys like `myapp.log-level`. The comment claimed "component handles the prefix" but no such component-level prefix mechanism exists.
   - *What was changed:* Updated the Go code to construct prefixed keys using the `APP_ENV` value (e.g., `prod.log-level`) for Strategy 2. Added a comment explaining that Strategy 1 would use keys directly without a prefix.
   - *Why:* Since `keyPrefix` doesn't exist in the configuration store component, the application must handle key prefixing itself when using a shared store.

4. **Promotion script used incorrect key format.**
   - *What was wrong:* The promote-config.sh script used `myapp||${key}` format in its Redis GET/SET commands, matching the incorrect double-pipe convention from the original Strategy 1.
   - *What was changed:* Updated to use simple keys (`${key}`) without the `myapp||` prefix, consistent with the corrected Strategy 1 key format.
   - *Why:* Same as issue 1 — the double-pipe format is not used by Dapr's configuration store.

## Review Notes
- The `GetConfigurationItems` method name in the Dapr Go SDK was verified as correct. The method signature is `GetConfigurationItems(ctx context.Context, storeName string, keys []string, opts ...ConfigurationOpt) (map[string]*ConfigurationItem, error)`.
- The component YAML structure (`apiVersion: dapr.io/v1alpha1`, `kind: Component`, `version: v1`) is correct for the Redis configuration store.
- The `secretKeyRef` format with `name` and `key` fields is correct for referencing Kubernetes secrets in Dapr components.
- The helper functions `getStr` and `getInt` referenced in the Go code are not defined in the post. This is acceptable for a blog post that focuses on the configuration retrieval pattern rather than full implementation, but readers would need to implement these themselves.
- The summary paragraph still states "application code is identical" across environments, which is approximately true for Strategy 1 but not strictly true for Strategy 2 where the prefix is environment-dependent. This is a minor simplification rather than a technical error.
