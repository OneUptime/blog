# Validation Summary: How to Configure mDNS Name Resolution for Dapr Self-Hosted Mode

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (self-hosted mode)
- mDNS (Multicast DNS) for service discovery
- Dapr CLI (`dapr run`, `dapr list`, `dapr invoke`)
- Dapr Configuration resources
- HashiCorp Consul (mentioned as alternative)
- SQLite name resolution (mentioned as alternative)

## Sources Consulted
- Dapr supported name resolution components overview: https://docs.dapr.io/reference/components-reference/supported-name-resolution/
- Dapr configuration overview (nameResolution spec): https://docs.dapr.io/operations/configuration/configuration-overview/
- Dapr Consul name resolution setup (for Configuration YAML format reference): https://docs.dapr.io/reference/components-reference/supported-name-resolution/setup-nr-consul/
- Dapr CLI `dapr invoke` reference: https://docs.dapr.io/reference/cli/dapr-invoke/
- Dapr service invocation how-to: https://docs.dapr.io/developing-applications/building-blocks/service-invocation/howto-invoke-discover-services/
- RFC 6762 (Multicast DNS): https://www.rfc-editor.org/rfc/rfc6762.html

## Issues Found

### 1. Wrong resource kind for name resolution configuration
- **What was wrong:** The blog configured mDNS as a `kind: Component` resource with `spec.type: nameresolution.mdns` and `spec.metadata` fields. Dapr name resolution is configured via `kind: Configuration` resources with `spec.nameResolution.component` and `spec.nameResolution.version`.
- **What was changed:** Replaced the `kind: Component` YAML block with the correct `kind: Configuration` format using `spec.nameResolution.component: "mdns"` and `spec.nameResolution.version: "v1"`.
- **Why:** The Dapr documentation explicitly states name resolution components are configured via the Configuration resource, not as standalone Component resources.

### 2. Wrong placement instruction and CLI flag
- **What was wrong:** The blog instructed readers to place the config in the components directory (`~/.dapr/components/`) and use `--components-path`. Configuration files are referenced with the `--config` flag, not `--components-path`.
- **What was changed:** Updated the instruction to save as a configuration file and use `--config ./config.yaml`.
- **Why:** The `--components-path` flag is for Dapr component files (state stores, pub/sub, etc.), not for Dapr runtime configuration which includes name resolution.

### 3. Non-existent mDNS metadata fields
- **What was wrong:** The multi-interface section showed `subscriberAddressFamily` and `addressPrefix` as mDNS configuration metadata fields. These fields do not exist in the Dapr mDNS component (the mDNS-specific docs page returns 404, and mDNS is designed as a zero-configuration component).
- **What was changed:** Replaced the incorrect YAML with an explanation that mDNS does not support interface selection configuration, and provided a Consul configuration example as the recommended alternative for multi-interface environments.
- **Why:** Recommending non-existent configuration fields would cause confusion and errors for readers.

## Review Notes
- The mDNS-specific documentation page (setup-nr-mdns/) returns 404 on the Dapr docs site, suggesting mDNS is intentionally zero-configuration with no user-tunable settings beyond what the Configuration resource provides.
- All CLI commands (`dapr run`, `dapr list`, `dapr invoke`), flags, and the service invocation URL format (`/v1.0/invoke/{app-id}/method/{method-name}`) are correct.
- UDP port 5353 for mDNS is correct per RFC 6762.
- The troubleshooting advice (tcpdump, debug logging, firewall/VPN considerations) and limitations section are technically accurate.
- SQLite name resolution is correctly mentioned as an alternative, though it is currently in Alpha status in Dapr.
