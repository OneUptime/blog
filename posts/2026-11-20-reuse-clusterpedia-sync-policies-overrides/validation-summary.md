# Validation review

Checked the shared-policy examples against chart2.7.0 schemas and v0.9.0 manager behavior. The article explicitly distinguishes additions from exclusions, records the missing-reference warning, and separates policy rollback from stored-data recovery.

Local checks passed for YAML, synthetic credential-preserving patch results, array replacement, a rejected wrong-type version field, shell syntax, and five Mermaid edges. The generated1280x720 social image was visually reviewed: full title visible, no clipping.

No live cluster, RBAC, controller reconciliation, resource query, or server dry-run was executed. The jq fixture is limited to these shallow patches. Mermaid was structurally checked but not rendered. Sources are listed in validation.json.

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
