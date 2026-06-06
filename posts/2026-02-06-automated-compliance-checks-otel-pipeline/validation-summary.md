# Validation Summary: How to Set Up Automated Compliance Checks

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- Open Policy Agent (OPA)
- Rego
- yq
- jq
- GitHub Actions
- Python subprocess scripting

## Sources Consulted
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector troubleshooting documentation: https://opentelemetry.io/docs/collector/troubleshooting/
- OpenTelemetry Collector zPages extension documentation: https://pkg.go.dev/go.opentelemetry.io/collector/extension/zpagesextension
- OpenTelemetry Collector attributes processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/attributesprocessor/README.md
- Open Policy Agent documentation: https://www.openpolicyagent.org/docs
- Open Policy Agent policy language documentation: https://www.openpolicyagent.org/docs/policy-language
- Open Policy Agent CLI help from OPA 1.17.0
- yq documentation and CLI help from yq 4.53.2: https://github.com/mikefarah/yq
- GitHub Actions workflow trigger documentation: https://docs.github.com/actions/using-workflows/triggering-a-workflow

## Issues Found
- The Rego examples used pre-OPA-1.0 partial-set syntax (`deny[msg] { ... }`). Updated them to Rego v1 syntax with `deny contains msg if { ... }` and added `if` to helper rules.
- The first policy text said it checked all exporters for TLS, but the policy only applies to exporter names beginning with `otlp`. Updated the wording to say OTLP exporters and explicit TLS settings.
- The PII policy only checked whether an attributes processor appeared in a pipeline, not whether it contained redaction actions. Updated it to require an `attributes` processor with `delete` or `hash` actions, matching the attributes processor documentation.
- The GitHub Actions example treated any OPA JSON result containing a `value` field as a failure. OPA returns a `value` field even when the denial set is empty, so this would fail passing configs. Updated the workflow to flatten denial messages with `jq` and fail only when the violation count is greater than zero.
- The workflow watched `deploy/otel/**` but only scanned `config/otel-collector*.yaml`. Updated the loop to scan matching YAML files in both locations and enabled `nullglob` so unmatched globs do not get passed to `yq`.
- The Python scanner attempted to fetch `/debug/configz` from zPages. The current zPages extension exposes service, pipeline, extension, feature, trace, and expvar pages, not a JSON effective-config endpoint. Updated the example to scan deployed config files directly.
- The Python scanner used `--input /dev/stdin` and then counted the OPA `result` array rather than denial messages. Updated it to use OPA's official `--stdin-input` flag and return the flattened denial messages.

## Review Notes
The examples are now syntactically valid with current OPA and yq releases. The policy examples are intentionally simplified and should still be tailored to each organization's exact endpoint, TLS, and PII handling requirements before production use.
