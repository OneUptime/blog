# Validation Summary: How to Escape UTF-8 Metric Names, Label Names, and Label Values in OpenMetrics

## Status

validated

## Post Type

Technical guide with an OpenMetrics exposition example and a Python label-value encoder.

## Technologies Covered

- OpenMetrics 1.0 text exposition and the experimental OpenMetrics 2.0 specification
- Prometheus 3 UTF-8 metric and label names
- HTTP content negotiation and name-escaping schemes
- Python string processing and UTF-8 encoding
- Monitoring and time-series identity

## Sources Consulted

- [OpenMetrics 1.0 specification](https://prometheus.io/docs/specs/om/open_metrics_spec/) — name grammar, reserved names, string escaping, HELP text, UTF-8 encoding, and exposition structure.
- [UTF-8 in Prometheus](https://prometheus.io/docs/guides/utf8/) — Prometheus 3 support, legacy compatibility, and library support caveats.
- [UTF-8 metric and label name escaping schemes](https://prometheus.io/docs/instrumenting/escaping_schemes/) — all four schemes and their negotiation parameters.
- [Scrape protocol content negotiation](https://prometheus.io/docs/instrumenting/content_negotiation/) — Accept and Content-Type parameters.
- [OpenMetrics 2.0 specification](https://prometheus.io/docs/specs/om/open_metrics_spec_2_0/) — experimental status, currently version 2.0.0-rc0.
- [Python str.replace documentation](https://docs.python.org/3/library/stdtypes.html#str.replace) — replacement semantics.
- [Python string literals and f-strings](https://docs.python.org/3/reference/lexical_analysis.html#f-strings) — escape sequences, interpolation, and doubled braces.
- [Python JSON documentation](https://docs.python.org/3/library/json.html) — JSON escaping and Unicode handling.
- [Official Prometheus Python client's OpenMetrics parser](https://github.com/prometheus/client_python/blob/master/prometheus_client/openmetrics/parser.py) — parsing and HELP unescaping implementation.
- [Author profile](https://github.com/nawazdhandala) — verified the author link destination.

## Issues Found

No technical issues found.

## Review Notes

- Left README.md unchanged. The post correctly distinguishes strict OpenMetrics 1.0 name restrictions from negotiated UTF-8 name support. Its recommended names form a conservative valid subset; the letter-first recommendation avoids reserved leading underscores.
- Confirmed UTF-8 without a BOM, the EOF terminator, and escaping of backslash, double quote, and line feed. OpenMetrics 1.0 uses the same escaped-string grammar for HELP text and label values, so the HELP advice is correct for the stated protocol.
- Executed the exact Python example with Python 3.13.1 and verified its printed output. Parsed the complete exposition example with prometheus-client 0.26.0 and checked its gauge type, value, and labels.
- Round-tripped 11 inputs through the supplied encoder and the official OpenMetrics parser, testing both label values and HELP text: ASCII, non-ASCII text, a quote, a backslash, a line feed, the combined example, an empty string, a literal backslash-n sequence, Japanese text with an emoji, a tab, and NUL. All passed after UTF-8 encoding and decoding.
- Verified that escaping the combined example twice changes the encoded text and that strict UTF-8 decoding rejects an invalid byte. The Python snippet emits one sample line; the test harness supplied metadata and EOF for complete exposition parsing.
- The scheme descriptions match the official documentation. Underscore replacement can collapse the two example names into the same exported name. The table is a summary, and the recommendation to use a library encoder avoids presenting it as a complete encoding algorithm.
- UTF-8 negotiation support varies by client library and consumer version. No live HTTP endpoint or historical consumer was supplied, so negotiation and older-reader compatibility were reviewed against the specifications, not integration-tested.
- All referenced technical documentation links resolve to the intended resources. The OpenMetrics 2.0 experimental-status statement remains accurate. There are no terminal commands, configuration snippets, or deprecated Python APIs in the post.
