# Validation Summary: How to Choose the Right Name Resolution Component for Dapr

## Status
validated

## Post Type
Decision Guide / Reference

## Technologies Covered
- Dapr (name resolution subsystem)
- Kubernetes DNS service discovery
- mDNS (multicast DNS)
- HashiCorp Consul
- SQLite (file-based name resolution)
- Dapr NameFormat component
- AWS Cloud Map

## Sources Consulted
- Dapr Name Resolution components overview: https://docs.dapr.io/reference/components-reference/supported-name-resolution/
- Dapr Kubernetes name resolution: https://docs.dapr.io/reference/components-reference/supported-name-resolution/nr-kubernetes/
- Dapr mDNS name resolution: https://docs.dapr.io/reference/components-reference/supported-name-resolution/nr-mdns/
- Dapr Consul name resolution: https://docs.dapr.io/reference/components-reference/supported-name-resolution/nr-consul/
- Dapr SQLite name resolution: https://docs.dapr.io/reference/components-reference/supported-name-resolution/nr-sqlite/
- Dapr NameFormat name resolution: https://docs.dapr.io/reference/components-reference/supported-name-resolution/nr-nameformat/

## Issues Found

### 1. Wrong YAML resource format for all configuration examples
**What was wrong:** All YAML examples used Component resource format (`spec.type`, `spec.version`, `spec.metadata`) with `nameresolution.X` type strings. Dapr name resolution is configured via the Configuration resource using `spec.nameResolution.component` with plain string values (e.g., `"kubernetes"`, `"consul"`) and `spec.nameResolution.configuration` for settings.
**What was changed:** All five YAML snippets were rewritten to use the correct Configuration resource format.

### 2. NameFormat field name and template syntax were incorrect
**What was wrong:** The post used `nameFormat` as the field name with Go template syntax (`{{ .ID }}`). The correct field name is `format` and it uses `{appid}` placeholder syntax (not Go templates).
**What was changed:** Updated the field name to `format` and the value to use `{appid}` placeholder syntax (e.g., `"service-{appid}.prod.internal"`).

### 3. Consul `datacenter` field placement was incorrect
**What was wrong:** The `datacenter` field was shown inside the `client` configuration object. According to Dapr's Consul docs, `datacenter` belongs under `queryOptions`, not `client`.
**What was changed:** Moved `datacenter` to a separate `queryOptions` block. Also changed the format from an embedded JSON string to proper YAML map structure, which is what Dapr Configuration resources expect.

### 4. AWS Cloud Map comparison matrix row was inaccurate
**What was wrong:** The row listed `kubernetes` + CoreDNS as the recommended component for AWS Cloud Map. Dapr has a dedicated `cloudmap` name resolution component for AWS Cloud Map.
**What was changed:** Updated the row to recommend `cloudmap` instead of `kubernetes` + CoreDNS.

### 5. Incorrect component type reference in prose
**What was wrong:** The Kubernetes section referenced `nameresolution.kubernetes` in inline code. The correct component name is simply `kubernetes`.
**What was changed:** Updated to `kubernetes`.

## Review Notes
- The post omits the AWS Cloud Map (`cloudmap`) component from its main decision guide sections, only mentioning it in the comparison matrix. This is acceptable since the post focuses on the most common scenarios, but authors may want to add a brief section on Cloud Map for AWS users.
- mDNS may not work in some cloud provider virtual networks (e.g., Azure VMs) or on enterprise macOS systems with network filters. The post could note this caveat.
- All five name resolution components listed in the post (mDNS, Kubernetes, Consul, SQLite, NameFormat) are accurately described in terms of their use cases and trade-offs.
