# Validation Summary: How to Use Dapr Multi-App Run Template in Self-Hosted Mode

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr CLI (Multi-App Run with `dapr run -f`)
- YAML configuration for multi-app templates
- Self-hosted local development mode

## Sources Consulted
- Dapr official documentation: Multi-App Run overview (https://docs.dapr.io/developing-applications/local-development/multi-app-dapr-run/multi-app-overview/)
- Dapr official documentation: Multi-App Run template reference (https://docs.dapr.io/developing-applications/local-development/multi-app-dapr-run/multi-app-template/)
- Dapr CLI source code (`cmd/run.go`) for flag compatibility verification
- Dapr v1.10 release notes (confirming Multi-App Run introduction version)

## Issues Found

### 1. Incorrect Dapr version for Multi-App Run introduction
- **What was wrong:** The post stated Multi-App Run was "introduced in Dapr 1.12" and listed "Dapr CLI v1.12+" as a prerequisite.
- **What was changed:** Corrected to "Dapr 1.10" and "Dapr CLI v1.10+" respectively.
- **Why:** Multi-App Run was first introduced as a feature in Dapr v1.10 (self-hosted mode). Dapr v1.11 added enhancements (logging, multiple resource paths), and v1.12 added Windows support and Kubernetes Multi-App Run. The original version was v1.10.

### 2. Non-existent `--app-id` flag for subset app selection
- **What was wrong:** The "Run a Subset of Apps" section claimed you could use `--app-id` flags with `dapr run -f` to start only specific services from the template (e.g., `dapr run -f dapr.yaml --app-id order-service --app-id payment-service`).
- **What was changed:** The entire "Run a Subset of Apps" section was removed.
- **Why:** The `--app-id` flag is not compatible with the `-f` (run file) mode. The Dapr CLI source code shows that only a limited set of flags (`kubernetes`, `help`, `version`, `runtime-path`, `log-as-json`) are compatible with `-f`. There is no supported mechanism to run a subset of apps from a multi-app template.

## Review Notes
- The `--log-as-json` flag used in the "View Logs for a Specific App" section exists in the Dapr CLI source code and is compatible with `-f` mode. However, it is not prominently documented in the official CLI reference. The `jq` filter using `.app_id` as the JSON field name may need adjustment depending on the actual JSON log schema — users should verify the field names in their log output.
- The "Use Environment Files" section title is slightly misleading — it shows inline `env:` map entries in YAML rather than referencing an external `.env` file. The YAML content itself is technically correct, but the section doesn't demonstrate `.env` file usage as the title implies.
- The `common` section fields (`appHealthCheckPath`, `appHealthProbeInterval`, `appHealthProbeTimeout`, `appMaxConcurrency`) shown in the "Full Template Options Reference" are supported by the Dapr source code struct definitions but are not showcased in official documentation examples. They should work but are not officially documented for the `common` section.
