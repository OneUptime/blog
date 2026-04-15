# Validation Summary: How to Document Custom Dapr Components

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (component model, state management building block)
- Go (component implementation with `mapstructure` struct tags)
- YAML (Dapr component resource specs, metadata schema)
- Markdown (documentation formatting)

## Sources Consulted
- Dapr component spec documentation: https://docs.dapr.io/operations/components/component-schema/
- Dapr state management overview: https://docs.dapr.io/developing-applications/building-blocks/state-management/
- Dapr state management how-to: https://docs.dapr.io/developing-applications/building-blocks/state-management/howto-get-save-state/
- Dapr components-contrib repository (metadata.yaml structure): https://github.com/dapr/components-contrib
- Official Dapr component reference docs (metadata table format)

## Issues Found

### 1. Fabricated Go struct tags `mdonly` and `mdesc`
**What was wrong:** The post included Go struct tags `mdonly:"false"` and `mdesc:"..."` on the metadata struct, presented as standard Dapr tags for auto-generating documentation. These tags do not exist in the Dapr ecosystem. Dapr components-contrib uses `metadata.yaml` files alongside each component for documentation metadata, not custom Go struct tags.

**What was changed:** Replaced the struct with one using only the correct `mapstructure` tags. Replaced the fake struct-tag-based documentation generation approach with the actual `metadata.yaml` file approach used by official Dapr components in the components-contrib repository.

### 2. Non-existent documentation generation tool
**What was wrong:** The post referenced a CLI tool at `github.com/dapr/components-contrib/tools/generate-docs` with `--component` and `--output` flags. This tool does not exist at that path in the components-contrib repository. Documentation in Dapr is generated from `metadata.yaml` files by CI/build tooling, not a standalone Go CLI.

**What was changed:** Removed the fabricated `go run` command and replaced it with a `metadata.yaml` file example showing the standard schema used by all official Dapr components.

### 3. Summary paragraph referenced incorrect approach
**What was wrong:** The summary mentioned "Auto-generating metadata documentation from Go struct tags" which reflected the incorrect approach described above.

**What was changed:** Updated to reference `metadata.yaml` files as the mechanism for keeping docs synchronized with the official Dapr component documentation pipeline.

## Review Notes
- The Dapr component YAML format (`apiVersion: dapr.io/v1alpha1`, `kind: Component`, `spec.type/version/metadata` structure) is correct.
- The metadata table format (Field | Required | Details | Example) matches official Dapr component reference documentation.
- Both referenced URLs (state management overview and how-to guide) are valid and resolve correctly.
- The overall documentation structure recommended (README with component format, spec metadata table, authentication section, related links, troubleshooting table) aligns well with official Dapr component documentation patterns.
- The example uses `version: v2` in the component spec, which is valid but uncommon — most official components use `v1`. This is acceptable since it's a hypothetical custom component example.
