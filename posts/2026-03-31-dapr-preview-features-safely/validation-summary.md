# Validation Summary: How to Use Dapr Preview Features Safely

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Kubernetes (for Dapr deployment annotations and Configuration CRD)
- Python (illustrative feature flag pattern)
- Dapr CLI

## Sources Consulted
- Dapr preview features documentation: https://docs.dapr.io/operations/configuration/preview-features/
- Dapr Kubernetes overview (annotations): https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-overview/
- Dapr self-hosted install guide: https://docs.dapr.io/getting-started/install-dapr-selfhost/
- Dapr CLI reference (dapr init): https://docs.dapr.io/reference/cli/dapr-init/
- Dapr CLI reference (dapr version): https://docs.dapr.io/reference/cli/dapr-version/
- Dapr alpha/beta APIs: https://docs.dapr.io/operations/support/alpha-beta-apis/
- Dapr source code (pkg/config/configuration.go) for actual preview feature names

## Issues Found
1. **Invalid preview feature names in YAML examples**: "SchedulerReminders" and "ActorTypeMetadata" are not real Dapr preview feature names. Replaced with actual current preview feature names: `ActorStateTTL` and `HotReload`.
2. **Inaccurate "common preview features" list**: The original list included "Scheduler service", "Outbox pattern", and "Query API for state stores". The Query API is an alpha API (uses `/v1.0-alpha1/` endpoints), not a preview feature toggled via Configuration YAML. Replaced the list with actual preview features: Actor state TTL, Hot reload, Workflows clustered deployment, and App health checks (noted as now stable).
3. **Wrong code block language**: The `dapr init --runtime-version 1.13.2` command was inside a `yaml` fenced code block. Changed to `bash` since it is a CLI command.
4. **Python pseudocode referenced non-existent feature**: Updated the illustrative Python code to reference `ActorStateTTL` (a real preview feature) instead of the non-existent `SchedulerReminders`, with more plausible method names.

## Review Notes
- Dapr has two distinct maturity tracks that the post could clarify further: "preview features" (toggled via Configuration YAML feature flags) and "alpha/beta APIs" (versioned API endpoints like `/v1.0-alpha1/`). The post's distinction between alpha and preview is slightly oversimplified but acceptable for a guide focused on the Configuration-based preview features.
- The Python code example uses illustrative method names (e.g., `save_state_with_ttl`) that approximate but do not exactly match the Dapr Python SDK API. This is acceptable as the code demonstrates the feature-flag pattern rather than exact SDK usage.
- The claim that app health checks became stable "in 1.13+" could not be confirmed to a specific version. Changed to "in recent versions" to avoid asserting an unverified version number.
- `dapr --version` and `dapr version` are both valid commands. The former outputs just the CLI version; the latter shows both CLI and runtime versions. Either is acceptable in this context.
