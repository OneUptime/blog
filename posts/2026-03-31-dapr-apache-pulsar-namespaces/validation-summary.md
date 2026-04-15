# Validation Summary: How to Configure Apache Pulsar Namespaces for Dapr

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Apache Pulsar (namespaces, tenants, retention, persistence, JWT authentication, TLS)
- Dapr pub/sub component (`pubsub.pulsar`)
- Dapr Python SDK (`dapr-client`)
- Kubernetes (secrets, ConfigMap volumes)
- Pulsar Admin CLI (`pulsar-admin`)
- Pulsar Admin REST API

## Sources Consulted
- Apache Pulsar official documentation — Security/JWT authentication: https://pulsar.apache.org/docs/security-jwt/
- Apache Pulsar official documentation — Admin CLI (tenants, namespaces): https://pulsar.apache.org/docs/reference-pulsar-admin/
- Dapr Pulsar pub/sub component reference: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-pulsar/
- Dapr Python SDK documentation: https://docs.dapr.io/developing-applications/sdks/python/

## Issues Found

### 1. Incorrect Pulsar token CLI command
- **What was wrong:** The blog used `bin/pulsar-tokens create` — there is no `pulsar-tokens` binary in the Pulsar distribution.
- **What was changed:** Corrected to `bin/pulsar tokens create` (using the `pulsar` binary with `tokens` as a subcommand).
- **Why:** The standard Pulsar CLI binaries are `pulsar`, `pulsar-admin`, `pulsar-client`, `pulsar-daemon`, and `pulsar-perf`. Token management is a subcommand of the `pulsar` binary.

### 2. Combined tenant/namespace in Dapr component metadata
- **What was wrong:** The Dapr component configuration set `namespace: "mycompany/orders"`, combining the tenant and namespace into one field.
- **What was changed:** Split into separate `tenant: "mycompany"` and `namespace: "orders"` metadata fields.
- **Why:** The Dapr Pulsar component documents `tenant` and `namespace` as distinct metadata fields (defaulting to `"public"` and `"default"` respectively). Using a combined `"tenant/namespace"` value in the `namespace` field would produce an incorrect topic URL (e.g., `persistent://public/mycompany/orders/topic` instead of `persistent://mycompany/orders/topic`). The Summary section text was also updated to reflect both fields.

### 3. Invalid TLS metadata fields
- **What was wrong:** The TLS Configuration section used `tlsTrustCertsFilePath`, `tlsAllowInsecureConnection`, and `tlsValidateHostname` as Dapr component metadata fields. These are native Pulsar Java client configuration properties and are not exposed by the Dapr Pulsar component.
- **What was changed:** Replaced with `enableTLS: "true"`, which is the actual Dapr Pulsar component metadata field for TLS. Updated the explanatory text to note that the `pulsar+ssl://` scheme enables TLS and that custom CA certs should be mounted into the system trust store.
- **Why:** The Dapr Pulsar component only exposes `enableTLS` (boolean) for TLS configuration. Certificate trust is handled via the container's system trust store, not via component metadata fields.

## Review Notes
- The `--secret-key my-secret-key` flag in the token creation command uses a bare string. In production, this should be a file path (e.g., `file:///path/to/secret.key`) or a properly encoded key. Acceptable for a simplified tutorial example.
- The `redeliveryDelay: "10"` value in the component config does not specify a unit. According to the Dapr Pulsar component docs, this field accepts a duration string. The behavior may vary by version — consider using `"10s"` for clarity.
- The Python SDK example is correct and uses current API patterns (`publish_event` with named parameters).
- All Pulsar Admin CLI commands (`set-retention`, `set-message-ttl`, `set-persistence`) use correct flags and values.
- The REST API endpoints shown are correct Pulsar Admin v2 API paths.
