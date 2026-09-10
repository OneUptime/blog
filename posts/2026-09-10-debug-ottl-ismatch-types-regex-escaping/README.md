# Debug OTTL IsMatch Types and Regex Escaping

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, OpenTelemetry Collector, OTTL, Observability, Troubleshooting

Description: Find why IsMatch misses an existing attribute by checking its actual context, string conversion, anchors, case, and YAML-to-regex escaping.

An attribute can exist in your backend and still fail an OTTL `IsMatch` condition. The Collector may be reading a different attribute level, seeing a different type, or receiving a regex changed by configuration escaping. Work from the actual value and the exact rendered statement.

This guide uses OpenTelemetry Collector Contrib **0.160.0**. In this release, `IsMatch` accepts string-like input and converts several nonstring types. A blanket explanation that it always rejects integers is incorrect.

## Confirm the Attribute Path First

A resource attribute and a span attribute with the same name are separate values. For example, a service name normally lives at `resource.attributes["service.name"]`. Querying `span.attributes["service.name"]` can return nil even when the backend displays a service column.

For a local test, record presence and match results separately:

```yaml
processors:
  transform/match_diagnostic:
    error_mode: ignore
    trace_statements:
      - set(span.attributes["diagnostic.present"], false)
      - set(span.attributes["diagnostic.present"], true) where span.attributes["example.code"] != nil
      - set(span.attributes["diagnostic.is_string"], IsString(span.attributes["example.code"]))
      - set(span.attributes["diagnostic.matches"], IsMatch(span.attributes["example.code"], "^[0-9]{3}$"))
```

A nil target makes `IsMatch` return false. The [function documentation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.160.0/pkg/ottl/ottlfuncs/README.md#ismatch) describes conversion of integers, floats, booleans, byte slices, maps, and slices before matching.

The diagnostic attributes are temporary. Remove them after verifying the final rule, especially if their source values could expose sensitive information.

## Understand the Representation Being Matched

An integer `200` can match `^[0-9]{3}$` after conversion to a string. A list containing the string `200` is represented differently and should not be treated as the same scalar value. Byte slices use base64 encoding, and maps or slices use JSON representation.

If your rule should accept only real string attributes, express that requirement:

```yaml
processors:
  transform/string_codes:
    error_mode: ignore
    trace_statements:
      - set(span.attributes["example.valid_code"], true) where IsString(span.attributes["example.code"]) and IsMatch(span.attributes["example.code"], "^[0-9]{3}$")
```

That is a schema decision. It intentionally excludes numeric `200`, even though `IsMatch` alone would accept its string representation.

Avoid matching the serialized form of a map to inspect a nested field. Use the appropriate map path and a type guard instead. Serialization details are a poor substitute for a structural predicate.

## Make Escaping Visible

A plain YAML scalar still contains an OTTL string, and that string contains a regex. For a literal dot, the regex engine needs `\.`; the OTTL string must therefore contain `\\.`:

```yaml
processors:
  transform/domain:
    error_mode: ignore
    trace_statements:
      - set(span.attributes["example.internal_host"], true) where IsMatch(span.attributes["server.address"], "^api\\.example\\.com$")
```

The pattern should match `api.example.com` and reject `apiXexampleYcom`. Forgetting to escape the dot broadens the match, while adding too many escapes can make it search for literal backslashes.

Character classes can simplify some expressions. `[0-9]+` avoids the OTTL backslash required for a regex `\d`. Use whichever makes the intended language easiest to review.

Double-quoting the entire YAML statement adds another escaping layer. A folded or literal YAML block can help with longer expressions, but templating and environment expansion still apply to the final Collector configuration.

## Check Regex Semantics Separately from Escaping

`IsMatch` uses Go regular-expression matching semantics. A pattern without anchors can match a substring. `error` can match `request_error_total`; `^error$` requires the entire value to be exactly `error`.

Matching is case-sensitive unless the pattern requests otherwise, such as `(?i)`. A value with a trailing slash or space does not satisfy an anchored pattern that excludes those characters.

Go regex syntax also differs from engines that support lookbehind and backreferences. An unsupported expression is a parsing or compilation error, not an ordinary false result. The [Go regexp syntax reference](https://pkg.go.dev/regexp/syntax) is the appropriate language reference for these patterns.

## Test a Small Matrix Through the Collector

For the code example, submit a string `200`, integer `200`, list `["200"]`, string `20`, empty string, and missing attribute. For the domain example, include the literal-dot match, the wildcard-lookalike, uppercase characters, and a trailing period.

```bash
otelcol-contrib validate --config collector.yaml
otelcol-contrib --config collector.yaml
```

Use a detailed debug exporter and compare expected booleans with the output. If a standalone regex test succeeds but the Collector test fails, inspect the rendered statement and decoded input. If the diagnostic presence flag is false, return to path ownership and processor order.

An earlier transform may have renamed or deleted the key. A backend may also normalize labels after export, so its display is not always evidence of what this processor received.

## Conclusion

Debug `IsMatch` by separating path presence, input representation, and regex semantics. Account for the release's documented coercions and every escaping layer. A fixture that includes both lookalike values and wrong types quickly shows whether the rule matches the schema you intended.

## Official Documentation

- [IsMatch contract](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.160.0/pkg/ottl/ottlfuncs/README.md#ismatch)
- [IsMatch implementation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.160.0/pkg/ottl/ottlfuncs/func_is_match.go)
- [Go regular expression syntax](https://pkg.go.dev/regexp/syntax)
- [OTTL language](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.160.0/pkg/ottl/LANGUAGE.md)
