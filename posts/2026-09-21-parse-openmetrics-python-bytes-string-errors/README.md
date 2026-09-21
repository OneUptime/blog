# How to Parse OpenMetrics in Python Without Bytes and String Errors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Python, Monitoring, Data Validation

Description: Decode OpenMetrics HTTP bytes as strict UTF-8, choose the OpenMetrics parser, and consume lazy results where parsing errors are handled.

A Python HTTP client returns bytes, while the OpenMetrics text parser expects decoded text. Passing `response.content` directly can produce type errors; converting it with `str(response.content)` is worse because it produces Python's representation of the bytes, including a leading `b` and escaped newlines.

Decode the response exactly once as UTF-8, validate the negotiated media type, and then consume the parser's iterator. This example uses `prometheus-client` 0.26.0 and the OpenMetrics-specific parser module.

## Keep transport and text parsing separate

For a small known byte string, the essential conversion is:

```python
from prometheus_client.openmetrics.parser import text_string_to_metric_families

raw = b"# TYPE workers gauge\nworkers 4\n# EOF\n"
text = raw.decode("utf-8")
families = list(text_string_to_metric_families(text))
assert families[0].samples[0].value == 4
```

Use `decode("utf-8")` with its default strict error handling. Replacement characters hide corrupt input and can alter names or labels. OpenMetrics 1.0 is a UTF-8 text format with a required end marker. [OpenMetrics specification](https://prometheus.io/docs/specs/om/open_metrics_spec/)

The import matters: `prometheus_client.parser` is the traditional Prometheus text parser, while `prometheus_client.openmetrics.parser` handles OpenMetrics. The latter implementation consumes text through a string buffer and checks the OpenMetrics terminator. [Official Python OpenMetrics parser source](https://github.com/prometheus/client_python/blob/v0.26.0/prometheus_client/openmetrics/parser.py)

## Fetch a bounded response and parse it

Install the parser and HTTP client in a virtual environment:

```bash
python -m pip install 'prometheus-client==0.26.0' requests
```

Save this as `inspect_metrics.py`:

```python
from email.message import Message
import sys

import requests
from prometheus_client.openmetrics.parser import text_string_to_metric_families

MAX_BYTES = 2 * 1024 * 1024


def fetch_families(url):
    with requests.get(
        url,
        headers={"Accept": "application/openmetrics-text; version=1.0.0"},
        timeout=(3, 5),
        stream=True,
    ) as response:
        response.raise_for_status()
        content_type = Message()
        content_type["Content-Type"] = response.headers.get("Content-Type", "")
        if content_type.get_content_type() != "application/openmetrics-text":
            raise ValueError("endpoint did not return OpenMetrics")
        if content_type.get_param("version") != "1.0.0":
            raise ValueError("expected OpenMetrics version 1.0.0")
        if content_type.get_content_charset() != "utf-8":
            raise ValueError("expected OpenMetrics charset utf-8")
        body = bytearray()
        for chunk in response.iter_content(chunk_size=65536):
            body.extend(chunk)
            if len(body) > MAX_BYTES:
                raise ValueError("metrics response exceeds size limit")
    text = bytes(body).decode("utf-8")
    return list(text_string_to_metric_families(text))


if __name__ == "__main__":
    try:
        for family in fetch_families(sys.argv[1]):
            for sample in family.samples:
                print(sample.name, sample.labels, sample.value)
    except (requests.RequestException, UnicodeDecodeError, ValueError) as error:
        raise SystemExit(f"Unable to parse metrics: {error}")
```

Run it against your endpoint:

```bash
python inspect_metrics.py http://127.0.0.1:8000/metrics
```

The response size limit applies while reading, including decompressed chunks delivered by Requests. The timeout separates connection and read inactivity limits; it is not a strict wall-clock deadline for an arbitrarily slow server. Use this diagnostic against known endpoints and apply a total deadline in a service that processes untrusted URLs. [Requests timeouts and response streaming](https://requests.readthedocs.io/en/latest/user/advanced/)

## Consume the iterator inside error handling

Parsing is lazy. Merely assigning `families = text_string_to_metric_families(text)` may not discover a malformed line near the end. `list(...)` forces the complete payload through the parser before returning success.

For very large valid payloads, iterate instead of retaining every family, but keep the iteration inside the `try` block and account for partially processed results if a later family fails. A validation job should not mark a payload valid after reading only its first metric.

Samples are richer than `(name, labels, value)` tuples. Access named attributes as the example does instead of unpacking exactly three values; client versions and sample types can include timestamps or exemplars.

## Reproduce common failure classes

Keep small fixtures for each boundary:

- A valid UTF-8 label such as `city="Zürich"` must survive decoding unchanged.
- Invalid UTF-8 bytes should raise `UnicodeDecodeError` before metrics parsing.
- A missing `# EOF` should fail the OpenMetrics parser.
- An HTML error page with status 200 should fail the content-type check.
- A valid response larger than the configured limit should fail the size check.

Save the raw failing body and headers in a controlled diagnostic location when needed. Do not “repair” it by stripping arbitrary prefixes, silently replacing characters, or adding an EOF marker; those changes can conceal truncation or an upstream format mismatch.

The Python parser is useful for inspection and regression tests, but its source notes that it is more permissive than Prometheus's main Go parser. Complete compatibility testing by scraping the endpoint with the Prometheus version you deploy. A successful Python parse establishes that this parser accepted the text, not that every OpenMetrics consumer will accept all its semantics.
