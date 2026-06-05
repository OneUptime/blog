# Validation Summary: Use OpenTelemetry Weaver to Enforce Semantic Convention Consistency Across Teams

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Weaver
- OpenTelemetry semantic conventions
- Weaver semantic convention registries
- Weaver Jinja/minijinja code generation
- GitHub Actions
- Python
- YAML

## Sources Consulted
- OpenTelemetry Weaver README: https://github.com/open-telemetry/weaver
- OpenTelemetry Weaver command-line usage docs: https://github.com/open-telemetry/weaver/blob/main/docs/usage.md
- OpenTelemetry Weaver code generation docs: https://github.com/open-telemetry/weaver/blob/main/docs/codegen.md
- OpenTelemetry Weaver registry validation docs: https://github.com/open-telemetry/weaver/blob/main/docs/validate.md
- OpenTelemetry Weaver custom telemetry schema docs: https://github.com/open-telemetry/weaver/blob/main/docs/define-your-own-telemetry-schema.md
- OpenTelemetry Weaver semantic convention schema reference: https://github.com/open-telemetry/weaver/blob/main/schemas/semconv-syntax.md
- OpenTelemetry semantic conventions code-generation docs: https://opentelemetry.io/docs/specs/semconv/non-normative/code-generation/

## Issues Found
- The install command used `cargo install weaver`, which resolves to an unrelated crates.io package rather than the OpenTelemetry Weaver CLI. Replaced it with the official release binary flow and source-build instructions.
- The release archive name and extraction command were outdated. Updated the example to use the current `weaver-x86_64-unknown-linux-gnu.tar.xz` asset format.
- The custom registry layout omitted `manifest.yaml` and placed templates under the registry directory. Added a manifest example and moved templates to a separate `templates/` directory so Weaver does not parse template config as registry YAML.
- The semantic convention example used the deprecated `prefix` field and short attribute IDs. Updated the example to use fully qualified attribute IDs such as `order.id`.
- The YAML examples omitted required `stability` fields for attributes and enum members. Added `stability: development` where current Weaver validation requires it.
- The code generation command used obsolete top-level commands and flags (`weaver generate`, `--semantic-conventions`, `--output`). Updated it to `weaver registry generate python --registry ... --templates ... <output>`.
- The Jinja template used a top-level `groups` variable, `attr.id`, and `group.prefix`, which do not match the current resolved registry context. Updated it to use `ctx.groups` and `attr.name`.
- The generated Python constants in the usage example did not match the corrected template output. Updated references to `OrderAttributes.ORDER_ID`, `ORDER_TYPE`, and `ORDER_ITEM_COUNT`.
- The CI example used outdated install and validation commands. Updated it to the official setup action and current `weaver registry check --registry ...` command.
- The collector helper script still depended on `group["prefix"]`. Updated it to derive prefixes from fully qualified attribute IDs.
- The deprecation example used an unstructured string, which current Weaver warns against for attributes. Replaced it with the structured `deprecated` object using `reason: renamed`, `renamed_to`, and `note`.
- The post claimed deprecated attributes are automatically marked with language-specific annotations. Clarified that templates can emit those annotations from Weaver's deprecation metadata.

## Review Notes
Validated the corrected registry and Python generation flow locally with OpenTelemetry Weaver 0.23.0. The article still uses simplified internal examples, but the commands and schema snippets now match current Weaver documentation and run cleanly.
