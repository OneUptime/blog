# Validation Summary: How to Use Dapr Service Invocation with Python

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Service Invocation building block)
- Dapr Python SDK (`dapr` package)
- Python
- Flask
- Dapr Resiliency policies
- Dapr CLI (`dapr run`)

## Sources Consulted
- Dapr Python SDK GitHub repository: https://github.com/dapr/python-sdk
- Dapr Python SDK client docs: https://docs.dapr.io/developing-applications/sdks/python/python-client/
- Dapr Python SDK overview: https://docs.dapr.io/developing-applications/sdks/python/
- Dapr Resiliency schema reference: https://docs.dapr.io/reference/resource-specs/resiliency-schema/
- Dapr Resiliency overview: https://docs.dapr.io/operations/resiliency/resiliency-overview/
- Dapr retry policies docs: https://docs.dapr.io/operations/resiliency/policies/retries/retries-overview/
- Dapr CLI `dapr run` reference: https://docs.dapr.io/reference/cli/dapr-run/
- Dapr Python SDK source: `dapr/clients/grpc/_helpers.py`, `dapr/clients/grpc/_response.py`, `dapr/clients/http/dapr_invocation_http_client.py`

## Issues Found

1. **Incorrect import path for `MetadataDict`**: The post used `from dapr.clients.grpc._request import MetadataDict`. The `MetadataDict` type is defined in `dapr.clients.grpc._helpers`, not `_request`. Fixed to `from dapr.clients.grpc._helpers import MetadataDict`.

2. **Wrong `kind` in Resiliency YAML**: The post specified `kind: ResiliencyPolicy`. The correct Dapr resource kind is `Resiliency`. Fixed to `kind: Resiliency`.

3. **Incorrect `targets.apps` structure in Resiliency YAML**: The post wrapped the retry policy under an `outbound` key (`targets.apps.inventory-service.outbound.retry`). The `outbound` wrapper is used under `targets.components`, not `targets.apps`. For app-level targets, the retry policy is applied directly (`targets.apps.inventory-service.retry`). Removed the `outbound` nesting.

## Review Notes
- The `MetadataDict` type is imported from a private module (`_helpers` has a leading underscore). This is a private/internal API that could change between SDK versions. For production code, users may want to define their own type alias or use the raw dict type instead.
- The `metadata` parameter on `invoke_method()` has been marked as deprecated in newer versions of the SDK. The blog's usage is functional but readers should be aware it may be removed in future releases.
- All other code examples (`DaprClient` usage, `invoke_method` parameters, `result.text()`, Flask receiver service, `dapr run` CLI commands) are correct and follow current SDK conventions.
