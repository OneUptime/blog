# How to Understand Dapr API Versioning Scheme

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, API, Versioning, Compatibility, HTTP

Description: Understand how Dapr versions its HTTP and gRPC APIs, what each version prefix means, and how to handle API evolution in your applications.

---

Dapr exposes its runtime capabilities through versioned HTTP and gRPC APIs. Understanding the versioning scheme helps you write stable client code and plan upgrades confidently.

## HTTP API URL Structure

Every Dapr HTTP API follows this URL pattern:

```yaml
http://localhost:{dapr-port}/v{version}/{building-block}/{operation}
```

For example:

```bash
# v1.0 state management
curl http://localhost:3500/v1.0/state/statestore/mykey

# v1.0 pub/sub publish
curl -X POST http://localhost:3500/v1.0/publish/pubsub/orders \
  -H "Content-Type: application/json" \
  -d '{"orderId": "100"}'

# v1.0-alpha1 (alpha feature)
curl http://localhost:3500/v1.0-alpha1/workflows/dapr/myworkflow/start
```

## Version Stability Levels

Dapr uses three stability labels in API versions:

| Prefix | Meaning |
|--------|---------|
| `v1.0` | Stable - no breaking changes within this version |
| `v1.0-beta1` | Beta - may change, but close to stable |
| `v1.0-alpha1` | Alpha - experimental, may change or be removed |

Alpha APIs require opting in via the `dapr.io/config` annotation pointing to a Dapr Configuration resource.

## Enabling Alpha APIs

To use alpha APIs, create a Dapr Configuration and enable the feature gate:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: appconfig
spec:
  features:
    - name: WorkflowAPI
      enabled: true
```

Reference this config in your deployment:

```yaml
annotations:
  dapr.io/config: "appconfig"
```

## gRPC API Versioning

The gRPC proto packages follow the same pattern:

```text
dapr.proto.runtime.v1
dapr.proto.common.v1
```

Alpha gRPC APIs use packages like `dapr.proto.runtime.v1alpha1`.

When using the Go SDK, import stable protos from:

```go
import pb "github.com/dapr/dapr/pkg/proto/runtime/v1"
```

## What Stable Guarantees

For `v1.0` stable APIs, Dapr guarantees:

- No removal of existing endpoints within a major Dapr version
- No removal of existing request/response fields
- New optional fields may be added
- Behavior changes are communicated with deprecation notices

## Checking API Availability

Use the metadata endpoint to check which APIs are available in your running Dapr sidecar:

```bash
curl http://localhost:3500/v1.0/metadata
```

The response includes the runtime version, registered components, and subscriptions.

## Summary

Dapr HTTP APIs use `/v1.0/` prefixes for stable endpoints and `/v1.0-alpha1/` or `/v1.0-beta1/` for pre-stable features. Alpha APIs must be explicitly enabled via a Dapr Configuration resource. The `v1.0` stable APIs guarantee backwards compatibility within a major version, while alpha and beta APIs may change between Dapr releases.
