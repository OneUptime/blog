# Validation Summary: How to Use IDE Auto-Completion and Validation with the OpenTelemetry Config

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry declarative configuration
- JSON Schema
- YAML Language Server
- Red Hat VS Code YAML extension
- VS Code settings
- JetBrains IDE JSON Schema mappings
- Neovim nvim-lspconfig / yaml-language-server
- SchemaStore

## Sources Consulted
- OpenTelemetry configuration repository README: https://github.com/open-telemetry/opentelemetry-configuration
- OpenTelemetry compiled schema: https://raw.githubusercontent.com/open-telemetry/opentelemetry-configuration/main/opentelemetry_configuration.json
- OpenTelemetry generated schema documentation: https://github.com/open-telemetry/opentelemetry-configuration/blob/main/schema-docs.md
- OpenTelemetry getting started example: https://github.com/open-telemetry/opentelemetry-configuration/blob/main/examples/otel-getting-started.yaml
- Red Hat YAML Language Server README: https://github.com/redhat-developer/yaml-language-server
- Red Hat VS Code YAML extension README: https://github.com/redhat-developer/vscode-yaml
- SchemaStore catalog: https://www.schemastore.org/api/json/catalog.json
- JetBrains JSON Schema documentation: https://www.jetbrains.com/help/idea/json.html
- JetBrains YAML documentation: https://www.jetbrains.com/help/idea/yaml.html
- Neovim nvim-lspconfig repository: https://github.com/neovim/nvim-lspconfig

## Issues Found
- The schema URL used throughout the post pointed to `schema/opentelemetry_configuration.json`, which now returns 404. Updated all references to the compiled schema at `opentelemetry_configuration.json` in the repository root.
- The main YAML example used outdated OpenTelemetry declarative configuration fields: `file_format: "0.3"`, map-style `resource.attributes`, and `otlp` with `protocol: "grpc"`. Updated it to `file_format: "1.1"`, array-style resource attributes, and `otlp_grpc`, matching the current schema.
- The environment variable placeholder example placed `sampler` at the top level and lacked required surrounding configuration. Updated it to put the sampler under `tracer_provider` and include a minimal valid processor so the demonstrated warning is specifically about the string placeholder used where the schema expects a number.
- The SchemaStore section said OpenTelemetry would work once added to SchemaStore. SchemaStore now lists "OpenTelemetry Declarative Configuration", so the wording was updated to reflect current behavior.
- The diagnostic suppression wording was too vague. Updated it to the documented `# yaml-language-server-disable` comment used by yaml-language-server.
- VS Code settings snippets contained comments but were fenced as `json`. Changed those fences to `jsonc`, which matches VS Code settings syntax.
- The JetBrains XML snippet placed a comment before the XML declaration, which makes the XML declaration invalid. Moved the declaration to the first line.

## Review Notes
The updated OpenTelemetry YAML examples were validated against the current compiled OpenTelemetry JSON schema. The environment variable placeholder example intentionally still produces a type validation warning for `ratio`, which is the behavior the section explains.
