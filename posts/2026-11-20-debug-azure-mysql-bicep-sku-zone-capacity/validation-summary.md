# Validation summary

Reviewed official MySQL capacity-error guidance, deployment history, CLI references and tagged CLI 2.80.0 command/parameter definitions. Checked MySQL 2024-12-30 resource property paths and the distinction between local compilation, what-if and allocation.

Three Bash examples passed syntax checking. JMESPath 1.0.1 tests on synthetic deployment data verified filtering failed operations while preserving nested error details, empty results, and correlation-ID extraction. The generated image was visually inspected and is readable without clipping.

No Azure CLI lookup, Bicep deployment, quota change or provider registration was executed. The build command refers to the reader's existing main.bicep; no actual reader template was available to compile. Synthetic query tests do not verify live response contents or capacity.

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
