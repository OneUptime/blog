# Validation Summary: How to Set Up Service Discovery with Dapr

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (name resolution building block, service invocation API, CLI)
- Kubernetes (DNS-based service discovery, Services, Endpoints)
- mDNS (self-hosted local discovery)
- HashiCorp Consul (name resolution component)

## Sources Consulted
- Dapr Service Invocation Overview — https://docs.dapr.io/developing-applications/building-blocks/service-invocation/service-invocation-overview/
- Dapr Supported Name Resolution Components — https://docs.dapr.io/reference/components-reference/supported-name-resolution/
- Dapr Consul Name Resolution Setup — https://docs.dapr.io/reference/components-reference/supported-name-resolution/setup-nr-consul/
- Dapr How-To: Invoke and Discover Services — https://docs.dapr.io/developing-applications/building-blocks/service-invocation/howto-invoke-discover-services/
- HashiCorp Consul CLI: services register — https://developer.hashicorp.com/consul/commands/services/register

## Issues Found
No technical issues found.

## Review Notes
- The post lists three built-in name resolution components (Kubernetes DNS, mDNS, Consul). Dapr also supports SQLite (since runtime 1.13) and NameFormat (since runtime 1.16). The post does not claim to be exhaustive, so this is not an error, but readers should be aware additional options exist.
- The Consul name resolution component is listed as Alpha status in the official Dapr docs. The post recommends it for "production self-hosted deployments" without noting this status. Readers should verify the maturity level for their use case.
- All YAML configuration fields for the Consul name resolution component (`selfRegister`, `client.address`, `daprPortMetaKey`, `queryOptions.useCache`) match the official documentation exactly.
- The `consul services register` CLI syntax is valid. The single-dash flag style (`-name`, `-port`, `-tag`) is correct for Consul's CLI conventions.
- The Dapr service invocation API endpoint (`/v1.0/invoke/{app-id}/method/{method-name}`) and default HTTP port (3500) are correct.
- The Dapr sidecar container name `daprd` used in the `kubectl logs` example is accurate.
