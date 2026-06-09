# Validation Summary: How to Use Fluent Bit Filters

## Status
validated

## Post Type
Tutorial / Hands-on guide

## Technologies Covered
- Fluent Bit (filters: modify, record_modifier, grep, parser, nest, lua, kubernetes)
- INI and YAML configuration formats
- Lua scripting (for custom filter logic)
- Kubernetes (pod metadata enrichment, container log collection)
- OpenTelemetry (logs output to OTLP/HTTP endpoint)
- Regex parsing (for log structure extraction)

## Sources Consulted
- Fluent Bit Official Documentation: https://docs.fluentbit.io/manual
- Modify filter docs: https://docs.fluentbit.io/manual/pipeline/filters/modify
- Record Modifier filter docs: https://docs.fluentbit.io/manual/pipeline/filters/record-modifier
- Grep filter docs: https://docs.fluentbit.io/manual/pipeline/filters/grep
- Parser filter docs: https://docs.fluentbit.io/manual/pipeline/filters/parser
- Nest filter docs: https://docs.fluentbit.io/manual/pipeline/filters/nest
- Lua filter docs: https://docs.fluentbit.io/manual/pipeline/filters/lua
- Kubernetes filter docs: https://docs.fluentbit.io/manual/pipeline/filters/kubernetes
- OpenTelemetry output docs: https://docs.fluentbit.io/manual/pipeline/outputs/opentelemetry
- HTTP output docs: https://docs.fluentbit.io/manual/pipeline/outputs/http

## Issues Found
No technical issues found.

The blog post is technically accurate. Specifically:
- Modify filter operations (`add`, `rename`, `copy`, `remove`, `remove_wildcard`, `remove_regex`) and the `Condition Key_value_equals KEY VALUE` syntax are correct.
- Record_modifier options (`record`, `remove_key`, `whitelist_key`) match the official documentation.
- Grep filter `regex` and `exclude` options follow the documented `FIELD REGEX` syntax.
- Parser filter supports multiple `parser` entries that are tried in order (correctly described).
- Nest filter operations (`nest` / `lift`), with `wildcard`, `nest_under`, `nested_under`, `add_prefix`, `remove_prefix`, are valid.
- Lua filter function signature `function name(tag, timestamp, record)` is correct, including the 4-value return form for tag-based routing.
- Lua return codes used (1 and 2) match the documented semantics — 1 to replace timestamp/record (with optional 4th tag value for routing), 2 to replace the record while keeping the original timestamp.
- Kubernetes filter options (`kube_url`, `kube_ca_file`, `kube_token_file`, `merge_log`, `merge_log_trim`, `keep_log`, `k8s-logging.parser`, `k8s-logging.exclude`, `labels`, `annotations`) are valid.
- OpenTelemetry output uses correct `logs_uri /v1/logs` path and standard TLS options.
- HTTP output `json_date_format iso8601` is a valid format.
- `*` is correctly quoted in YAML samples (since `*` is a YAML reserved alias indicator).
- INI comments using `#` are supported by Fluent Bit's classic config parser.

## Review Notes
- The YAML example uses `add: environment production` as a scalar; in the canonical YAML schema, multi-value modify options (`add`, `rename`, etc.) are typically expressed as a list of strings (e.g. `add: ["environment production"]` or a YAML sequence). For a single value, single-value scalar forms are widely shown in tutorials and parse correctly in current Fluent Bit versions, so this is not flagged as an error — but readers extending the example to multiple values should switch to list form.
- The header comment of the "Keep Only Error Logs" grep example says "drops everything except errors and warnings," while the regex `(error|warn|fatal|critical)` actually matches four levels. The regex itself is correct and the title ("Keep Only Error Logs") matches the intent; the inline description is a minor wording inaccuracy, not a technical bug, so it was left as-is per the "fix technical errors only" instruction.
- The `remove_wildcard secret_*` form works but, per the docs, `Remove_wildcard` takes a prefix (e.g. `secret_`) rather than a wildcard glob; including `*` is redundant but not harmful with the current parser.
- `tls off` together with `tls.verify off` is fine for the OpenTelemetry output to a cluster-internal collector; production deployments should still consider enabling TLS to the collector. Informational only.
