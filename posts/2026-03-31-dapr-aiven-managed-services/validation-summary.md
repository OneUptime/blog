# Validation Summary: How to Use Dapr with Aiven Managed Services

## Status
validated

## Post Type
Tutorial / Integration Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Aiven managed services
- PostgreSQL (Dapr state store component)
- Redis (Dapr pub/sub component)
- Apache Kafka (Dapr pub/sub component with mTLS)
- Kubernetes (secrets management)
- Aiven CLI (`avn`)

## Sources Consulted
- Dapr PostgreSQL state store component reference (https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-postgresql/)
- Dapr Redis pub/sub component reference (https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-redis-pubsub/)
- Dapr Kafka pub/sub component reference (https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-apache-kafka/)
- Dapr Metadata API reference (https://docs.dapr.io/reference/api/metadata_api/)
- Dapr State Management API reference (https://docs.dapr.io/reference/api/state_api/)
- Dapr Publish/Subscribe API reference (https://docs.dapr.io/reference/api/pubsub_api/)
- Aiven CLI documentation (https://aiven.io/docs/tools/cli)
- Aiven CLI GitHub repository (https://github.com/aiven/aiven-client)

## Issues Found

### Issue 1: Incorrect Aiven CLI flag `--format json` (3 occurrences)
- **What was wrong:** The post used `--format json` with the `avn service get` command in three places. The Aiven CLI does not support `--format json` as a data format specifier; `--format` expects a format string with placeholders. The correct flag for JSON output is `--json`.
- **What was changed:** Replaced `--format json` with `--json` on all three occurrences (PostgreSQL connection info display, PostgreSQL service URI extraction, Redis password extraction).
- **Why:** Using `--format json` would not produce JSON output and would instead be interpreted as a literal format string, causing the subsequent `jq` commands to fail.

### Issue 2: Incorrect Kafka `authType` value
- **What was wrong:** The Kafka pub/sub component YAML specified `authType: "certificate"`. The Dapr Kafka component does not recognize `"certificate"` as a valid `authType` value.
- **What was changed:** Changed `authType` value from `"certificate"` to `"mtls"`, which is the correct value for mutual TLS authentication in the Dapr Kafka component.
- **Why:** The valid `authType` values are: `none`, `password`, `mtls`, `oidc`, `oidc_private_key_jwt`, and `awsiam`. Using an invalid value would cause the component to fail to initialize.

### Issue 3: Deprecated `authRequired` field removed
- **What was wrong:** The Kafka pub/sub component YAML included `authRequired: "true"` alongside `authType`. The `authRequired` field is deprecated in the Dapr Kafka component.
- **What was changed:** Removed the `authRequired` field entirely, as `authType: "mtls"` already implies authentication is required.
- **Why:** Using deprecated fields is not recommended and the field is redundant when `authType` is specified.

## Review Notes
- The PostgreSQL component YAML uses `secretKeyRef` without an `auth.secretStore` block. In Kubernetes environments, this works because the Kubernetes secret store is typically the default. For non-Kubernetes deployments, an explicit `auth` block would be needed.
- The jq paths `.connection_info.pg[0]` (for PostgreSQL) and `.connection_info.redis_password[0]` (for Redis) in the Aiven CLI output could not be fully verified against documentation. These are plausible but readers should verify with their own `avn service get --json` output.
- The placeholder hostnames (`my-redis.a.aivencloud.com`, `my-kafka.a.aivencloud.com`) use a simplified pattern. Real Aiven hostnames follow the pattern `<service>-<project>.<subdomain>.aivencloud.com`, but the simplified form is acceptable for illustration purposes.
- All Dapr API endpoints (`/v1.0/metadata`, `/v1.0/state/{store}`, `/v1.0/publish/{pubsub}/{topic}`) and their request/response formats are correct.
