# Validation Summary: How to Enable Component Hot Reload in Dapr

## Status
validated

## Post Type
Tutorial / How-To Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Component Hot Reload (preview feature)
- Kubernetes (Deployments, Annotations, Secrets, Components CRD)
- Redis (as example state store component)

## Sources Consulted
- [Dapr Docs: Updating Components](https://docs.dapr.io/operations/components/component-updates/) — primary reference for hot reload behavior, limitations, and feature gate name
- [Dapr Docs: Preview Features](https://docs.dapr.io/operations/support/support-preview-features/) — confirmed HotReload introduced in v1.13
- [Dapr Docs: Enable Preview Features](https://docs.dapr.io/operations/configuration/preview-features/) — YAML configuration structure for feature flags
- [Dapr v1.13.0 Release Notes](https://github.com/dapr/dapr/releases/tag/v1.13.0) — confirmed hot reload as new preview feature in v1.13
- [Dapr CLI Issue #953: Rename --components-path](https://github.com/dapr/cli/issues/953) — confirmed `--components-path` deprecation in favor of `--resources-path`

## Issues Found

1. **Incorrect minimum version (Prerequisites)**: The post stated "Dapr v1.12+" but the HotReload feature was introduced in Dapr v1.13. Changed to "Dapr v1.13+".

2. **Incorrect reload behavior description (What Happens During a Hot Reload)**: The post described a "graceful drain" process where "in-flight requests complete" and included a fabricated second-by-second timeline. The official docs state the component is **closed and then reinitialized**, causing **brief unavailability** — not a graceful drain. Rewrote the section to match official documentation and added the `spec.ignoreErrors` behavior.

3. **Fabricated log messages (Observe Hot Reload Events in Logs)**: Changed "Draining current state.redis component" to "Closing current state.redis component" to match actual behavior, and added a note that exact log messages may vary by version.

4. **Inaccurate limitations (Limitations of Hot Reload)**: The post listed four limitations, two of which are not documented: "Input binding components require careful handling" and "Not all component types support graceful drain." The official docs only list **Actor State Stores** and **Workflow Backends** as unsupported. Rewrote the section to match official documentation, including the `spec.ignoreErrors` behavior.

5. **Deprecated CLI flag (Self-Hosted Mode)**: The post used `--components-path` which was deprecated in Dapr CLI 1.13 in favor of `--resources-path`. Updated the flag.

6. **Missing --config flag (Self-Hosted Mode)**: The self-hosted `dapr run` example did not include the `--config` flag needed to reference the Configuration resource with the HotReload feature enabled. Added `--config ./config.yaml` and explanatory text.

7. **Unsubstantiated poll interval claim (Self-Hosted Mode)**: The post claimed a "default 5 seconds" poll interval for self-hosted file watching. No official documentation supports this claim. Removed the specific interval and simplified to "Dapr detects the change automatically."

## Review Notes
- The HotReload feature is still listed as a **preview feature** in Dapr. The post could benefit from a note about this status, as preview features may change behavior across releases.
- The secret rotation technique (annotating a component to trigger reload) is a reasonable workaround but is not officially documented in Dapr docs. It works because the annotation change triggers a Kubernetes resource update that the sidecar detects, but readers should be aware this is a community pattern, not an officially supported workflow.
- The illustrative log messages shown throughout the post are approximate representations, not actual Dapr log output. A disclaimer was added to one section; the others are presented as expectations that "should" appear, which is acceptable for a tutorial.
