# Validation Summary: How to Use the OpenTelemetry Config Validator Tool for Env Variable

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry declarative configuration
- OpenTelemetry configuration validator
- YAML
- JSON Schema
- Environment variable substitution
- Docker
- GitHub Actions

## Sources Consulted
- OpenTelemetry configuration repository README: https://github.com/open-telemetry/opentelemetry-configuration
- OpenTelemetry validator README: https://github.com/open-telemetry/opentelemetry-configuration/tree/main/validator
- OpenTelemetry validator CLI source: https://github.com/open-telemetry/opentelemetry-configuration/blob/main/validator/main.go
- OpenTelemetry declarative configuration documentation: https://opentelemetry.io/docs/languages/sdk-configuration/declarative-configuration/
- OpenTelemetry configuration data model specification: https://opentelemetry.io/docs/specs/otel/configuration/data-model/
- OpenTelemetry generated schema documentation: https://github.com/open-telemetry/opentelemetry-configuration/blob/main/schema-docs.md
- OpenTelemetry validator Docker workflow and Dockerfile: https://github.com/open-telemetry/opentelemetry-configuration/tree/main/validator

## Issues Found
- The install instructions used `go build -o otel-config-validator ./cmd/validate`, but the upstream validator is built from the repository with `make validator` because schema files must be copied for embedding. Updated the build command and binary name to `validator/otel_config_validator`.
- The Docker image reference `ghcr.io/open-telemetry/opentelemetry-configuration/validator:latest` did not match the repository Docker workflow or validator README. Replaced it with the documented local Docker build flow using `make validator-docker-image` and `otel_config_validator:current`.
- The CLI examples used a nonexistent `validate` subcommand and unsupported flags: `--config`, `--substitute-env`, `--strict`, `--dump-resolved`, `--env-file`, `--schema-version`, and `--schema-file`. Updated examples to the actual CLI form, `otel_config_validator [options] <config.yaml>`, with `-o` for resolved output and `-s` for an alternate schema directory.
- The sample OpenTelemetry config used `file_format: "0.3"`, while current official examples use `file_format: "1.0"`. Updated the examples and resolved output.
- The resource attributes example used a mapping, but the current schema expects `resource.attributes` to be an array of name/value entries or `attributes_list` to be a string. Updated the snippet to use `- name` and `value`.
- The exporter key `otlp` is not a valid current declarative configuration span exporter key. Updated it to `otlp_grpc`.
- The missing environment variable section described a nonexistent `--strict` mode. Updated it to match the spec behavior: missing variables without defaults are replaced with an empty value and may then fail schema validation.
- The env file section claimed the validator accepts an env-file option. Updated the local example to source the file in the shell before running the validator, while keeping Docker `--env-file` only in the Docker example because that is a Docker option.
- The CI example used an unavailable published image and unsupported CLI flags. Updated it to build the validator Docker image from the official repository before using it.

## Review Notes
The upstream validator CLI was verified from repository documentation and source, but the binary was not executed locally because Go is not installed in this workspace. The review used official OpenTelemetry documentation, schema docs, source files, and shelltest examples as authoritative references.
