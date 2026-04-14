# Validation Summary: How to Use Dapr Multi-App Run for Local Development

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Dapr CLI (multi-app run feature)
- Dapr sidecar architecture
- dapr.yaml multi-app run template configuration
- Node.js, Python, Go, .NET (as example app runtimes)
- Dapr Configuration API (tracing/Zipkin example)

## Sources Consulted
- Dapr multi-app run overview: https://docs.dapr.io/developing-applications/local-development/multi-app-dapr-run/multi-app-overview/
- Dapr multi-app run template reference: https://docs.dapr.io/developing-applications/local-development/multi-app-dapr-run/multi-app-template/
- Dapr CLI `dapr run` reference: https://docs.dapr.io/reference/cli/dapr-run/
- Dapr CLI `dapr stop` reference: https://docs.dapr.io/reference/cli/dapr-stop/
- Dapr CLI source code (`pkg/standalone/run.go`, `pkg/runfileconfig/run_file_config.go`) for schema verification

## Issues Found

### 1. Removed fabricated "Template Variables" section
**What was wrong:** The post contained an entire section claiming that `dapr run -f` supports an `--env-file` flag and that dapr.yaml supports `${VAR}` template variable interpolation from `.env` files. Neither feature exists in Dapr. There is no `--env-file` flag on `dapr run`, and the dapr.yaml file is parsed as standard YAML without template variable substitution.
**What was changed:** Removed the "Template Variables" section entirely (including the `.env` file example, the dapr.yaml snippet with `${REDIS_HOST}`, and the `dapr run -f dapr.yaml --env-file .env` command).
**Why:** The section described non-existent functionality that would cause errors if readers attempted to use it.

### 2. Added missing `h2c` to `appProtocol` valid values
**What was wrong:** The comment on the `appProtocol` field listed `http | grpc | https | grpcs` but omitted `h2c` (HTTP/2 Cleartext), which is a valid and documented protocol option.
**What was changed:** Updated the comment from `# http | grpc | https | grpcs` to `# http | grpc | https | grpcs | h2c`.
**Why:** Completeness of the reference for valid `appProtocol` values per the official Dapr CLI documentation.

## Review Notes
- The `resourcesPath` field (singular) used throughout the post is technically deprecated in favor of `resourcesPaths` (plural, which accepts a list). The singular form still works for backward compatibility, but readers building new projects may want to use the plural form.
- The multi-app run feature is noted as being in alpha in some versions of the Dapr documentation. Readers should verify the feature's stability status for their Dapr CLI version.
- All other dapr.yaml fields, CLI commands (`dapr run -f`, `dapr stop -f`, `dapr stop --app-id`, `dapr list`), configuration examples, and the Dapr Configuration resource YAML are accurate.
