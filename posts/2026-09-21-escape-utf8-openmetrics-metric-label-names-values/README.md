# How to Escape UTF-8 Metric Names, Label Names, and Label Values in OpenMetrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Python, Monitoring, Observability

Description: Separate OpenMetrics 1.0 name restrictions from negotiated UTF-8 names, and safely escape label values without changing metric identity.

---

There are two different escaping problems in a metrics endpoint: representing characters inside strings, and translating metric or label **names** for a consumer that supports only the legacy name character set. Mixing them can produce valid-looking output that either fails parsing or creates unexpected series names.

Start by identifying the protocol and consumer versions. Strict [OpenMetrics 1.0](https://prometheus.io/docs/specs/om/open_metrics_spec/) uses restricted metric and label names in its grammar, while label values support UTF-8. Modern Prometheus adds negotiated UTF-8-name support; that capability should not be assumed for every historical OpenMetrics reader.

## Keep a portable OpenMetrics 1.0 baseline

For a broadly compatible endpoint, choose metric names containing ASCII letters, digits, and underscores, beginning with a letter. Label names should follow the same conservative convention. Colons have a reserved role in metric names, so avoid them in instrumentation.

This example keeps the name portable while retaining the label value's original text:

```text
# TYPE warehouse_queue_depth gauge
# HELP warehouse_queue_depth Items awaiting processing.
warehouse_queue_depth{location="München",queue="priority"} 7
# EOF
```

Do not replace the `ü` in a label value simply because the metric name uses a restricted alphabet. Labels describe data; changing their values changes series identity and potentially their meaning.

Encode the response as UTF-8 without a byte order mark. A `charset=utf-8` parameter does not transform an incorrectly encoded byte stream into UTF-8.

## Escape string characters once

The characters requiring escaping inside quoted OpenMetrics strings are backslash, double quote, and line feed. A small encoder for label values is:

```python
def escape_label_value(value):
    return (value.replace("\\", "\\\\")
            .replace("\n", "\\n")
            .replace('"', '\\"'))

value = 'München "priority"\\archive\nretry'
encoded = escape_label_value(value)
line = f'warehouse_queue_depth{{queue="{encoded}"}} 7\n'
print(line, end="")
```

Escape backslashes first so that the backslashes introduced for quotes and newlines are not escaped again. Accept raw values at this boundary; passing an already escaped value through the function a second time changes the decoded value.

Do not use URL encoding or HTML escaping here. `%22` and `&quot;` are ordinary characters to an OpenMetrics parser, not representations of a double quote. JSON escaping is also not a drop-in protocol implementation: JSON's supported escape sequences differ, and escaping Unicode as `\uXXXX` is not how OpenMetrics represents UTF-8 values.

Apply the same documented string-escaping rules to HELP text. Reject invalid UTF-8 at the byte boundary rather than decoding with replacement characters, which can silently merge or rename distinct values.

## Negotiate UTF-8 names deliberately

[Prometheus 3's UTF-8 guide](https://prometheus.io/docs/guides/utf8/) explains the transition to UTF-8 metric and label names. The [escaping-scheme specification](https://prometheus.io/docs/instrumenting/escaping_schemes/) defines the `escaping` parameter exchanged in `Accept` and `Content-Type` headers.

The schemes have different identity consequences:

| Scheme | Effect |
| --- | --- |
| `allow-utf-8` | Preserve valid UTF-8 names using the applicable quoted syntax. |
| `underscores` | Replace characters outside the legacy set with underscores. |
| `dots` | Encode dots specially and double existing underscores. |
| `values` | Encode non-legacy code points using the defined `U__` representation. |

Use the client library's negotiated encoder for these schemes. A manual regex substitution cannot implement all four correctly, and returning an `escaping=allow-utf-8` header does not make an old parser understand the resulting names.

For example, underscore translation can map both `queue.depth` and `queue-depth` to `queue_depth`. Detect that collision before exposing data. Adding an arbitrary suffix during each scrape would make the schema unstable; choose stable exported names or an agreed encoding instead.

## Test values and names separately

For value escaping, round-trip an ASCII value, non-ASCII text, a quote, a backslash, and a line feed through the encoder and an OpenMetrics parser. Compare the parsed value with the original string, not with the escaped wire text.

For names, request each supported scheme and inspect both the response content type and parsed series names. Include two names that collide under underscore translation. Repeat using the oldest consumer you support, because a modern parser accepting a payload does not establish compatibility with an older grammar.

The [OpenMetrics 2.0 specification](https://prometheus.io/docs/specs/om/open_metrics_spec_2_0/) is explicitly marked experimental. Do not treat its newer syntax as permission to change a strict 1.0 endpoint unconditionally. Keep protocol upgrades, negotiated escaping, and application naming decisions explicit, then verify the downstream queries that depend on those names.
