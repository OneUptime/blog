# Choose OTTL Error Modes Without Accidentally Dropping Telemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, OpenTelemetry Collector, OTTL, Observability, Troubleshooting

Description: Choose ignore, silent, or propagate for OTTL runtime errors, understand payload loss, and verify behavior with malformed telemetry.

A single malformed log body can have a wider effect than one failed field extraction. OTTL error handling determines whether processing continues or the error travels back through the Collector pipeline. Choose that behavior deliberately, especially when one request contains many records.

This guide targets OpenTelemetry Collector Contrib **0.160.0** and its transform processor. Other components that embed OTTL have their own configuration and defaults. Set `error_mode` explicitly instead of relying on the behavior of an older deployment.

## Know What Each Mode Does

For runtime statement failures, the transform processor offers three choices:

| Mode | Failed statement | Following statements | Error logging |
|---|---|---|---|
| `ignore` | Error is ignored | Continue | Error is logged |
| `silent` | Error is ignored | Continue | Error is not logged |
| `propagate` | Error is returned upstream | Processing fails | Pipeline handles the error |

The [transform processor documentation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.160.0/processor/transformprocessor/README.md#general-config) warns that propagating an error can result in the payload being dropped. Do not interpret this as a request to skip only the one bad attribute or record.

In 0.160.0, the beta `processor.transform.defaultErrorModeIgnore` gate makes `ignore` the default when enabled. Older configurations may have relied on `propagate`. Explicitly declaring your choice avoids that ambiguity during an upgrade.

None of these modes permits invalid syntax, an unknown function, or an unsupported path at startup. Those are configuration errors and must be fixed before the processor can run.

## Start with Visible, Tolerant Parsing

For optional enrichment, preserve the original record and add fields when parsing succeeds:

```yaml
processors:
  transform/optional_json:
    error_mode: ignore
    log_statements:
      - context: log
        statements:
          - set(log.cache["parsed"], ParseJSON(log.body)) where IsString(log.body)
          - set(log.attributes["order.id"], log.cache["parsed"]["order_id"]) where IsMap(log.cache["parsed"]) and log.cache["parsed"]["order_id"] != nil
          - set(log.attributes["pipeline.stage"], "parsed_or_preserved")
```

A plain text body can make `ParseJSON` fail. With `ignore`, the final marker still runs. A structured map body is skipped by the string guard. An array parsed from JSON is not treated as an object because the second rule checks `IsMap`.

The marker means the record reached that stage, not that JSON parsing succeeded. Use names that communicate this distinction. A field called `parse.success=true` written unconditionally would create misleading operational evidence.

The original body is retained. That gives you a useful reference when investigating malformed source data, provided the body is permitted in your destination and does not contain sensitive content.

## Override Error Handling for a Group

An advanced statement group can override the processor-level mode:

```yaml
processors:
  transform/group_modes:
    error_mode: ignore
    log_statements:
      - context: log
        error_mode: silent
        statements:
          - set(log.cache["candidate"], ParseJSON(log.body)) where IsString(log.body)
      - context: log
        statements:
          - set(log.attributes["pipeline.name"], "application")
```

Use `silent` after you have characterized an expected failure pattern and have another way to measure it. Otherwise, you remove the evidence needed to discover a producer changing its format.

The two groups above intentionally do not share a cache dependency. If a later transformation needs a parsed object, keep that transformation in the same group as the parse or store a suitable persistent attribute explicitly.

For required transformations, `propagate` may express a deliberate policy, but it is not transactional rollback. Earlier statements may already have mutated the payload. The actual receiver response, retries, and buffering depend on the surrounding pipeline and upstream client.

## Treat Redaction as a Different Requirement

Ignoring an optional enrichment failure is often acceptable. Ignoring a failed redaction can export the original secret. Do not use a blanket `ignore` policy as proof that sensitive fields have been removed.

Prefer deleting a known sensitive attribute when its contents are unnecessary, and test malformed or unexpected types. If you use propagation to stop export on a redaction error, verify the complete pipeline's behavior with synthetic secrets and confirm every exporter sits after the redaction stage.

## Test Mixed Payloads

Use a disposable local Collector with a debug or file exporter. Send one OTLP request containing a valid JSON object, malformed JSON, a plain string, and a map body. Repeat with each mode, keeping the fixture unchanged.

```bash
otelcol-contrib validate --config collector.yaml
otelcol-contrib --config collector.yaml
```

For `ignore` and `silent`, compare the number of exported records, the fields added to each, and whether later statements ran. Check Collector logs to distinguish the modes. For `propagate`, inspect the client's response and whether any part of the request reached the exporter. Include a valid record after the malformed one to expose effects beyond the failing statement.

## Conclusion

Use `ignore` for visible, tolerant enrichment and `silent` only when failures are understood. Reserve `propagate` for a deliberate failure policy whose pipeline behavior you have tested. Explicit modes, type guards, and mixed-record fixtures make telemetry loss and partial transformations much easier to detect.

## Official Documentation

- [Transform error modes and feature gates](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.160.0/processor/transformprocessor/README.md)
- [OTTL function error behavior](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.160.0/pkg/ottl/ottlfuncs/README.md)
- [Collector pipeline architecture](https://opentelemetry.io/docs/collector/architecture/)
