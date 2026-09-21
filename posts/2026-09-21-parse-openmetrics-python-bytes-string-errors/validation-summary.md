# Validation Summary: How to Parse OpenMetrics in Python Without Bytes and String Errors

## Status
validated

## Post Type
Tutorial / implementation guide.

## Technologies Covered
- Python bytes, Unicode strings, strict UTF-8 decoding, and generators.
- OpenMetrics 1.0 and Prometheus text exposition.
- prometheus-client 0.26.0 and its OpenMetrics parser.
- Requests HTTP streaming, decompression, status handling, and timeouts.
- Python email.message.Message for media-type parameter parsing.
- pip package installation.

## Sources Consulted
- OpenMetrics 1.0 specification, especially Overall Structure: https://prometheus.io/docs/specs/om/open_metrics_spec/
- Official Python client OpenMetrics parser at v0.26.0: https://github.com/prometheus/client_python/blob/v0.26.0/prometheus_client/openmetrics/parser.py (also read the raw source).
- Official prometheus-client 0.26.0 distribution and package metadata: https://pypi.org/project/prometheus-client/0.26.0/ (installed this exact version and inspected its traditional parser and Sample definition locally).
- Python built-in types, including bytes.decode and str conversions: https://docs.python.org/3/library/stdtypes.html
- Python email.message.Message API, including get_content_type, get_param, and get_content_charset: https://docs.python.org/3/library/email.compat32-message.html
- Requests advanced usage, streaming and timeouts: https://requests.readthedocs.io/en/latest/user/advanced/
- Requests quickstart, binary content, decompression, and HTTP errors: https://requests.readthedocs.io/en/latest/user/quickstart/
- Official pip install documentation: https://pip.pypa.io/en/stable/cli/pip_install/

## Issues Found
- The response media-type check validated the type and version but accepted a missing charset or an explicitly incompatible charset. OpenMetrics 1.0 requires `application/openmetrics-text; version=1.0.0; charset=utf-8`. Added a `get_content_charset() != "utf-8"` check that raises ValueError before reading the body. This API normalizes charset case, so `UTF-8` remains accepted. The existing Accept header can validly negotiate the media type and version without specifying every response parameter.

## Review Notes
- Installed the exact documented parser version in an isolated temporary virtual environment. Runtime checks used Python 3.13.1, prometheus-client 0.26.0, and Requests 2.34.2. The installation command succeeded; the post makes no claim that 0.26.0 is the newest release.
- Executed both Python code blocks extracted from the corrected README. The small gauge assertion passed, and the complete script worked against a local HTTP fixture server.
- Verified successful plain and gzip responses, the unchanged Zürich label, and case-insensitive UTF-8 charset handling.
- Verified rejection of invalid UTF-8, missing EOF, HTTP 200 HTML, incorrect OpenMetrics versions, missing or incompatible charsets, and HTTP 500 responses.
- Verified the 2 MiB limit against a valid 110,000-sample payload, both uncompressed and gzip-compressed. The same payload parsed successfully directly, establishing that the HTTP rejection was due to its size. The check limits accumulated decompressed body bytes; it is not a total process-memory budget.
- Confirmed that passing bytes directly raises TypeError and that parsing str(bytes) fails. Confirmed that an iterator can yield a valid family before subsequently raising for missing EOF, supporting the full-consumption advice.
- Ran the extracted script as a subprocess with a URL argument: the success case printed the expected sample, and a missing-EOF response produced the documented error prefix and nonzero exit status.
- Confirmed Sample has named fields for name, labels, value, timestamp, exemplar, and native_histogram in 0.26.0. Three-value tuple unpacking is unsuitable.
- The parser source explicitly describes itself as laxer than the main Go parser. The post correctly limits its validation claims. No live Prometheus scrape was performed; compatibility should still be tested against the reader's deployed Prometheus version.
- The timeout explanation correctly distinguishes connection/read inactivity limits from a total deadline. This was checked against Requests documentation; a slow-server timing test was not needed.
- The referenced technical documentation links resolved to the intended resources. No deprecated API usage was identified. README changes were limited to the charset validation correction.
