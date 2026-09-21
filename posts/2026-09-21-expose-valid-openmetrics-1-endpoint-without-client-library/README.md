# How to Expose a Valid OpenMetrics 1.0 Endpoint Without a Client Library

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Python, Monitoring, Observability

Description: Build a small OpenMetrics 1.0 HTTP endpoint with correct metadata, counter names, escaping, UTF-8 encoding, and EOF handling.

---

A hand-written metrics endpoint can be useful for a small appliance, a constrained runtime, or a compatibility test. The difficult part is maintaining the contract between the HTTP headers and the bytes sent over the connection. A response that resembles Prometheus text is not automatically a valid OpenMetrics response.

This example targets **OpenMetrics 1.0**, with legacy ASCII metric names and UTF-8 label values. The [OpenMetrics 1.0 specification](https://prometheus.io/docs/specs/om/open_metrics_spec/) defines LF line endings, UTF-8 without a byte order mark, and a final `# EOF` marker. Its prescribed media type is `application/openmetrics-text; version=1.0.0; charset=utf-8`.

## Start with one complete snapshot

Here is a complete exposition for a worker process:

```text
# TYPE worker_jobs counter
# HELP worker_jobs Jobs completed since worker startup.
worker_jobs_total{result="success"} 12
worker_jobs_total{result="failure"} 2
# TYPE worker_queue_depth gauge
# HELP worker_queue_depth Jobs waiting to run.
worker_queue_depth 3
# EOF
```

The counter family is `worker_jobs`; its sample name is `worker_jobs_total`. Using `worker_jobs_total` for both the OpenMetrics family and its total sample changes the relationship between metadata and samples. A queue depth is a gauge because it can decrease without representing a counter reset.

Keep one family together and emit metadata before its samples. Omit timestamps for ordinary live scrapes, allowing the scraper to assign collection time. A `_created` sample, when supplied, describes the counter's creation time; it is not a substitute for a sample timestamp.

## Serve it with Python's standard library

Save this as `exporter.py`. The dictionary stands in for state collected by your application; it deliberately contains only bounded result labels.

```python
from http.server import BaseHTTPRequestHandler, HTTPServer
from threading import Lock

state = {"success": 12, "failure": 2, "queue_depth": 3}
lock = Lock()


def escape(value):
    return (str(value).replace("\\", "\\\\")
            .replace("\n", "\\n").replace('"', '\\"'))


def render():
    with lock:
        snapshot = dict(state)
    lines = [
        "# TYPE worker_jobs counter",
        "# HELP worker_jobs Jobs completed since worker startup.",
    ]
    for result in ("success", "failure"):
        count = snapshot[result]
        if type(count) is not int or count < 0:
            raise ValueError("job totals must be nonnegative integers")
        lines.append(
            f'worker_jobs_total{{result="{escape(result)}"}} {count}'
        )
    depth = snapshot["queue_depth"]
    if type(depth) is not int or depth < 0:
        raise ValueError("queue depth must be a nonnegative integer")
    lines.extend([
        "# TYPE worker_queue_depth gauge",
        "# HELP worker_queue_depth Jobs waiting to run.",
        f"worker_queue_depth {depth}",
        "# EOF",
    ])
    return ("\n".join(lines) + "\n").encode("utf-8")


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path != "/metrics":
            self.send_error(404)
            return
        try:
            body = render()
        except ValueError:
            self.send_error(503, "Metrics snapshot unavailable")
            return
        self.send_response(200)
        self.send_header(
            "Content-Type",
            "application/openmetrics-text; version=1.0.0; charset=utf-8",
        )
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)


HTTPServer(("127.0.0.1", 8000), Handler).serve_forever()
```

This is a local demonstration with one fixed representation, not a general HTTP negotiation implementation. Its intended consumer explicitly accepts OpenMetrics 1.0. For a shared endpoint serving different consumers, add protocol negotiation or use a maintained client library. The standard-library HTTP server also needs replacement or appropriate integration into your production HTTP stack.

Notice that the payload is assembled before the successful response begins. If collection fails halfway through, the endpoint must not append `# EOF` to a partial snapshot and present it as complete. `Content-Length` uses encoded bytes, which matters when labels contain non-ASCII text.

## Check the actual response

Run the program and request the representation explicitly:

```bash
python3 exporter.py
```

In another terminal:

```bash
curl --fail-with-body -sS -D headers.txt \
  -H 'Accept: application/openmetrics-text;version=1.0.0' \
  http://127.0.0.1:8000/metrics -o metrics.om
```

Inspect the headers, verify the final line, and parse the saved file using an OpenMetrics parser. The [Python client's OpenMetrics parser](https://github.com/prometheus/client_python/blob/master/prometheus_client/openmetrics/parser.py) is useful for a focused check, though its own source notes that successful parsing is not a complete specification-conformance guarantee.

Finally, scrape the endpoint with the Prometheus version you deploy. Test an empty registry, a failed collection, and values containing quotes, backslashes, and newlines. Recheck through the production proxy as well: the bytes seen on localhost do not prove that a gateway preserved the content type or complete body.
