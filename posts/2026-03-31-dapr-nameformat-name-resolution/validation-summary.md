# Validation Summary: How to Configure NameFormat Name Resolution in Dapr

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (name resolution subsystem)
- NameFormat name resolution component
- Kubernetes (deployment annotations)
- DNS / service discovery

## Sources Consulted
- Dapr components-contrib source code: `nameresolution/nameformat/nameformat.go` — confirms `{appid}` simple string replacement (not Go templates), and that only app ID is used
- Dapr components-contrib metadata: `nameresolution/nameformat/metadata.yaml` — confirms field name is `format` (not `nameFormat`), version is `v1`, status is alpha
- Dapr Configuration overview documentation (https://docs.dapr.io/operations/configuration/configuration-overview/) — confirms name resolution is configured via `kind: Configuration` under `spec.nameResolution`, not as a `kind: Component`
- Dapr supported name resolution components reference (https://docs.dapr.io/reference/components-reference/supported-name-resolution/)
- Dapr Configuration schema spec (https://docs.dapr.io/reference/resource-specs/configuration-schema/)

## Issues Found

1. **Wrong resource kind (Critical):** All YAML examples used `kind: Component` with `spec.type: nameresolution.nameformat`. Dapr name resolution is configured via `kind: Configuration` with `spec.nameResolution.component: "nameformat"`. Fixed all three YAML snippets to use the correct Configuration resource structure.

2. **Wrong metadata field name (Critical):** The post used `nameFormat` as the metadata field name. The actual field is `format`, nested under `spec.nameResolution.configuration`. Fixed in all examples.

3. **Wrong template syntax and variables (Critical):** The post claimed the component uses Go template syntax (`{{ .ID }}`, `{{ .Namespace }}`, `{{ .Port }}`). The actual implementation uses simple string replacement with a single `{appid}` placeholder. Only `{appid}` is supported — namespace and port are not available as variables. Rewrote the "Using Template Variables" section to "Using the Format Placeholder" with correct information.

4. **Incorrect application instructions (Moderate):** The "Applying the Component" section instructed users to copy a YAML file to `~/.dapr/components/` or use `--components-path`, which is how Dapr components are loaded. Name resolution configuration is applied via `--config` flag (self-hosted) or the `dapr.io/config` annotation (Kubernetes). Rewrote the section with correct instructions.

5. **Misleading description (Minor):** The intro described the component as using "a Go template to construct the target hostname." Changed to "simple string replacement" to accurately reflect the implementation.

## Review Notes
- The nameformat component is in alpha status as of Dapr v1.16. This could change in future versions and the API surface may evolve.
- The namespace example was adjusted — since `{appid}` is the only supported placeholder, namespace must be hardcoded in the format string rather than dynamically resolved. This is a limitation users should be aware of.
- The comparison table listing `sqlite` as a name resolution component appears valid (added for Docker Compose scenarios).
