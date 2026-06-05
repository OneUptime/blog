# Validation Summary: How to Validate OpenTelemetry Declarative Config Files Against the JSON Schema

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry declarative configuration
- JSON Schema
- Python
- jsonschema
- PyYAML
- ajv-cli
- yq
- GitHub Actions
- envsubst
- pre-commit

## Sources Consulted
- OpenTelemetry declarative configuration docs: https://opentelemetry.io/docs/languages/sdk-configuration/declarative-configuration/
- OpenTelemetry configuration data model: https://opentelemetry.io/docs/specs/otel/configuration/data-model/
- OpenTelemetry configuration repository: https://github.com/open-telemetry/opentelemetry-configuration
- Current OpenTelemetry compiled schema: https://raw.githubusercontent.com/open-telemetry/opentelemetry-configuration/main/opentelemetry_configuration.json
- ajv-cli documentation: https://ajv.js.org/packages/ajv-cli.html
- pre-commit documentation: https://pre-commit.com/
- jsonschema validation documentation: https://python-jsonschema.readthedocs.io/en/v4.10.2/validate/
- PyYAML documentation: https://pyyaml.org/wiki/PyYAMLDocumentation
- GNU envsubst documentation: https://www.gnu.org/software/gettext/manual/html_node/envsubst-Invocation
- yq documentation: https://github.com/mikefarah/yq

## Issues Found
- The post said the schema lives in the OpenTelemetry specification repository and used a raw URL under `schema/opentelemetry_configuration.json`. The official source is the `open-telemetry/opentelemetry-configuration` repository, and the current compiled schema is at the repository root. Updated the wording and both download URLs.
- The `ajv-cli` command omitted the schema draft. The current OpenTelemetry schema declares JSON Schema draft 2020-12, while `ajv-cli` defaults to draft-07. Added `--spec=draft2020`.
- The Python script accepted only two positional arguments, but the pre-commit snippet passed `--schema` plus filenames. Updated the script to use `argparse` with `--schema` and one or more config files, then updated the command examples and CI invocation to match.
- The environment variable section said raw files will not validate whenever `${ENV_VAR}` syntax is used. OpenTelemetry supports environment variable substitution, and node types are interpreted after substitution. Reworded this to say raw files may not validate and explained the type-resolution reason.

## Review Notes
The Python snippet was syntax-checked locally and validated a minimal `file_format: "1.0"` YAML config against the current schema. The `ajv-cli` command was smoke-tested with `npx ajv-cli validate --spec=draft2020` against the current schema and a minimal JSON config.
