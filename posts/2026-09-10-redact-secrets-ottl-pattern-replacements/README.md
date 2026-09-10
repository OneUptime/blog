# Redact Passwords, Tokens, and URL Secrets with OTTL Patterns

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, OTTL, Security, Data Privacy, Observability

Description: Remove known secret attributes and redact constrained text and URL query values with OTTL, including capture-group escaping and verification.

Secret removal works best when the producer never records the secret. When credentials already reach a Collector, remove known sensitive attributes and apply pattern replacement only to formats you can define and test. A regex for one token shape is not a complete detector for every credential representation.

This guide uses OpenTelemetry Collector Contrib **0.160.0**. All examples are intended for synthetic fixtures first; use fake secrets while inspecting debug output.

## Delete Fields You Do Not Need

If an authorization header or password attribute has no operational value, deleting the key avoids type and formatting assumptions:

```yaml
processors:
  transform/delete_secrets:
    error_mode: ignore
    trace_statements:
      - delete_key(span.attributes, "http.request.header.authorization")
      - delete_key(span.attributes, "password")
      - delete_key(span.attributes, "token")
```

Deletion removes the entire value whether it is a string, array, or another type. This is more predictable than expecting every producer to serialize headers identically.

These paths cover span attributes only. Resource attributes, span events, log bodies, and other copies require their own rules. Make a small inventory of where the source actually puts credentials before declaring the pipeline sanitized.

## Redact Known Query Parameters

If you retain a URL for diagnosis, replace values of a defined parameter allowlist:

```yaml
processors:
  transform/url_secrets:
    error_mode: ignore
    trace_statements:
      - >-
        replace_pattern(span.attributes["url.full"],
        "(?i)([?&](?:password|token|access_token|api_key)=)[^&#]*",
        "$${1}[REDACTED]")
        where IsString(span.attributes["url.full"])
      - >-
        replace_pattern(span.attributes["http.url"],
        "(?i)([?&](?:password|token|access_token|api_key)=)[^&#]*",
        "$${1}[REDACTED]")
        where IsString(span.attributes["http.url"])
      - delete_key(span.attributes, "url.query")
```

The capture group preserves the separator and parameter name, while the value is replaced. The Collector configuration layer consumes one dollar sign from `$$`; the replacement engine then receives `${1}`. The [OTTL replacement documentation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.160.0/pkg/ottl/ottlfuncs/README.md#replace_pattern) describes capture references and Collector dollar-sign escaping.

This pattern handles ordinary ampersand-separated parameters with literal names. It does not decode percent-encoded parameter names, embedded URLs, unusual separators, or secrets in path segments and fragments. If those representations are possible, remove the whole URL or sanitize it with a proper URL-aware component before collection.

Deleting `url.query` prevents a separate raw-query attribute from retaining the same secret. Inspect your actual schema for additional legacy or custom copies.

## Handle a Constrained Text Format

For plain text log bodies with a known `key=value` format, a targeted replacement can retain surrounding context:

```yaml
processors:
  transform/text_secrets:
    error_mode: ignore
    log_statements:
      - >-
        replace_pattern(log.body,
        "(?i)(password|token|api_key)=[^[:space:],;]+",
        "[REDACTED]") where IsString(log.body)
      - >-
        replace_pattern(log.body,
        "(?i)Bearer[[:space:]]+[A-Za-z0-9._~+/-]+=*",
        "Bearer [REDACTED]") where IsString(log.body)
```

The first rule assumes unquoted values without embedded whitespace. It is unsuitable for arbitrary JSON, shell syntax, or a password that contains spaces. Structured log bodies should be handled by deleting known map keys after checking their parent types.

A string guard prevents an inappropriate converter call; it also means nonstring bodies are skipped. That is acceptable only if another rule or source contract handles their sensitive fields. A skipped rule is not evidence that the record is clean.

## Place Sanitization Before Every Export Path

Attach these processors before the relevant exporters, including debug, file, and secondary exporters. A separate pipeline that exports original data bypasses the sanitization policy even when the main pipeline is correct.

`error_mode: ignore` preserves telemetry on a runtime failure. For optional enrichment that can be helpful; for required redaction it can leave original data intact. Prefer deletion where possible and verify the complete failure behavior if your policy uses `propagate` to reject problematic payloads.

Do not assume propagation rolls back earlier mutations or affects only the failing record. Test the actual receiver, processors, and exporter chain with mixed batches.

## Verify Absence of Synthetic Secrets

Use unique fake values and check the entire exported payload. Include repeated query parameters, mixed-case names, missing attributes, nonstring headers, percent-encoded names, and a token copied into a span event.

```bash
otelcol-contrib validate --config collector.yaml
otelcol-contrib --config collector.yaml
```

The ordinary query cases should retain parameter names and lose the synthetic values. The unsupported encoded-name fixture should expose the documented limitation and drive a broader deletion policy if that input is allowed.

Test the rendered configuration after templating, because shell, YAML, environment substitution, and regex replacement each interpret certain characters. Never verify only the pattern in a standalone regex website and assume the deployed Collector receives the same expression.

## Conclusion

Delete unnecessary secret fields, use replacements for narrowly defined formats, and inspect every export path. Capture-group escaping and negative fixtures are essential. Successful matching on one token does not prove that every representation of the credential has been removed.

## Official Documentation

- [OTTL pattern replacement](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.160.0/pkg/ottl/ottlfuncs/README.md#replace_pattern)
- [Pattern replacement implementation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.160.0/pkg/ottl/ottlfuncs/func_replace_pattern.go)
- [Transform error handling](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.160.0/processor/transformprocessor/README.md#general-config)
