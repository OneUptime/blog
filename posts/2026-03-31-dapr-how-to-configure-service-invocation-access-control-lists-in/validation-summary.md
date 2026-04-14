# Validation Summary: How to Configure Service Invocation Access Control Lists in Dapr

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Configuration resources (`dapr.io/v1alpha1` / `Configuration`)
- Dapr service invocation access control lists (ACLs)
- Kubernetes (deployments, annotations, sidecar injection)
- mTLS / SPIFFE identity
- gRPC service invocation

## Sources Consulted
- Dapr official docs: Service invocation access control (https://docs.dapr.io/operations/configuration/invoke-allowlist/)
- Dapr official docs: Configuration schema reference (https://docs.dapr.io/reference/config-schema/)
- Dapr official docs: Configuration overview (https://docs.dapr.io/operations/configuration/configuration-overview/)
- Dapr official docs: Dapr CLI reference for `dapr invoke` (https://docs.dapr.io/reference/cli/dapr-invoke/)
- Dapr official docs: Service invocation API (https://docs.dapr.io/reference/api/service_invocation_api/)

## Issues Found
1. **`dapr invoke` used in Kubernetes context**: The "Verify Access Control Works" section used the `dapr invoke` CLI command, which is a self-hosted mode only command and does not work on Kubernetes clusters. The blog's prerequisites explicitly state a Kubernetes environment. Fixed by replacing `dapr invoke` commands with `curl` against the Dapr sidecar HTTP API (`http://localhost:3500/v1.0/invoke/<appId>/method/<method>`), which is the correct approach for testing service invocation on Kubernetes.

## Review Notes
- The YAML structure for Configuration resources, field names (`accessControl`, `defaultAction`, `trustDomain`, `policies`, `appId`, `namespace`, `operations`, `name`, `httpVerb`, `action`), and valid values all match official Dapr documentation.
- The `apiVersion: dapr.io/v1alpha1` and `kind: Configuration` are correct.
- Wildcard patterns (`/orders/*`, `/orders/*/payment`) are valid -- Dapr supports `*` for single path segments and `**` for multi-level matching.
- The gRPC section correctly omits `httpVerb` since it is ignored for gRPC invocations.
- The `dapr.io/config` annotation for attaching a Configuration to a deployment is correct.
- The troubleshooting log example is illustrative rather than exact, but the general approach (checking daprd sidecar logs for access control messages) is correct. The actual HTTP response for ACL denials is 403 with message "Invocation forbidden by access control".
- The statement "Without ACLs, any service in the same namespace can invoke any method on any other service" is slightly conservative -- without ACLs, cross-namespace invocation is also allowed by default. However, this is not misleading in context.
