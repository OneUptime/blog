# Validation Summary: How to Fix the OpenMetrics “Data Does Not End with # EOF” Error

## Status
validated

## Post Type
Technical troubleshooting guide with shell commands and Python examples.

## Technologies Covered
- OpenMetrics 1.0 text exposition
- Prometheus text format 0.0.4 and scrape parsing
- HTTP content negotiation, compression, and proxy behavior
- curl
- Python 3 and prometheus-client

## Sources Consulted
- OpenMetrics 1.0 specification, including ABNF, overall structure, escaping, and partial-response handling: https://prometheus.io/docs/specs/om/open_metrics_spec/
- Prometheus exposition formats, including legacy comments and metadata: https://prometheus.io/docs/instrumenting/exposition_formats/
- Prometheus scrape protocol content negotiation: https://prometheus.io/docs/instrumenting/content_negotiation/
- Prometheus OpenMetrics parser implementation and exact error handling: https://github.com/prometheus/prometheus/blob/main/model/textparse/openmetricsparse.go
- Official Python client OpenMetrics parser: https://github.com/prometheus/client_python/blob/master/prometheus_client/openmetrics/parser.py
- curl manual, including compression, header/body output, HTTP failure handling, and exit codes: https://curl.se/docs/manpage.html
- Python pathlib documentation for binary file reads: https://docs.python.org/3/library/pathlib.html#pathlib.Path.read_bytes
- Python built-in types documentation for byte inspection, strict UTF-8 decoding, encoding, and string joining: https://docs.python.org/3/library/stdtypes.html
- Python built-in functions documentation for iterable consumption by any() and list(): https://docs.python.org/3/library/functions.html
- Author profile link verified: https://github.com/nawazdhandala

## Issues Found
1. **The encoder consumed one-shot iterables before serialization.** The original any() check exhausted a valid generator, leaving only the EOF marker in the output. Added lines = list(lines) before validation so both passes see the same snapshot. Verified list and iterator inputs produce identical output.
2. **The carriage-return restriction was too broad.** Changed the statement to prohibit CRLF line endings. The specification requires LF terminators, but its ABNF allows carriage returns inside escaped-string content. The example retains its stricter input check; it is a small encoder with an explicit input contract, not a complete serializer for every allowed string.
3. **The curl error explanation overgeneralized truncation evidence.** Clarified that an incomplete-transfer error can indicate truncation, while other errors can indicate HTTP or connection failures. Verified that --fail-with-body saves a complete HTTP 500 response while returning exit code 22.

## Review Notes
- Confirmed the EOF requirement, optional final LF, UTF-8/BOM rules, empty exposition behavior, escaping, counter metadata differences, and rejection of partial documents. The suffix check is correctly described as diagnostic rather than full validation.
- Both Python snippets compiled and executed. Tests with prometheus-client 0.26.0 covered empty output, escaped label newlines, iterator input, optional final LF, and rejection of missing EOF, trailing material, concatenated payloads, and an invalid sample preceding EOF. The encoder rejected embedded LF and CR as written.
- Tested the curl flags with curl 8.7.1 against a temporary local HTTP server. Confirmed the Accept header, separate response headers, gzip decoding, successful body capture, and HTTP 500 body preservation. Saved headers still describe the compressed representation, while the saved body is decompressed.
- --fail-with-body requires curl 7.76.0 or newer. The Python APIs used are current and non-deprecated.
- The explicit OpenMetrics 1.0 request is appropriate to this post. Actual Prometheus negotiation can differ by version and configuration; reproducing a production failure also requires matching its gateway, authentication, and relevant request headers.
- All linked resources resolved to the intended documentation, parser, or author profile. No configuration snippets were present.
- The internal exporter hostname is illustrative. No deployed exporter or production Prometheus was available; production target-health and sample verification remain deployment checks described by the guide, not checks performed in this review.
