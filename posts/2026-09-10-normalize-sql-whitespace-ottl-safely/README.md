# Normalize SQL Span Whitespace with OTTL Without Losing Meaning

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, OTTL, Tracing, Observability, Troubleshooting

Description: Understand escaped versus actual SQL whitespace and use OTTL only for constrained display normalization that preserves the original query.

A regular expression cannot safely normalize whitespace in arbitrary SQL while guaranteeing unchanged meaning. SQL has quoted literals, comments, quoted identifiers, and dialect-specific syntax. Replacing every newline with a space can change a string value or make a line comment swallow the rest of a query.

Use a SQL-aware parser or instrumentation-side normalization when semantic preservation is required. OpenTelemetry Collector Contrib **0.160.0** can perform a narrower display transformation with OTTL, but it needs an explicit input contract and should preserve the original query.

## Distinguish Three Representations

These examples look similar in a log viewer but contain different data:

```text
Actual newline:
SELECT id
FROM orders

Literal backslash and n:
SELECT id\nFROM orders

SQL string literal containing meaningful spacing:
SELECT 'a  b' AS label
```

An OTLP JSON payload may show `\n` as JSON escaping for an actual newline. After decoding, the Collector sees a newline character. A literal backslash followed by `n` requires an additional escaping layer in JSON.

Inspect the decoded attribute rather than counting slashes in a dashboard rendering. If you normalize the wrong representation, the expression can either do nothing or replace characters that were part of the query itself.

## Establish a Safe Input Contract

A reasonable contract for a display-only rule is that an upstream SQL parser has already removed or canonicalized literals and comments and has identified where whitespace can be collapsed. A boolean marker can indicate that this specific formatting step is allowed.

The marker in the following example is an application-defined attribute, `example.sql_whitespace_safe`. It is not an OpenTelemetry semantic convention and must not be set automatically merely because a query exists.

Current SQL telemetry uses `db.query.text`; older instrumentation may use `db.statement`. The [database SQL conventions](https://opentelemetry.io/docs/specs/semconv/db/sql/) also discuss query text and collection concerns. Pick the source your instrumentation actually emits.

## Normalize a Separate Display Attribute

For inputs meeting the contract, copy the query and collapse actual whitespace in the copy:

```yaml
processors:
  transform/sql_display:
    error_mode: ignore
    trace_statements:
      - context: span
        statements:
          - set(span.attributes["example.sql_display"], span.attributes["db.query.text"]) where span.attributes["example.sql_whitespace_safe"] == true and IsString(span.attributes["db.query.text"])
          - replace_pattern(span.attributes["example.sql_display"], "[[:space:]]+", " ") where span.attributes["example.sql_whitespace_safe"] == true and IsString(span.attributes["example.sql_display"])
```

`[[:space:]]+` matches runs of whitespace without an extra backslash-escaping puzzle. The [replace_pattern function](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.160.0/pkg/ottl/ottlfuncs/README.md#replace_pattern) changes every matching section of the target string.

The original `db.query.text` remains available for comparison. The display field is custom and should not become an executable SQL source, audit record, or supposedly canonical fingerprint.

If the source genuinely stores literal `\n`, `\r`, and `\t` separators under the same safe contract, use a separate first replacement on the display field:

```yaml
processors:
  transform/escaped_sql_display:
    error_mode: ignore
    trace_statements:
      - context: span
        statements:
          - set(span.attributes["example.sql_display"], span.attributes["db.query.text"]) where span.attributes["example.sql_whitespace_safe"] == true and IsString(span.attributes["db.query.text"])
          - replace_pattern(span.attributes["example.sql_display"], "\\\\[nrt]", " ") where span.attributes["example.sql_whitespace_safe"] == true and IsString(span.attributes["example.sql_display"])
          - replace_pattern(span.attributes["example.sql_display"], "[[:space:]]+", " ") where span.attributes["example.sql_whitespace_safe"] == true and IsString(span.attributes["example.sql_display"])
```

In this plain YAML scalar, OTTL decodes the string before the regex engine sees it. The regex then matches a literal backslash followed by one of the selected letters. Do not add another decoding pass unless the producer contract requires it.

## Test Queries That Must Remain Untouched

Include ordinary multiline SQL plus adversarial semantic cases:

```sql
SELECT 'a  b' AS label;
SELECT 1 -- keep this comment boundary
FROM orders;
SELECT E'line\nnext';
```

These statements must not receive the safe marker merely because they are valid SQL. Collapsing their raw text can change values or comment boundaries. Dialects with quoted identifiers, dollar-quoted bodies, or vendor hints need their own parser-aware handling.

Also test missing query attributes, nonstring values, old convention keys, and a statement already normalized. The original query must remain byte-for-byte unchanged in every case.

```bash
otelcol-contrib validate --config collector.yaml
otelcol-contrib --config collector.yaml
```

Run the exact rendered configuration after any Helm or configuration-generation step. Compare output attribute values from a file or detailed debug exporter using synthetic queries that contain no credentials.

## Conclusion

OTTL regex replacement is useful for a constrained display field, but it cannot prove SQL equivalence. Distinguish actual characters from their serialized escaping, require a trustworthy normalization contract, and preserve the original text. Use a SQL-aware component when query meaning or canonical fingerprints must be guaranteed.

## Official Documentation

- [OTTL replacement semantics](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.160.0/pkg/ottl/ottlfuncs/README.md#replace_pattern)
- [Replacement implementation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.160.0/pkg/ottl/ottlfuncs/func_replace_pattern.go)
- [SQL semantic conventions](https://opentelemetry.io/docs/specs/semconv/db/sql/)
