# Validation Summary: How to Understand Dapr Alpha vs Beta vs Stable Features

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr runtime
- Dapr Configuration resource (Kubernetes and self-hosted)
- Dapr Metadata API
- Dapr feature flags / preview features

## Sources Consulted
- Dapr Preview Features documentation: https://docs.dapr.io/operations/support/support-preview-features/
- Dapr Configuration Overview: https://docs.dapr.io/operations/configuration/configuration-overview/
- Dapr Enable Preview Features How-To: https://docs.dapr.io/operations/configuration/preview-features/
- Dapr Metadata API Reference: https://docs.dapr.io/reference/api/metadata_api/
- Dapr Workflow Overview: https://docs.dapr.io/developing-applications/building-blocks/workflow/workflow-overview/

## Issues Found

1. **Metadata API jq path was incorrect.** The blog used `.extended.featuresEnabled` but the Dapr Metadata API returns enabled features at the top-level `.enabledFeatures` field, not nested under `.extended`. Fixed the curl command from `jq '.extended.featuresEnabled'` to `jq '.enabledFeatures'`.

2. **Workflow API tier was outdated.** The examples table listed the Workflow API as "Beta" with the note "Enabled by default in recent versions." The Dapr Workflow API graduated to Stable in Dapr 1.12. Updated the tier to "Stable" and the note to "Enabled by default since Dapr 1.12."

## Review Notes
- Dapr's official documentation uses the term "preview features" rather than a formal three-tier "Alpha/Beta/Stable" system for runtime features. The blog's three-tier model is a reasonable analogy (and mirrors Kubernetes' approach), but readers should be aware that official Dapr docs primarily distinguish between "preview" (opt-in) and "stable" (enabled by default) for runtime features. The Alpha/Beta/Stable maturity model is more formally applied to Dapr building block APIs and components.
- The specific preview feature flags (`HotReload`, `ActorStateTTL`) and their status as preview features were verified as accurate against the current documentation.
- The Configuration YAML format (`spec.features` with `name` and `enabled` fields), the `dapr.io/v1alpha1` apiVersion, the `dapr.io/config` pod annotation, and the `~/.dapr/config.yaml` self-hosted path were all verified as correct.
