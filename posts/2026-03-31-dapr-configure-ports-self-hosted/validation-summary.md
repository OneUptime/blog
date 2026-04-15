# Validation Summary: How to Configure Dapr Ports in Self-Hosted Mode

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (self-hosted mode)
- Dapr CLI (`dapr run`)
- Dapr HTTP and gRPC APIs
- Dapr JavaScript SDK (`@dapr/dapr`)
- Dapr Python SDK (`dapr`)
- Prometheus metrics endpoint
- Bash scripting

## Sources Consulted
- Dapr CLI reference for `dapr run` — https://docs.dapr.io/reference/cli/dapr-run/
- Dapr environment variables reference — https://docs.dapr.io/reference/environment/
- Dapr metadata API reference — https://docs.dapr.io/reference/api/metadata_api/
- Dapr JavaScript SDK source and documentation — https://github.com/dapr/js-sdk
- Dapr Python SDK documentation — https://github.com/dapr/python-sdk

## Issues Found

1. **Incorrect internal gRPC default port (line 22)**: The post listed the Dapr internal gRPC port (Kubernetes only) as `50005`. The correct default is `50002` per the official Dapr CLI reference. Fixed to `50002`.

2. **JS SDK `communicationProtocol` used a plain string instead of the enum (lines 51-57)**: The post passed `communicationProtocol: 'HTTP'` as a string literal. The Dapr JS SDK defines `CommunicationProtocolEnum` as a numeric TypeScript enum, so the correct usage is `CommunicationProtocolEnum.HTTP`. Fixed the import to include `CommunicationProtocolEnum` and updated the constructor call to use the enum value.

## Review Notes
- The environment variables `DAPR_HTTP_PORT` and `DAPR_GRPC_PORT` are correct but are considered legacy. Dapr now also supports `DAPR_HTTP_ENDPOINT` and `DAPR_GRPC_ENDPOINT` as newer alternatives. The legacy variables still work, so this is not an error, but a future update could mention the newer alternatives.
- The multi-app script in Step 5 reuses port 50001 for the `orders` service gRPC port, which is also the Dapr default. This is technically fine since the port is explicitly assigned, but could be confusing to readers. Not changed since it is not incorrect.
