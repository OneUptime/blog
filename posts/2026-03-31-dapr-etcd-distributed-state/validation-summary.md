# Validation Summary: How to Use etcd for Distributed State with Dapr

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (state management building block)
- etcd (distributed key-value store)
- Kubernetes (deployment target)
- Helm / Bitnami etcd chart
- Dapr Go SDK (`github.com/dapr/go-sdk/client`)
- Dapr Python SDK (`dapr.clients`)
- etcdctl CLI

## Sources Consulted
- Dapr etcd state store docs: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-etcd/
- Dapr components-contrib etcd source: https://github.com/dapr/components-contrib/tree/main/state/etcd
- Dapr Go SDK source: https://github.com/dapr/go-sdk (client/state.go for SaveState signature)
- Dapr Python SDK source: https://github.com/dapr/python-sdk (dapr/clients/grpc/client.py)
- Dapr Python SDK docs: https://docs.dapr.io/developing-applications/sdks/python/python-client/
- Bitnami etcd Helm chart: https://github.com/bitnami/charts/tree/main/bitnami/etcd (values.yaml, README.md)

## Issues Found

1. **Component YAML: `dialTimeout` field does not exist** — Removed. The etcd state store component does not expose `dialTimeout` as a configurable metadata field; it is hard-coded to 5 seconds in the source code.

2. **Component YAML: `operationTimeout` field does not exist** — Removed. Like `dialTimeout`, operation timeouts are hard-coded internally and not configurable via component metadata.

3. **Component YAML: `keyPrefix` should be `keyPrefixPath`** — Changed `keyPrefix` to `keyPrefixPath`, which is the actual metadata field name in the Dapr etcd state store component.

4. **Component YAML: `version: v1` is deprecated** — Changed to `version: v2`. The v1 schema is deprecated and causes data inconsistencies with Actor TTLs in Dapr v1.12+. v2 should always be used for new deployments.

5. **Go code: Missing `"encoding/json"` import** — Added the missing import. The code uses `json.Marshal` but did not import the `encoding/json` package, which would cause a compile error.

6. **Go code: `SaveState` missing required `meta` parameter** — Added `nil` as the 5th argument to `SaveState`. The Go SDK signature is `SaveState(ctx, storeName, key, data, meta, ...options)` where `meta map[string]string` is required before the variadic options. Without it, the code would not compile.

7. **Python code: Non-idiomatic import** — Changed `import dapr.clients as dapr` to `from dapr.clients import DaprClient` and updated usages. While the original would work at runtime, it shadows the `dapr` module name and contradicts all official Dapr Python SDK documentation and examples.

8. **Summary section: Referenced incorrect field name** — Updated `keyPrefix` to `keyPrefixPath` in the summary paragraph to match the corrected component configuration.

## Review Notes
- The Helm install command sets three parameters (`persistence.size=8Gi`, `auth.rbac.create=true`, `auth.token.type=jwt`) to their already-default values. This is harmless and makes intent explicit, but readers should know these are the defaults.
- The health check command uses HTTPS endpoints and TLS certs, but the Helm install doesn't explicitly enable TLS. Readers may need to configure TLS separately (via `auth.client.secureTransport=true` and related cert parameters in the Bitnami chart) for the verification command to work as shown.
- The certificate paths in the health check (`/opt/bitnami/etcd/certs/ca.crt`) may need subdirectories in practice (e.g., `/opt/bitnami/etcd/certs/client/ca.crt`) depending on the Bitnami chart version and TLS configuration.
- The `get_state` response `.data` attribute in the Python example returns `bytes`, not `str`. This is correct usage but readers should be aware of the type.
