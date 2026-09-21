# How to Fix the OpenMetrics “Data Does Not End with # EOF” Error

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, HTTP, Monitoring, Python

Description: Find and repair OpenMetrics EOF failures by checking negotiated formats, final bytes, truncation, and response transformations.

---

The error “data does not end with # EOF” means an OpenMetrics parser reached the end of its input without recognizing the format's completion marker. It does not necessarily mean the exporter forgot one line. The response may be truncated, mislabeled, or transformed by an intermediary.

The [OpenMetrics 1.0 specification](https://prometheus.io/docs/specs/om/open_metrics_spec/#overall-structure) requires an exposition to end with `# EOF` and recommends a trailing LF. Samples and metadata use LF line endings; carriage returns are not allowed. Treat the complete document as the unit of correctness.

## Save exactly what the scraper receives

Request OpenMetrics explicitly and separate headers from the body:

```bash
curl --fail-with-body --compressed -sS -D metrics.headers \
  -H 'Accept: application/openmetrics-text;version=1.0.0' \
  http://exporter.internal:8000/metrics -o metrics.om
```

`--compressed` allows curl to decode an HTTP-compressed response before you inspect it. Feeding raw gzip bytes to a text parser would create a different problem. Also record curl's exit status: a transfer error is evidence of truncation even if a partial file exists.

Use bytes to inspect the ending rather than relying on a terminal's rendering:

```python
from pathlib import Path

body = Path("metrics.om").read_bytes()
print("bytes:", len(body))
print("tail:", repr(body[-100:]))
print("CR bytes:", body.count(b"\r"))
print("BOM:", body.startswith(b"\xef\xbb\xbf"))
print("EOF ending:", body.endswith((b"# EOF\n", b"# EOF")))
body.decode("utf-8", errors="strict")
```

The suffix test is diagnostic, not a full validator. An invalid sample earlier in the file remains invalid even when the last bytes look right.

## Distinguish a format mismatch from truncation

Inspect the response's `Content-Type`. If it declares OpenMetrics but the body uses a traditional Prometheus encoder, correct the encoder/header pair. Traditional text does not require `# EOF`, and simply adding that marker does not repair other format differences such as counter-family metadata.

The [exposition-format documentation](https://prometheus.io/docs/instrumenting/exposition_formats/) distinguishes the formats. Request `text/plain;version=0.0.4` separately and compare the results. If both requests return identical legacy output while claiming different formats, the negotiation layer is changing headers without changing serialization.

If the application response contains EOF but the proxied response does not, inspect response size limits, buffering, compression, connection resets, and timeouts. A failure occurring only as cardinality grows often points to a body-size or duration threshold. Record byte counts at both points rather than guessing from a small local response.

## Emit EOF only after complete serialization

For a small hand-written exporter, assemble the entire snapshot before committing a successful HTTP response:

```python
def encode_snapshot(lines):
    # Each item is a validated metadata or sample line without a terminator.
    if any("\n" in line or "\r" in line for line in lines):
        raise ValueError("serialize and escape values before joining lines")
    return ("\n".join([*lines, "# EOF"]) + "\n").encode("utf-8")
```

The input contract matters: embedded newlines in label values must already be escaped as the two characters `\n`. Do not blindly append EOF in a `finally` block after collection failure. That would turn a truncated snapshot into a document that falsely appears complete.

For streaming implementations, let the encoder finalize only when every family is serialized successfully. If an HTTP response has already begun and later serialization fails, terminate the response and surface the collection error. A retry should obtain a new coherent snapshot.

## Check for accidental trailing material

Nothing should be appended after the final EOF marker. Common culprits include debug output, HTML footers, middleware banners, and a second exporter payload concatenated onto the first. Combining two complete documents also creates an EOF in the middle; merge metric families through a registry instead of concatenating serialized responses.

Verify the empty case too. An empty OpenMetrics exposition still needs its EOF marker. A branch returning an empty string when no jobs exist can explain failures that disappear as soon as the first job starts.

## Validate the repair at two levels

Parse the saved UTF-8 body with an [OpenMetrics-aware parser](https://github.com/prometheus/client_python/blob/master/prometheus_client/openmetrics/parser.py). Include cases for empty output, escaped label text, and an intentionally truncated response. Do not rely solely on traditional-text linting, which can treat unfamiliar `#` lines as comments.

Then scrape the deployed endpoint with your actual Prometheus version. Confirm target health and expected samples through the same gateway used in production. The repair is complete when the full response arrives, its content type matches its syntax, and the parser accepts the complete exposition.
