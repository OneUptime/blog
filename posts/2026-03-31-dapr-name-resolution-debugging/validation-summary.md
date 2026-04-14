# Validation Summary: How to Debug Name Resolution Issues in Dapr

## Status
validated

## Post Type
Guide / Troubleshooting Reference

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Name Resolution Components (mDNS, Kubernetes DNS, Consul, SQLite)
- Dapr Metadata API
- Dapr CLI (`dapr run`, `dapr invoke`)
- Kubernetes (kubectl, DNS, annotations)
- HashiCorp Consul (HTTP API, health checks)
- SQLite
- mDNS / Multicast DNS

## Sources Consulted
- Dapr Metadata API reference: https://docs.dapr.io/reference/api/metadata_api/
- Dapr CLI reference (dapr run, dapr invoke): https://docs.dapr.io/reference/cli/
- Dapr log level configuration: https://docs.dapr.io/operations/configuration/increase-log-level/
- Dapr annotations reference: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr mDNS name resolution: https://docs.dapr.io/reference/components-reference/supported-name-resolution/nr-mdns/
- Dapr Kubernetes name resolution: https://docs.dapr.io/reference/components-reference/supported-name-resolution/nr-kubernetes/
- Dapr Consul name resolution: https://docs.dapr.io/reference/components-reference/supported-name-resolution/nr-consul/
- Dapr SQLite name resolution: https://docs.dapr.io/reference/components-reference/supported-name-resolution/nr-sqlite/
- Dapr Health API reference: https://docs.dapr.io/reference/api/health_api/

## Issues Found

1. **Incorrect metadata API field name (line 29)**: The post referred to `registeredComponents` as the field name in the metadata API response. The actual field name is `components`. Fixed to `components`.

2. **Hardcoded SQLite database path (line 117)**: The post used `/tmp/dapr-nameresolution.db` as if it were a default path. However, `connectionString` is a required metadata field in the SQLite name resolution component — there is no default path. Changed to `/path/to/your/nr.db` with a note to use the path from the component's `connectionString` metadata field.

3. **Invalid `--log-level` flag on `dapr invoke` (line 145)**: The post included `--log-level debug` as a flag for `dapr invoke`. This flag is not a documented option for the `dapr invoke` subcommand. Removed the flag from the command.

## Review Notes
- The mDNS debugging commands (`dns-sd -B _dapr._tcp local.` and `avahi-browse -rt _dapr._tcp`) use the service type `_dapr._tcp` which is plausible but not explicitly documented in the official Dapr docs. Port 5353 is the standard mDNS port per RFC 6762, so that claim is correct.
- The Kubernetes DNS section describes Dapr creating headless services with a `-dapr` suffix. This is consistent with how the Dapr operator/sidecar-injector creates services in Kubernetes, though the official name resolution docs don't detail this naming convention explicitly.
- The Consul API endpoints shown (`/v1/catalog/services`, `/v1/health/service/<name>`) are standard Consul HTTP API paths and are correct.
- The healthz endpoint (`/v1.0/healthz`) is confirmed correct. The post could optionally mention `/v1.0/healthz/outbound` as an alternative that doesn't require the app channel to be initialized.
- The SQLite column names (`appID, address, port, updateTime`) and table name (`hosts`) are plausible based on the documented table name default but column names are not explicitly documented.
