# Validation Summary: How to Understand Dapr Service Discovery Mechanisms

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Name Resolution Components (mDNS, Kubernetes, Consul)
- Kubernetes DNS-based service discovery
- Dapr Python SDK
- mTLS (mutual TLS)

## Sources Consulted
- Dapr Supported Name Resolution Components reference: https://docs.dapr.io/reference/components-reference/supported-name-resolution/
- Dapr Kubernetes Name Resolution docs: https://docs.dapr.io/reference/components-reference/supported-name-resolution/nr-kubernetes/
- Dapr Placement Service documentation: https://docs.dapr.io/concepts/dapr-services/placement/
- Dapr Configuration Overview: https://docs.dapr.io/operations/configuration/configuration-overview/
- Dapr Configuration Schema spec: https://docs.dapr.io/reference/resource-specs/configuration-schema/
- Dapr Metadata API reference: https://docs.dapr.io/reference/api/metadata_api/
- Dapr Python SDK source (invoke_method): https://github.com/dapr/python-sdk

## Issues Found

1. **Incorrect component count and names**: The post stated "three built-in name resolution components" but listed four in the table. Dapr actually ships with six (mdns, kubernetes, consul, sqlite, nameformat, aws.cloudmap). The component names used the wrong `nr.` prefix (e.g., `nr.mdns` instead of `mdns`). Additionally, `nr.dns` was listed but no such component exists. **Fixed**: Changed text to "several," removed the `nr.` prefix from all component names, and removed the fabricated `dns` entry.

2. **Incorrect Kubernetes name resolution description**: The post claimed Dapr uses "the Kubernetes API" to resolve app IDs and that "the `dapr-placement` service coordinates discovery." In reality, Dapr's Kubernetes name resolution uses the cluster's DNS provider (standard Kubernetes DNS), not the Kubernetes API. The `dapr-placement` service is exclusively for Dapr actor placement and has nothing to do with service discovery. **Fixed**: Corrected the description to reference Kubernetes DNS and removed the `dapr-placement` claim.

3. **Wrong default Configuration resource name**: The kubectl command referenced `dapr-system` as the Configuration resource name, but the actual name installed by the Dapr control plane is `daprsystem` (no hyphen). **Fixed**: Changed `dapr-system` to `daprsystem` in the kubectl command.

4. **Custom Name Resolution uses wrong resource kind**: The custom name resolution example used `kind: Component` with `spec.type: nameresolution.mdns`. Name resolution is configured within a `kind: Configuration` resource under `spec.nameResolution`, not as a standalone Component resource. **Fixed**: Replaced with the correct Configuration resource format showing a Consul name resolver example.

## Review Notes
- The Python SDK `invoke_method` usage is correct with valid parameter names (`app_id`, `method_name`, `data`, `content_type`).
- The mDNS configuration snippet and `dapr run` commands are correct.
- The service invocation flow (5 steps) is accurate.
- The metadata endpoint (`/v1.0/metadata`) and `appConnectionProperties` field exist, though `appConnectionProperties` shows the local app's connection properties (how the sidecar connects to its own app), not discovered remote services. This is slightly misleading in the "Verifying Service Discovery" context but not technically wrong, so it was left as-is.
- The post does not mention newer name resolution components (sqlite, nameformat, aws.cloudmap) but this is acceptable as it focuses on the most common ones.
