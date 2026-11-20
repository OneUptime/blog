# Validation summary

Compiled the complete Bicep snippet with official Bicep CLI 0.49.2 against the pinned metricAlerts 2018-03-01 API. The CLI asset SHA-256 matched official release metadata. Compilation exited successfully without diagnostics.

Inspected compiled JSON for one criterion per loop-created rule, single-server scope, three base metrics plus conditional replica lag, disabled default and retained metric validation. The shell build example passed bash syntax checking. Reviewed official metric definitions, aggregation and alert-state semantics. The generated image was visually inspected and is readable without clipping.

No Azure deployment validation, deployment, metrics query, live alert evaluation or notification delivery was performed. Compilation does not validate resource existence, permissions or actual metric availability. No independent binary signature verification was performed.

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
